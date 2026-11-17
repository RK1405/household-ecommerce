'use strict';
/** Payment provider factory: PAYMENT_PROVIDER=dummy | razorpay */
const config = require('../../config');
let instance;
module.exports = function getProvider() {
  if (instance) return instance;
  const Impl = config.payments.provider === 'razorpay' ? require('./razorpay.provider') : require('./dummy.provider');
  instance = new Impl();
  return instance;
};
