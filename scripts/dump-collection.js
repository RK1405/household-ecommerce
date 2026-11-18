'use strict';
/** Prints one stored collection as JSON (works for both providers). Used by the e2e suite. Usage: node scripts/dump-collection.js emails */
const fs = require('fs');
const path = require('path');
const config = require('../src/config');
const name = process.argv[2];
(async () => {
  if (config.dataProvider === 'mysql') {
    const store = require('../src/db/mysqlStore');
    await store.init({});
    process.stdout.write(JSON.stringify(store.get(name) ?? null));
    await store.close();
  } else {
    process.stdout.write(fs.readFileSync(path.join(config.paths.data, `${name}.json`), 'utf8'));
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
