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

router.use(requireAuth);

router.get('/order/:orderId', (req, res) => {
  const o = ownOrder(req);
  res.json({ order: { id: o.id, orderNo: o.orderNo, total: o.totals.total, status: o.status, paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod, gateway: o.gateway, customer: o.customer }, provider: getProvider().name, payments: repo.payments.byOrder(o.id).map(({ events, ...p }) => p) });
});

router.post('/:orderId/initiate', wrap(async (req, res) => {
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

router.post('/pay/:paymentId/upi-status', (req, res) => {
  const { p, o } = ownPayment(req);
  if (p.status !== 'created') return res.json({ status: p.status });
  if (req.body?.cancelled) return res.json({ status: 'failed', payment: fail(p, o, 'Payment request declined / timed out on UPI app') });
  if (p.sim?.willFail) return res.json({ status: 'failed', payment: fail(p, o, 'Declined by UPI app (test VPA)') });
  res.json({ status: 'authorised', ...authorise(p, o) });
});

router.post('/pay/:paymentId/otp', (req, res) => {
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
  const { event: ev, payload } = await getProvider().handleWebhook(raw, req.get('x-razorpay-signature'));
  console.log('[webhook]', ev, payload?.payment?.entity?.id || '');
  res.json({ ok: true });
});
