'use strict';
const router = require('express').Router();
const repo = require('../../repositories');
const getProvider = require('../../services/payments');
const email = require('../../services/email.service');
const { wrap, HttpError } = require('../../middleware/errors');

router.get('/payments', (req, res) => {
  let list = repo.payments.all();
  const { status, method, q, from, to } = req.query;
  if (status) list = list.filter((p) => p.status === status);
  if (method) list = list.filter((p) => p.method === method);
  if (from) list = list.filter((p) => p.createdAt.slice(0, 10) >= from);
  if (to) list = list.filter((p) => p.createdAt.slice(0, 10) <= to);
  if (q) { const s = q.toLowerCase(); list = list.filter((p) => `${p.id} ${p.orderNo} ${p.gatewayOrderId} ${p.vpa || ''}`.toLowerCase().includes(s)); }
  res.json(list.map(({ sim, ...p }) => p));
});

router.get('/payments/reconciliation', (req, res) => {
  const pays = repo.payments.all();
  const orders = repo.orders.all();
  const sum = (arr) => arr.reduce((a, p) => a + p.amount, 0);
  const captured = pays.filter((p) => p.status === 'captured');
  const refunded = pays.filter((p) => p.status === 'refunded');
  const failed = pays.filter((p) => p.status === 'failed');
  const online = orders.filter((o) => o.paymentMethod === 'ONLINE');
  const mismatches = [];
  online.forEach((o) => {
    const ps = pays.filter((p) => p.orderId === o.id);
    const cap = ps.find((p) => p.status === 'captured' || p.status === 'refunded');
    if (o.paymentStatus === 'paid' && !cap) mismatches.push({ orderNo: o.orderNo, issue: 'Order marked paid but no captured payment' });
    if (cap && cap.amount !== o.totals.total) mismatches.push({ orderNo: o.orderNo, issue: `Amount mismatch: order ₹${o.totals.total} vs payment ₹${cap.amount}` });
    if (o.status === 'Pending Payment' && Date.now() - Date.parse(o.createdAt) > 30 * 60e3) mismatches.push({ orderNo: o.orderNo, issue: 'Awaiting payment for more than 30 minutes' });
  });
  const cod = orders.filter((o) => o.paymentMethod === 'COD');
  res.json({
    captured: { count: captured.length, amount: sum(captured) },
    refunded: { count: refunded.length, amount: refunded.reduce((a, p) => a + (p.refunds || []).reduce((x, r) => x + r.amount, 0), 0) },
    failed: { count: failed.length, amount: sum(failed) },
    net: sum(captured),
    codCollected: { count: cod.filter((o) => o.paymentStatus === 'paid').length, amount: cod.filter((o) => o.paymentStatus === 'paid').reduce((a, o) => a + o.totals.total, 0) },
    codPending: { count: cod.filter((o) => o.paymentStatus === 'pending').length, amount: cod.filter((o) => o.paymentStatus === 'pending').reduce((a, o) => a + o.totals.total, 0) },
    mismatches,
  });
});

router.get('/payments/:id', (req, res) => {
  const p = repo.payments.findById(req.params.id);
  if (!p) throw new HttpError(404, 'Payment not found');
  const o = repo.orders.findById(p.orderId);
  res.json({ ...p, sim: undefined, order: o ? { id: o.id, orderNo: o.orderNo, customer: o.customer, status: o.status, total: o.totals.total } : null });
});

router.post('/payments/:id/refund', wrap(async (req, res) => {
  const p = repo.payments.findById(req.params.id);
  if (!p) throw new HttpError(404, 'Payment not found');
  if (p.status !== 'captured') throw new HttpError(400, 'Only captured payments can be refunded');
  const already = (p.refunds || []).reduce((a, r) => a + r.amount, 0);
  const amount = req.body.amount ? Number(req.body.amount) : p.amount - already;
  if (!(amount > 0) || amount > p.amount - already) throw new HttpError(400, `Refund amount must be between ₹1 and ₹${p.amount - already}`);
  const r = await getProvider().refund(p.id, { amount, notes: { reason: req.body.reason || 'Admin refund' } });
  const refund = { id: r.id, amount, at: new Date().toISOString(), reason: req.body.reason || 'Admin refund', by: req.user.name };
  const full = already + amount >= p.amount;
  const up = repo.payments.update(p.id, { status: full ? 'refunded' : 'captured', refunds: [...(p.refunds || []), refund], events: [...(p.events || []), { status: full ? 'refunded' : 'partially_refunded', at: refund.at, amount }] });
  const o = repo.orders.findById(p.orderId);
  if (o) {
    const order = repo.orders.update(o.id, { paymentStatus: full ? 'refunded' : 'partially-refunded' });
    email.queue('refund', order.customer.email, { order, refund });
  }
  res.json(up);
}));

module.exports = router;
