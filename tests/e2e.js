'use strict';
/**
 * End-to-end test suite (Playwright, Chromium).
 *   npm i -D playwright && npx playwright install chromium
 *   npm run test:e2e            → resets demo data, starts the server on :3100, runs all checks,
 *                                 writes docs/test-report.md and screenshots to docs/screenshots/
 * WARNING: resets /data and the outbox (demo data only).
 */
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.E2E_PORT || 3100;
const B = `http://localhost:${PORT}`;
const SHOTS = path.join(ROOT, 'docs', 'screenshots');
const results = [];
const issues = [];

async function check(name, fn) {
  const t = Date.now();
  try { await fn(); results.push({ name, ok: true, ms: Date.now() - t }); console.log(`  ✔ ${name}`); }
  catch (e) { results.push({ name, ok: false, ms: Date.now() - t, error: e.message.split('\n')[0] }); console.log(`  ✘ ${name}\n      ${e.message.split('\n')[0]}`); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };
const outbox = () => JSON.parse(execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'dump-collection.js'), 'emails'], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }).toString());
const hasEmail = (type, pred = () => true) => outbox().some((e) => e.type === type && pred(e));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function watch(page, label) {
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/tile\.openstreetmap|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|ERR_PROXY|maps\.googleapis/.test(t + (m.location()?.url || ''))) return; // external map tiles may be offline
    if (/status of 4\d\d/.test(t)) return; // expected API validation errors are asserted separately
    issues.push(`[${label}] console error on ${page.url()}: ${t}`);
  });
  page.on('pageerror', (e) => issues.push(`[${label}] page error on ${page.url()}: ${e.message}`));
  page.on('response', (r) => {
    const u = r.url();
    if (r.status() >= 400 && u.startsWith(B) && !u.includes('/api/') && !u.includes('/nope-404')) issues.push(`[${label}] HTTP ${r.status()} ${u}`);
    if (r.status() >= 500 && u.startsWith(B)) issues.push(`[${label}] HTTP ${r.status()} ${u}`);
  });
}

