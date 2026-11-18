'use strict';
/**
 * MySQL persistence for the document store (DATA_PROVIDER=mysql).
 * All collections are loaded into memory at startup (so repositories stay synchronous) and every
 * change is written through to MySQL by a serialised, retrying flush queue.
 *   hh_documents(collection, doc_id, pos, body)  - one row per record / per object document
 *   hh_files(kind, name, mime, data)             - uploaded images and email HTML
 * Single app instance only (the memory cache is the read source).
 */
const mysql = require('mysql2/promise');
const config = require('../config');

const META = '__kind__';
const OBJ = '__doc__';
const cache = new Map();      // name -> array | object (shared with jsonStore)
const persisted = new Map();  // name -> Map(doc_id -> 'pos|json')
let pool = null;
let ready = false;
const dirty = new Set();
let flushing = null;
let retryTimer = null;

function poolOptions() {
  const c = config.mysql;
  const base = c.url ? { uri: c.url } : { host: c.host, port: c.port, user: c.user, password: c.password, database: c.database };
  return { ...base, waitForConnections: true, connectionLimit: 5, charset: 'utf8mb4', ssl: c.ssl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined, maxPreparedStatements: 64 };
}

async function init({ buildSeed } = {}) {
  if (!pool) pool = mysql.createPool(poolOptions());
  await pool.query(`CREATE TABLE IF NOT EXISTS hh_documents (
    collection VARCHAR(64) NOT NULL, doc_id VARCHAR(128) NOT NULL, pos INT NOT NULL DEFAULT 0, body LONGTEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (collection, doc_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS hh_files (
    kind VARCHAR(32) NOT NULL, name VARCHAR(255) NOT NULL, mime VARCHAR(100) NOT NULL, data LONGBLOB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (kind, name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await load();
  if (buildSeed) {
    const seed = buildSeed();
    const created = [];
    for (const [name, value] of Object.entries(seed)) {
      if (cache.has(name)) continue;
      cache.set(name, value); persisted.set(name, new Map()); dirty.add(name); created.push(name);
    }
    if (created.length) { console.log(`[mysql] seeded ${created.join(', ')}`); await drain(); }
  }
  ready = true;
}

async function load() {
  cache.clear(); persisted.clear();
  const [rows] = await pool.query('SELECT collection, doc_id, pos, body FROM hh_documents ORDER BY collection, pos');
  const kinds = new Map(); const bodies = new Map();
  for (const r of rows) {
    if (r.doc_id === META) { kinds.set(r.collection, r.body); continue; }
    if (!bodies.has(r.collection)) bodies.set(r.collection, []);
    bodies.get(r.collection).push(r);
  }
  for (const [name, kind] of kinds) {
    const list = bodies.get(name) || [];
    const snap = new Map();
    for (const r of list) snap.set(r.doc_id, `${r.pos}|${r.body}`);
    snap.set(META, kind);
    persisted.set(name, snap);
    cache.set(name, kind === 'object' ? JSON.parse(list.find((r) => r.doc_id === OBJ)?.body || '{}') : list.map((r) => JSON.parse(r.body)));
  }
}

const isReady = () => ready;
const get = (name) => (cache.has(name) ? cache.get(name) : undefined);
function set(name, data) { cache.set(name, data); markDirty(name); }

function markDirty(name) {
  dirty.add(name);
  if (!flushing) flushing = flush().finally(() => { flushing = null; });
}

function rowsFor(name) {
  const data = cache.get(name);
  const out = new Map();
  if (Array.isArray(data)) {
    out.set(META, 'array');
    data.forEach((d, i) => { out.set(String(d.id ?? `_${i}`), `${i}|${JSON.stringify(d)}`); });
  } else {
    out.set(META, 'object');
    out.set(OBJ, `0|${JSON.stringify(data)}`);
  }
  return out;
}

async function flushOne(name) {
  const next = rowsFor(name);
  const prev = persisted.get(name) || new Map();
  const upserts = []; const deletes = [];
  for (const [id, v] of next) if (prev.get(id) !== v) upserts.push([id, v]);
  for (const id of prev.keys()) if (!next.has(id)) deletes.push(id);
  if (!upserts.length && !deletes.length) return;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const id of deletes) await conn.query('DELETE FROM hh_documents WHERE collection=? AND doc_id=?', [name, id]);
    for (const [id, v] of upserts) {
      if (id === META) { await conn.query('INSERT INTO hh_documents (collection, doc_id, pos, body) VALUES (?,?,0,?) ON DUPLICATE KEY UPDATE body=VALUES(body)', [name, META, v]); continue; }
      const cut = v.indexOf('|');
      await conn.query('INSERT INTO hh_documents (collection, doc_id, pos, body) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE pos=VALUES(pos), body=VALUES(body)', [name, id, Number(v.slice(0, cut)), v.slice(cut + 1)]);
    }
    await conn.commit();
    persisted.set(name, next);
  } catch (e) {
    try { await conn.rollback(); } catch (_) { /* ignore */ }
    throw e;
  } finally { conn.release(); }
}

async function flush() {
  while (dirty.size) {
    const name = dirty.values().next().value;
    dirty.delete(name);
    try { await flushOne(name); } catch (e) {
      console.error(`[mysql] saving "${name}" failed, will retry:`, e.message);
      dirty.add(name);
      if (!retryTimer) retryTimer = setTimeout(() => { retryTimer = null; if (dirty.size && !flushing) markDirty([...dirty][0]); }, 3000);
      return;
    }
  }
}

async function drain() {
  for (let i = 0; i < 20; i++) {
    if (flushing) await flushing; else if (dirty.size) { markDirty([...dirty][0]); await flushing; } else return;
    if (dirty.size) await new Promise((r) => setTimeout(r, 500));
  }
}

async function putFile(kind, name, data, mime) {
  await pool.query('INSERT INTO hh_files (kind, name, mime, data) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE mime=VALUES(mime), data=VALUES(data)', [kind, name, mime || 'application/octet-stream', data]);
}
async function getFile(kind, name) {
  const [rows] = await pool.query('SELECT mime, data FROM hh_files WHERE kind=? AND name=?', [kind, name]);
  return rows[0] || null;
}

/** Wipe everything (used by npm run reset and the tests), then re-seed. */
async function reset(buildSeed) {
  await pool.query('TRUNCATE TABLE hh_documents'); await pool.query('TRUNCATE TABLE hh_files');
  cache.clear(); persisted.clear(); dirty.clear();
  await init({ buildSeed });
}
async function close() { await drain(); if (pool) await pool.end(); }

module.exports = { init, isReady, get, set, putFile, getFile, drain, reset, close };
