'use strict';
const router = require('express').Router();
const repo = require('../repositories');
const orders = require('../services/order.service');
const { requireAuth } = require('../middleware/auth');
const { wrap, HttpError } = require('../middleware/errors');

router.post('/', requireAuth, wrap(async (req, res) => {
  const order = await orders.placeOrder(req.user, req.body || {});
  res.status(201).json({ order, next: order.paymentMethod === 'ONLINE' ? `/payment.html?order=${order.id}` : `/order-confirmation.html?order=${order.id}` });
}));

/** Public, minimal order tracking used by the chatbot (no personal data returned). */
router.get('/track/:orderNo', (req, res) => {
  const o = repo.orders.findByNumber(req.params.orderNo.trim());
  if (!o) throw new HttpError(404, `No order found with ID ${req.params.orderNo}. Order IDs look like HH100012.`);
  const s = repo.settings.get().delivery[o.deliveryMethod] || {};
  res.json({ orderNo: o.orderNo, status: o.status, paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus, items: o.items.reduce((a, i) => a + i.qty, 0), placedAt: o.createdAt, deliveryMethod: o.deliveryMethod, eta: s.eta, lastUpdate: o.statusHistory[o.statusHistory.length - 1], tracking: o.tracking || null });
});

/** Order summary for confirmation / invoice pages (owner or admin). */
router.get('/:id', requireAuth, (req, res) => {
  const o = repo.orders.findById(req.params.id);
  if (!o || (o.userId !== req.user.id && req.user.role !== 'admin')) throw new HttpError(404, 'Order not found');
  res.json({ ...o, payments: repo.payments.byOrder(o.id).map(({ events, ...p }) => p), store: repo.cms.get().store, tax: repo.settings.get().tax });
});

module.exports = router;
