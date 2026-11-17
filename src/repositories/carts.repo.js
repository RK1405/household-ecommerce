'use strict';
const { collection } = require('../db/jsonStore');
const col = collection('carts');
module.exports = {
  getByUser(userId) {
    return col.findOne((c) => c.userId === userId) || { id: null, userId, items: [], couponCode: null };
  },
  save(userId, items, couponCode = null) {
    const existing = col.findOne((c) => c.userId === userId);
    if (existing) return col.update(existing.id, { items, couponCode });
    return col.insert({ id: `cart_${userId}`, userId, items, couponCode, createdAt: new Date().toISOString() });
  },
  clear(userId) { return module.exports.save(userId, [], null); },
};
