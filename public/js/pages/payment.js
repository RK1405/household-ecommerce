/** Dummy payment gateway UI (UPI + Card with OTP). Mirrors Razorpay's flow so it can be swapped for Razorpay Checkout. */
import { initPage, requireLogin } from '../lib/page.js';
import { get, post } from '../lib/api.js';
import { esc, inr } from '../lib/format.js';

const s = await initPage();
if (!requireLogin(s)) await new Promise(() => {});
const orderId = new URLSearchParams(location.search).get('order');
const gw = document.getElementById('gateway');
let info;
try { info = await get(`/api/payments/order/${encodeURIComponent(orderId)}`); }
catch (e) { gw.innerHTML = `<div class="gateway-body"><div class="alert alert-danger">${esc(e.message)}</div><a class="btn" href="/account.html#orders">My orders</a></div>`; throw e; }
const o = info.order;
if (o.paymentStatus === 'paid' || o.paymentMethod !== 'ONLINE') location.replace(`/order-confirmation.html?order=${o.id}`);

const head = `<div class="gateway-head"><div><div class="xs" style="opacity:.8">${esc(s.cms.store.name)} · Order ${esc(o.orderNo)}</div><div class="amt">${inr(o.total)}</div></div><div style="text-align:right"><div style="font-weight:800">🔒 DemoPay</div><div class="xs" style="opacity:.8">Test mode</div></div></div>`;
const luhn = (n) => { let sum = 0; const d = n.replace(/\D/g, ''); for (let i = 0; i < d.length; i++) { let x = Number(d[d.length - 1 - i]); if (i % 2) { x *= 2; if (x > 9) x -= 9; } sum += x; } return d.length >= 12 && sum % 10 === 0; };

