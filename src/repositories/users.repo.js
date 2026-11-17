'use strict';
const { collection } = require('../db/jsonStore');
const col = collection('users');
const strip = (u) => { if (!u) return u; const { passwordHash, reset, ...rest } = u; return rest; };
module.exports = {
  all: () => col.all(),
  findById: col.findById,
  findByEmail: (email) => col.findOne((u) => u.email.toLowerCase() === String(email).toLowerCase()),
  create: (u) => col.insert(u),
  update: col.update,
  remove: col.remove,
  publicView: strip,
};
