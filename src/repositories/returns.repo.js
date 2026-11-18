'use strict';
/** Return requests (one per customer request, may cover several items of one order). */
const { collection } = require('../db/jsonStore');
const col = collection('returns');
module.exports = {
  all: () => col.all().slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  findById: col.findById,
  byOrder: (orderId) => col.find((r) => r.orderId === orderId),
  byUser: (userId) => col.find((r) => r.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  create: (r) => col.insert(r),
  update: col.update,
  nextReturnNo() {
    const max = col.all().reduce((m, r) => Math.max(m, Number(String(r.returnNo).replace(/\D/g, '')) || 0), 1000);
    return `RT${max + 1}`;
  },
};
