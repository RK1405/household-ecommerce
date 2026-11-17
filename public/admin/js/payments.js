import { initAdmin } from './layout.js';
import { get, post } from '/js/lib/api.js';
import { esc, inr, dateTime, statusBadge, debounce } from '/js/lib/format.js';
import { openModal, openForm, toast, empty } from './ui.js';

const { cfg } = await initAdmin('payments', 'Payments');
document.getElementById('prov').textContent = cfg.paymentProvider;
async function recon() {
  const r = await get('/api/admin/payments/reconciliation');
  document.getElementById('recon').innerHTML = [['Captured (online)', r.captured], ['Refunded', r.refunded], ['Failed attempts', r.failed], ['COD collected', r.codCollected], ['COD pending', r.codPending]].map(([l, v]) => `<div class="kpi"><div class="lbl">${l}</div><div class="val">${inr(v.amount)}</div><span class="xs muted">${v.count} transactions</span></div>`).join('');
  document.getElementById('mismatch-panel').hidden = !r.mismatches.length;
  document.getElementById('mismatch').innerHTML = r.mismatches.map((m) => `<li>⚠️ <strong>${esc(m.orderNo)}</strong> — ${esc(m.issue)}</li>`).join('');
}
async function load() {
  const p = new URLSearchParams({ q: document.getElementById('q').value, status: document.getElementById('st').value, method: document.getElementById('md').value, from: document.getElementById('from').value, to: document.getElementById('to').value });
  const list = await get(`/api/admin/payments?${p}`);
  document.getElementById('rows').innerHTML = list.map((x) => `<tr><td><button class="link-btn" data-open="${x.id}">${esc(x.id)}</button></td><td><a href="/admin/orders.html?id=${x.orderId}">${esc(x.orderNo)}</a></td><td class="small">${dateTime(x.createdAt)}</td><td>${esc(x.method)}<br><span class="xs muted">${esc(x.vpa || (x.card ? `${x.card.network} •••• ${x.card.last4}` : ''))}</span></td><td class="num">${inr(x.amount)}</td><td>${statusBadge(x.status)}</td><td><button class="btn btn-sm btn-light" data-open="${x.id}">Details</button></td></tr>`).join('') || empty('No transactions', 7);
}
async function open(id) {
  const x = await get(`/api/admin/payments/${id}`);
  const refunded = (x.refunds || []).reduce((a, r) => a + r.amount, 0);
  const m = openModal(`Payment ${x.id}`, `<dl class="kv"><dt>Status</dt><dd>${statusBadge(x.status)}</dd><dt>Order</dt><dd><a href="/admin/orders.html?id=${x.orderId}">${esc(x.order?.orderNo)}</a> · ${esc(x.order?.customer.name)}</dd><dt>Amount</dt><dd>${inr(x.amount)}</dd><dt>Method</dt><dd>${esc(x.method)} ${esc(x.vpa || (x.card ? `${x.card.network} •••• ${x.card.last4}` : ''))}</dd><dt>Gateway order</dt><dd><span class="code">${esc(x.gatewayOrderId)}</span></dd><dt>Provider</dt><dd>${esc(x.provider)}</dd>${x.failureReason ? `<dt>Failure</dt><dd>${esc(x.failureReason)}</dd>` : ''}<dt>Refunded</dt><dd>${inr(refunded)}</dd></dl>
    <h3 class="mt-4">Timeline</h3><ul class="list-plain">${(x.events || []).map((e) => `<li>${statusBadge(e.status)} <span class="xs muted">${dateTime(e.at)}</span>${e.reason ? ` — ${esc(e.reason)}` : ''}${e.amount ? ` — ${inr(e.amount)}` : ''}</li>`).join('')}</ul>
    ${(x.refunds || []).length ? `<h3 class="mt-4">Refunds</h3><ul class="list-plain">${x.refunds.map((r) => `<li>${esc(r.id)} · ${inr(r.amount)} · ${esc(r.reason || '')} <span class="xs muted">${dateTime(r.at)}</span></li>`).join('')}</ul>` : ''}
    ${x.status === 'captured' ? '<button class="btn btn-danger mt-4" id="refund">Issue refund (dummy)</button>' : ''}`);
  m.querySelector('#refund')?.addEventListener('click', () => openForm({ title: 'Refund payment', submitLabel: 'Refund', values: { amount: x.amount - refunded, reason: 'Customer request' }, fields: [{ name: 'amount', label: `Amount (max ${inr(x.amount - refunded)})`, type: 'number', min: 1 }, { name: 'reason', label: 'Reason' }],
    onSubmit: async (v) => { await post(`/api/admin/payments/${x.id}/refund`, v); toast('Refund processed (dummy) — refund email in outbox', { type: 'success' }); load(); recon(); } }));
}
document.getElementById('rows').onclick = (e) => { const b = e.target.closest('[data-open]'); if (b) open(b.dataset.open); };
document.getElementById('q').oninput = debounce(load, 250);
['st', 'md', 'from', 'to'].forEach((i) => (document.getElementById(i).onchange = load));
recon(); await load();
const pre = new URLSearchParams(location.search).get('id'); if (pre) open(pre);
