'use strict';
/**
 * Razorpay provider (Orders API + Checkout). Talks to the REST API over HTTPS with Basic auth, so no SDK is needed.
 * Env: PAYMENT_PROVIDER=razorpay, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET.
 * Flow: createOrder (server) -> Razorpay Checkout in the browser -> POST /api/payments/verify (signature)
 *       -> fetchPayment (amount/order/status check) -> capture if needed -> order paid.  Webhook is the safety net.
 * Amounts are RUPEES at this interface; they are converted to paise here.
 */
const crypto = require('crypto');
const PaymentProvider = require('./PaymentProvider');
const config = require('../../config');
const { HttpError } = require('../../middleware/errors');

const paise = (rupees) => Math.round(Number(rupees) * 100);
const safeEqual = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

class RazorpayProvider extends PaymentProvider {
  get name() { return 'razorpay'; }
  get keyId() { return config.payments.razorpayKeyId; }
  get isTest() { return /^rzp_test_/.test(this.keyId); }

  async api(method, path, body) {
    const { razorpayKeyId: id, razorpayKeySecret: secret, razorpayApiBase: base } = config.payments;
    if (!id || !secret) throw new HttpError(500, 'Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing).');
    let res;
    try {
      res = await fetch(`${base}${path}`, {
        method,
        headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(20000),
      });
    } catch (e) { throw new HttpError(502, `Could not reach Razorpay: ${e.message}`); }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new HttpError(res.status === 401 ? 500 : 502, `Razorpay: ${json.error?.description || res.statusText}`);
    return json;
  }

  async createOrder({ amount, currency = 'INR', receipt, notes }) {
    return this.api('POST', '/orders', { amount: paise(amount), currency, receipt: String(receipt).slice(0, 40), notes });
  }
  fetchPayment(paymentId) { return this.api('GET', `/payments/${encodeURIComponent(paymentId)}`); }
  verifyPaymentSignature({ orderId, paymentId, signature }) {
    const expected = crypto.createHmac('sha256', config.payments.razorpayKeySecret).update(`${orderId}|${paymentId}`).digest('hex');
    return safeEqual(signature, expected);
  }
  capture(paymentId, amount) { return this.api('POST', `/payments/${encodeURIComponent(paymentId)}/capture`, { amount: paise(amount), currency: 'INR' }); }
  refund(paymentId, { amount, notes } = {}) { return this.api('POST', `/payments/${encodeURIComponent(paymentId)}/refund`, { amount: paise(amount), notes }); }
  async handleWebhook(rawBody, signatureHeader) {
    const secret = config.payments.razorpayWebhookSecret;
    if (!secret) throw new HttpError(500, 'RAZORPAY_WEBHOOK_SECRET is not set');
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (!safeEqual(signatureHeader, expected)) throw new HttpError(400, 'Invalid webhook signature');
    const body = JSON.parse(rawBody);
    return { event: body.event, payload: body.payload };
  }
}
module.exports = RazorpayProvider;
