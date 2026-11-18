'use strict';
/**
 * Razorpay integration test against a MOCK Razorpay API (no network, no real keys).
 *   node tests/razorpay.test.js
 * Starts a fake api.razorpay.com, starts the store with PAYMENT_PROVIDER=razorpay, and drives the real HTTP API:
 * order creation, Checkout init, signature verify + capture, tamper/amount-mismatch rejection, webhook safety net,
 * failed attempts and refund on cancel. Resets the data (JSON provider unless DATA_PROVIDER is set).
 */
const http = require('http');
const crypto = require('crypto');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const APP = 3120, MOCK = 3121, B = `http://localhost:${APP}`;
const KEY = 'rzp_test_mockkey', SECRET = 'mock_secret_value', WH = 'mock_webhook_secret';
const results = [];
const assert = (c, m) => { if (!c) throw new Error(m); };
async function check(name, fn) { try { await fn(); results.push(true); console.log(`  ✔ ${name}`); } catch (e) { results.push(false); console.log(`  ✘ ${name}\n      ${e.message}`); } }

// ---------- mock Razorpay ----------
const orders = new Map(), payments = new Map(), calls = [];
const mock = http.createServer((req, res) => {
  let body = ''; req.on('data', (d) => (body += d)); req.on('end', () => {
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    const auth = Buffer.from(`${KEY}:${SECRET}`).toString('base64');
    if (req.headers.authorization !== `Basic ${auth}`) return send(401, { error: { description: 'Authentication failed' } });
    const j = body ? JSON.parse(body) : {}; const u = req.url.replace('/v1', ''); calls.push(`${req.method} ${u}`);
    if (req.method === 'POST' && u === '/orders') { const o = { id: `order_${crypto.randomBytes(5).toString('hex')}`, entity: 'order', amount: j.amount, currency: j.currency, receipt: j.receipt, status: 'created' }; orders.set(o.id, o); return send(200, o); }
    let m;
    if ((m = u.match(/^\/payments\/(\w+)$/)) && req.method === 'GET') return payments.has(m[1]) ? send(200, payments.get(m[1])) : send(404, { error: { description: 'No such payment' } });
    if ((m = u.match(/^\/payments\/(\w+)\/capture$/))) { const p = payments.get(m[1]); if (!p || p.amount !== j.amount) return send(400, { error: { description: 'capture amount mismatch' } }); p.status = 'captured'; return send(200, p); }
    if ((m = u.match(/^\/payments\/(\w+)\/refund$/))) { const p = payments.get(m[1]); if (!p || p.status !== 'captured') return send(400, { error: { description: 'not captured' } }); return send(200, { id: `rfnd_${crypto.randomBytes(4).toString('hex')}`, payment_id: p.id, amount: j.amount, status: 'processed' }); }
    send(404, { error: { description: 'not found' } });
  });
});
const sign = (orderId, payId) => crypto.createHmac('sha256', SECRET).update(`${orderId}|${payId}`).digest('hex');
function makePayment(order, over = {}) {
  const id = `pay_${crypto.randomBytes(6).toString('hex')}`;
  const p = { id, entity: 'payment', order_id: order.gateway.orderId, amount: Math.round(order.totals.total * 100), currency: 'INR', status: 'authorized', method: 'upi', vpa: 'priya@okaxis', ...over };
  payments.set(id, p); return p;
}

// ---------- tiny HTTP client with cookies ----------
function client() {
  let cookie = '';
  return async (method, url, body, headers = {}) => {
    const r = await fetch(B + url, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) });
    const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    const text = await r.text(); let json; try { json = JSON.parse(text); } catch (_) { json = text; }
    return { status: r.status, json };
  };
}

