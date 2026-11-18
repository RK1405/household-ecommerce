'use strict';
const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const repo = require('../../repositories');
const config = require('../../config');
const pricing = require('../../services/pricing.service');
const returnPolicy = require('../../utils/returnPolicy');
const { HttpError } = require('../../middleware/errors');
const { id, slugify } = require('../../utils/ids');
const { toCsv, parseCsv } = require('../../utils/csv');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(/^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(file.mimetype) ? null : new HttpError(400, 'Only image files are allowed'), true),
});
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

const TAGS = ['new-arrival', 'on-offer', 'best-seller'];

function normalise(b, existing = {}) {
  const num = (v, d = 0) => (v === '' || v === undefined || v === null ? d : Number(v));
  const list = (v) => (Array.isArray(v) ? v : String(v || '').split(/\||\n/)).map((s) => String(s).trim()).filter(Boolean);
  const p = {
    name: String(b.name ?? existing.name ?? '').trim(),
    slug: slugify(b.slug || b.name || existing.slug || ''),
    sku: String(b.sku ?? existing.sku ?? '').trim().toUpperCase(),
    brand: String(b.brand ?? existing.brand ?? '').trim(),
    category: b.category ?? existing.category, subcategory: b.subcategory ?? existing.subcategory,
    description: String(b.description ?? existing.description ?? ''),
    highlights: b.highlights !== undefined ? list(b.highlights) : existing.highlights || [],
    mrp: num(b.mrp, existing.mrp), price: num(b.price, existing.price),
    salePrice: b.salePrice === '' || b.salePrice === null ? null : b.salePrice !== undefined ? Number(b.salePrice) : existing.salePrice ?? null,
    saleStart: b.saleStart !== undefined ? b.saleStart || null : existing.saleStart ?? null,
    saleEnd: b.saleEnd !== undefined ? b.saleEnd || null : existing.saleEnd ?? null,
    gstRate: num(b.gstRate, existing.gstRate ?? 18), hsn: String(b.hsn ?? existing.hsn ?? ''),
    stock: Math.max(0, Math.floor(num(b.stock, existing.stock ?? 0))),
    lowStockThreshold: num(b.lowStockThreshold, existing.lowStockThreshold ?? 5),
    returnWindowDays: Math.floor(num(b.returnWindowDays, existing.returnWindowDays ?? returnPolicy.DEFAULT_WINDOW_DAYS)),
    rating: num(b.rating, existing.rating ?? 0), ratingCount: num(b.ratingCount, existing.ratingCount ?? 0),
    tags: b.tags !== undefined ? list(b.tags).filter((t) => TAGS.includes(t)) : existing.tags || [],
    featured: b.featured !== undefined ? b.featured === true || b.featured === 'true' || b.featured === '1' : !!existing.featured,
    active: b.active !== undefined ? !(b.active === false || b.active === 'false' || b.active === '0') : existing.active !== false,
    images: b.images !== undefined ? list(b.images) : existing.images || [],
  };
  const errors = {};
  if (!p.name) errors.name = 'Required';
  if (!p.sku) errors.sku = 'Required';
  if (!repo.categories.findBySlug(p.category)) errors.category = 'Choose a category';
  const sub = repo.categories.findBySlug(p.subcategory);
  if (!sub || sub.parentId !== `cat_${p.category}` && repo.categories.findById(sub.parentId)?.slug !== p.category) errors.subcategory = 'Choose a subcategory of the category';
  if (!(p.mrp > 0)) errors.mrp = 'MRP must be > 0';
  if (!(p.price > 0) || p.price > p.mrp) errors.price = 'Selling price must be > 0 and ≤ MRP';
  if (p.salePrice != null && !(p.salePrice > 0 && p.salePrice <= p.price)) errors.salePrice = 'Sale price must be ≤ selling price';
  if (!(p.returnWindowDays >= 0 && p.returnWindowDays <= returnPolicy.MAX_WINDOW_DAYS)) errors.returnWindowDays = `Return window must be 0 (no returns) to ${returnPolicy.MAX_WINDOW_DAYS} days`;
  if (![0, 5, 12, 18, 28].includes(p.gstRate)) errors.gstRate = 'GST must be 0, 5, 12, 18 or 28';
  return { p, errors };
}

function assertUnique(p, selfId) {
  if (repo.products.all().some((x) => x.id !== selfId && x.slug === p.slug)) throw new HttpError(409, 'Another product already uses this slug', { slug: 'Duplicate' });
  if (repo.products.all().some((x) => x.id !== selfId && x.sku === p.sku)) throw new HttpError(409, 'Another product already uses this SKU', { sku: 'Duplicate' });
}

router.get('/products', (req, res) => {
  const promos = pricing.activePromotions();
  let list = repo.products.all();
  const { q, category, stock, status } = req.query;
  if (q) { const s = q.toLowerCase(); list = list.filter((p) => `${p.name} ${p.sku} ${p.brand}`.toLowerCase().includes(s)); }
  if (category) list = list.filter((p) => p.category === category);
  if (stock === 'low') list = list.filter((p) => p.stock > 0 && p.stock <= (p.lowStockThreshold || 5));
  if (stock === 'out') list = list.filter((p) => p.stock <= 0);
  if (status === 'active') list = list.filter((p) => p.active !== false);
  if (status === 'inactive') list = list.filter((p) => p.active === false);
  res.json(list.map((p) => ({ ...p, pricing: pricing.priceProduct(p, promos) })));
});

