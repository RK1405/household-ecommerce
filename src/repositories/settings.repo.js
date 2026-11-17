'use strict';
/** Store settings: delivery, COD rules, GST/invoice, email (SMTP + per-type toggles). */
const { documentStore } = require('../db/jsonStore');
const doc = documentStore('settings', {});
module.exports = { get: doc.get, set: doc.set, patch: doc.patch };
