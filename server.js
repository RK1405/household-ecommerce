'use strict';
/**
 * HomeHaat demo store — Express server.
 *   npm install && cp .env.example .env && npm start   →  http://localhost:3000
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const config = require('./src/config');
const { writeSeed } = require('./scripts/seed');

// First run: create /data/*.json from the seed generator
const seeded = writeSeed();
if (seeded.length) console.log(`[seed] created ${seeded.join(', ')}`);

const repo = require('./src/repositories');
const pricing = require('./src/services/pricing.service');
const { attachUser, adminPageGuard } = require('./src/middleware/auth');
const { errorHandler } = require('./src/middleware/errors');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});
app.use(express.json({ limit: '1mb', verify: (req, _res, buf) => { if (req.originalUrl === '/api/payments/webhook') req.rawBody = buf.toString('utf8'); } }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(attachUser);

// ---------- API ----------
app.get('/api/health', (req, res) => res.json({ ok: true, demoMode: config.demoMode, time: new Date().toISOString() }));
app.post('/api/payments/webhook', require('./src/routes/payments.routes').webhook);
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api', require('./src/routes/catalog.routes'));
app.use('/api', require('./src/routes/content.routes'));
app.use('/api/cart', require('./src/routes/cart.routes'));
app.use('/api/account', require('./src/routes/account.routes'));
app.use('/api/orders', require('./src/routes/orders.routes'));
app.use('/api/payments', require('./src/routes/payments.routes'));
app.use('/api/contact', require('./src/routes/contact.routes'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// ---------- Vendor libraries served locally (no CDN) ----------
app.use('/vendor/chart.js', express.static(path.join(__dirname, 'node_modules/chart.js/dist')));
app.use('/vendor/leaflet', express.static(path.join(__dirname, 'node_modules/leaflet/dist')));

// ---------- Shareable product URLs with Open Graph tags ----------
const productHtml = path.join(config.paths.public, 'product.html');
const escAttr = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
app.get('/product/:slug', (req, res, next) => {
  const p = repo.products.findBySlug(req.params.slug);
  if (!p || p.active === false) return next();
  const base = config.baseUrl || `${req.protocol}://${req.get('host')}`;
  const store = repo.cms.get().store;
  const pr = pricing.priceProduct(p);
  const title = `${p.name} — ₹${pr.finalPrice.toLocaleString('en-IN')} | ${store.name}`;
  const desc = `${pr.discountPct ? `${pr.discountPct}% off · ` : ''}${p.brand} · ${p.description}`.slice(0, 200);
  const img = /^https?:/.test(p.images[0]) ? p.images[0] : base + p.images[0];
  const url = `${base}/product/${p.slug}`;
  const tags = [
    `<title>${escAttr(title)}</title>`,
    `<meta name="description" content="${escAttr(desc)}">`,
    `<link rel="canonical" href="${escAttr(url)}">`,
    `<meta property="og:type" content="product">`, `<meta property="og:site_name" content="${escAttr(store.name)}">`,
    `<meta property="og:title" content="${escAttr(title)}">`, `<meta property="og:description" content="${escAttr(desc)}">`,
    `<meta property="og:url" content="${escAttr(url)}">`, `<meta property="og:image" content="${escAttr(img)}">`,
    `<meta property="og:image:width" content="800">`, `<meta property="og:image:height" content="800">`,
    `<meta property="product:price:amount" content="${pr.finalPrice}">`, `<meta property="product:price:currency" content="INR">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.sku, brand: p.brand, image: p.images.map((i) => (i.startsWith('http') ? i : base + i)), description: p.description, offers: { '@type': 'Offer', priceCurrency: 'INR', price: pr.finalPrice, availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url } }).replace(/</g, '\\u003c')}</script>`,
  ].join('\n  ');
  const html = fs.readFileSync(productHtml, 'utf8').replace(/<title>[^<]*<\/title>/, '').replace('<!--OG_TAGS-->', tags);
  res.type('html').send(html);
});

// ---------- Static site ----------
app.use('/admin', adminPageGuard);
app.get('/admin', (req, res) => res.redirect('/admin/dashboard.html'));
app.use(express.static(config.paths.public, { extensions: ['html'] }));

app.use((req, res) => {
  if (req.accepts('html')) return res.status(404).sendFile(path.join(config.paths.public, '404.html'));
  res.status(404).send('Not found');
});
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    const base = config.baseUrl || `http://localhost:${config.port}`;
    console.log(`\n  ${repo.cms.get().store.name} is running`);
    console.log(`  Storefront : ${base}/`);
    console.log(`  Admin      : ${base}/admin/login.html`);
    console.log(`  Demo mode  : ${config.demoMode ? 'ON (emails go to storage/outbox, demo logins shown)' : 'OFF'}\n`);
  });
}

module.exports = app;
