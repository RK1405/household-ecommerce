import { initAdmin } from './layout.js';
import { get, post } from '/js/lib/api.js';
import { esc, inr, dateTime, debounce } from '/js/lib/format.js';
import { openModal, closeModal, openForm, toast, empty } from './ui.js';

await initAdmin('returns', 'Returns');
const TONE = { Requested: 'info', Approved: 'success', Received: 'warning', Refunded: 'muted', Rejected: 'danger', Cancelled: 'muted' };
const badge = (s) => `<span class="badge badge-${TONE[s] || 'muted'}">${esc(s)}</span>`;
const st = document.getElementById('st');

async function load() {
  const p = new URLSearchParams({ q: document.getElementById('q').value, status: st.value });
  const r = await get(`/api/admin/returns?${p}`);
  if (st.options.length === 1) st.insertAdjacentHTML('beforeend', r.statuses.map((s) => `<option>${s}</option>`).join(''));
  document.getElementById('counts').innerHTML = ['Requested', 'Approved', 'Received', 'Refunded'].map((s) => `<div class="kpi"><div class="label">${s}</div><div class="value">${r.counts[s] || 0}</div></div>`).join('');
  document.getElementById('rows').innerHTML = r.items.map((x) => `<tr><td><button class="link-btn" data-open="${x.id}">${esc(x.returnNo)}</button><br><span class="xs muted">${dateTime(x.createdAt)}</span></td><td><a href="/admin/orders.html?id=${x.orderId}">${esc(x.orderNo)}</a></td><td>${esc(x.customer.name)}<br><span class="xs muted">${esc(x.customer.email)}</span></td><td class="small">${x.items.map((i) => `${esc(i.name)} × ${i.qty}`).join('<br>')}</td><td class="small">${esc(x.reason)}</td><td class="small">${x.paymentMethod === 'COD' ? 'COD' : 'Online'}</td><td class="num"><strong>${inr(x.refundAmount)}</strong></td><td>${badge(x.status)}</td><td><button class="btn btn-sm btn-light" data-open="${x.id}">Open</button></td></tr>`).join('') || empty('No return requests', 9);
}

