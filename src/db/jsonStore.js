'use strict';
/**
 * Tiny JSON-file store. Each collection is one file in /data/<name>.json.
 * All access goes through the repositories in src/repositories — swap this
 * module (or the repositories) for MySQL / Salesforce adapters later.
 */
const fs = require('fs');
const path = require('path');
const config = require('../config');

const cache = new Map();

function file(name) { return path.join(config.paths.data, `${name}.json`); }

function ensureSeeded(name, fallback) {
  const f = file(name);
  if (fs.existsSync(f)) return;
  const seed = path.join(config.paths.seed, `${name}.json`);
  fs.mkdirSync(config.paths.data, { recursive: true });
  if (fs.existsSync(seed)) fs.copyFileSync(seed, f);
  else fs.writeFileSync(f, JSON.stringify(fallback, null, 2));
}

function read(name, fallback = []) {
  if (cache.has(name)) return cache.get(name);
  ensureSeeded(name, fallback);
  const data = JSON.parse(fs.readFileSync(file(name), 'utf8'));
  cache.set(name, data);
  return data;
}

function write(name, data) {
  cache.set(name, data);
  const f = file(name);
  const tmp = `${f}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, f);
  return data;
}

function clearCache() { cache.clear(); }

/** Generic collection helper used by entity repositories (array-shaped files). */
function collection(name) {
  return {
    all: () => read(name, []),
    findById: (id) => read(name, []).find((x) => x.id === id) || null,
    find: (pred) => read(name, []).filter(pred),
    findOne: (pred) => read(name, []).find(pred) || null,
    insert(doc) {
      const list = read(name, []);
      list.push(doc);
      write(name, list);
      return doc;
    },
    update(id, patch) {
      const list = read(name, []);
      const i = list.findIndex((x) => x.id === id);
      if (i < 0) return null;
      list[i] = { ...list[i], ...patch, id: list[i].id, updatedAt: new Date().toISOString() };
      write(name, list);
      return list[i];
    },
    remove(id) {
      const list = read(name, []);
      const i = list.findIndex((x) => x.id === id);
      if (i < 0) return false;
      list.splice(i, 1);
      write(name, list);
      return true;
    },
    replaceAll(list) { return write(name, list); },
  };
}

/** Object-shaped documents (cms.json, settings.json). */
function documentStore(name, fallback = {}) {
  return {
    get: () => read(name, fallback),
    set: (doc) => write(name, doc),
    patch(p) { return write(name, { ...read(name, fallback), ...p }); },
  };
}

module.exports = { read, write, collection, documentStore, clearCache };
