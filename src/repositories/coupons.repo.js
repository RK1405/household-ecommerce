'use strict';
const { collection } = require('../db/jsonStore');
const col = collection('coupons');
module.exports = {
  all: () => col.all(),
  findById: col.findById,
  findByCode: (code) => col.findOne((c) => c.code.toUpperCase() === String(code || '').trim().toUpperCase()),
  create: (c) => col.insert(c),
  update: col.update,
  remove: col.remove,
};
