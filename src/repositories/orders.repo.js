'use strict';
const { collection } = require('../db/jsonStore');
const col = collection('orders');
module.exports = {
  all: () => col.all().slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findById: col.findById,
  findByNumber: (no) => col.findOne((o) => o.orderNo.toLowerCase() === String(no).toLowerCase()),
  byUser: (userId) => module.exports.all().filter((o) => o.userId === userId),
  create: (o) => col.insert(o),
  update: col.update,
  nextOrderNo() {
    const max = col.all().reduce((m, o) => Math.max(m, Number(String(o.orderNo).replace(/\D/g, '')) || 0), 100000);
    return `HH${max + 1}`;
  },
};
