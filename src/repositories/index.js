'use strict';
/**
 * Repository registry. DATA_PROVIDER=json uses the JSON-file repositories in this folder.
 * To move to MySQL/Salesforce, implement the same method signatures (see db/mysql and
 * integrations/salesforce) and switch here based on config.dataProvider.
 */
module.exports = {
  products: require('./products.repo'),
  categories: require('./categories.repo'),
  users: require('./users.repo'),
  carts: require('./carts.repo'),
  orders: require('./orders.repo'),
  payments: require('./payments.repo'),
  returns: require('./returns.repo'),
  coupons: require('./coupons.repo'),
  promotions: require('./promotions.repo'),
  cms: require('./cms.repo'),
  settings: require('./settings.repo'),
  contacts: require('./contacts.repo'),
  emails: require('./emails.repo'),
};