function choose(tab = 'UPI', error = '') {
  gw.innerHTML = `${head}<div class="gateway-body">
    ${o.paymentStatus === 'failed' && !error ? '<div class="alert alert-warning">Your previous payment attempt failed. No money was deducted — please try again.</div>' : ''}
    ${error ? `<div class="alert alert-danger" role="alert">${esc(error)}</div>` : ''}
    <div class="pay-tabs" role="tablist"><button class="pay-tab" role="tab" aria-selected="${tab === 'UPI'}" data-tab="UPI">📱 UPI</button><button class="pay-tab" role="tab" aria-selected="${tab === 'CARD'}" data-tab="CARD">💳 Debit / Credit card</button></div>
    ${tab === 'UPI' ? `<form id="upi-form" novalidate><div class="field"><label for="vpa">UPI ID / VPA</label><input class="input" id="vpa" name="vpa" placeholder="yourname@okaxis" autocomplete="off" required><span class="field-error" id="vpa-err"></span></div>
        <button class="btn btn-block btn-lg" style="background:#3448b6">Pay ${inr(o.total)}</button></form>
        <div class="test-data mt-4"><strong>Test data:</strong> any valid UPI ID succeeds, e.g. <code data-fill="vpa">priya@okaxis</code>. Use <code data-fill="vpa">fail@upi</code> to simulate a decline.</div>`
    : `<form id="card-form" novalidate>
        <div class="field"><label for="cnum">Card number</label><input class="input" id="cnum" name="number" inputmode="numeric" autocomplete="cc-number" placeholder="4111 1111 1111 1111" maxlength="23"><span class="field-error" data-e="number"></span></div>
        <div class="form-grid cols-2"><div class="field"><label for="cexp">Expiry (MM/YY)</label><input class="input" id="cexp" name="expiry" inputmode="numeric" autocomplete="cc-exp" placeholder="12/29" maxlength="5"><span class="field-error" data-e="expiry"></span></div>
        <div class="field"><label for="ccvv">CVV</label><input class="input" id="ccvv" name="cvv" type="password" inputmode="numeric" autocomplete="cc-csc" placeholder="•••" maxlength="4"><span class="field-error" data-e="cvv"></span></div></div>
        <div class="field"><label for="cname">Name on card</label><input class="input" id="cname" name="name" autocomplete="cc-name" value="${esc(o.customer.name)}"><span class="field-error" data-e="name"></span></div>
        <button class="btn btn-block btn-lg" style="background:#3448b6">Pay ${inr(o.total)}</button></form>
        <div class="test-data mt-4"><strong>Test cards</strong> (any future expiry, any CVV):<br>✅ Success: <code data-fill="card" data-v="4111 1111 1111 1111">4111 1111 1111 1111</code> &nbsp;❌ Decline: <code data-fill="card" data-v="4000 0000 0000 0002">4000 0000 0000 0002</code><br>OTP: <code>123456</code></div>`}
    <p class="xs muted mt-4 mb-0" style="text-align:center"><a href="/account.html#orders">Cancel and go to my orders</a></p></div>`;
  gw.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => choose(b.dataset.tab)));
  gw.querySelectorAll('[data-fill]').forEach((c) => (c.onclick = () => {
    if (c.dataset.fill === 'vpa') gw.querySelector('#vpa').value = c.textContent;
    else { gw.querySelector('#cnum').value = c.dataset.v; gw.querySelector('#cexp').value = '12/30'; gw.querySelector('#ccvv').value = '123'; }
  }));
  if (tab === 'UPI') {
    gw.querySelector('#upi-form').onsubmit = async (e) => {
      e.preventDefault();
      const vpa = gw.querySelector('#vpa').value.trim();
      if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}$/.test(vpa)) { gw.querySelector('#vpa-err').textContent = 'Enter a valid UPI ID, e.g. name@okaxis'; return; }
      busy(e.submitter);
      try { const r = await post(`/api/payments/${o.id}/initiate`, { method: 'UPI', vpa }); upiWait(r, vpa); }
      catch (err) { choose('UPI', err.message); }
    };
  } else {
    const num = gw.querySelector('#cnum'), exp = gw.querySelector('#cexp');
    num.oninput = () => { num.value = num.value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim(); };
    exp.oninput = () => { let v = exp.value.replace(/\D/g, '').slice(0, 4); if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`; exp.value = v; };
    gw.querySelector('#card-form').onsubmit = async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const errs = {};
      if (!luhn(f.number)) errs.number = 'Card number is invalid';
      const m = /^(\d{2})\/(\d{2})$/.exec(f.expiry); if (!m || +m[1] < 1 || +m[1] > 12) errs.expiry = 'Use MM/YY'; else if (new Date(2000 + +m[2], +m[1], 0, 23, 59) < new Date()) errs.expiry = 'Card has expired';
      if (!/^\d{3,4}$/.test(f.cvv)) errs.cvv = '3 or 4 digits';
      if (!f.name.trim()) errs.name = 'Required';
      gw.querySelectorAll('[data-e]').forEach((x) => { x.textContent = errs[x.dataset.e] || ''; });
      if (Object.keys(errs).length) return;
      busy(e.submitter);
      try { const r = await post(`/api/payments/${o.id}/initiate`, { method: 'CARD', card: f }); otp(r, f.number.slice(-4)); }
      catch (err) { choose('CARD', err.message); }
    };
  }
}
const busy = (b) => { if (b) { b.classList.add('is-loading'); b.disabled = true; } };

function upiWait(r, vpa) {
  let left = r.expiresIn || 8;
  gw.innerHTML = `${head}<div class="gateway-body upi-wait"><div class="ring" id="ring" style="--p:100%"><span id="secs">${left}</span></div>
    <h3>Approve the payment on your UPI app</h3><p class="small muted">A collect request of <strong>${inr(o.total)}</strong> was sent to <strong>${esc(vpa)}</strong>. Open your UPI app and approve it.</p>
    <p class="xs muted">(Simulated: it auto-approves in a few seconds.)</p><button class="btn btn-light" id="upi-cancel">Cancel payment</button></div>`;
  const t = setInterval(async () => {
    left--; const ring = document.getElementById('ring'); if (!ring) return clearInterval(t);
    ring.style.setProperty('--p', `${(left / (r.expiresIn || 8)) * 100}%`); document.getElementById('secs').textContent = left;
    if (left <= 0) { clearInterval(t); finish(await post(`/api/payments/pay/${r.paymentId}/upi-status`, {})); }
  }, 1000);
  document.getElementById('upi-cancel').onclick = async () => { clearInterval(t); finish(await post(`/api/payments/pay/${r.paymentId}/upi-status`, { cancelled: true })); };
}

function otp(r, last4) {
  gw.innerHTML = `${head}<div class="gateway-body"><h3>Enter OTP</h3><p class="small muted">Your bank sent a 6-digit OTP to the mobile number linked with card ending ${esc(last4)}. <br><span class="xs">${esc(r.hint || '')}</span></p>
    <form id="otp-form"><div class="field"><label for="otp">One-time password</label><input class="input" id="otp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" style="letter-spacing:.5em;font-size:1.3rem;text-align:center"><span class="field-error" id="otp-err" role="alert"></span></div>
    <button class="btn btn-block btn-lg" style="background:#3448b6">Verify & pay</button></form></div>`;
  const input = document.getElementById('otp'); input.focus();
  document.getElementById('otp-form').onsubmit = async (e) => {
    e.preventDefault(); const b = e.submitter; busy(b);
    try { finish(await post(`/api/payments/pay/${r.paymentId}/otp`, { otp: input.value })); }
    catch (err) { document.getElementById('otp-err').textContent = err.message; b.classList.remove('is-loading'); b.disabled = false; input.select(); }
  };
}

async function finish(res) {
  if (res.status === 'authorised') {
    gw.innerHTML = `${head}<div class="gateway-body upi-wait"><div class="ring" style="--p:100%"><span>⏳</span></div><h3>Verifying payment…</h3></div>`;
    try {
      await post('/api/payments/verify', { razorpay_order_id: res.razorpay_order_id, razorpay_payment_id: res.razorpay_payment_id, razorpay_signature: res.razorpay_signature });
      gw.innerHTML = `${head}<div class="gateway-body" style="text-align:center"><div class="result-icon ok">✓</div><h2>Payment successful</h2><p class="muted">Payment ID ${esc(res.razorpay_payment_id)}</p><p class="small">Redirecting to your order…</p></div>`;
      setTimeout(() => location.replace(`/order-confirmation.html?order=${o.id}`), 1400);
    } catch (e) { failed(e.message); }
  } else failed(res.payment?.failureReason || 'Payment failed');
}

function failed(reason) {
  o.paymentStatus = 'failed';
  gw.innerHTML = `${head}<div class="gateway-body" style="text-align:center"><div class="result-icon fail">✕</div><h2>Payment failed</h2><p class="muted">${esc(reason)}</p><p class="small">No money was deducted. You can try again with another method.</p>
    <div class="row" style="justify-content:center"><button class="btn" id="retry">Retry payment</button><a class="btn btn-light" href="/account.html#orders">My orders</a></div></div>`;
  document.getElementById('retry').onclick = () => choose('UPI');
}

choose('UPI');
