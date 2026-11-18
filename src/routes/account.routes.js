'use strict';
const router = require('express').Router();
const repo = require('../repositories');
const { requireAuth } = require('../middleware/auth');
const { HttpError } = require('../middleware/errors');
const { validateAddress, normPhone, isMobile } = require('../utils/validate');
const { id } = require('../utils/ids');
const returns = require('../services/returns.service');

router.use(requireAuth);

router.get('/profile', (req, res) => res.json(repo.users.publicView(req.user)));
router.put('/profile', (req, res) => {
  const { name, phone } = req.body || {};
  if (!String(name || '').trim()) throw new HttpError(400, 'Name is required', { name: 'Required' });
  if (phone && !isMobile(phone)) throw new HttpError(400, 'Enter a valid 10-digit mobile number', { phone: 'Invalid' });
  res.json(repo.users.publicView(repo.users.update(req.user.id, { name: String(name).trim(), phone: phone ? normPhone(phone) : '' })));
});

function sanitizeAddress(b) {
  const lat = b.lat === '' || b.lat == null ? null : Number(b.lat);
  const lng = b.lng === '' || b.lng == null ? null : Number(b.lng);
  return {
    label: String(b.label || 'Home').slice(0, 20), name: String(b.name || '').trim(), phone: normPhone(b.phone),
    line1: String(b.line1 || '').trim(), line2: String(b.line2 || '').trim(), landmark: String(b.landmark || '').trim(),
    city: String(b.city || '').trim(), state: b.state, pincode: String(b.pincode || '').trim(),
    lat, lng, mapsUrl: lat != null && lng != null ? `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}` : '',
  };
}

router.get('/addresses', (req, res) => res.json(req.user.addresses || []));
router.post('/addresses', (req, res) => {
  const a = sanitizeAddress(req.body || {});
  const errors = validateAddress(a);
  if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the address fields', errors);
  const list = [...(req.user.addresses || [])];
  const addr = { id: id('a_'), ...a, isDefault: !list.length || !!req.body.isDefault };
  if (addr.isDefault) list.forEach((x) => { x.isDefault = false; });
  list.push(addr);
  repo.users.update(req.user.id, { addresses: list });
  res.status(201).json(addr);
});
router.put('/addresses/:id', (req, res) => {
  const list = [...(req.user.addresses || [])];
  const i = list.findIndex((x) => x.id === req.params.id);
  if (i < 0) throw new HttpError(404, 'Address not found');
  const a = sanitizeAddress({ ...list[i], ...req.body });
  const errors = validateAddress(a);
  if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the address fields', errors);
  list[i] = { ...list[i], ...a };
  if (req.body.isDefault) list.forEach((x, j) => { x.isDefault = j === i; });
  repo.users.update(req.user.id, { addresses: list });
  res.json(list[i]);
});
router.post('/addresses/:id/default', (req, res) => {
  const list = (req.user.addresses || []).map((x) => ({ ...x, isDefault: x.id === req.params.id }));
  if (!list.some((x) => x.isDefault)) throw new HttpError(404, 'Address not found');
  repo.users.update(req.user.id, { addresses: list });
  res.json(list);
});
router.delete('/addresses/:id', (req, res) => {
  let list = (req.user.addresses || []).filter((x) => x.id !== req.params.id);
  if (list.length && !list.some((x) => x.isDefault)) list[0].isDefault = true;
  repo.users.update(req.user.id, { addresses: list });
  res.json(list);
});

router.get('/orders', (req, res) => res.json(repo.orders.byUser(req.user.id).map((o) => ({ ...o, returnInfo: returns.orderReturnInfo(o) }))));

// ----- Returns -----
router.get('/orders/:id/return-options', (req, res) => {
  const o = repo.orders.findById(req.params.id);
  if (!o || o.userId !== req.user.id) throw new HttpError(404, 'Order not found');
  res.json({ ...returns.eligibility(o), reasons: returns.REASONS, paymentMethod: o.paymentMethod });
});
router.get('/returns', (req, res) => res.json(repo.returns.byUser(req.user.id)));
router.post('/returns', (req, res) => res.status(201).json(returns.create(req.user, req.body || {})));
router.post('/returns/:id/cancel', (req, res) => {
  const r = repo.returns.findById(req.params.id);
  if (!r) throw new HttpError(404, 'Return not found');
  res.json(returns.cancel(req.user, r));
});
router.get('/orders/:id', (req, res) => {
  const o = repo.orders.findById(req.params.id);
  if (!o || o.userId !== req.user.id) throw new HttpError(404, 'Order not found');
  res.json({ ...o, payments: repo.payments.byOrder(o.id).map(({ events, ...p }) => p) });
});
router.post('/orders/:id/cancel', (req, res) => {
  const o = repo.orders.findById(req.params.id);
  if (!o || o.userId !== req.user.id) throw new HttpError(404, 'Order not found');
  if (!['Placed', 'Confirmed', 'Pending Payment'].includes(o.status)) throw new HttpError(400, 'This order can no longer be cancelled online. Please contact support.');
  const orders = require('../services/order.service');
  res.json(orders.changeStatus(o, 'Cancelled', 'Cancelled by customer', 'customer'));
});

module.exports = router;
