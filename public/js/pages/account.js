import { initPage, requireLogin } from '../lib/page.js';
import { get, post, put, del } from '../lib/api.js';
import { esc, inr, date, dateTime, statusBadge } from '../lib/format.js';
import { logout } from '../lib/session.js';
import { addressCard, openAddressForm, formatAddress } from '../components/addressForm.js';
import { toast } from '../components/toast.js';

const s = await initPage({ active: 'account' });
if (!requireLogin(s)) await new Promise(() => {});
const panel = document.getElementById('acc-panel');
document.getElementById('hello').textContent = `Namaste, ${s.user.name.split(' ')[0]} 👋`;
if (new URLSearchParams(location.search).get('welcome')) toast('Welcome! Your account is ready. Check your email (outbox) for a welcome offer.', { type: 'success', timeout: 6000 });
const FLOW = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Out for delivery', 'Delivered'];

const tabs = {
  async orders() {
    const orders = await get('/api/account/orders');
    if (!orders.length) return `<div class="card empty"><div class="emoji">📦</div><h2>No orders yet</h2><a class="btn" href="/products.html">Start shopping</a></div>`;
    return `<h2 style="font-size:1.3rem">Your orders</h2>${orders.map((o) => {
      const idx = FLOW.indexOf(o.status);
      return `<article class="order-card"><div class="row between"><div><strong>${esc(o.orderNo)}</strong> <span class="small muted">· ${date(o.createdAt)}</span></div><div class="row" style="gap:6px">${statusBadge(o.status)}${statusBadge(o.paymentStatus)}</div></div>
      <div class="row mt-4" style="gap:8px">${o.items.slice(0, 4).map((i) => `<img src="${i.image}" alt="${esc(i.name)}" title="${esc(i.name)}" style="width:52px;height:52px;border-radius:8px">`).join('')}<span class="small muted">${o.items.reduce((a, i) => a + i.qty, 0)} item(s) · <strong style="color:var(--c-text)">${inr(o.totals.total)}</strong> · ${o.paymentMethod === 'COD' ? 'COD' : 'Online'}</span></div>
      ${idx >= 0 ? `<ol class="timeline" aria-label="Order progress">${FLOW.map((st, i) => `<li class="${i <= idx ? 'done' : ''} ${i === idx ? 'current' : ''}">${st}</li>`).join('')}</ol>` : `<p class="small mt-4">${o.status === 'Pending Payment' ? `Payment pending — <a href="/payment.html?order=${o.id}">complete payment</a>` : `This order was ${esc(o.status.toLowerCase())}.`}</p>`}
      <details><summary class="small" style="cursor:pointer;font-weight:600">Order details & tracking history</summary><div class="small mt-4">
        ${o.items.map((i) => `<div class="row between"><a href="/product/${i.slug}">${esc(i.name)} × ${i.qty}</a><span>${inr(i.lineTotal)}</span></div>`).join('')}
        <hr class="divider"><p><strong>Deliver to:</strong> ${esc(o.shippingAddress.name)}, ${formatAddress(o.shippingAddress)}</p>
        ${o.tracking ? `<p><strong>Courier:</strong> ${esc(o.tracking.courier)} · AWB ${esc(o.tracking.awb)}</p>` : ''}
        <ul>${o.statusHistory.slice().reverse().map((h) => `<li>${esc(h.status)} — ${dateTime(h.at)}${h.note ? ` · ${esc(h.note)}` : ''}</li>`).join('')}</ul>
        <div class="row">${['Placed', 'Confirmed', 'Pending Payment'].includes(o.status) ? `<button class="btn btn-sm btn-light" data-cancel="${o.id}">Cancel order</button>` : ''}${o.status !== 'Pending Payment' ? `<a class="btn btn-sm btn-light" href="/order-confirmation.html?order=${o.id}">View summary</a>` : ''}</div></div></details></article>`;
    }).join('')}`;
  },
  async addresses() {
    const list = await get('/api/account/addresses');
    return `<div class="row between mb-4"><h2 style="font-size:1.3rem" class="mb-0">Saved addresses</h2><button class="btn btn-sm" id="add-addr">+ Add address</button></div>
      <div class="addr-grid">${list.map((a) => addressCard(a)).join('') || '<p class="muted">No addresses saved yet.</p>'}</div>`;
  },
  async profile() {
    const u = await get('/api/account/profile');
    return `<div class="card card-pad" style="max-width:560px"><h2 style="font-size:1.3rem">Profile</h2><form id="profile-form">
      <div class="field"><label for="p-name">Full name</label><input class="input" id="p-name" name="name" value="${esc(u.name)}" required></div>
      <div class="field"><label for="p-email">Email</label><input class="input" id="p-email" value="${esc(u.email)}" disabled><span class="field-hint">Contact support to change your email.</span></div>
      <div class="field"><label for="p-phone">Mobile</label><div class="input-group"><span class="prefix">+91</span><input class="input" id="p-phone" name="phone" value="${esc(u.phone || '')}" inputmode="numeric" maxlength="10"></div></div>
      <p class="xs muted">Member since ${date(u.createdAt)}</p><button class="btn">Save profile</button></form></div>`;
  },
  async security() {
    return `<div class="card card-pad" style="max-width:560px"><h2 style="font-size:1.3rem">Change password</h2><form id="pw-form">
      <div class="field"><label for="cur">Current password</label><input class="input" id="cur" name="current" type="password" autocomplete="current-password" required></div>
      <div class="field"><label for="npw">New password</label><input class="input" id="npw" name="password" type="password" autocomplete="new-password" required><span class="field-hint">At least 8 characters with letters and numbers</span></div>
      <button class="btn">Update password</button></form></div>`;
  },
};

async function show(tab) {
  if (tab === 'logout') return logout();
  if (!tabs[tab]) tab = 'orders';
  document.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  panel.innerHTML = '<div class="skeleton" style="height:200px"></div>';
  panel.innerHTML = await tabs[tab]();
  if (location.hash !== `#${tab}`) history.replaceState(null, '', `#${tab}`);
}
document.querySelector('.side-nav').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab); };
window.addEventListener('hashchange', () => show(location.hash.slice(1)));

panel.addEventListener('click', async (e) => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.id === 'add-addr') openAddressForm(null, { onSaved: () => { toast('Address saved', { type: 'success' }); show('addresses'); } });
  if (t.dataset.edit) { const list = await get('/api/account/addresses'); openAddressForm(list.find((a) => a.id === t.dataset.edit), { onSaved: () => { toast('Address updated', { type: 'success' }); show('addresses'); } }); }
  if (t.dataset.del && confirm('Delete this address?')) { await del(`/api/account/addresses/${t.dataset.del}`); toast('Address deleted'); show('addresses'); }
  if (t.dataset.default) { await post(`/api/account/addresses/${t.dataset.default}/default`); show('addresses'); }
  if (t.dataset.cancel && confirm('Cancel this order?')) { try { await post(`/api/account/orders/${t.dataset.cancel}/cancel`); toast('Order cancelled', { type: 'success' }); show('orders'); } catch (err) { toast(err.message, { type: 'error' }); } }
});
panel.addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target));
  try {
    if (e.target.id === 'profile-form') { await put('/api/account/profile', d); toast('Profile saved', { type: 'success' }); }
    if (e.target.id === 'pw-form') { await put('/api/auth/password', d); toast('Password updated', { type: 'success' }); e.target.reset(); }
  } catch (err) { toast(err.message, { type: 'error' }); }
});
show(location.hash.slice(1) || 'orders');
