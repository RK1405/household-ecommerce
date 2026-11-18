'use strict';
/**
 * Customer returns.
 *   Requested → Approved → Received → Refunded         (or Rejected / Cancelled by customer while Requested)
 * Rules: order must be Delivered; each item has its own window (days after delivery) that the admin sets per product
 * (0 = no returns) and products sold below the minimum price (Store settings, default ₹1,000) are never returnable.
 * The store pays for return pickup. Online orders are refunded through the payment provider; COD orders are paid out by
 * the admin to the UPI ID the customer gives (recorded with a reference).
 */
const repo = require('../repositories');
const email = require('./email.service');
const getProvider = require('./payments');
const returnPolicy = require('../utils/returnPolicy');
const { HttpError } = require('../middleware/errors');
const { id } = require('../utils/ids');

const REASONS = ['Damaged or defective', 'Wrong item received', 'Item not as described', 'Missing parts or accessories', 'No longer needed', 'Other'];
const ACTIVE = ['Requested', 'Approved', 'Received', 'Refunded']; // statuses that "use up" returnable quantity
const DAY = 864e5;
const money2 = (n) => Math.round(n * 100) / 100;
const UPI_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}$/;

const deliveredAt = (o) => [...(o.statusHistory || [])].reverse().find((h) => h.status === 'Delivered')?.at || null;

/** What the customer actually paid per unit for items (coupon share applied, delivery excluded). */
function paidPerUnit(o, item) {
  const sumLines = o.items.reduce((a, i) => a + i.lineTotal, 0) || 1;
  const itemsPaid = Math.max(0, o.totals.total - (o.totals.delivery || 0));
  return money2((item.lineTotal / sumLines) * itemsPaid / item.qty);
}

function itemWindow(o, item) {
  if (Number.isFinite(item.returnWindowDays)) return item.returnWindowDays; // snapshot taken when the order was placed
  const p = repo.products.findById(item.productId); // orders placed before returns existed
  return returnPolicy.effectiveWindow(item.price, returnPolicy.adminWindow(p), returnPolicy.minPriceOf(repo.settings.get()));
}

/** Eligibility for every line of an order. */
function eligibility(o) {
  const out = { orderId: o.id, delivered: o.status === 'Delivered', deliveredAt: deliveredAt(o), items: [], anyReturnable: false, message: '' };
  if (!out.delivered) { out.message = o.status === 'Returned' ? 'This order has been returned.' : 'Returns open after the order is delivered.'; return out; }
  const used = {};
  for (const r of repo.returns.byOrder(o.id).filter((x) => ACTIVE.includes(x.status))) for (const it of r.items) used[it.productId] = (used[it.productId] || 0) + it.qty;
  const now = Date.now();
  out.items = o.items.map((item) => {
    const days = itemWindow(o, item);
    const deadline = out.deliveredAt && days > 0 ? new Date(new Date(out.deliveredAt).getTime() + days * DAY).toISOString() : null;
    const remaining = Math.max(0, item.qty - (used[item.productId] || 0));
    let reason = '';
    if (days <= 0) reason = item.price < returnPolicy.minPriceOf(repo.settings.get()) ? `No returns on products under ₹${returnPolicy.minPriceOf(repo.settings.get()).toLocaleString('en-IN')}` : 'This product is not returnable';
    else if (deadline && now > new Date(deadline).getTime()) reason = `Return window of ${days} days has ended`;
    else if (remaining <= 0) reason = 'Already requested for return';
    return { productId: item.productId, name: item.name, image: item.image, qty: item.qty, remaining, unitPaid: paidPerUnit(o, item), windowDays: days, deadline, returnable: !reason, reason };
  });
  out.anyReturnable = out.items.some((i) => i.returnable);
  if (!out.anyReturnable) out.message = out.items.every((i) => i.windowDays <= 0) ? 'Items in this order are not eligible for return.' : (out.items.some((i) => i.reason.startsWith('Already')) ? 'Return already requested.' : 'The return window for this order has ended.');
  return out;
}

const adminEmail = () => email.smtpSettings().adminEmail;
const push = (r, status, by, note = '') => ({ status, history: [...(r.history || []), { status, at: new Date().toISOString(), by, note }], updatedAt: new Date().toISOString() });

