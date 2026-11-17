'use strict';
/**
 * Dummy gateway that simulates Razorpay's flow locally:
 *   createOrder → (customer pays on /payment.html: UPI approve or Card + OTP) → authorised
 *   → verifyPaymentSignature (HMAC-SHA256 of "<order_id>|<payment_id>", like Razorpay) → capture → captured
 *   refund → refunded
 * Test data:
 *   UPI  : any valid VPA (name@bank) succeeds; a VPA starting with "fail" (e.g. fail@upi) is declined.
 *   Card : 4111 1111 1111 1111 → success, 4000 0000 0000 0002 → declined (any future expiry, any 3-digit CVV)
 *   OTP  : 123456
 */
const crypto = require('crypto');
const PaymentProvider = require('./PaymentProvider');
const config = require('../../config');

const rid = (p) => `${p}_${crypto.randomBytes(7).toString('base64url').replace(/[-_]/g, 'x')}`;

const TEST_CARDS = {
  '4111111111111111': { outcome: 'success', network: 'Visa' },
  '5555555555554444': { outcome: 'success', network: 'Mastercard' },
  '6521111111111117': { outcome: 'success', network: 'RuPay' },
  '4000000000000002': { outcome: 'failure', network: 'Visa', reason: 'Card declined by issuing bank (test card)' },
  '4000000000009995': { outcome: 'failure', network: 'Visa', reason: 'Insufficient funds (test card)' },
};

function luhn(num) {
  const s = String(num).replace(/\D/g, '');
  if (s.length < 12 || s.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < s.length; i++) {
    let d = Number(s[s.length - 1 - i]);
    if (i % 2) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

function validateExpiry(exp) {
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(String(exp || ''));
  if (!m) return 'Enter expiry as MM/YY';
  const mm = Number(m[1]), yy = 2000 + Number(m[2]);
  if (mm < 1 || mm > 12) return 'Invalid expiry month';
  const end = new Date(yy, mm, 0, 23, 59, 59);
  if (end < new Date()) return 'Card has expired';
  return null;
}

const VPA_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}$/;

class DummyProvider extends PaymentProvider {
  get name() { return 'dummy'; }

  async createOrder({ amount, currency = 'INR', receipt, notes }) {
    return { id: rid('order'), entity: 'order', amount, currency, receipt, notes, status: 'created', created_at: Math.floor(Date.now() / 1000) };
  }

  sign(orderId, paymentId) {
    return crypto.createHmac('sha256', config.payments.dummySecret).update(`${orderId}|${paymentId}`).digest('hex');
  }

  verifyPaymentSignature({ orderId, paymentId, signature }) {
    const expected = this.sign(orderId, paymentId);
    return typeof signature === 'string' && signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  async capture(paymentId, amount) { return { id: paymentId, amount, status: 'captured', captured: true }; }

  async refund(paymentId, { amount, notes } = {}) {
    return { id: rid('rfnd'), entity: 'refund', payment_id: paymentId, amount, notes, status: 'processed', created_at: Math.floor(Date.now() / 1000) };
  }

  async handleWebhook(rawBody) {
    // The dummy gateway calls our handlers directly; kept for interface parity.
    const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    return { event: body.event, payload: body.payload };
  }

  // ----- simulator helpers (not part of the Razorpay-like interface) -----
  newPaymentId() { return rid('pay'); }
  validateUpi(vpa) {
    if (!VPA_RE.test(String(vpa || '').trim())) return { ok: false, error: 'Enter a valid UPI ID, e.g. name@okaxis' };
    return { ok: true, willFail: /^fail/i.test(vpa) };
  }
  validateCard({ number, expiry, cvv, name }) {
    const n = String(number || '').replace(/\s/g, '');
    if (!/^\d+$/.test(n) || !luhn(n)) return { ok: false, error: 'Card number is invalid (failed Luhn check)' };
    const e = validateExpiry(expiry);
    if (e) return { ok: false, error: e };
    if (!/^\d{3,4}$/.test(String(cvv || ''))) return { ok: false, error: 'CVV must be 3 or 4 digits' };
    if (!String(name || '').trim()) return { ok: false, error: 'Enter the name on card' };
    const test = TEST_CARDS[n];
    return { ok: true, last4: n.slice(-4), network: test?.network || (n[0] === '4' ? 'Visa' : n[0] === '5' ? 'Mastercard' : 'Card'), willFail: test?.outcome === 'failure', reason: test?.reason };
  }
  get testOtp() { return '123456'; }
}

module.exports = DummyProvider;
module.exports.luhn = luhn;