async function open(id) {
  const x = await get(`/api/admin/returns/${id}`);
  const actions = {
    Requested: '<button class="btn" id="a-approve">Approve</button> <button class="btn btn-danger" id="a-reject">Reject…</button>',
    Approved: '<button class="btn" id="a-receive">Mark items received…</button>',
    Received: x.paymentMethod === 'COD' ? `<button class="btn" id="a-payout">Record UPI refund…</button>` : '<span class="small muted">Refund is being processed.</span>',
  }[x.status] || '';
  const m = openModal(`Return ${x.returnNo}`, `<div class="row between"><div>${badge(x.status)} <span class="small muted">requested ${dateTime(x.createdAt)}</span></div><a class="btn btn-sm btn-light" href="/admin/orders.html?id=${x.orderId}">Order ${esc(x.orderNo)}</a></div>
    <div class="grid-2 mt-4">
      <div class="panel"><h2>Request</h2><dl class="kv"><dt>Customer</dt><dd>${esc(x.customer.name)} · ${esc(x.customer.email)}${x.customer.phone ? ` · +91 ${esc(x.customer.phone)}` : ''}</dd><dt>Reason</dt><dd>${esc(x.reason)}</dd>${x.comment ? `<dt>Details</dt><dd>${esc(x.comment)}</dd>` : ''}<dt>Pick up from</dt><dd>${esc(x.pickupAddress.name)}, ${esc(x.pickupAddress.line1)}${x.pickupAddress.line2 ? ', ' + esc(x.pickupAddress.line2) : ''}, ${esc(x.pickupAddress.city)}, ${esc(x.pickupAddress.state)} – ${esc(x.pickupAddress.pincode)}</dd><dt>Payment</dt><dd>${x.paymentMethod === 'COD' ? `Cash on Delivery — refund to UPI <strong>${esc(x.upiId)}</strong>` : 'Online — refunded to the original payment method'}</dd></dl></div>
      <div class="panel"><h2>Items & refund</h2><ul class="list-plain">${x.items.map((i) => `<li>${esc(i.name)} × ${i.qty} <span class="muted">— ${inr(i.lineRefund)}</span></li>`).join('')}</ul><p class="mt-4"><strong>Refund total: ${inr(x.refundAmount)}</strong><br><span class="xs muted">Based on what the customer paid (coupon share included, delivery charge not refunded).</span></p>${x.refund ? `<p class="small">Refunded: ${esc(x.refund.id)}${x.refund.upiId ? ` to ${esc(x.refund.upiId)}` : ''}</p>` : ''}</div>
    </div>
    <div class="mt-4">${actions}</div>
    <h3 class="mt-4">History</h3><ul class="list-plain">${x.history.slice().reverse().map((h) => `<li>${badge(h.status)} <span class="xs muted">${dateTime(h.at)} · ${esc(h.by || '')}</span>${h.note ? `<br><span class="small">${esc(h.note)}</span>` : ''}</li>`).join('')}</ul>`);
  const run = (path, body, msg) => async () => { try { await post(`/api/admin/returns/${x.id}/${path}`, body); toast(msg, { type: 'success' }); closeModal(); load(); } catch (e) { toast(e.message, { type: 'error' }); } };
  m.querySelector('#a-approve')?.addEventListener('click', () => openForm({ title: 'Approve return', submitLabel: 'Approve and email customer', intro: '<p class="small muted">The customer is told pickup is free and that the refund follows after you receive and check the items. Arrange the courier pickup yourself.</p>', fields: [{ name: 'note', label: 'Note for the customer (optional)', type: 'textarea', span: true }], onSubmit: async (v) => { await post(`/api/admin/returns/${x.id}/approve`, v); toast('Return approved — email sent', { type: 'success' }); load(); } }));
  m.querySelector('#a-reject')?.addEventListener('click', () => openForm({ title: 'Reject return', submitLabel: 'Reject and email customer', fields: [{ name: 'note', label: 'Reason shown to the customer', type: 'textarea', required: true, span: true }], onSubmit: async (v) => { await post(`/api/admin/returns/${x.id}/reject`, v); toast('Return rejected — email sent', { type: 'success' }); load(); } }));
  m.querySelector('#a-receive')?.addEventListener('click', () => openForm({ title: 'Items received', submitLabel: x.paymentMethod === 'ONLINE' ? 'Confirm and refund' : 'Confirm received', intro: x.paymentMethod === 'ONLINE' ? `<p class="small muted">This refunds ${inr(x.refundAmount)} to the customer's original payment method straight away.</p>` : `<p class="small muted">Next you record the UPI refund you send to ${esc(x.upiId)}.</p>`, values: { restock: true }, fields: [{ name: 'restock', label: 'Add the items back to stock (untick if damaged)', type: 'checkbox', span: true }, { name: 'note', label: 'Inspection note (internal)', type: 'textarea', span: true }], onSubmit: async (v) => { await post(`/api/admin/returns/${x.id}/receive`, v); toast(x.paymentMethod === 'ONLINE' ? 'Refund processed — email sent' : 'Marked received', { type: 'success' }); load(); } }));
  m.querySelector('#a-payout')?.addEventListener('click', () => openForm({ title: 'Record UPI refund', submitLabel: 'Save and email customer', intro: `<p class="small">Pay <strong>${inr(x.refundAmount)}</strong> to UPI ID <strong>${esc(x.upiId)}</strong> from your own UPI app, then enter the transaction reference here.</p>`, fields: [{ name: 'reference', label: 'UPI transaction reference', required: true, span: true }], onSubmit: async (v) => { await post(`/api/admin/returns/${x.id}/payout`, v); toast('Refund recorded — email sent', { type: 'success' }); load(); } }));
}
document.getElementById('rows').onclick = (e) => { const b = e.target.closest('[data-open]'); if (b) open(b.dataset.open); };
document.getElementById('q').oninput = debounce(load, 250);
st.onchange = load;
const want = new URLSearchParams(location.search).get('id');
await load();
if (want) open(want);