async function login(page, email, password) {
  await page.goto(`${B}/login.html`);
  await page.fill('#email', email); await page.fill('#password', password);
  await Promise.all([page.waitForURL((u) => !u.pathname.endsWith('/login.html')), page.click('#login-form button')]);
}
async function addToCartBySlug(page, slug, qty = 1) {
  await page.goto(`${B}/product/${slug}`);
  await page.fill('#qty-input', String(qty));
  await page.click('#add-btn');
  await page.waitForSelector('.toast.success');
  await page.keyboard.press('Escape');
}
async function placeOrder(page, payment) {
  await page.goto(`${B}/checkout.html`);
  await page.waitForSelector('#place');
  await page.check(`input[name=payment][value=${payment}]`);
  await Promise.all([page.waitForURL(/payment\.html|order-confirmation/), page.click('#place')]);
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  console.log('Resetting demo data…');
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'reset-data.js')], { stdio: 'inherit' });
  const server = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT, BASE_URL: B, DEMO_MODE: 'true', GOOGLE_MAPS_API_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
  for (let i = 0; i < 50; i++) { try { const r = await fetch(`${B}/api/health`); if (r.ok) break; } catch { /* starting */ } await sleep(200); }

  const browser = await chromium.launch();
  const desk = await browser.newContext({ viewport: { width: 1366, height: 900 }, permissions: ['clipboard-read', 'clipboard-write', 'geolocation'], geolocation: { latitude: 13.0418, longitude: 80.2341 } });
  const page = await desk.newPage(); watch(page, 'desktop');

  try {
    console.log('\nStorefront');
    await check('Home page renders slider and CMS bento blocks', async () => {
      await page.goto(B);
      await page.waitForSelector('.hero-slide');
      assert(await page.locator('.hero-slide').count() >= 3, 'expected ≥3 slides');
      for (const t of ['.tile-latest', '.tile-offers', '.tile-categories', '.tile-bestsellers', '.tile-coupon', '.tile-promo']) assert(await page.locator(t).count() === 1, `missing ${t}`);
      assert(await page.locator('.deal-card').count() === 1, 'deal of the day missing');
      await page.hover('.hero'); await page.click('.hero-nav.next');
    });

    await check('Register a new account (welcome email in outbox)', async () => {
      await page.goto(`${B}/register.html`);
      await page.fill('#name', 'Test Shopper'); await page.fill('#email', 'shopper@example.com'); await page.fill('#phone', '9876512345'); await page.fill('#password', 'Shop@1234');
      await Promise.all([page.waitForURL(/account\.html/), page.click('#reg button')]);
      await sleep(300);
      assert(hasEmail('welcome', (e) => e.to === 'shopper@example.com'), 'welcome email not in outbox');
      await page.click('#logout-btn'); await page.waitForURL(`${B}/`);
    });

    await check('Forgot password writes a reset email to the outbox', async () => {
      await page.goto(`${B}/login.html`); await page.click('#forgot');
      await page.fill('#femail', 'user@demo.com'); await page.click('#f-form button');
      await page.waitForSelector('#f-msg .alert-success');
      assert(hasEmail('password_reset', (e) => e.to === 'user@demo.com'), 'reset email missing');
    });

    await check('Admin demo account can log in (and is blocked from nothing on storefront)', async () => {
      await login(page, 'admin@demo.com', 'Admin@123');
      assert(page.url().includes('/admin/dashboard.html'), `admin landed on ${page.url()}`);
      await page.waitForSelector('#kpis .kpi');
      await page.click('#admin-logout'); await page.waitForURL(/admin\/login/);
    });

    await check('Admin pages are protected server-side', async () => {
      const r = await page.request.get(`${B}/api/admin/dashboard`); assert(r.status() === 401, `expected 401, got ${r.status()}`);
      await page.goto(`${B}/admin/products.html`); assert(page.url().includes('/admin/login.html'), 'not redirected to admin login');
    });

    await check('Browse, filter (category + subcategory + in-stock + offers), sort and paginate', async () => {
      await page.goto(`${B}/products.html`);
      await page.waitForSelector('.pcard');
      assert(/50 products/.test(await page.textContent('#result-count')), 'expected 50 products');
      assert(await page.locator('#pagination button[data-page]').count() > 2, 'pagination missing');
      await page.check('input[name=category][value=kitchen-dining]'); await page.waitForSelector('input[name=subcategory][value=cookware]');
      await page.check('input[name=subcategory][value=cookware]'); await page.waitForFunction(() => /^4 products/.test(document.getElementById('result-count').textContent));
      await page.selectOption('#sort', 'price-asc'); await page.waitForTimeout(400);
      const prices = await page.$$eval('.pcard .price .now', (els) => els.map((e) => Number(e.textContent.replace(/[^\d]/g, ''))));
      assert(prices.every((p, i) => !i || prices[i - 1] <= p), `not sorted: ${prices}`);
      assert((await page.textContent('#crumbs')).includes('Cookware'), 'breadcrumb missing Cookware');
      await page.goto(`${B}/products.html?inStock=1&offers=1&rating=4`); await page.waitForSelector('.pcard');
      assert(!(await page.locator('.pcard .oos').count()), 'out-of-stock shown with inStock filter');
      await page.goto(`${B}/products.html?q=kettle`); await page.waitForSelector('.pcard');
      assert((await page.locator('.pcard').count()) === 2, 'search for kettle should return 2');
      await page.screenshot({ path: path.join(SHOTS, 'listing-desktop.png') });
    });

    await check('Quick view opens with gallery, price and add-to-cart', async () => {
      await page.goto(`${B}/products.html?category=bath`); await page.waitForSelector('.pcard');
      await page.hover('.pcard >> nth=0'); await page.click('.pcard >> nth=0 >> .qv');
      await page.waitForSelector('.modal.open [data-add]');
      assert(await page.locator('.modal.open .thumbs button').count() >= 3, 'quick view gallery < 3 images');
      await page.screenshot({ path: path.join(SHOTS, 'quick-view.png') });
      await page.click('.modal.open [data-add]'); await page.waitForSelector('.toast.success');
    });

    await check('Product zoom: hover lens on desktop + fullscreen viewer', async () => {
      await page.goto(`${B}/product/mixer-grinder-750-w-with-3-jars`); await page.waitForSelector('.stage');
      const box = await page.locator('.stage').boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2 + 10);
      assert(await page.locator('.lens').isVisible(), 'lens not visible on hover');
      await page.screenshot({ path: path.join(SHOTS, 'product-desktop.png') });
      await page.click('.stage img.main'); await page.waitForSelector('.viewer.open');
      await page.click('.viewer [data-z]'); await page.keyboard.press('Escape');
    });

    await check('Shareable link serves Open Graph tags and opens the right product; images have direct URLs', async () => {
      const slug = 'jaipur-block-print-cushion-covers-set-of-5';
      const html = await (await page.request.get(`${B}/product/${slug}`)).text();
      assert(/<meta property="og:title" content="Jaipur Block-Print Cushion Covers Set of 5/.test(html), 'og:title missing');
      assert(html.includes(`og:image" content="${B}/images/products/${slug}/main.jpg`), 'og:image missing');
      await page.goto(`${B}/product/${slug}`); await page.waitForSelector('.pdp-info h1');
      assert((await page.textContent('.pdp-info h1')).includes('Jaipur Block-Print'), 'wrong product opened');
      await page.click('[data-share=copy]'); await page.waitForSelector('.toast.success');
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      assert(clip === `${B}/product/${slug}`, `clipboard was ${clip}`);
      assert((await page.getAttribute('[data-share=wa]', 'href')).startsWith('https://wa.me/?text='), 'WhatsApp link missing');
      await page.click('[data-share=img]'); await page.waitForTimeout(200);
      const img = await page.evaluate(() => navigator.clipboard.readText());
      const r = await page.request.get(img); assert(r.ok() && r.headers()['content-type'].startsWith('image/'), `image link ${img} not an image`);
    });

    await check('Cart persists for guests (localStorage) and shows price breakdown', async () => {
      await addToCartBySlug(page, 'mixer-grinder-750-w-with-3-jars', 1);
      await page.reload(); await page.goto(`${B}/cart.html`); await page.waitForSelector('.cart-line');
      assert(await page.locator('.cart-line').count() >= 2, 'guest cart did not persist');
      const txt = await page.textContent('.summary');
      for (const k of ['Subtotal', 'Delivery', 'GST', 'Total payable']) assert(txt.includes(k), `breakdown missing ${k}`);
    });

    await check('Coupons: invalid/expired messages and valid discount', async () => {
      await page.fill('#coupon', 'MONSOON20'); await page.click('#coupon-form button'); await page.waitForSelector('#coupon-msg.err');
      assert(/expired/i.test(await page.textContent('#coupon-msg')), 'expired message missing');
      await page.fill('#coupon', 'NOPE123'); await page.click('#coupon-form button'); await page.waitForFunction(() => /not valid/.test(document.getElementById('coupon-msg').textContent));
      await page.fill('#coupon', 'festive250'); await page.click('#coupon-form button'); await page.waitForSelector('#coupon-msg.ok');
      assert((await page.textContent('.summary')).includes('Coupon (FESTIVE250)'), 'discount line missing');
      await page.screenshot({ path: path.join(SHOTS, 'cart-desktop.png'), fullPage: true });
    });

    await check('Login merges guest cart into the server cart (user@demo.com)', async () => {
      await login(page, 'user@demo.com', 'User@123');
      const r = await (await page.request.get(`${B}/api/cart`)).json();
      assert(r.items.length >= 2, 'merged cart empty');
      assert(r.couponCode === 'FESTIVE250', 'coupon not merged');
    });

    await check('Add an address with Indian validation and a map pin (current location)', async () => {
      await page.goto(`${B}/account.html#addresses`); await page.click('#add-addr');
      await page.waitForSelector('#addr-form');
      await page.fill('#ad-line1', '7 Temple Road'); await page.fill('#ad-pincode', '60012'); await page.fill('#ad-city', 'Chennai');
      await page.click('#addr-form [type=submit]');
      assert(/6 digits/.test(await page.textContent('[data-err=pincode]')), 'PIN validation missing');
      assert(/state/i.test(await page.textContent('[data-err=state]')), 'state validation missing');
      await page.fill('#ad-pincode', '600017'); await page.selectOption('#ad-state', 'Tamil Nadu'); await page.fill('#ad-phone', '98765');
      await page.click('#addr-form [type=submit]');
      assert(/10-digit/.test(await page.textContent('[data-err=phone]')), 'mobile validation missing');
      await page.fill('#ad-phone', '9876500002');
      await page.waitForSelector('[data-map] .leaflet-marker-icon', { state: 'attached' });
      assert(await page.locator('[data-notice]').count() === 1, 'missing Google Maps fallback notice');
      await page.click('[data-locate]'); await page.waitForFunction(() => document.querySelector('#addr-form [name=lat]').value !== '');
      await page.screenshot({ path: path.join(SHOTS, 'address-map.png') });
      await page.click('#addr-form [type=submit]'); await page.waitForSelector('.toast.success');
      const list = await (await page.request.get(`${B}/api/account/addresses`)).json();
      const a = list.find((x) => x.line1 === '7 Temple Road');
      assert(a && Math.abs(a.lat - 13.0418) < 0.001 && a.mapsUrl.includes('google.com/maps'), 'lat/lng + maps link not saved');
    });

    let codOrderId;
    await check('Checkout with Cash on Delivery → confirmation + order email', async () => {
      await placeOrder(page, 'COD');
      await page.waitForURL(/order-confirmation/); await page.waitForSelector('.result-icon.ok');
      codOrderId = new URL(page.url()).searchParams.get('order');
      await page.screenshot({ path: path.join(SHOTS, 'order-confirmation.png'), fullPage: true });
      await sleep(200);
      assert(hasEmail('order_placed'), 'order_placed email missing');
    });

    await check('COD limit rule blocks COD above ₹10,000', async () => {
      await addToCartBySlug(page, 'mixer-grinder-750-w-with-3-jars', 4);
      await page.goto(`${B}/checkout.html`); await page.waitForSelector('#place');
      assert(await page.locator('input[name=payment][value=COD]').isDisabled(), 'COD should be disabled');
      assert(/up to ₹10,000/.test(await page.textContent('.choice.is-disabled')), 'COD limit message missing');
      const lines = await (await page.request.get(`${B}/api/cart`)).json();
      await page.request.put(`${B}/api/cart`, { data: { items: lines.items.map((i) => ({ ...i, qty: 1 })), couponCode: null } });
    });

    const pay = async (method, data, expectOk) => {
      await addToCartBySlug(page, 'stainless-steel-electric-kettle-1-5-l', 1);
      await placeOrder(page, 'ONLINE'); await page.waitForURL(/payment\.html/);
      await page.waitForSelector('.pay-tab');
      if (method === 'UPI') {
        await page.fill('#vpa', data); await page.click('#upi-form button');
        await page.waitForSelector('.ring');
      } else {
        await page.click('[data-tab=CARD]');
        await page.fill('#cnum', data); await page.fill('#cexp', '12/30'); await page.fill('#ccvv', '123');
        await page.click('#card-form button'); await page.waitForSelector('#otp');
        await page.fill('#otp', '111111'); await page.click('#otp-form button'); await page.waitForFunction(() => /Incorrect OTP/.test(document.getElementById('otp-err').textContent));
        await page.fill('#otp', '123456'); await page.click('#otp-form button');
      }
      if (expectOk) { await page.waitForURL(/order-confirmation/, { timeout: 20000 }); await page.waitForSelector('.result-icon.ok'); }
      else { await page.waitForSelector('.result-icon.fail', { timeout: 20000 }); }
    };
    await check('Online payment: UPI success', async () => { await pay('UPI', 'priya@okaxis', true); await sleep(200); assert(hasEmail('payment_success'), 'payment_success email missing'); });
    await check('Online payment: UPI failure (fail@upi) + retry screen', async () => { await pay('UPI', 'fail@upi', false); assert(await page.locator('#retry').count(), 'retry missing'); await page.screenshot({ path: path.join(SHOTS, 'payment-failed.png') }); assert(hasEmail('payment_failed'), 'payment_failed email missing'); });
    await check('Online payment: Card success (Luhn + OTP 123456)', async () => { await pay('CARD', '4111 1111 1111 1111', true); });
    await check('Online payment: Card decline (4000 0000 0000 0002)', async () => { await pay('CARD', '4000 0000 0000 0002', false); });
    await check('Card form rejects an invalid (non-Luhn) number', async () => {
      await page.click('#retry'); await page.click('[data-tab=CARD]'); await page.fill('#cnum', '4111 1111 1111 1112'); await page.fill('#cexp', '12/30'); await page.fill('#ccvv', '123'); await page.click('#card-form button');
      assert(/invalid/i.test(await page.textContent('[data-e=number]')), 'Luhn error missing');
      await page.screenshot({ path: path.join(SHOTS, 'payment-card.png') });
    });

    await check('Account shows orders with tracking timeline', async () => {
      await page.goto(`${B}/account.html#orders`); await page.waitForSelector('.order-card');
      assert(await page.locator('.timeline').count() >= 1, 'timeline missing');
    });

    await check('Contact form stores the message and emails the admin (outbox)', async () => {
      await page.goto(`${B}/contact.html`); await page.waitForSelector('#contact-form');
      await page.fill('#c-msg', 'Please share bulk pricing for 20 kettles.'); await page.click('#contact-form button');
      await page.waitForSelector('#c-result .alert-success');
      assert(hasEmail('contact_admin'), 'contact email missing');
    });

    await check('Chatbot answers every intent (rule-based)', async () => {
      await page.goto(B); await page.click('#chat-fab'); await page.waitForSelector('.msg.bot >> text=Namaste');
      const ask = async (text, expect) => {
        const n = await page.locator('.msg.bot').count();
        await page.fill('#chat-text', text); await page.press('#chat-text', 'Enter');
        await page.waitForFunction((c) => document.querySelectorAll('.msg.bot').length > c && !document.querySelector('.msg.bot:last-child .typing'), n);
        const last = await page.locator('.msg.bot').last().innerText();
        assert(expect.test(last), `"${text}" → unexpected reply: ${last.slice(0, 90)}`);
      };
      await ask('show me categories', /Kitchen & Dining/);
      await ask('find a product', /Type the product/); await ask('kadai', /Kadai/i);
      await ask('any offers today?', /deals|Coupon/i);
      await ask('how do I apply a coupon', /Apply/);
      await ask('delivery charges?', /Standard delivery: ₹79/);
      await ask('is cash on delivery available', /Cash on Delivery — available on orders up to ₹10,000/);
      await ask('track my order', /order ID/); await ask('HH100005', /Order HH100005/);
      await ask('track HH999999', /couldn't find/i);
      await ask('I want to return an item', /window shown on each product page/);
      await ask('forgot password', /reset link/);
      await ask('talk to a human', /\+91/);
      await ask('qwertyuiop', /didn't quite get that/);
      await page.screenshot({ path: path.join(SHOTS, 'chatbot.png') });
    });

    console.log('\nAdmin');
    await page.click('#logout-btn'); await page.waitForURL(`${B}/`);
    await login(page, 'admin@demo.com', 'Admin@123');

    await check('Dashboard KPIs, chart, recent orders and low stock', async () => {
      await page.goto(`${B}/admin/dashboard.html`); await page.waitForSelector('#kpis .kpi'); await page.waitForSelector('#recent tr');
      await page.waitForFunction(() => { const c = document.getElementById('sales-chart'); return c && c.width > 0 && window.Chart; });
      assert(await page.locator('#low li').count() >= 1, 'low stock list empty');
      await page.waitForTimeout(500); await page.screenshot({ path: path.join(SHOTS, 'admin-dashboard.png') });
    });

    await check('Order status change (Shipped) sends the email to the outbox', async () => {
      await page.goto(`${B}/admin/orders.html?id=${codOrderId}`); await page.waitForSelector('#status-form');
      await page.selectOption('#ns', 'Shipped'); await page.click('#status-form button');
      await page.waitForSelector('.toast.success'); await sleep(200);
      assert(hasEmail('order_shipped'), 'order_shipped email missing');
      await page.screenshot({ path: path.join(SHOTS, 'admin-order.png') });
      await page.selectOption('#ns', 'Out for delivery'); await page.click('#status-form button'); await page.waitForTimeout(500);
      assert(hasEmail('out_for_delivery'), 'out_for_delivery email missing');
    });

    await check('GST invoice renders', async () => {
      await page.goto(`${B}/admin/invoice.html?id=${codOrderId}`); await page.waitForSelector('text=TAX INVOICE');
      assert(/CGST/.test(await page.textContent('#invoice')), 'expected CGST/SGST for Tamil Nadu order');
    });

    await check('Admin product CRUD (create, edit, delete) reflects on the storefront', async () => {
      await page.goto(`${B}/admin/products.html`); await page.waitForSelector('#rows tr'); await page.click('#new');
      await page.fill('#f-name', 'Brass Diya Set of 4'); await page.fill('#f-sku', 'HH-DEC-LAM-901'); await page.fill('#f-brand', 'Nivaas');
      await page.selectOption('#f-category', 'home-decor'); await page.selectOption('#f-subcategory', 'lamps-lighting');
      await page.fill('#f-mrp', '999'); await page.fill('#f-price', '749'); await page.fill('#f-stock', '25');
      await page.fill('[data-imgurl=images]', '/images/products/brass-finish-mandala-wall-hanging/main.jpg'); await page.press('[data-imgurl=images]', 'Enter');
      await page.click('.form-modal [type=submit]'); await page.waitForSelector('.toast.success');
      const r = await (await page.request.get(`${B}/api/products?q=diya`)).json();
      assert(r.total === 1 && r.items[0].price === 674, `new product not live with promo price (got ${r.items[0]?.price})`); // Deepavali 10% promo on home-decor
      await page.goto(`${B}/product/brass-diya-set-of-4`); await page.waitForSelector('.pdp-info h1');
      // edit price
      await page.goto(`${B}/admin/products.html`); await page.fill('#q', 'diya'); await page.waitForTimeout(500);
      await page.click('[data-edit]'); await page.fill('#f-price', '699'); await page.click('.form-modal [type=submit]'); await page.waitForSelector('.toast.success');
      const r2 = await (await page.request.get(`${B}/api/products/brass-diya-set-of-4`)).json();
      assert(r2.price === 629, `edited price not reflected (${r2.price})`);
      // delete
      await page.click('[data-del]'); await page.click('[data-yes]'); await page.waitForSelector('.toast');
      const gone = await page.request.get(`${B}/api/products/brass-diya-set-of-4`); assert(gone.status() === 404, 'deleted product still live');
    });

    await check('Admin coupon CRUD works at the storefront cart', async () => {
      await page.goto(`${B}/admin/coupons.html`); await page.waitForSelector('#rows tr'); await page.click('#new');
      await page.fill('#f-code', 'REVIEW100'); await page.selectOption('#f-type', 'flat'); await page.fill('#f-value', '100'); await page.fill('#f-minOrder', '500'); await page.fill('#f-description', 'Flat ₹100 for the review');
      await page.click('.form-modal [type=submit]'); await page.waitForSelector('.toast.success');
      const q = await (await page.request.post(`${B}/api/cart/quote`, { data: { items: [{ productId: 'p_001', qty: 1 }], couponCode: 'review100' } })).json();
      assert(q.coupon.valid && q.discount === 100, `coupon not applied: ${q.coupon.message}`);
    });

    await check('Admin banner CRUD (create, delete) reflects in the home slider', async () => {
      await page.goto(`${B}/admin/cms.html#banners`); await page.waitForSelector('[data-add]'); await page.click('[data-add]');
      await page.fill('#f-title', 'Pongal Kitchen Fest'); await page.fill('#f-subtitle', 'Brass and steel essentials for the harvest festival'); await page.fill('#f-ctaText', 'Shop now'); await page.fill('#f-ctaLink', '/products.html?category=kitchen-dining');
      await page.click('.form-modal [type=submit]'); await page.waitForSelector('.toast.success');
      await page.goto(B); await page.waitForSelector('.hero-slide');
      assert(await page.locator('.hero-slide h2', { hasText: 'Pongal Kitchen Fest' }).count() === 1, 'new banner not on home page');
      await page.goto(`${B}/admin/cms.html#banners`); await page.waitForSelector('.sortable-row');
      await page.locator('.sortable-row', { hasText: 'Pongal Kitchen Fest' }).locator('[data-del]').click(); await page.click('[data-yes]'); await page.waitForSelector('.toast.success');
      const home = await (await page.request.get(`${B}/api/home`)).json(); assert(!home.banners.some((b) => b.title === 'Pongal Kitchen Fest'), 'deleted banner still live');
    });

    await check('Sales reports render charts and tables', async () => {
      await page.goto(`${B}/admin/reports.html`); await page.waitForSelector('#t-top tr');
      await page.waitForFunction(() => window.Chart && Object.keys(window.Chart.instances).length >= 4);
      await page.click('[data-r="90"]'); await page.selectOption('#group', 'week'); await page.click('#f button.btn'); await page.waitForTimeout(800);
      const csv = await page.request.get(B + (await page.getAttribute('[data-csv=products]', 'href'))); assert(csv.ok() && (await csv.text()).includes('revenue'), 'CSV export failed');
      await page.screenshot({ path: path.join(SHOTS, 'admin-reports.png') });
    });

    await check('Payments: reconciliation and dummy refund', async () => {
      await page.goto(`${B}/admin/payments.html?status=captured`); await page.waitForSelector('#rows [data-open]');
      await page.selectOption('#st', 'captured'); await page.waitForTimeout(400);
      await page.click('#rows [data-open] >> nth=0'); await page.click('#refund'); await page.click('.form-modal [type=submit]'); await page.waitForSelector('.toast.success');
      await sleep(200); assert(hasEmail('refund'), 'refund email missing');
    });

    await check('Email settings: test email + template preview + outbox list', async () => {
      await page.goto(`${B}/admin/email-settings.html`); await page.waitForSelector('#types li');
      await page.fill('#to', 'rama@example.com'); await page.click('#test button'); await page.waitForFunction(() => /outbox/.test(document.getElementById('test-result').textContent));
      await page.click('[data-preview=order_placed]'); await page.waitForSelector('iframe.preview');
      assert(await page.locator('#outbox tr').count() > 5, 'outbox list empty');
    });

    await check('Every admin page loads without errors', async () => {
      for (const p of ['products', 'categories', 'orders', 'customers', 'reviews', 'coupons', 'promotions', 'cms', 'payments', 'settings']) {
        await page.goto(`${B}/admin/${p}.html`, { waitUntil: 'networkidle' }); await page.waitForSelector('.admin-top h1');
      }
      await page.goto(`${B}/admin/products.html`, { waitUntil: 'networkidle' }); await page.screenshot({ path: path.join(SHOTS, 'admin-products.png') });
    });

    console.log('\nResponsive & quality sweep');
    const pages = ['/', '/products.html', '/product/tri-ply-stainless-steel-kadai-24-cm', '/cart.html', '/checkout.html', '/account.html', '/contact.html', '/page.html?slug=about', '/page.html?slug=shipping-returns', '/login.html', '/register.html', '/nope-404'];
    for (const [w, h, label] of [[360, 760, 'w360'], [390, 844, 'mobile'], [768, 1024, 'tablet'], [1366, 900, 'desktop']]) {
      await check(`No console errors, broken images or horizontal scroll at ${w}px`, async () => {
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900, isMobile: w < 900 });
        const p = await ctx.newPage(); watch(p, label);
        await login(p, 'user@demo.com', 'User@123');
        const problems = [];
        for (const u of pages) {
          await p.goto(B + u, { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
          const broken = await p.$$eval('img', (imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0 && !i.src.includes('openstreetmap')).map((i) => i.src));
          if (broken.length) problems.push(`${u}: broken images ${broken.join(', ')}`);
          const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          if (overflow > 1) problems.push(`${u}: horizontal overflow ${overflow}px`);
          const noAlt = await p.$$eval('img:not([alt])', (x) => x.length); if (noAlt) problems.push(`${u}: ${noAlt} images without alt`);
          if (label === 'mobile' && ['/', '/product/tri-ply-stainless-steel-kadai-24-cm', '/products.html', '/admin/dashboard.html'].includes(u)) {
            await p.screenshot({ path: path.join(SHOTS, `${u === '/' ? 'home' : u.includes('product/') ? 'product' : 'listing'}-mobile.png`), fullPage: u === '/' });
          }
          if (label === 'desktop' && u === '/') await p.screenshot({ path: path.join(SHOTS, 'home-desktop.png'), fullPage: true });
        }
        if (label === 'mobile') {
          await p.goto(`${B}/product/tri-ply-stainless-steel-kadai-24-cm`); await p.waitForSelector('#buy-row'); await p.evaluate(() => window.scrollTo(0, 1400)); await p.waitForTimeout(500);
          if (!(await p.locator('.sticky-buy.show').count())) problems.push('sticky add-to-cart bar did not appear on mobile');
          await p.screenshot({ path: path.join(SHOTS, 'product-mobile-sticky.png') });
          await p.tap('.stage img.main'); if (!(await p.locator('.viewer.open').count())) problems.push('tap-to-zoom viewer did not open');
          await p.screenshot({ path: path.join(SHOTS, 'zoom-mobile.png') });
          await p.goto(`${B}/`); await p.tap('#menu-btn'); await p.waitForTimeout(300); if (!(await p.locator('#mobile-menu.open').count())) problems.push('hamburger menu did not open');
          await p.goto(`${B}/admin/dashboard.html`);
        }
        await ctx.close();
        assert(!problems.length, problems.join(' | '));
      });
    }
  } finally {
    await browser.close();
    server.kill();
  }

  const passed = results.filter((r) => r.ok).length;
  const md = [`# E2E test report`, '', `Run: ${new Date().toISOString()} · ${passed}/${results.length} checks passed`, '', '| Result | Check | Time |', '|---|---|---|',
    ...results.map((r) => `| ${r.ok ? '✅' : '❌'} | ${r.name}${r.error ? ` — ${r.error.replace(/\|/g, '/')}` : ''} | ${(r.ms / 1000).toFixed(1)}s |`), '',
    `## Console / network issues (${issues.length})`, '', ...(issues.length ? [...new Set(issues)].map((i) => `- ${i}`) : ['None.'])].join('\n');
  fs.writeFileSync(path.join(ROOT, 'docs', 'test-report.md'), md + '\n');
  console.log(`\n${passed}/${results.length} checks passed · ${new Set(issues).size} console/network issues → docs/test-report.md`);
  if (issues.length) console.log([...new Set(issues)].slice(0, 20).join('\n'));
  // restore a clean demo dataset for the reviewer
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'reset-data.js')], { stdio: 'ignore' });
  process.exit(passed === results.length && !issues.length ? 0 : 1);
})();
