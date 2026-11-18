'use strict';
/** Binary/text file storage for uploads and the email outbox: disk (json provider) or MySQL (mysql provider). */
const fs = require('fs');
const path = require('path');
const config = require('../config');
const mysqlStore = require('./mysqlStore');

const useDb = () => config.dataProvider === 'mysql';
const dirOf = (kind) => (kind === 'uploads' ? config.paths.uploads : config.paths.outbox);
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.html': 'text/html; charset=utf-8' };
const mimeOf = (name) => MIME[path.extname(name).toLowerCase()] || 'application/octet-stream';

async function put(kind, name, data, mime) {
  const safe = path.basename(name);
  if (useDb()) return mysqlStore.putFile(kind, safe, Buffer.isBuffer(data) ? data : Buffer.from(data), mime || mimeOf(safe));
  fs.mkdirSync(dirOf(kind), { recursive: true });
  fs.writeFileSync(path.join(dirOf(kind), safe), data);
}
async function get(kind, name) {
  const safe = path.basename(name);
  if (useDb()) return mysqlStore.getFile(kind, safe);
  const f = path.join(dirOf(kind), safe);
  return fs.existsSync(f) ? { mime: mimeOf(safe), data: fs.readFileSync(f) } : null;
}
module.exports = { put, get, mimeOf };
