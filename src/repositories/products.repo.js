'use strict';
/** Product data access. Swap implementation for MySQL/Salesforce without touching routes. */
const { collection } = require('../db/jsonStore');
const col = collection('products');
module.exports = {
  all: () => col.all(),
  active: () => col.all().filter((p) => p.active !== false),
  findById: col.findById,
  findBySlug: (slug) => col.findOne((p) => p.slug === slug),
  findBySku: (sku) => col.findOne((p) => p.sku === sku),
  create: (p) => col.insert(p),
  update: col.update,
  remove: col.remove,
  adjustStock(id, delta) {
    const p = col.findById(id);
    if (!p) return null;
    return col.update(id, { stock: Math.max(0, (p.stock || 0) + delta) });
  },
  replaceAll: col.replaceAll,
};
