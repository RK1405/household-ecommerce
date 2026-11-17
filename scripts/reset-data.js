'use strict';
/** Wipes runtime data (data/*.json, storage/outbox, public/uploads) and re-seeds the demo dataset. */
const fs = require('fs');
const path = require('path');
const { writeSeed } = require('./seed');
const root = path.join(__dirname, '..');
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
