'use strict';
const repo = require('../repositories');
const pricing = require('./pricing.service');
const email = require('./email.service');
const getProvider = require('./payments');
const { HttpError } = require('../middleware/errors');
const { id } = require('../utils/ids');

const FLOW = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for delivery', 'Delivered'];
const ALL_STATUSES = ['Pending Payment', ...FLOW, 'Cancelled', 'Returned'];

function allowedNext(status) {
  if (status === 'Pending Payment') return ['Placed', 'Cancelled'];
  if (status === 'Delivered') return ['Returned'];
  if (['Cancelled', 'Returned'].includes(status)) return [];
  const i = FLOW.indexOf(status);
  return [...FLOW.slice(i + 1), 'Cancelled'];
}

async function placeOrder(user, body) {
  const cart = repo.carts.getByUser(user.id);
  if (!cart.items.length) throw new HttpError(400, 'Your cart is empty.');
  const paymentMethod = body.paymentMethod === 'COD' ? 'COD' : 'ONLINE';
  const q = pricing.quote(cart.items, { couponCode: 'couponCode' in body ? body.couponCode : cart.couponCode, user, deliveryMethod: body.deliveryMethod });
  if (q.issues.length) throw new HttpError(409, q.issues.map((i) => i.message).join(' '));
  if (q.coupon && !q.coupon.valid) throw new HttpError(400, q.coupon.message);
  if (paymentMethod === 'COD' && !q.codAvailable) throw new HttpError(400, q.codMessage || 'Cash on Delivery is not available for this order.');
  const addr = (user.addresses || []).find((a) => a.id === body.addressId);
  if (!addr) throw new HttpError(400, 'Please select a delivery address.');
  const billing = body.billingAddressId ? (user.addresses || []).find((a) => a.id === body.billingAddressId) || addr : addr;

  const now = new Date().toISOString();
  const order = {
    id: id('o_'), orderNo: repo.orders.nextOrderNo(), userId: user.id,
    customer: { name: user.name, email: user.email, phone: user.phone || addr.phone },
    items: q.lines.map(({ badges, stock, lineMrp, ...l }) => l),
    shippingAddress: addr, billingAddress: billing, gstin: String(body.gstin || '').toUpperCase().slice(0, 15) || null,
    deliveryMethod: q.deliveryMethod, paymentMethod,
    paymentStatus: paymentMethod === 'COD' ? 'pending' : 'awaiting',
    status: paymentMethod === 'COD' ? 'Placed' : 'Pending Payment',
    statusHistory: [{ status: paymentMethod === 'COD' ? 'Placed' : 'Pending Payment', at: now, note: paymentMethod === 'COD' ? 'Cash on Delivery' : 'Awaiting online payment' }],
    notes: body.note ? [{ text: String(body.note).slice(0, 300), by: 'customer', at: now }] : [],
    totals: { mrpTotal: q.mrpTotal, subtotal: q.subtotal, discount: q.discount, couponCode: q.coupon?.valid ? q.coupon.code : null, gst: q.gst, delivery: q.delivery, total: q.total },
    createdAt: now, updatedAt: now,
  };
  if (paymentMethod === 'ONLINE') {
    const gw = await getProvider().createOrder({ amount: order.totals.total, currency: 'INR', receipt: order.orderNo, notes: { orderId: order.id } });
    order.gateway = { provider: getProvider().name, orderId: gw.id };
  }
  repo.orders.create(order);
  // reserve stock + count coupon usage
  order.items.forEach((i) => repo.products.adjustStock(i.productId, -i.qty));
  if (order.totals.couponCode) {
    const c = repo.coupons.findByCode(order.totals.couponCode);
    if (c) repo.coupons.update(c.id, { usedCount: (c.usedCount || 0) + 1 });
  }
  repo.carts.clear(user.id);
  if (paymentMethod === 'COD') email.queue('order_placed', order.customer.email, { order });
  return order;
}

function restock(order) { order.items.forEach((i) => repo.products.adjustStock(i.productId, i.qty)); }

async function refundOrder(order, reason) {
  const pay = repo.payments.byOrder(order.id).find((p) => p.status === 'captured');
  if (!pay) return null;
  const r = await getProvider().refund(pay.id, { amount: pay.amount, notes: { reason } });
  const refund = { id: r.id, amount: pay.amount, at: new Date().toISOString(), reason };
  repo.payments.update(pay.id, { status: 'refunded', refunds: [...(pay.refunds || []), refund], events: [...(pay.events || []), { status: 'refunded', at: refund.at }] });
  return refund;
}

function changeStatus(order, status, note = '', by = 'admin') {
  if (!ALL_STATUSES.includes(status)) throw new HttpError(400, 'Unknown status');
  if (!allowedNext(order.status).includes(status)) throw new HttpError(400, `Cannot move an order from "${order.status}" to "${status}".`);
  const at = new Date().toISOString();
  const patch = { status, statusHistory: [...order.statusHistory, { status, at, note, by }] };
  if (status === 'Delivered' && order.paymentMethod === 'COD') patch.paymentStatus = 'paid';
  if (status === 'Shipped' && !order.tracking) patch.tracking = { courier: 'Demo Express Logistics', awb: `DX${Date.now().toString().slice(-9)}` };
  if (status === 'Cancelled' || status === 'Returned') {
    restock(order);
    if (order.paymentMethod === 'COD') patch.paymentStatus = status === 'Returned' ? 'refund-due' : 'cancelled';
  }
  const updated = repo.orders.update(order.id, patch);
  const tpl = email.STATUS_EMAIL[status];
  const isPaidOnline = order.paymentMethod === 'ONLINE' && order.paymentStatus === 'paid';
  if ((status === 'Cancelled' || status === 'Returned') && isPaidOnline) {
    refundOrder(updated, status).then((refund) => {
      const o = repo.orders.update(order.id, { paymentStatus: 'refunded' });
      if (status === 'Cancelled') email.queue('cancelled', o.customer.email, { order: o });
      email.queue('refund', o.customer.email, { order: o, refund });
    }).catch((e) => console.error('[refund]', e.message));
  } else if (tpl) {
    email.queue(tpl, updated.customer.email, { order: updated });
  }
  return updated;
}

module.exports = { placeOrder, changeStatus, allowedNext, refundOrder, FLOW, ALL_STATUSES };
