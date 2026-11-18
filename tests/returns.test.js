'use strict';
/**
 * Returns & refunds test (JSON provider, dummy payments).   node tests/returns.test.js
 * Covers: per-product windows, no returns under the minimum price, eligibility, request validation, COD (UPI payout) and
 * online (automatic refund) flows, approve/reject/receive/restock, double-refund guard, expired windows and the customer UI.
 */
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const PORT = 3130, B = `http://localhost:${PORT}`;
const results = [];
const assert = (c, m) => { if (!c) throw new Error(m); };
async function check(name, fn) { try { await fn(); results.push(true); console.log(`  ✔ ${name}`); } catch (e) { results.push(false); console.log(`  ✘ ${name}\n      ${e.message}`); } }

function client() {
  let cookie = '';
  return async (method, url, body) => {
    const r = await fetch(B + url, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    const t = await r.text(); let json; try { json = JSON.parse(t); } catch (_) { json = t; }
    return { status: r.status, json };
  };
}

(async () => {
  console.log('Returns & refunds');
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'reset-data.js')], { stdio: 'ignore' });
  const seed = require(path.join(ROOT, 'scripts', 'seed')).buildSeed();
  const ok = seed.products.filter((p) => p.price >= 1000 && p.returnWindowDays === 7 && !p.salePrice && p.stock > 20);
  const cheap = seed.products.filter((p) => p.price < 1000 && p.returnWindowDays > 0 && !p.salePrice && p.stock > 20);
  assert(ok.length >= 2 && cheap.length, 'seed lacks suitable products');
  const A = ok[0], A2 = ok[1], Bp = cheap[0], Cp = ok[2] || ok[1];
  const server = spawn(process.execPath, ['server.js'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, DATA_PROVIDER: process.env.DATA_PROVIDER || 'json', PORT: String(PORT), BASE_URL: B, DEMO_MODE: 'true', PAYMENT_PROVIDER: 'dummy' } });
  server.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
  for (let i = 0; i < 40; i++) { try { if ((await fetch(`${B}/api/health`)).ok) break; } catch (_) { /* wait */ } await new Promise((r) => setTimeout(r, 250)); }
  try {
    const user = client(), admin = client();
    await user('POST', '/api/auth/login', { email: 'user@demo.com', password: 'User@123' });
    await admin('POST', '/api/auth/login', { email: 'admin@demo.com', password: 'Admin@123' });
    const stockOf = async (id) => (await admin('GET', '/api/admin/products')).json.find((p) => p.id === id).stock;
    // Emails are queued in the background, so wait briefly for them to appear (MySQL writes take a few ms longer than files).
    const mail = async (type) => { let list = []; for (let i = 0; i < 20; i++) { list = (await admin('GET', '/api/admin/outbox')).json.filter((e) => e.type === type); if (list.length) break; await new Promise((r) => setTimeout(r, 150)); } return list; };
    const place = async (lines, paymentMethod = 'COD') => {
      await user('POST', '/api/cart/merge', { items: lines });
      const r = await user('POST', '/api/orders', { paymentMethod, addressId: 'a_demo1', deliveryMethod: 'standard' });
      assert(r.status === 201, `order failed: ${JSON.stringify(r.json)}`); return r.json.order;
    };
    const payOnline = async (o) => {
      const i = await user('POST', `/api/payments/${o.id}/initiate`, { method: 'UPI', vpa: 'priya@okaxis' });
      const s = await user('POST', `/api/payments/pay/${i.json.paymentId}/upi-status`, {});
      const v = await user('POST', '/api/payments/verify', { razorpay_order_id: s.json.razorpay_order_id, razorpay_payment_id: s.json.razorpay_payment_id, razorpay_signature: s.json.razorpay_signature });
      assert(v.status === 200, `verify failed ${JSON.stringify(v.json)}`);
    };
    const deliver = async (o) => { for (const st of ['Confirmed', 'Delivered']) assert((await admin('POST', `/api/admin/orders/${o.id}/status`, { status: st })).status === 200, `status ${st}`); };
    const opts = async (o) => (await user('GET', `/api/account/orders/${o.id}/return-options`)).json;
    const reqReturn = (o, items, extra = {}) => user('POST', '/api/account/returns', { orderId: o.id, items, reason: 'Damaged or defective', comment: 'Box was dented', upiId: 'priya@okaxis', ...extra });

    await admin('PUT', `/api/admin/products/${Cp.id}`, { returnWindowDays: 0 });
    let o1;

    await check('Product API shows the return policy: window, under-₹1,000 rule, admin "no returns"', async () => {
      const get = async (slug) => (await user('GET', `/api/products/${slug}`)).json.product || (await user('GET', `/api/products/${slug}`)).json;
      const a = await get(A.slug), b = await get(Bp.slug), c = await get(Cp.slug);
      assert(a.returnPolicy.days === 7, `A ${JSON.stringify(a.returnPolicy)}`);
      assert(b.returnPolicy.days === 0 && b.returnPolicy.reason === 'under-min-price', `B ${JSON.stringify(b.returnPolicy)}`);
      assert(c.returnPolicy.days === 0 && c.returnPolicy.reason === 'admin', `C ${JSON.stringify(c.returnPolicy)}`);
    });
    await check('Admin product form rejects a return window outside 0–30 days', async () => {
      assert((await admin('PUT', `/api/admin/products/${A.id}`, { returnWindowDays: 45 })).status === 400, 'should reject 45');
    });
    await check('Returns are not offered before delivery', async () => {
      o1 = await place([{ productId: A.id, qty: 2 }, { productId: Bp.id, qty: 1 }, { productId: Cp.id, qty: 1 }]);
      assert(!(await opts(o1)).delivered, 'should not be delivered');
      assert((await reqReturn(o1, [{ productId: A.id, qty: 1 }])).status === 400, 'return accepted before delivery');
    });
    await check('After delivery: only the eligible product is returnable, others explain why not', async () => {
      await deliver(o1);
      const e = await opts(o1);
      const a = e.items.find((i) => i.productId === A.id), b = e.items.find((i) => i.productId === Bp.id), c = e.items.find((i) => i.productId === Cp.id);
      assert(a.returnable && a.remaining === 2 && a.windowDays === 7, `A ${JSON.stringify(a)}`);
      assert(!b.returnable && /under ₹1,000/.test(b.reason), `B ${b.reason}`);
      assert(!c.returnable && /not returnable/.test(c.reason), `C ${c.reason}`);
    });
    await check('Requests are validated: non-returnable items, too many units, missing reason, COD needs a valid UPI ID', async () => {
      assert((await reqReturn(o1, [{ productId: Bp.id, qty: 1 }])).status === 400, 'under-₹1,000 item accepted');
      assert((await reqReturn(o1, [{ productId: Cp.id, qty: 1 }])).status === 400, 'admin no-return item accepted');
      assert((await reqReturn(o1, [{ productId: A.id, qty: 3 }])).status === 400, 'too many units accepted');
      assert((await reqReturn(o1, [{ productId: A.id, qty: 1 }], { reason: '' })).status === 400, 'missing reason accepted');
      assert((await reqReturn(o1, [{ productId: A.id, qty: 1 }], { upiId: '' })).status === 400, 'COD without UPI accepted');
      assert((await reqReturn(o1, [{ productId: A.id, qty: 1 }], { upiId: 'not a upi' })).status === 400, 'bad UPI accepted');
      assert((await reqReturn(o1, [])).status === 400, 'empty selection accepted');
    });
    let r1;
    await check('A valid request is created, emails customer and admin, and reserves the quantity', async () => {
      const r = await reqReturn(o1, [{ productId: A.id, qty: 1 }]);
      assert(r.status === 201 && r.json.status === 'Requested' && /^RT\d+$/.test(r.json.returnNo), JSON.stringify(r.json));
      r1 = r.json;
      assert(r1.refundAmount > 0 && r1.refundAmount <= A.price, `refund ${r1.refundAmount}`);
      assert((await mail('return_requested')).length && (await mail('return_admin')).length, 'emails missing');
      assert((await opts(o1)).items.find((i) => i.productId === A.id).remaining === 1, 'quantity not reserved');
      assert((await reqReturn(o1, [{ productId: A.id, qty: 2 }])).status === 400, 'over-return accepted');
    });
    await check('Customer can cancel a requested return and the quantity is released', async () => {
      assert((await user('POST', `/api/account/returns/${r1.id}/cancel`)).json.status === 'Cancelled', 'not cancelled');
      assert((await opts(o1)).items.find((i) => i.productId === A.id).remaining === 2, 'quantity not released');
    });
    await check('COD: approve → received (restocked) → UPI payout recorded → refunded, order partially refunded', async () => {
      const r = (await reqReturn(o1, [{ productId: A.id, qty: 2 }])).json;
      const before = await stockOf(A.id);
      assert((await admin('POST', `/api/admin/returns/${r.id}/receive`, {})).status === 400, 'received before approval');
      assert((await admin('POST', `/api/admin/returns/${r.id}/approve`, { note: 'Pickup in 2 days' })).json.status === 'Approved', 'not approved');
      assert((await mail('return_approved')).length, 'approval email missing');
      const rc = await admin('POST', `/api/admin/returns/${r.id}/receive`, { restock: true });
      assert(rc.json.status === 'Received', `status ${rc.json.status}`);
      assert((await stockOf(A.id)) === before + 2, 'stock not restored');
      assert((await admin('POST', `/api/admin/returns/${r.id}/payout`, {})).status === 400, 'payout without reference accepted');
      const po = await admin('POST', `/api/admin/returns/${r.id}/payout`, { reference: 'UPI-REF-12345' });
      assert(po.json.status === 'Refunded' && po.json.refund.id === 'UPI-REF-12345', JSON.stringify(po.json));
      assert((await mail('return_refunded')).length, 'refund email missing');
      const o = (await user('GET', `/api/account/orders`)).json.find((x) => x.id === o1.id);
      assert(o.paymentStatus === 'partially-refunded' && o.status === 'Delivered', `${o.status}/${o.paymentStatus}`);
    });
    await check('Manual "Returned" is blocked once an order has returns (no double refund)', async () => {
      const r = await admin('POST', `/api/admin/orders/${o1.id}/status`, { status: 'Returned' });
      assert(r.status === 400 && /Returns/.test(r.json.error), JSON.stringify(r.json));
    });
    await check('Online: rejection needs a reason; approved return refunds automatically and closes the order', async () => {
      const o2 = await place([{ productId: A2.id, qty: 1 }], 'ONLINE');
      await payOnline(o2); await deliver(o2);
      const r = (await reqReturn(o2, [{ productId: A2.id, qty: 1 }], { upiId: undefined })).json;
      assert(r.status === 'Requested', JSON.stringify(r));
      assert((await admin('POST', `/api/admin/returns/${r.id}/reject`, {})).status === 400, 'rejected without a reason');
      const rj = await admin('POST', `/api/admin/returns/${r.id}/reject`, { note: 'Item was used' });
      assert(rj.json.status === 'Rejected' && (await mail('return_rejected')).length, 'rejection failed');
      const r2 = (await reqReturn(o2, [{ productId: A2.id, qty: 1 }], { upiId: undefined })).json;
      await admin('POST', `/api/admin/returns/${r2.id}/approve`, {});
      const rc = await admin('POST', `/api/admin/returns/${r2.id}/receive`, {});
      assert(rc.json.status === 'Refunded' && rc.json.refund?.id, JSON.stringify(rc.json));
      const pay = (await user('GET', `/api/payments/order/${o2.id}`)).json.payments[0];
      assert(pay.status === 'refunded', `payment ${pay.status}`);
      const o = (await user('GET', '/api/account/orders')).json.find((x) => x.id === o2.id);
      assert(o.status === 'Returned' && o.paymentStatus === 'refunded', `${o.status}/${o.paymentStatus}`);
    });
    await check('Expired window: an old delivered order is not returnable', async () => {
      const list = (await user('GET', '/api/account/orders')).json;
      const old = list.find((o) => o.status === 'Delivered' && o.id !== o1.id && Date.now() - new Date(o.statusHistory.find((h) => h.status === 'Delivered')?.at || 0).getTime() > 40 * 864e5);
      assert(old, 'no old delivered order in seed');
      assert(!old.returnInfo.canReturn && old.returnInfo.message, JSON.stringify(old.returnInfo));
      assert((await reqReturn(old, [{ productId: old.items[0].productId, qty: 1 }])).status === 400, 'expired return accepted');
    });
    await check('Minimum return price is a setting: lowering it makes cheaper products returnable', async () => {
      const s = (await admin('GET', '/api/admin/settings')).json;
      await admin('PUT', '/api/admin/settings', { ...s, returns: { minPrice: 0 } });
      const b = (await user('GET', `/api/products/${Bp.slug}`)).json; const bp = (b.product || b).returnPolicy;
      await admin('PUT', '/api/admin/settings', { ...s, returns: { minPrice: 1000 } });
      assert(bp.days > 0, `still ${JSON.stringify(bp)}`);
    });
    await check('Browser: customer sees Return items, submits a request, and sees its status', async () => {
      const o3 = await place([{ productId: A.id, qty: 1 }]); await deliver(o3);
      const { chromium } = require('playwright');
      const browser = await chromium.launch();
      try {
        const page = await (await browser.newContext()).newPage();
        const errs = []; page.on('pageerror', (e) => errs.push(e.message));
        await page.goto(`${B}/login.html`);
        await page.evaluate(() => fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'user@demo.com', password: 'User@123' }) }));
        await page.goto(`${B}/account.html#orders`);
        const btn = page.locator(`[data-return="${o3.id}"]`);
        await btn.waitFor({ timeout: 10000 });
        await btn.click();
        await page.waitForSelector('#return-form');
        await page.check('input[name=pick]'); await page.selectOption('#r-reason', 'Wrong item received'); await page.fill('#r-upi', 'priya@okaxis');
        await page.click('#r-submit');
        await page.waitForSelector('#return-form', { state: 'detached', timeout: 10000 });
        await page.waitForSelector(`article:has-text("${o3.orderNo}") .badge:text("Requested")`, { timeout: 10000 });
        assert(!errs.length, `page errors: ${errs.join('; ')}`);
      } finally { await browser.close(); }
    });
    await check('Admin Returns page and order detail load without errors', async () => {
      const { chromium } = require('playwright');
      const browser = await chromium.launch();
      try {
        const page = await (await browser.newContext()).newPage();
        const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
        await page.goto(`${B}/admin/login.html`);
        await page.evaluate(() => fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@demo.com', password: 'Admin@123' }) }));
        await page.goto(`${B}/admin/returns.html`);
        await page.waitForSelector('#rows tr [data-open]', { timeout: 10000 });
        await page.click('#rows [data-open] >> nth=0');
        await page.waitForSelector('.modal.open .kv');
        assert(!errs.length, `errors: ${errs.join('; ')}`);
      } finally { await browser.close(); }
    });
  } finally { server.kill(); }
  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} checks passed`);
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'reset-data.js')], { stdio: 'ignore' });
  process.exit(pass === results.length ? 0 : 1);
})();
