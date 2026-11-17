'use strict';
/** TODO(MySQL): implement CustomersService over the `users` + `addresses` + `orders` tables (db/mysql/schema.sql). */
const CustomersService = require('./CustomersService');
module.exports = class MySqlCustomersAdapter extends CustomersService {};
