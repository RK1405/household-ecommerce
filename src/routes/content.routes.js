'use strict';
const router = require('express').Router();
const repo = require('../repositories');
const config = require('../config');
const pricing = require('../services/pricing.service');
const { categoryTree } = require('./catalog.routes');
const { HttpError } = require('../middleware/errors');
const { INDIAN_STATES } = require('../utils/validate');

const activeBanner = (b) => b.active && pricing.inWindow(b.startAt, b.endAt);

router.get('/config/public', (req, res) => {
  const cms = repo.cms.get();
  const s = repo.settings.get();
  res.json({
    store: cms.store, demoMode: config.demoMode, googleMapsApiKey: config.googleMapsApiKey,
    delivery: s.delivery, cod: s.cod, paymentProvider: config.payments.provider, states: INDIAN_STATES,
    demoAccounts: config.showDemoLogins ? [{ role: 'Customer', email: 'user@demo.com', password: 'User@123' }, { role: 'Admin', email: 'admin@demo.com', password: 'Admin@123' }] : [],
  });
});

router.get('/cms', (req, res) => {
  const cms = repo.cms.get();
  res.json({
    store: cms.store, announcement: cms.announcement, footer: cms.footer, contact: cms.contact,
    banners: cms.banners.filter(activeBanner).sort((a, b) => a.order - b.order),
    pages: cms.pages.filter((p) => p.active).map(({ slug, title }) => ({ slug, title })),
  });
});

router.get('/cms/pages/:slug', (req, res) => {
  const page = repo.cms.get().pages.find((p) => p.slug === req.params.slug && p.active);
  if (!page) throw new HttpError(404, 'Page not found');
  res.json(page);
});

/** Everything the home page needs in one call: slider + bento blocks resolved with product data. */
router.get('/home', (req, res) => {
  const cms = repo.cms.get();
  const promos = pricing.activePromotions();
  const products = repo.products.active().map((p) => pricing.view(p, promos));
  const now = Date.now();
  const blocks = cms.bento.blocks.filter((b) => b.active).sort((a, b) => a.order - b.order).map((b) => {
    const limit = b.limit || 4;
    switch (b.type) {
      case 'latest': return { ...b, items: products.slice().sort((x, y) => y.createdAt.localeCompare(x.createdAt)).slice(0, limit) };
      case 'offers': {
        const deal = products.find((p) => p.pricing.promotion?.dealOfDay);
        const items = products.filter((p) => p.pricing.isOffer && p !== deal).sort((x, y) => y.pricing.discountPct - x.pricing.discountPct).slice(0, limit);
        return { ...b, deal, items };
      }
      case 'bestsellers': return { ...b, items: products.filter((p) => (p.tags || []).includes('best-seller')).sort((x, y) => y.ratingCount - x.ratingCount).slice(0, limit) };
      case 'categories': return { ...b, items: categoryTree().slice(0, limit) };
      case 'coupon': {
        const c = repo.coupons.all().find((x) => x.active && x.highlight && pricing.inWindow(x.startAt, x.endAt, now)) || repo.coupons.all().find((x) => x.active && pricing.inWindow(x.startAt, x.endAt, now));
        return { ...b, coupon: c ? { code: c.code, description: c.description, endAt: c.endAt, minOrder: c.minOrder, type: c.type, value: c.value } : null };
      }
      default: return b;
    }
  });
  res.json({ banners: cms.banners.filter(activeBanner).sort((a, b) => a.order - b.order), blocks });
});

module.exports = router;