router.get('/products/export.csv', (req, res) => {
  const cols = ['sku', 'name', 'slug', 'brand', 'category', 'subcategory', 'mrp', 'price', 'salePrice', 'gstRate', 'hsn', 'stock', 'returnWindowDays', 'rating', 'tags', 'featured', 'active', 'images', 'highlights', 'description'];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('﻿' + toCsv(repo.products.all(), cols));
});

router.post('/products/import', csvUpload.single('file'), (req, res) => {
  if (!req.file) throw new HttpError(400, 'Attach a CSV file');
  const rows = parseCsv(req.file.buffer.toString('utf8').replace(/^﻿/, ''));
  const result = { created: 0, updated: 0, errors: [] };
  rows.forEach((row, i) => {
    const existing = repo.products.findBySku(String(row.sku || '').toUpperCase());
    const { p, errors } = normalise(row, existing || {});
    if (Object.keys(errors).length) { result.errors.push({ row: i + 2, sku: row.sku, errors }); return; }
    try {
      assertUnique(p, existing?.id);
      if (existing) { repo.products.update(existing.id, p); result.updated++; }
      else { repo.products.create({ id: id('p_'), ...p, images: p.images.length ? p.images : ['/images/brand/placeholder.svg'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); result.created++; }
    } catch (e) { result.errors.push({ row: i + 2, sku: row.sku, errors: { _: e.message } }); }
  });
  res.json(result);
});

router.get('/products/:id', (req, res) => {
  const p = repo.products.findById(req.params.id);
  if (!p) throw new HttpError(404, 'Product not found');
  res.json(p);
});

router.post('/products', (req, res) => {
  const { p, errors } = normalise(req.body || {});
  if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields', errors);
  assertUnique(p);
  const now = new Date().toISOString();
  const created = repo.products.create({ id: id('p_'), ...p, images: p.images.length ? p.images : ['/images/brand/placeholder.svg'], createdAt: now, updatedAt: now });
  res.status(201).json(created);
});

router.put('/products/:id', (req, res) => {
  const existing = repo.products.findById(req.params.id);
  if (!existing) throw new HttpError(404, 'Product not found');
  const { p, errors } = normalise(req.body || {}, existing);
  if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields', errors);
  assertUnique(p, existing.id);
  res.json(repo.products.update(existing.id, p));
});

router.patch('/products/:id/stock', (req, res) => {
  const p = repo.products.findById(req.params.id);
  if (!p) throw new HttpError(404, 'Product not found');
  const stock = Math.max(0, Math.floor(Number(req.body.stock)));
  if (Number.isNaN(stock)) throw new HttpError(400, 'Invalid stock');
  res.json(repo.products.update(p.id, { stock }));
});

router.delete('/products/:id', (req, res) => {
  if (!repo.products.remove(req.params.id)) throw new HttpError(404, 'Product not found');
  res.json({ ok: true });
});

/** Image upload (multer → /public/uploads). Returns public URLs to put in product.images or CMS. */
router.post('/uploads', upload.array('images', 8), async (req, res) => {
  const files = require('../../db/files');
  for (const f of req.files || []) {
    f.filename = `${Date.now()}-${slugify(path.parse(f.originalname).name).slice(0, 40)}${path.extname(f.originalname).toLowerCase()}`;
    await files.put('uploads', f.filename, f.buffer, f.mimetype);
  }
  if (!req.files?.length) throw new HttpError(400, 'No images uploaded');
  res.status(201).json({ urls: req.files.map((f) => `/uploads/${f.filename}`) });
});

// ----- Categories -----
router.get('/categories', (req, res) => {
  const products = repo.products.all();
  res.json(repo.categories.all().map((c) => ({ ...c, productCount: products.filter((p) => p.category === c.slug || p.subcategory === c.slug).length })));
});
router.post('/categories', (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim();
  if (!name) throw new HttpError(400, 'Name is required', { name: 'Required' });
  const slug = slugify(b.slug || name);
  if (repo.categories.findBySlug(slug)) throw new HttpError(409, 'Slug already exists', { slug: 'Duplicate' });
  if (b.parentId && !repo.categories.findById(b.parentId)) throw new HttpError(400, 'Parent category not found');
  res.status(201).json(repo.categories.create({ id: `cat_${slug}`, name, slug, parentId: b.parentId || null, icon: b.icon || '🏷️', color: b.color || '#0f766e', order: Number(b.order) || 99, image: b.image || '', active: b.active !== false }));
});
router.put('/categories/:id', (req, res) => {
  const c = repo.categories.findById(req.params.id);
  if (!c) throw new HttpError(404, 'Category not found');
  const b = req.body || {};
  // slug is kept stable because products reference it
  res.json(repo.categories.update(c.id, { name: b.name ?? c.name, icon: b.icon ?? c.icon, color: b.color ?? c.color, order: b.order !== undefined ? Number(b.order) : c.order, image: b.image ?? c.image, active: b.active !== undefined ? !!b.active : c.active, parentId: b.parentId !== undefined ? b.parentId || null : c.parentId }));
});
router.delete('/categories/:id', (req, res) => {
  const c = repo.categories.findById(req.params.id);
  if (!c) throw new HttpError(404, 'Category not found');
  const used = repo.products.all().filter((p) => p.category === c.slug || p.subcategory === c.slug).length;
  if (used) throw new HttpError(400, `Cannot delete: ${used} product(s) use this category. Move them first.`);
  if (repo.categories.children(c.id).length) throw new HttpError(400, 'Delete or move its subcategories first.');
  repo.categories.remove(c.id);
  res.json({ ok: true });
});

module.exports = router;