function create(user, body = {}) {
  const o = repo.orders.findById(body.orderId);
  if (!o || o.userId !== user.id) throw new HttpError(404, 'Order not found');
  const el = eligibility(o);
  if (!el.delivered) throw new HttpError(400, el.message);
  const reason = REASONS.includes(body.reason) ? body.reason : null;
  if (!reason) throw new HttpError(400, 'Please choose a reason for the return.', { reason: 'Required' });
  const wanted = (Array.isArray(body.items) ? body.items : []).map((x) => ({ productId: String(x.productId), qty: Math.floor(Number(x.qty)) })).filter((x) => x.qty > 0);
  if (!wanted.length) throw new HttpError(400, 'Select at least one item to return.');
  const items = [];
  for (const w of wanted) {
    const line = el.items.find((i) => i.productId === w.productId);
    if (!line) throw new HttpError(400, 'An item is not part of this order.');
    if (!line.returnable) throw new HttpError(400, `${line.name}: ${line.reason}.`);
    if (w.qty > line.remaining) throw new HttpError(400, `${line.name}: you can return at most ${line.remaining}.`);
    items.push({ productId: line.productId, name: line.name, image: line.image, qty: w.qty, unitPaid: line.unitPaid, lineRefund: money2(line.unitPaid * w.qty) });
  }
  let upiId = null;
  if (o.paymentMethod === 'COD') {
    upiId = String(body.upiId || '').trim().toLowerCase();
    if (!UPI_RE.test(upiId)) throw new HttpError(400, 'Enter the UPI ID where we should send your refund, e.g. name@okaxis.', { upiId: 'Required for Cash on Delivery orders' });
  }
  const at = new Date().toISOString();
  const ret = repo.returns.create({
    id: id('ret_'), returnNo: repo.returns.nextReturnNo(), orderId: o.id, orderNo: o.orderNo, userId: user.id,
    customer: { name: o.customer.name, email: o.customer.email, phone: o.customer.phone },
    items, refundAmount: money2(items.reduce((a, i) => a + i.lineRefund, 0)), reason, comment: String(body.comment || '').slice(0, 500),
    paymentMethod: o.paymentMethod, upiId, pickupAddress: o.shippingAddress, status: 'Requested',
    history: [{ status: 'Requested', at, by: 'customer', note: '' }], createdAt: at, updatedAt: at,
  });
  email.queue('return_requested', o.customer.email, { order: o, ret });
  email.queue('return_admin', adminEmail(), { order: o, ret });
  return ret;
}

function cancel(user, ret) {
  if (ret.userId !== user.id) throw new HttpError(404, 'Return not found');
  if (ret.status !== 'Requested') throw new HttpError(400, 'This return can no longer be cancelled.');
  return repo.returns.update(ret.id, push(ret, 'Cancelled', 'customer', 'Cancelled by customer'));
}

function approve(ret, by, note) {
  if (ret.status !== 'Requested') throw new HttpError(400, 'Only requested returns can be approved.');
  const up = repo.returns.update(ret.id, { ...push(ret, 'Approved', by, note), adminNote: note || '' });
  email.queue('return_approved', ret.customer.email, { order: repo.orders.findById(ret.orderId), ret: up });
  return up;
}

function reject(ret, by, note) {
  if (ret.status !== 'Requested') throw new HttpError(400, 'Only requested returns can be rejected.');
  if (!String(note || '').trim()) throw new HttpError(400, 'Please give the customer a reason for rejecting.', { note: 'Required' });
  const up = repo.returns.update(ret.id, { ...push(ret, 'Rejected', by, note), adminNote: note });
  email.queue('return_rejected', ret.customer.email, { order: repo.orders.findById(ret.orderId), ret: up });
  return up;
}

/** Order-level bookkeeping after money has gone back to the customer. */
function afterRefund(order) {
  const refunded = repo.returns.byOrder(order.id).filter((r) => r.status === 'Refunded');
  const back = {}; refunded.forEach((r) => r.items.forEach((i) => { back[i.productId] = (back[i.productId] || 0) + i.qty; }));
  const all = order.items.every((i) => (back[i.productId] || 0) >= i.qty);
  const at = new Date().toISOString();
  const patch = { paymentStatus: all ? 'refunded' : 'partially-refunded' };
  if (all) { patch.status = 'Returned'; patch.statusHistory = [...order.statusHistory, { status: 'Returned', at, note: 'All items returned', by: 'system' }]; }
  return repo.orders.update(order.id, patch);
}

