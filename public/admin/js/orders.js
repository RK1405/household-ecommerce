import { initAdmin } from './layout.js';
import { get, post } from '/js/lib/api.js';
import { esc, inr, inr2, date, dateTime, statusBadge, debounce } from '/js/lib/format.js';
import { openModal, closeModal, toast, empty } from './ui.js';
import { formatAddress } from '/js/components/addressForm.js';

await initAdmin('orders', 'Orders');
let page = 1;
const val = (id) => document.getElementById(id).value;

async function load() {
  const p = new URLSearchParams({ q: val('q'), status: val('status'), payment: val('payment'), from: val('from'), to: val('to'), page });
  const r = await get(`/api/admin/orders?${p}`);
  const sel = document.getElementById('status');
  if (sel.options.length === 1) sel.insertAdjacentHTML('beforeend', r.statuses.map((s) => `<option>${s}</option>`).join(''));
  document.getElementById('export').href = `/api/admin/orders/export.csv?${p}`;
  document.getElementById('count').textContent = `${r.total} orders`;
  document.getElementById('rows').innerHTML = r.items.map((o) => `<tr><td><button class="link-btn" data-open="${o.id}">${esc(o.orderNo)}</button></td><td class="small">${dateTime(o.createdAt)}</td><td>${esc(o.customer.name)}<br><span class="xs muted">${esc(o.customer.email)}</span></td><td class="small">${esc(o.shippingAddress?.city || '')}</td><td class="num">${o.items.reduce((a, i) => a + i.qty, 0)}</td><td class="small">${o.paymentMethod === 'COD' ? 'COD' : 'Online'} ${statusBadge(o.paymentStatus)}</td><td>${statusBadge(o.status)}</td><td class="num"><strong>${inr(o.totals.total)}</strong></td><td><button class="btn btn-sm btn-light" data-open="${o.id}">View</button></td></tr>`).join('') || empty('No orders found', 9);
  document.getElementById('pager').innerHTML = r.pages > 1 ? Array.from({ length: r.pages }, (_, i) => `<button data-page="${i + 1}" ${i + 1 === r.page ? 'aria-current="page"' : ''}>${i + 1}</button>`).join('') : '';
}

