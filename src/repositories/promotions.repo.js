'use strict';
const { collection } = require('../db/jsonStore');
const col = collection('promotions');
module.exports = {
  all: () => col.all(),
  findById: col.findById,
  create: (p) => col.insert(p),
  update: col.update,
  remove: col.remove,
};
