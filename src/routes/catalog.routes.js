'use strict';
const router = require('express').Router();
const repo = require('../repositories');
const pricing = require('../services/pricing.service');
const reviews = require('../services/reviews');
const { wrap, HttpError } = require('../middleware/errors');

function categoryTree() {
  const all = repo.categories.all().filter((c) => c.active !== false);
  const products = repo.products.active();
  return all.filter((c) => !c.parentId).map((c) => ({
    ...c,
    count: products.filter((p) => p.category === c.slug).length,
    children: all.filter((s) => s.parentId === c.id).map((s) => ({ ...s, count: products.filter((p) => p.subcategory === s.slug).length })),
  }));
}

function filterProducts(q) {
  const promos = pricing.activePromotions();
  let list = repo.products.active().map((p) => pricing.view(p, promos));
  const facetsBase = list;
  if (q.q) {
    const terms = String(q.q).toLowerCase().split(/\s+/).filter(Boolean);
    list = list.filter((p) => { const hay = `${p.name} ${p.brand} ${p.category} ${p.subcategory} ${(p.tags || []).join(' ')} ${p.sku}`.toLowerCase(); return terms.every((t) => hay.includes(t)); });
  }
  if (q.category) list = list.filter((p) => p.category === q.category);
  if (q.subcategory) { const subs = String(q.subcategory).split(','); list = list.filter((p) => subs.includes(p.subcategory)); }
  if (q.brand) { const b = String(q.brand).split(','); list = list.filter((p) => b.includes(p.brand)); }
  if (q.minPrice) list = list.filter((p) => p.price >= Number(q.minPrice));
  if (q.maxPrice) list = list.filter((p) => p.price <= Number(q.maxPrice));
  if (q.rating) list = list.filter((p) => p.rating >= Number(q.rating));
  if (q.inStock === '1' || q.inStock === 'true') list = list.filter((p) => p.inStock);
  if (q.offers === '1' || q.offers === 'true') list = list.filter((p) => p.pricing.isOffer);
  if (q.tag) list = list.filter((p) => (p.tags || []).includes(q.tag));
  if (q.ids) { const ids = String(q.ids).split(','); list = list.filter((p) => ids.includes(p.id)); }
  const sorters = {
    relevance: (a, b) => (b.featured - a.featured) || (b.ratingCount - a.ratingCount),
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    rating: (a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount,
    discount: (a, b) => b.pricing.discountPct - a.pricing.discountPct,
    popular: (a, b) => b.ratingCount - a.ratingCount,
  };
  list.sort(sorters[q.sort] || sorters.relevance);
  const limit = Math.min(48, Math.max(1, Number(q.limit) || 12));
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(pages, Math.max(1, Number(q.page) || 1));
  const prices = facetsBase.map((p) => p.price);
  return {
    items: list.slice((page - 1) * limit, page * limit), total, page, pages, limit,
    facets: { brands: [...new Set(facetsBase.map((p) => p.brand))].sort(), minPrice: Math.min(...prices), maxPrice: Math.max(...prices) },
  };
}

router.get('/categories', (req, res) => res.json(categoryTree()));
router.get('/products', (req, res) => res.json(filterProducts(req.query)));

router.get('/search/suggest', (req, res) => {
  const r = filterProducts({ q: req.query.q || '', limit: 6 });
  res.json(r.items.map((p) => ({ name: p.name, slug: p.slug, image: p.images[0], price: p.price, category: p.category })));
});

router.get('/products/:slug', (req, res) => {
  const p = repo.products.findBySlug(req.params.slug) || repo.products.findById(req.params.slug);
  if (!p || p.active === false) throw new HttpError(404, 'Product not found');
  const view = pricing.view(p);
  const cat = repo.categories.findBySlug(p.category);
  const sub = repo.categories.findBySlug(p.subcategory);
  const promos = pricing.activePromotions();
  const related = repo.products.active().filter((x) => x.id !== p.id && (x.subcategory === p.subcategory || x.category === p.category))
    .sort((a, b) => (b.subcategory === p.subcategory) - (a.subcategory === p.subcategory)).slice(0, 8).map((x) => pricing.view(x, promos));
  res.json({ ...view, categoryName: cat?.name, subcategoryName: sub?.name, related });
});

// ----- Reviews (MOCK service — not connected to storage, see src/services/reviews) -----
router.get('/products/:slug/reviews', wrap(async (req, res) => {
  const p = repo.products.findBySlug(req.params.slug);
  if (!p) throw new HttpError(404, 'Product not found');
  res.json(await reviews().listByProduct(p.id));
}));
router.post('/products/:slug/reviews', wrap(async (req, res) => {
  const p = repo.products.findBySlug(req.params.slug);
  if (!p) throw new HttpError(404, 'Product not found');
  const rating = Number(req.body.rating);
  if (!(rating >= 1 && rating <= 5)) throw new HttpError(400, 'Choose a rating from 1 to 5 stars');
  if (!String(req.body.body || '').trim()) throw new HttpError(400, 'Please write a short review');
  const r = await reviews().create({ productId: p.id, productName: p.name, productSlug: p.slug, userId: req.user?.id || null, name: req.user?.name || String(req.body.name || 'Guest').slice(0, 40), rating, title: String(req.body.title || '').slice(0, 80), body: String(req.body.body).slice(0, 1000) });
  res.status(201).json({ review: r, message: 'Thanks! Your review is pending moderation. (Demo: reviews use mock data and are not saved permanently.)' });
}));

module.exports = router;
module.exports.filterProducts = filterProducts;
module.exports.categoryTree = categoryTree;
