'use strict';
/** Website content: store identity, banners, bento blocks, announcement, footer, contact, static pages. */
const { documentStore } = require('../db/jsonStore');
const doc = documentStore('cms', {});
module.exports = {
  get: doc.get,
  set: doc.set,
  patch: doc.patch,
  section: (key) => doc.get()[key],
  setSection(key, value) { return doc.patch({ [key]: value }); },
};
