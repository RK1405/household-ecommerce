'use strict';
/**
 * Razorpay provider — STUB. To go live:
 *   1. npm install razorpay
 *   2. Set PAYMENT_PROVIDER=razorpay, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET in .env
 *   3. Implement the TODOs below (signatures already match PaymentProvider)
 *   4. On payment.html, replace the simulated form with Razorpay Checkout:
 *        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
 *        new Razorpay({ key, order_id, amount, handler: (resp) => POST /api/payments/verify with
 *          { razorpay_order_id, razorpay_payment_id, razorpay_signature } }).open()
 *   5. Point a webhook at POST /api/payments/webhook (payment.captured, payment.failed, refund.processed)
 */
const crypto = require('crypto');
const PaymentProvider = require('./PaymentProvider');
const config = require('../../config');

class RazorpayProvider extends PaymentProvider {
  get name() { return 'razorpay'; }
  client() {
    // TODO: const Razorpay = require('razorpay');
    // return new Razorpay({ key_id: config.payments.razorpayKeyId, key_secret: config.payments.razorpayKeySecret });
    throw new Error('Razorpay SDK not installed — see src/services/payments/razorpay.provider.js');
  }
  async createOrder({ amount, currency = 'INR', receipt, notes }) {
    // Razorpay expects paise
    return this.client().orders.create({ amount: Math.round(amount * 100), currency, receipt, notes });
  }
  verifyPaymentSignature({ orderId, paymentId, signature }) {
    const expected = crypto.createHmac('sha256', config.payments.razorpayKeySecret).update(`${orderId}|${paymentId}`).digest('hex');
    return expected === signature;
  }
  async capture(paymentId, amount) {
    return this.client().payments.capture(paymentId, Math.round(amount * 100), 'INR');
  }
  async refund(paymentId, { amount, notes } = {}) {
    return this.client().payments.refund(paymentId, { amount: Math.round(amount * 100), notes });
  }
  async handleWebhook(rawBody, signatureHeader) {
    const expected = crypto.createHmac('sha256', config.payments.razorpayWebhookSecret).update(rawBody).digest('hex');
    if (expected !== signatureHeader) throw new Error('Invalid webhook signature');
    const body = JSON.parse(rawBody);
    return { event: body.event, payload: body.payload };
  }
}
module.exports = RazorpayProvider;
