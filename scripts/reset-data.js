'use strict';
/** Wipes runtime data (data/*.json, storage/outbox, public/uploads, or the MySQL tables) and re-seeds the demo dataset. */
const fs = require('fs');
const path = require('path');
const config = require('../src/config');
const { writeSeed, buildSeed } = require('./seed');
const root = path.join(__dirname, '..');

async function main() {
  if (config.dataProvider === 'mysql') {
    const store = require('../src/db/mysqlStore');
    await store.init({});
    await store.reset(buildSeed);
    await store.close();
    console.log('MySQL tables wiped and re-seeded.');
    return;
  }
  for (const dir of ['data', 'storage/outbox', 'public/uploads']) {
    const d = path.join(root, dir);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (f === '.gitkeep') continue;
      const p = path.join(d, f);
      if (fs.statSync(p).isFile()) fs.unlinkSync(p);
    }
  }
  console.log('Re-seeded:', writeSeed({ force: true }).join(', '));
}
main().catch((e) => { console.error(e.message); process.exit(1); });
