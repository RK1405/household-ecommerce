'use strict';
const router = require('express').Router();
const repo = require('../../repositories');
const pricing = require('../../services/pricing.service');
const { HttpError } = require('../../middleware/errors');
const { id } = require('../../utils/ids');

const toIso = (v) => (v ? new Date(v).toISOString() : null);

// ----- Coupons -----
function couponFrom(b, ex = {}) {
  const c = {
    code: String(b.code ?? ex.code ?? '').trim().toUpperCase().replace(/\s+/g, ''),
    description: String(b.description ?? ex.description ?? ''),
    type: (b.type ?? ex.type) === 'flat' ? 'flat' : 'percent',
    value: Number(b.value ?? ex.value), minOrder: Number(b.minOrder ?? ex.minOrder ?? 0),
    maxDiscount: b.maxDiscount === '' || b.maxDiscount === null ? null : Number(b.maxDiscount ?? ex.maxDiscount ?? 0) || null,
    startAt: toIso(b.startAt ?? ex.startAt), endAt: toIso(b.endAt ?? ex.endAt),
    usageLimit: Number(b.usageLimit ?? ex.usageLimit ?? 0) || null, perUserLimit: Number(b.perUserLimit ?? ex.perUserLimit ?? 0) || null,
    categories: Array.isArray(b.categories) ? b.categories : ex.categories || [],
    active: b.active !== undefined ? !!b.active : ex.active !== false,
    highlight: b.highlight !== undefined ? !!b.highlight : !!ex.highlight,
    usedCount: ex.usedCount || 0,
  };
  const errors = {};
  if (!/^[A-Z0-9]{3,20}$/.test(c.code)) errors.code = '3–20 letters/numbers';
  if (!(c.value > 0)) errors.value = 'Must be > 0';
  if (c.type === 'percent' && c.value > 90) errors.value = 'Percentage must be ≤ 90';
  if (c.startAt && c.endAt && c.endAt < c.startAt) errors.endAt = 'End must be after start';
  return { c, errors };
}
router.get('/coupons', (req, res) => res.json(repo.coupons.all().map((c) => ({ ...c, live: c.active && pricing.inWindow(c.startAt, c.endAt) }))));
router.post('/coupons', (req, res) => {
  const { c, errors } = couponFrom(req.body || {});
  if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields', errors);
  if (repo.coupons.findByCode(c.code)) throw new HttpError(409, 'Coupon code already exists', { code: 'Duplicate' });
  if (c.highlight) repo.coupons.all().forEach((x) => x.highlight && repo.coupons.update(x.id, { highlight: false }));
  res.status(201).json(repo.coupons.create({ id: id('c_'), ...c, createdAt: new Date().toISOString() }));
});
router.put('/coupons/:id', (req, res) => {
  const ex = repo.coupons.findById(req.params.id);
  if (!ex) throw new HttpError(404, 'Coupon not found');
  const { c, errors } = couponFrom(req.body || {}, ex);
  if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields', errors);
  const dup = repo.coupons.findByCode(c.code);
  if (dup && dup.id !== ex.id) throw new HttpError(409, 'Coupon code already exists', { code: 'Duplicate' });
  if (c.highlight) repo.coupons.all().forEach((x) => x.id !== ex.id && x.highlight && repo.coupons.update(x.id, { highlight: false }));
  res.json(repo.coupons.update(ex.id, c));
});
router.delete('/coupons/:id', (req, res) => { if (!repo.coupons.remove(req.params.id)) throw new HttpError(404, 'Coupon not found'); res.json({ ok: true }); });

// ----- Promotions / discounts -----
function promoFrom(b, ex = {}) {
  const p = {
    name: String(b.name ?? ex.name ?? '').trim(), scope: (b.scope ?? ex.scope) === 'product' ? 'product' : 'category',
    category: (b.scope ?? ex.scope) === 'product' ? null : b.category ?? ex.category ?? null,
    productIds: (b.scope ?? ex.scope) === 'product' ? (Array.isArray(b.productIds) ? b.productIds : ex.productIds || []) : [],
    discountType: (b.discountType ?? ex.discountType) === 'flat' ? 'flat' : 'percent', value: Number(b.value ?? ex.value),
    badge: String(b.badge ?? ex.badge ?? '').slice(0, 30), startAt: toIso(b.startAt ?? ex.startAt), endAt: toIso(b.endAt ?? ex.endAt),
    dealOfDay: b.dealOfDay !== undefined ? !!b.dealOfDay : !!ex.dealOfDay, active: b.active !== undefined ? !!b.active : ex.active !== false,
  };
  const errors = {};
  if (!p.name) errors.name = 'Required';
  if (!(p.value > 0)) errors.value = 'Must be > 0';
  if (p.discountType === 'percent' && p.value > 90) errors.value = 'Percentage must be ≤ 90';
  if (p.scope === 'category' && !repo.categories.findBySlug(p.category)) errors.category = 'Choose a category';
  if (p.scope === 'product' && !p.productIds.length) errors.productIds = 'Choose at least one product';
  if (!p.startAt || !p.endAt) errors.endAt = 'Start and end dates are required';
  else if (p.endAt < p.startAt) errors.endAt = 'End must be after start';
  return { p, errors };
}
const promoState = (p) => (!p.active ? 'paused' : Date.parse(p.startAt) > Date.now() ? 'scheduled' : Date.parse(p.endAt) < Date.now() ? 'ended' : 'live');
router.get('/promotions', (req, res) => res.json(repo.promotions.all().map((p) => ({ ...p, state: promoState(p), products: p.productIds.map((pid) => repo.products.findById(pid)?.name).filter(Boolean) }))));
router.post('/promotions', (req, res) => {
  const { p, errors } = promoFrom(req.body || {});
  if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields', errors);
  res.status(201).json(repo.promotions.create({ id: id('pr_'), ...p, createdAt: new Date().toISOString() }));
});
router.put('/promotions/:id', (req, res) => {
  const ex = repo.promotions.findById(req.params.id);
  if (!ex) throw new HttpError(404, 'Promotion not found');
  const { p, errors } = promoFrom(req.body || {}, ex);
  if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields', errors);
  res.json(repo.promotions.update(ex.id, p));
});
router.delete('/promotions/:id', (req, res) => { if (!repo.promotions.remove(req.params.id)) throw new HttpError(404, 'Promotion not found'); res.json({ ok: true }); });

module.exports = router;
