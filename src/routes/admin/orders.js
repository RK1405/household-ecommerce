'use strict';
const router = require('express').Router();
const repo = require('../../repositories');
const orders = require('../../services/order.service');
const { HttpError } = require('../../middleware/errors');
const { toCsv } = require('../../utils/csv');

function filter(q) {
  let list = repo.orders.all();
  if (q.status) list = list.filter((o) => o.status === q.status);
  if (q.payment) list = list.filter((o) => o.paymentMethod === q.payment);
  if (q.paymentStatus) list = list.filter((o) => o.paymentStatus === q.paymentStatus);
  if (q.from) list = list.filter((o) => o.createdAt.slice(0, 10) >= q.from);
  if (q.to) list = list.filter((o) => o.createdAt.slice(0, 10) <= q.to);
  if (q.q) { const s = q.q.toLowerCase(); list = list.filter((o) => `${o.orderNo} ${o.customer.name} ${o.customer.email} ${o.customer.phone} ${o.shippingAddress?.city}`.toLowerCase().includes(s)); }
  return list;
}

router.get('/orders', (req, res) => {
  const list = filter(req.query);
  const page = Math.max(1, Number(req.query.page) || 1), limit = 20;
  res.json({ items: list.slice((page - 1) * limit, page * limit), total: list.length, page, pages: Math.max(1, Math.ceil(list.length / limit)), statuses: orders.ALL_STATUSES });
});

router.get('/orders/export.csv', (req, res) => {
  const rows = filter(req.query).map((o) => ({ orderNo: o.orderNo, date: o.createdAt.slice(0, 10), customer: o.customer.name, email: o.customer.email, city: o.shippingAddress?.city, state: o.shippingAddress?.state, items: o.items.reduce((a, i) => a + i.qty, 0), subtotal: o.totals.subtotal, discount: o.totals.discount, delivery: o.totals.delivery, gst: o.totals.gst, total: o.totals.total, payment: o.paymentMethod, paymentStatus: o.paymentStatus, status: o.status }));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
  res.send('﻿' + toCsv(rows, Object.keys(rows[0] || { orderNo: '' })));
});

router.get('/orders/:id', (req, res) => {
  const o = repo.orders.findById(req.params.id);
  if (!o) throw new HttpError(404, 'Order not found');
  res.json({ ...o, payments: repo.payments.byOrder(o.id), allowedNext: orders.allowedNext(o.status), emails: repo.emails.all().filter((e) => e.orderNo === o.orderNo) });
});

router.post('/orders/:id/status', (req, res) => {
  const o = repo.orders.findById(req.params.id);
  if (!o) throw new HttpError(404, 'Order not found');
  const updated = orders.changeStatus(o, req.body.status, String(req.body.note || '').slice(0, 300), req.user.name);
  res.json({ ...updated, allowedNext: orders.allowedNext(updated.status) });
});

router.post('/orders/:id/notes', (req, res) => {
  const o = repo.orders.findById(req.params.id);
  if (!o) throw new HttpError(404, 'Order not found');
  const text = String(req.body.text || '').trim();
  if (!text) throw new HttpError(400, 'Note is empty');
  res.json(repo.orders.update(o.id, { notes: [...(o.notes || []), { text: text.slice(0, 500), by: req.user.name, at: new Date().toISOString(), internal: req.body.internal !== false }] }));
});

module.exports = router;