async function openOrder(id) {
  const o = await get(`/api/admin/orders/${id}`);
  const m = openModal(`Order ${o.orderNo}`, `
    <div class="row between"><div>${statusBadge(o.status)} ${statusBadge(o.paymentStatus)} <span class="small muted">placed ${dateTime(o.createdAt)}</span></div><a class="btn btn-sm btn-light" href="/admin/invoice.html?id=${o.id}" target="_blank" rel="noopener">🧾 Print GST invoice</a></div>
    <div class="a-grid half mt-4">
      <div class="panel"><h2>Customer & delivery</h2><dl class="kv"><dt>Name</dt><dd>${esc(o.customer.name)}</dd><dt>Email</dt><dd>${esc(o.customer.email)}</dd><dt>Phone</dt><dd>+91 ${esc(o.customer.phone || o.shippingAddress.phone)}</dd><dt>Ship to</dt><dd>${esc(o.shippingAddress.name)}, ${formatAddress(o.shippingAddress)} ${o.shippingAddress.mapsUrl ? `<a href="${esc(o.shippingAddress.mapsUrl)}" target="_blank" rel="noopener">📍 map</a>` : ''}</dd><dt>Delivery</dt><dd>${esc(o.deliveryMethod)}</dd>${o.gstin ? `<dt>GSTIN</dt><dd>${esc(o.gstin)}</dd>` : ''}${o.tracking ? `<dt>Tracking</dt><dd>${esc(o.tracking.courier)} · ${esc(o.tracking.awb)}</dd>` : ''}</dl></div>
      <div class="panel"><h2>Update status</h2>
        ${o.allowedNext.length ? `<form id="status-form"><div class="field"><label for="ns">Move to</label><select class="input" id="ns" name="status">${o.allowedNext.map((s) => `<option>${s}</option>`).join('')}</select></div><div class="field"><label for="nn">Note (optional, internal)</label><input class="input" id="nn" name="note" maxlength="300"></div><button class="btn">Update status</button><p class="xs muted mt-4">Shipped, Out for delivery, Delivered, Cancelled and Returned send the matching email to the customer (outbox in demo mode). Cancelling/returning a paid online order auto-refunds via the payment provider.</p></form>` : '<p class="muted">This order is closed.</p>'}
        <h2 class="mt-4">History</h2><ul class="list-plain">${o.statusHistory.slice().reverse().map((h) => `<li>${statusBadge(h.status)} <span class="xs muted">${dateTime(h.at)}${h.by ? ` · ${esc(h.by)}` : ''}</span>${h.note ? `<br><span class="small">${esc(h.note)}</span>` : ''}</li>`).join('')}</ul></div>
    </div>
    <div class="panel mt-4"><h2>Items</h2><div class="table-wrap"><table class="table"><thead><tr><th></th><th>Product</th><th class="num">Price</th><th class="num">Qty</th><th class="num">GST</th><th class="num">Total</th></tr></thead><tbody>${o.items.map((i) => `<tr><td><img class="thumb" src="${esc(i.image)}" alt=""></td><td>${esc(i.name)}<br><span class="xs muted">${esc(i.sku)}</span></td><td class="num">${inr(i.price)}</td><td class="num">${i.qty}</td><td class="num">${i.gstRate}%</td><td class="num">${inr(i.lineTotal)}</td></tr>`).join('')}</tbody></table></div>
      <dl class="kv" style="justify-content:end;margin-top:10px"><dt>Subtotal</dt><dd>${inr(o.totals.subtotal)}</dd>${o.totals.discount ? `<dt>Coupon ${esc(o.totals.couponCode)}</dt><dd>− ${inr(o.totals.discount)}</dd>` : ''}<dt>Delivery</dt><dd>${inr(o.totals.delivery)}</dd><dt>GST incl.</dt><dd>${inr2(o.totals.gst)}</dd><dt><strong>Total</strong></dt><dd><strong>${inr(o.totals.total)}</strong></dd></dl></div>
    <div class="a-grid half mt-4">
      <div class="panel"><h2>Payments</h2>${o.payments.length ? `<ul class="list-plain">${o.payments.map((p) => `<li><a href="/admin/payments.html?id=${p.id}">${esc(p.id)}</a> · ${esc(p.method)} · ${inr(p.amount)} ${statusBadge(p.status)}</li>`).join('')}</ul>` : `<p class="small muted">${o.paymentMethod === 'COD' ? 'Cash on Delivery — collected on delivery.' : 'No payment attempts yet.'}</p>`}
        <h2 class="mt-4">Emails sent</h2><ul class="list-plain">${o.emails.map((e) => `<li><a href="/api/admin/outbox/${e.id}" target="_blank" rel="noopener">${esc(e.label)}</a> <span class="xs muted">${dateTime(e.createdAt)}</span></li>`).join('') || '<li class="muted">None</li>'}</ul></div>
      <div class="panel"><h2>Notes</h2><ul class="list-plain">${(o.notes || []).map((n) => `<li>${esc(n.text)}<br><span class="xs muted">${esc(n.by)} · ${dateTime(n.at)}</span></li>`).join('') || '<li class="muted">No notes yet</li>'}</ul>
        <form id="note-form" class="row mt-4"><label for="note-text" class="sr-only">Add note</label><input class="input" id="note-text" name="text" placeholder="Add an internal note" style="flex:1" maxlength="500"><button class="btn btn-sm">Add</button></form></div>
    </div>`);
  m.querySelector('#status-form')?.addEventListener('submit', async (e) => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    try { await post(`/api/admin/orders/${o.id}/status`, d); toast(`Order moved to ${d.status}`, { type: 'success' }); await openOrder(o.id); load(); } catch (err) { toast(err.message, { type: 'error' }); }
  });
  m.querySelector('#note-form').addEventListener('submit', async (e) => {
    e.preventDefault(); const t = e.target.text.value.trim(); if (!t) return;
    await post(`/api/admin/orders/${o.id}/notes`, { text: t }); toast('Note added', { type: 'success' }); openOrder(o.id);
  });
}

document.getElementById('rows').onclick = (e) => { const b = e.target.closest('[data-open]'); if (b) openOrder(b.dataset.open); };
document.getElementById('pager').onclick = (e) => { const b = e.target.closest('[data-page]'); if (b) { page = Number(b.dataset.page); load(); } };
['q', 'status', 'payment', 'from', 'to'].forEach((id) => document.getElementById(id).addEventListener(id === 'q' ? 'input' : 'change', debounce(() => { page = 1; load(); }, 250)));
await load();
const pre = new URLSearchParams(location.search).get('id'); if (pre) openOrder(pre);
export { closeModal };
