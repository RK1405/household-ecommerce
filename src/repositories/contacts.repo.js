'use strict';
const { collection } = require('../db/jsonStore');
const col = collection('contacts');
module.exports = { all: () => col.all().slice().reverse(), create: (c) => col.insert(c), update: col.update };
