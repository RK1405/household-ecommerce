'use strict';
const repo = require('../../repositories');
let svc;
module.exports = function reviewsService() {
  if (svc) return svc;
  const provider = process.env.REVIEWS_PROVIDER || 'mock';
  if (provider === 'mysql') svc = new (require('./mysql.adapter'))();
  else if (provider === 'salesforce') svc = new (require('./salesforce.adapter'))();
  else svc = new (require('./mock.adapter'))(repo.products.all());
  return svc;
};
