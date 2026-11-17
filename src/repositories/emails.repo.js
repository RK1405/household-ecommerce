'use strict';
/** Outbox index (metadata). The rendered HTML lives in storage/outbox/<file>. */
const { collection } = require('../db/jsonStore');
const col = collection('emails');
module.exports = { all: () => col.all().slice().reverse(), findById: col.findById, create: (e) => col.insert(e) };
