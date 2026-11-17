'use strict';
const { collection } = require('../db/jsonStore');
const col = collection('payments');
module.exports = {
  all: () => col.all().slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findById: col.findById,
  byOrder: (orderId) => col.find((p) => p.orderId === orderId),
  create: (p) => col.insert(p),
  update: col.update,
};
