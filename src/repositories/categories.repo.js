'use strict';
const { collection } = require('../db/jsonStore');
const col = collection('categories');
module.exports = {
  all: () => col.all().slice().sort((a, b) => (a.order || 0) - (b.order || 0)),
  top: () => module.exports.all().filter((c) => !c.parentId),
  children: (parentId) => module.exports.all().filter((c) => c.parentId === parentId),
  findById: col.findById,
  findBySlug: (slug) => col.findOne((c) => c.slug === slug),
  create: (c) => col.insert(c),
  update: col.update,
  remove: col.remove,
};
