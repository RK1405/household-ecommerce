'use strict';
/**
 * Payment flow (dummy gateway, Razorpay-shaped):
 *   POST /api/payments/:orderId/initiate   {method:'UPI', vpa} | {method:'CARD', card:{number,expiry,cvv,name}}
 *        → payment record (status 'created'); next step 'upi_approve' or 'otp'
 *   POST /api/payments/pay/:paymentId/upi-status   (after the simulated "approve on your UPI app" countdown)
 *   POST /api/payments/pay/:paymentId/otp  {otp}
 *        → on success: status 'authorised' and returns { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *   POST /api/payments/verify  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *        → verifyPaymentSignature → capture → order Placed + paid, emails sent
 *   POST /api/payments/webhook  (Razorpay webhooks; dummy accepts JSON)
 *
 * With PAYMENT_PROVIDER=razorpay the browser uses Razorpay Checkout instead:
 *   POST /api/payments/:orderId/razorpay-init    → { keyId, orderId, amount, ... } for Checkout
 *   POST /api/payments/:orderId/razorpay-failed  → records a failed attempt
 *   POST /api/payments/verify                    → signature + Razorpay lookup + capture → order paid
 *   POST /api/payments/webhook                   → payment.captured / payment.failed safety net
 */
const router = require('express').Router();
const repo = require('../repositories');
const getProvider = require('../services/payments');
const email = require('../services/email.service');
const { requireAuth } = require('../middleware/auth');
const { wrap, HttpError } = require('../middleware/errors');

function ownOrder(req) {
  const o = repo.orders.findById(req.params.orderId);
  if (!o || o.userId !== req.user.id) throw new HttpError(404, 'Order not found');
  return o;
}
function ownPayment(req) {
  const p = repo.payments.findById(req.params.paymentId);
  if (!p) throw new HttpError(404, 'Payment not found');
  const o = repo.orders.findById(p.orderId);
  if (!o || o.userId !== req.user.id) throw new HttpError(404, 'Payment not found');
  return { p, o };
}
const event = (p, status, extra = {}) => ({ status, events: [...(p.events || []), { status, at: new Date().toISOString(), ...extra }], updatedAt: new Date().toISOString() });

function fail(p, o, reason) {
  const up = repo.payments.update(p.id, { ...event(p, 'failed', { reason }), failureReason: reason });
  repo.orders.update(o.id, { paymentStatus: 'failed' });
  email.queue('payment_failed', o.customer.email, { order: o, payment: up });
  return up;
}

function authorise(p, o) {
  const provider = getProvider();
  const up = repo.payments.update(p.id, event(p, 'authorised'));
  return { payment: up, razorpay_order_id: p.gatewayOrderId, razorpay_payment_id: p.id, razorpay_signature: provider.sign(p.gatewayOrderId, p.id) };
}

const METHODS = { upi: 'UPI', card: 'CARD', netbanking: 'NETBANKING', wallet: 'WALLET', emi: 'EMI', paylater: 'PAYLATER' };
const inflight = new Map();

/** Confirms a Razorpay payment with Razorpay itself, captures it if needed and marks the order paid. Idempotent. */
function settleRazorpay(order, paymentId) {
  if (inflight.has(paymentId)) return inflight.get(paymentId);
  const job = (async () => {
    const provider = getProvider();
    const existing = repo.payments.findById(paymentId);
    if (existing && (existing.status === 'captured' || existing.status === 'refunded')) return repo.orders.findById(order.id);
    const rp = await provider.fetchPayment(paymentId);
    if (rp.order_id !== order.gateway?.orderId) throw new HttpError(400, 'Payment does not belong to this order.');
    if (rp.amount !== Math.round(order.totals.total * 100) || rp.currency !== 'INR') throw new HttpError(400, 'Payment amount does not match the order.');
    if (rp.status === 'authorized') await provider.capture(paymentId, order.totals.total);
    else if (rp.status !== 'captured') throw new HttpError(400, `Payment is not complete (status: ${rp.status}).`);
    const at = new Date().toISOString();
    const rec = {
      id: rp.id, orderId: order.id, orderNo: order.orderNo, gatewayOrderId: rp.order_id, provider: 'razorpay', amount: order.totals.total, currency: 'INR', refunds: [],
      method: METHODS[rp.method] || String(rp.method || 'ONLINE').toUpperCase(), vpa: rp.vpa || null, card: rp.card ? { last4: rp.card.last4, network: rp.card.network } : null,
      status: 'captured', events: [...(existing?.events || [{ status: 'created', at }]), { status: 'captured', at }], createdAt: existing?.createdAt || at,
    };
    const cap = existing ? repo.payments.update(rp.id, rec) : repo.payments.create(rec);
    const fresh = repo.orders.findById(order.id);
    if (fresh.paymentStatus === 'paid') return fresh;
    const placed = repo.orders.update(order.id, { paymentStatus: 'paid', status: 'Placed', statusHistory: [...fresh.statusHistory, { status: 'Placed', at, note: `Paid online via ${rec.method} (${rp.id})` }] });
    email.queue('payment_success', placed.customer.email, { order: placed, payment: cap });
    email.queue('order_placed', placed.customer.email, { order: placed });
    return placed;
  })().finally(() => inflight.delete(paymentId));
  inflight.set(paymentId, job);
  return job;
}

