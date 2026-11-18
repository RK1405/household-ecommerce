'use strict';
const router = require('express').Router();
const repo = require('../../repositories');
const returns = require('../../services/returns.service');
const { wrap, HttpError } = require('../../middleware/errors');

const STATUSES = ['Requested', 'Approved', 'Received', 'Refunded', 'Rejected', 'Cancelled'];
const find = (req) => { const r = repo.returns.findById(req.params.id); if (!r) throw new HttpError(404, 'Return not found'); return r; };

router.get('/returns', (req, res) => {
  const { status, q } = req.query;
  let list = repo.returns.all();
  if (status) list = list.filter((r) => r.status === status);
  if (q) { const s = String(q).toLowerCase(); list = list.filter((r) => `${r.returnNo} ${r.orderNo} ${r.customer.name} ${r.customer.email}`.toLowerCase().includes(s)); }
  const counts = {}; repo.returns.all().forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
  res.json({ items: list, counts, statuses: STATUSES });
});
router.get('/returns/:id', (req, res) => {
  const r = find(req);
  const o = repo.orders.findById(r.orderId);
  res.json({ ...r, order: o ? { id: o.id, orderNo: o.orderNo, status: o.status, paymentStatus: o.paymentStatus, paymentMethod: o.paymentMethod, total: o.totals.total } : null });
});
router.post('/returns/:id/approve', (req, res) => res.json(returns.approve(find(req), req.user.name, String(req.body?.note || '').slice(0, 300))));
router.post('/returns/:id/reject', (req, res) => res.json(returns.reject(find(req), req.user.name, String(req.body?.note || '').slice(0, 300))));
router.post('/returns/:id/receive', wrap(async (req, res) => res.json(await returns.receive(find(req), req.user.name, { note: String(req.body?.note || '').slice(0, 300), restock: req.body?.restock !== false && req.body?.restock !== 'false' }))));
router.post('/returns/:id/payout', (req, res) => res.json(returns.recordPayout(find(req), req.user.name, req.body || {})));

module.exports = router;
