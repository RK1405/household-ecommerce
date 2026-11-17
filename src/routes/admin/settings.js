'use strict';
const router = require('express').Router();
const repo = require('../../repositories');
const config = require('../../config');
const { HttpError } = require('../../middleware/errors');

router.get('/settings', (req, res) => {
  const { email, ...rest } = repo.settings.get();
  res.json({ ...rest, env: { demoMode: config.demoMode, paymentProvider: config.payments.provider, dataProvider: config.dataProvider, googleMapsKeySet: !!config.googleMapsApiKey, baseUrl: config.baseUrl } });
});

router.put('/settings', (req, res) => {
  const b = req.body || {};
  const cur = repo.settings.get();
  const n = (v, d) => (v === '' || v === null || v === undefined ? d : Number(v));
  const delivery = {
    standard: { ...cur.delivery.standard, ...(b.delivery?.standard || {}) },
    express: { ...cur.delivery.express, ...(b.delivery?.express || {}) },
  };
  for (const k of ['standard', 'express']) {
    delivery[k].charge = n(delivery[k].charge, 0);
    delivery[k].freeAbove = delivery[k].freeAbove === '' || delivery[k].freeAbove === null ? null : n(delivery[k].freeAbove, null);
    if (delivery[k].charge < 0) throw new HttpError(400, 'Delivery charge cannot be negative');
  }
  const cod = { ...cur.cod, ...(b.cod || {}) };
  cod.enabled = !!cod.enabled; cod.maxOrderValue = n(cod.maxOrderValue, 10000); cod.minOrderValue = n(cod.minOrderValue, 0);
  if (cod.maxOrderValue <= 0) throw new HttpError(400, 'COD limit must be greater than 0');
  const tax = { ...cur.tax, ...(b.tax || {}) };
  if (tax.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(tax.gstin)) throw new HttpError(400, 'GSTIN format looks invalid (15 characters, e.g. 33AABCH1234Z1Z5)');
  repo.settings.patch({ delivery, cod, tax, lowStockThreshold: n(b.lowStockThreshold, cur.lowStockThreshold) });
  res.json({ ok: true });
});

module.exports = router;