function recordRazorpayFailure(order, paymentId, reason) {
  const existing = paymentId && repo.payments.findById(paymentId);
  if (existing && existing.status !== 'created' && existing.status !== 'failed') return existing;
  const at = new Date().toISOString();
  const rec = { id: paymentId || getProvider().newPaymentId?.() || `pay_failed_${Date.now()}`, orderId: order.id, orderNo: order.orderNo, gatewayOrderId: order.gateway?.orderId, provider: 'razorpay', amount: order.totals.total, currency: 'INR', method: 'ONLINE', vpa: null, card: null, refunds: [], status: 'failed', failureReason: reason, events: [{ status: 'failed', at, reason }], createdAt: at };
  const p = existing ? repo.payments.update(existing.id, rec) : repo.payments.create(rec);
  if (order.paymentStatus !== 'paid') {
    repo.orders.update(order.id, { paymentStatus: 'failed' });
    email.queue('payment_failed', order.customer.email, { order, payment: p });
  }
  return p;
}

const dummyOnly = (req, res, next) => (getProvider().name === 'dummy' ? next() : next(new HttpError(400, 'Not available with this payment provider.')));

router.use(requireAuth);

router.get('/order/:orderId', (req, res) => {
  const o = ownOrder(req);
  res.json({ order: { id: o.id, orderNo: o.orderNo, total: o.totals.total, status: o.status, paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod, gateway: o.gateway, customer: o.customer }, provider: getProvider().name, payments: repo.payments.byOrder(o.id).map(({ events, ...p }) => p) });
});

router.post('/:orderId/razorpay-init', wrap(async (req, res) => {
  const provider = getProvider();
  if (provider.name !== 'razorpay') throw new HttpError(400, 'Razorpay is not the active payment provider.');
  let o = ownOrder(req);
  if (o.paymentMethod !== 'ONLINE') throw new HttpError(400, 'This order is Cash on Delivery.');
  if (o.paymentStatus === 'paid') throw new HttpError(400, 'This order is already paid.');
  if (o.status === 'Cancelled') throw new HttpError(400, 'This order was cancelled.');
  if (o.gateway?.provider !== 'razorpay') {
    const gw = await provider.createOrder({ amount: o.totals.total, currency: 'INR', receipt: o.orderNo, notes: { orderId: o.id } });
    o = repo.orders.update(o.id, { gateway: { provider: 'razorpay', orderId: gw.id } });
  }
  res.json({ keyId: provider.keyId, testMode: provider.isTest, orderId: o.gateway.orderId, amount: Math.round(o.totals.total * 100), currency: 'INR',
    name: repo.cms.get().store.name, description: `Order ${o.orderNo}`, prefill: { name: o.customer.name, email: o.customer.email, contact: o.customer.phone ? `+91${String(o.customer.phone).replace(/\D/g, '').slice(-10)}` : '' } });
}));

router.post('/:orderId/razorpay-failed', wrap(async (req, res) => {
  if (getProvider().name !== 'razorpay') throw new HttpError(400, 'Razorpay is not the active payment provider.');
  const o = ownOrder(req);
  if (o.paymentStatus === 'paid') return res.json({ ok: true });
  const id = typeof req.body?.razorpay_payment_id === 'string' && /^pay_\w+$/.test(req.body.razorpay_payment_id) ? req.body.razorpay_payment_id : null;
  recordRazorpayFailure(o, id, String(req.body?.reason || 'Payment failed').slice(0, 200));
  res.json({ ok: true });
}));

router.post('/:orderId/initiate', dummyOnly, wrap(async (req, res) => {
  const o = ownOrder(req);
  if (o.paymentMethod !== 'ONLINE') throw new HttpError(400, 'This order is Cash on Delivery.');
  if (o.paymentStatus === 'paid') throw new HttpError(400, 'This order is already paid.');
  if (o.status === 'Cancelled') throw new HttpError(400, 'This order was cancelled.');
  const provider = getProvider();
  const { method } = req.body || {};
  const base = { id: provider.newPaymentId(), orderId: o.id, orderNo: o.orderNo, gatewayOrderId: o.gateway.orderId, provider: provider.name, amount: o.totals.total, currency: 'INR', refunds: [], createdAt: new Date().toISOString() };
  if (method === 'UPI') {
    const v = provider.validateUpi(req.body.vpa);
    if (!v.ok) throw new HttpError(400, v.error, { vpa: v.error });
    const p = repo.payments.create({ ...base, method: 'UPI', vpa: String(req.body.vpa).trim().toLowerCase(), card: null, status: 'created', sim: { willFail: v.willFail }, events: [{ status: 'created', at: base.createdAt }] });
    return res.json({ paymentId: p.id, next: 'upi_approve', expiresIn: 8 });
  }
  if (method === 'CARD') {
    const v = provider.validateCard(req.body.card || {});
    if (!v.ok) throw new HttpError(400, v.error);
    const p = repo.payments.create({ ...base, method: 'CARD', vpa: null, card: { last4: v.last4, network: v.network }, status: 'created', sim: { willFail: v.willFail, reason: v.reason }, events: [{ status: 'created', at: base.createdAt }] });
    return res.json({ paymentId: p.id, next: 'otp', hint: 'Demo OTP is 123456' });
  }
  throw new HttpError(400, 'Choose UPI or Card');
}));