async function refundOnline(order, ret) {
  const pay = repo.payments.byOrder(order.id).find((p) => p.status === 'captured');
  if (!pay) throw new HttpError(400, 'No captured online payment found for this order. Refund it manually and record the payout instead.');
  const already = (pay.refunds || []).reduce((a, r) => a + r.amount, 0);
  const amount = Math.min(ret.refundAmount, money2(pay.amount - already));
  if (!(amount > 0)) throw new HttpError(400, 'Nothing left to refund on this payment.');
  const r = await getProvider().refund(pay.id, { amount, notes: { reason: `Return ${ret.returnNo}` } });
  const refund = { id: r.id, amount, at: new Date().toISOString(), reason: `Return ${ret.returnNo}` };
  const full = already + amount >= pay.amount;
  repo.payments.update(pay.id, { status: full ? 'refunded' : 'captured', refunds: [...(pay.refunds || []), refund], events: [...(pay.events || []), { status: full ? 'refunded' : 'partially_refunded', at: refund.at, amount }] });
  return refund;
}

/** Items are back with us. Optionally restock. Online orders are refunded automatically; COD waits for the payout. */
async function receive(ret, by, { note, restock = true } = {}) {
  if (ret.status !== 'Approved') throw new HttpError(400, 'Approve the return before marking it received.');
  const order = repo.orders.findById(ret.orderId);
  if (restock) ret.items.forEach((i) => repo.products.adjustStock(i.productId, i.qty));
  let up = repo.returns.update(ret.id, { ...push(ret, 'Received', by, note), restocked: !!restock });
  if (ret.paymentMethod === 'ONLINE') {
    const refund = await refundOnline(order, up);
    up = repo.returns.update(ret.id, { ...push(up, 'Refunded', by, 'Refunded to the original payment method'), refund });
    const o = afterRefund(order);
    email.queue('return_refunded', o.customer.email, { order: o, ret: up });
  }
  return up;
}

/** COD: the admin paid the customer's UPI ID outside the system and records the reference. */
function recordPayout(ret, by, { reference }) {
  if (ret.paymentMethod !== 'COD') throw new HttpError(400, 'Only Cash on Delivery returns are paid out manually.');
  if (ret.status !== 'Received') throw new HttpError(400, 'Mark the return as received first.');
  if (!String(reference || '').trim()) throw new HttpError(400, 'Enter the UPI transaction reference.', { reference: 'Required' });
  const order = repo.orders.findById(ret.orderId);
  const refund = { id: String(reference).trim().slice(0, 60), amount: ret.refundAmount, at: new Date().toISOString(), upiId: ret.upiId };
  const up = repo.returns.update(ret.id, { ...push(ret, 'Refunded', by, `Paid to ${ret.upiId} (ref ${refund.id})`), refund });
  const o = afterRefund(order);
  email.queue('return_refunded', o.customer.email, { order: o, ret: up });
  return up;
}

const hasActiveReturns = (orderId) => repo.returns.byOrder(orderId).some((r) => ACTIVE.includes(r.status));

/** Summary attached to each order in "My orders". */
function orderReturnInfo(o) {
  const el = eligibility(o);
  const next = el.items.filter((i) => i.returnable && i.deadline).map((i) => i.deadline).sort()[0] || null;
  return { canReturn: el.anyReturnable, message: el.anyReturnable ? '' : el.message, returnBy: next, requests: repo.returns.byOrder(o.id).map((r) => ({ id: r.id, returnNo: r.returnNo, status: r.status, refundAmount: r.refundAmount, items: r.items.map((i) => `${i.name} × ${i.qty}`), adminNote: r.adminNote || '', createdAt: r.createdAt })) };
}

module.exports = { REASONS, eligibility, create, cancel, approve, reject, receive, recordPayout, hasActiveReturns, orderReturnInfo };