(async () => {
  console.log('Razorpay integration (mock API)');
  await new Promise((r) => mock.listen(MOCK, r));
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'reset-data.js')], { stdio: 'ignore' });
  const server = spawn(process.execPath, ['server.js'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: String(APP), BASE_URL: B, DEMO_MODE: 'true', PAYMENT_PROVIDER: 'razorpay', RAZORPAY_KEY_ID: KEY, RAZORPAY_KEY_SECRET: SECRET, RAZORPAY_WEBHOOK_SECRET: WH, RAZORPAY_API_BASE: `http://localhost:${MOCK}/v1` } });
  server.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
  for (let i = 0; i < 40; i++) { try { if ((await fetch(`${B}/api/health`)).ok) break; } catch (_) { /* wait */ } await new Promise((r) => setTimeout(r, 250)); }

  try {
    const user = client(), admin = client();
    await user('POST', '/api/auth/login', { email: 'user@demo.com', password: 'User@123' });
    await admin('POST', '/api/auth/login', { email: 'admin@demo.com', password: 'Admin@123' });
    const place = async () => {
      await user('POST', '/api/cart/merge', { items: [{ productId: 'p_001', qty: 1 }] });
      const r = await user('POST', '/api/orders', { paymentMethod: 'ONLINE', addressId: 'a_demo1', deliveryMethod: 'standard' });
      assert(r.status === 201, `place order failed: ${JSON.stringify(r.json)}`);
      return r.json.order;
    };
    const state = async (id) => (await user('GET', `/api/payments/order/${id}`)).json;
    let o1;

    await check('Order creation calls Razorpay Orders API (amount in paise) and stores the gateway order id', async () => {
      o1 = await place();
      assert(o1.gateway.provider === 'razorpay' && /^order_/.test(o1.gateway.orderId), 'gateway not razorpay');
      assert(orders.get(o1.gateway.orderId).amount === Math.round(o1.totals.total * 100), 'amount not in paise');
    });
    await check('razorpay-init returns Checkout options (key id, order id, amount, prefill) and never the secret', async () => {
      const r = await user('POST', `/api/payments/${o1.id}/razorpay-init`, {});
      assert(r.status === 200 && r.json.keyId === KEY && r.json.orderId === o1.gateway.orderId && r.json.amount === Math.round(o1.totals.total * 100) && r.json.testMode === true, JSON.stringify(r.json));
      assert(!JSON.stringify(r.json).includes(SECRET), 'secret leaked');
    });
    await check('Dummy-gateway endpoints are disabled while Razorpay is active', async () => {
      assert((await user('POST', `/api/payments/${o1.id}/initiate`, { method: 'UPI', vpa: 'a@b' })).status === 400, 'initiate should be blocked');
    });
    await check('Valid signature: payment is verified with Razorpay, captured, and the order becomes Placed + paid', async () => {
      const p = makePayment(o1);
      const r = await user('POST', '/api/payments/verify', { orderId: o1.id, razorpay_order_id: o1.gateway.orderId, razorpay_payment_id: p.id, razorpay_signature: sign(o1.gateway.orderId, p.id) });
      assert(r.status === 200 && r.json.ok, JSON.stringify(r.json));
      const s = await state(o1.id);
      assert(s.order.paymentStatus === 'paid' && s.order.status === 'Placed', `order ${s.order.status}/${s.order.paymentStatus}`);
      assert(s.payments[0].status === 'captured' && s.payments[0].method === 'UPI' && s.payments[0].id === p.id, 'payment record wrong');
      assert(calls.some((c) => c === `POST /payments/${p.id}/capture`), 'capture not called');
      assert((await user('POST', '/api/payments/verify', { orderId: o1.id, razorpay_order_id: o1.gateway.orderId, razorpay_payment_id: p.id, razorpay_signature: sign(o1.gateway.orderId, p.id) })).status === 200, 'verify not idempotent');
      assert((await state(o1.id)).payments.length === 1, 'duplicate payment record');
    });
    await check('Tampered signature is rejected and the order stays unpaid', async () => {
      const o = await place(); const p = makePayment(o);
      const r = await user('POST', '/api/payments/verify', { orderId: o.id, razorpay_order_id: o.gateway.orderId, razorpay_payment_id: p.id, razorpay_signature: 'f'.repeat(64) });
      assert(r.status === 400, `status ${r.status}`);
      assert((await state(o.id)).order.paymentStatus !== 'paid', 'order was marked paid');
    });
    await check('Valid signature but wrong amount at Razorpay is rejected', async () => {
      const o = await place(); const p = makePayment(o, { amount: 100 });
      const r = await user('POST', '/api/payments/verify', { orderId: o.id, razorpay_order_id: o.gateway.orderId, razorpay_payment_id: p.id, razorpay_signature: sign(o.gateway.orderId, p.id) });
      assert(r.status === 400, `status ${r.status}`);
      assert((await state(o.id)).order.paymentStatus !== 'paid', 'order was marked paid');
    });
    await check('A payment from another order cannot be used to pay this order', async () => {
      const a = await place(), b = await place(); const p = makePayment(a);
      const r = await user('POST', '/api/payments/verify', { orderId: b.id, razorpay_order_id: b.gateway.orderId, razorpay_payment_id: p.id, razorpay_signature: sign(b.gateway.orderId, p.id) });
      assert(r.status === 400, `status ${r.status}`);
    });
    await check('Failed attempt is recorded, order shows payment failed, retry is still possible', async () => {
      const o = await place();
      assert((await user('POST', `/api/payments/${o.id}/razorpay-failed`, { reason: 'Card declined' })).status === 200, 'failed call');
      const s = await state(o.id);
      assert(s.order.paymentStatus === 'failed' && s.payments.some((p) => p.status === 'failed'), 'failure not recorded');
      assert((await user('POST', `/api/payments/${o.id}/razorpay-init`, {})).status === 200, 'cannot retry');
    });
    await check('Webhook: bad signature rejected; payment.captured marks a closed-browser order paid', async () => {
      const o = await place(); const p = makePayment(o, { status: 'captured' });
      const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: p } } });
      assert((await user('POST', '/api/payments/webhook', body, { 'x-razorpay-signature': 'bad' })).status === 400, 'bad signature accepted');
      assert((await user('POST', '/api/payments/webhook', body, { 'x-razorpay-signature': crypto.createHmac('sha256', WH).update(body).digest('hex') })).status === 200, 'good webhook failed');
      const s = await state(o.id);
      assert(s.order.paymentStatus === 'paid' && s.order.status === 'Placed', 'order not paid by webhook');
    });
    await check('Cancelling a paid order refunds through Razorpay', async () => {
      const r = await admin('POST', `/api/admin/orders/${o1.id}/status`, { status: 'Cancelled', note: 'test' });
      assert(r.status === 200, JSON.stringify(r.json));
      await new Promise((x) => setTimeout(x, 800));
      assert(calls.some((c) => /^POST \/payments\/pay_\w+\/refund$/.test(c)), 'refund not called');
      const s = await state(o1.id);
      assert(s.payments[0].status === 'refunded' && s.order.paymentStatus === 'refunded', `${s.payments[0].status}/${s.order.paymentStatus}`);
    });
    await check('Browser: payment page opens Razorpay Checkout, completes payment and lands on the confirmation page', async () => {
      const { chromium } = require('playwright');
      const browser = await chromium.launch();
      try {
        const page = await (await browser.newContext()).newPage();
        const errors = []; page.on('pageerror', (e) => errors.push(e.message));
        await page.exposeFunction('mockPay', (orderId) => {
          const rzOrder = orders.get(orderId); const p = { id: `pay_${crypto.randomBytes(6).toString('hex')}`, entity: 'payment', order_id: orderId, amount: rzOrder.amount, currency: 'INR', status: 'authorized', method: 'card', card: { last4: '1111', network: 'Visa' } };
          payments.set(p.id, p);
          return { razorpay_order_id: orderId, razorpay_payment_id: p.id, razorpay_signature: sign(orderId, p.id) };
        });
        // Stand-in for https://checkout.razorpay.com/v1/checkout.js (real one is hosted by Razorpay)
        await page.route('https://checkout.razorpay.com/v1/checkout.js', (route) => route.fulfill({ contentType: 'application/javascript', body: `window.Razorpay = class { constructor(o){ this.o = o; window.__rzpOptions = o; } on(){} open(){ window.mockPay(this.o.order_id).then((r) => this.o.handler(r)); } };` }));
        await page.goto(`${B}/login.html`);
        await page.evaluate(() => fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'user@demo.com', password: 'User@123' }) }));
        const orderId = await page.evaluate(async () => {
          const j = (m, u, b) => fetch(u, { method: m, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then((r) => r.json());
          await j('POST', '/api/cart/merge', { items: [{ productId: 'p_002', qty: 1 }] });
          const r = await j('POST', '/api/orders', { paymentMethod: 'ONLINE', addressId: 'a_demo1', deliveryMethod: 'standard' }); if (!r.order) throw new Error(JSON.stringify(r)); return r.order.id;
        });
        await page.goto(`${B}/payment.html?order=${orderId}`);
        await page.waitForSelector('#rzp-pay');
        assert(!(await page.locator('#vpa').count()), 'dummy UPI form should not show');
        assert(/Razorpay/.test(await page.locator('.gateway-head').innerText()), 'header should say Razorpay');
        await page.click('#rzp-pay');
        await page.waitForURL(/order-confirmation\.html/, { timeout: 15000 });
        const st = await user('GET', `/api/payments/order/${orderId}`);
        assert(st.json.order.paymentStatus === 'paid', 'order not paid after Checkout');
        assert(!errors.length, `page errors: ${errors.join('; ')}`);
      } finally { await browser.close(); }
    });
  } finally { server.kill(); mock.close(); }
  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} checks passed`);
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'reset-data.js')], { stdio: 'ignore' });
  process.exit(pass === results.length ? 0 : 1);
})();