router.post('/pay/:paymentId/upi-status', dummyOnly, (req, res) => {
  const { p, o } = ownPayment(req);
  if (p.status !== 'created') return res.json({ status: p.status });
  if (req.body?.cancelled) return res.json({ status: 'failed', payment: fail(p, o, 'Payment request declined / timed out on UPI app') });
  if (p.sim?.willFail) return res.json({ status: 'failed', payment: fail(p, o, 'Declined by UPI app (test VPA)') });
  res.json({ status: 'authorised', ...authorise(p, o) });
});

router.post('/pay/:paymentId/otp', dummyOnly, (req, res) => {
  const { p, o } = ownPayment(req);
  if (p.status !== 'created') return res.json({ status: p.status });
  const tries = (p.otpTries || 0) + 1;
  if (String(req.body?.otp || '') !== getProvider().testOtp) {
    if (tries >= 3) return res.json({ status: 'failed', payment: fail(p, o, 'Incorrect OTP entered 3 times') });
    repo.payments.update(p.id, { otpTries: tries });
    throw new HttpError(400, `Incorrect OTP. ${3 - tries} attempt(s) left. (Demo OTP: 123456)`);
  }
  if (p.sim?.willFail) return res.json({ status: 'failed', payment: fail(p, o, p.sim.reason || 'Declined by bank') });
  res.json({ status: 'authorised', ...authorise(p, o) });
});

router.post('/verify', wrap(async (req, res) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
  const provider = getProvider();
  if (provider.name === 'razorpay') {
    const ord = repo.orders.findById(req.body?.orderId) || repo.orders.all().find((x) => x.gateway?.orderId === orderId);
    if (!ord || ord.userId !== req.user.id || ord.gateway?.orderId !== orderId) throw new HttpError(404, 'Order not found');
    if (!provider.verifyPaymentSignature({ orderId, paymentId, signature })) {
      recordRazorpayFailure(ord, null, 'Signature verification failed');
      throw new HttpError(400, 'Payment verification failed.');
    }
    await settleRazorpay(ord, paymentId);
    return res.json({ ok: true, orderId: ord.id });
  }
  const p = repo.payments.findById(paymentId);
  if (!p) throw new HttpError(404, 'Payment not found');
  const o = repo.orders.findById(p.orderId);
  if (!o || o.userId !== req.user.id) throw new HttpError(404, 'Payment not found');
  if (p.status === 'captured') return res.json({ ok: true, orderId: o.id });
  if (p.status !== 'authorised' || p.gatewayOrderId !== orderId || !provider.verifyPaymentSignature({ orderId, paymentId, signature })) {
    fail(p, o, 'Signature verification failed');
    throw new HttpError(400, 'Payment verification failed.');
  }
  await provider.capture(p.id, p.amount);
  const cap = repo.payments.update(p.id, event(p, 'captured'));
  const at = new Date().toISOString();
  const order = repo.orders.update(o.id, { paymentStatus: 'paid', status: 'Placed', statusHistory: [...o.statusHistory, { status: 'Placed', at, note: `Paid online via ${p.method} (${p.id})` }] });
  email.queue('payment_success', order.customer.email, { order, payment: cap });
  email.queue('order_placed', order.customer.email, { order });
  res.json({ ok: true, orderId: o.id });
}));

module.exports = router;

/** Webhook router is mounted separately (no auth; signature verified by the provider). */
module.exports.webhook = wrap(async (req, res) => {
  const raw = req.rawBody || JSON.stringify(req.body || {});
  const provider = getProvider();
  const { event: ev, payload } = await provider.handleWebhook(raw, req.get('x-razorpay-signature'));
  const pay = payload?.payment?.entity;
  console.log('[webhook]', ev, pay?.id || '');
  if (provider.name === 'razorpay' && pay?.order_id) {
    const order = repo.orders.all().find((o) => o.gateway?.orderId === pay.order_id);
    if (order && order.paymentStatus !== 'paid') {
      if (ev === 'payment.captured' || ev === 'payment.authorized') await settleRazorpay(order, pay.id);
      else if (ev === 'payment.failed') recordRazorpayFailure(order, pay.id, pay.error_description || 'Payment failed');
    }
  }
  res.json({ ok: true });
});
