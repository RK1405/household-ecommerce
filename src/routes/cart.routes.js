'use strict';
/**
 * Cart: guests keep the cart in localStorage and call POST /api/cart/quote for pricing.
 * Logged-in users have a server cart (GET/PUT /api/cart). On login the client calls
 * POST /api/cart/merge to merge the guest cart into the server cart.
 */
const router = require('express').Router();
const repo = require('../repositories');
const pricing = require('../services/pricing.service');
const { requireAuth } = require('../middleware/auth');

const clean = (items) => (Array.isArray(items) ? items : [])
  .filter((i) => i && i.productId && repo.products.findById(i.productId))
  .map((i) => ({ productId: String(i.productId), qty: Math.max(1, Math.min(10, Number(i.qty) || 1)) }));

router.post('/quote', (req, res) => {
  const { items, couponCode, deliveryMethod, paymentMethod } = req.body || {};
  res.json(pricing.quote(clean(items), { couponCode, user: req.user, deliveryMethod, paymentMethod }));
});

router.get('/', requireAuth, (req, res) => {
  const cart = repo.carts.getByUser(req.user.id);
  res.json({ items: cart.items, couponCode: cart.couponCode, quote: pricing.quote(cart.items, { couponCode: cart.couponCode, user: req.user }) });
});

router.put('/', requireAuth, (req, res) => {
  const items = clean(req.body.items);
  const couponCode = req.body.couponCode ? String(req.body.couponCode).toUpperCase() : null;
  repo.carts.save(req.user.id, items, couponCode);
  res.json({ items, couponCode, quote: pricing.quote(items, { couponCode, user: req.user }) });
});

router.post('/merge', requireAuth, (req, res) => {
  const cart = repo.carts.getByUser(req.user.id);
  const merged = [...cart.items];
  for (const g of clean(req.body.items)) {
    const ex = merged.find((m) => m.productId === g.productId);
    if (ex) ex.qty = Math.min(10, ex.qty + g.qty);
    else merged.push(g);
  }
  const couponCode = req.body.couponCode || cart.couponCode || null;
  repo.carts.save(req.user.id, merged, couponCode);
  res.json({ items: merged, couponCode, quote: pricing.quote(merged, { couponCode, user: req.user }) });
});

module.exports = router;
