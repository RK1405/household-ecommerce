'use strict';
let svc;
module.exports = function customersService() {
  if (svc) return svc;
  const provider = process.env.CUSTOMERS_PROVIDER || 'mock';
  if (provider === 'mysql') svc = new (require('./mysql.adapter'))();
  else if (provider === 'salesforce') svc = new (require('./salesforce.adapter'))();
  else svc = new (require('./mock.adapter'))();
  return svc;
};
