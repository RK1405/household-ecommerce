'use strict';
/** TODO(Salesforce): implement CustomersService over Account/Contact (Person Accounts) — see integrations/salesforce/README.md. */
const CustomersService = require('./CustomersService');
module.exports = class SalesforceCustomersAdapter extends CustomersService {};
