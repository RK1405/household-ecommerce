'use strict';
const crypto = require('crypto');
const id = (prefix = '') => `${prefix}${crypto.randomBytes(6).toString('hex')}`;
const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
module.exports = { id, slugify };
