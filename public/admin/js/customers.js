import { initAdmin } from './layout.js';
import { get, post, put } from '/js/lib/api.js';
import { esc, inr, date, dateTime, statusBadge, debounce } from '/js/lib/format.js';
import { openModal, toast, empty } from './ui.js';

await initAdmin('customers', 'Customers');
async function load() {
  const r = await get(`/api/admin/customers?q=${encodeURIComponent(document.getElementById('q').value)}&segment=${document.getElementById('seg').value}`);
  document.getElementById('rows').innerHTML = r.items.map((c) => `<tr><td><strong>${esc(c.name)}</strong><br><span class="xs muted">${esc(c.email)}</span></td><td class="small">${esc(c.phone)}</td><td class="small">${esc(c.city)}, ${esc(c.state)}</td><td><span class="badge ${c.segment === 'VIP' ? 'badge-deal' : 'badge-muted'}">${esc(c.segment)}</span></td><td class="num">${c.orders}</td><td class="num">${inr(c.totalSpend)}</td><td class="small">${date(c.lastOrderAt)}</td><td>${statusBadge(c.status)}</td><td><button class="btn btn-sm btn-light" data-view="${c.id}">View</button></td></tr>`).join('') || empty('No customers', 9);
}
async function view(id) {
  const c = await get(`/api/admin/customers/${id}`);
  const m = openModal(c.name, `<div class="mock-banner">Mock record — changes are kept in memory only.</div><dl class="kv"><dt>Email</dt><dd>${esc(c.email)}</dd><dt>Phone</dt><dd>${esc(c.phone)}</dd><dt>Location</dt><dd>${esc(c.city)}, ${esc(c.state)}</dd><dt>Customer since</dt><dd>${date(c.createdAt)}</dd><dt>Orders</dt><dd>${c.orders} · ${inr(c.totalSpend)}</dd></dl>
    <div class="row mt-4"><label for="cs">Status</label><select class="input" id="cs" style="width:auto"><option value="active" ${c.status === 'active' ? 'selected' : ''}>Active</option><option value="blocked" ${c.status === 'blocked' ? 'selected' : ''}>Blocked</option><option value="inactive" ${c.status === 'inactive' ? 'selected' : ''}>Inactive</option></select><button class="btn btn-sm" id="save-st">Save</button></div>
    <h3 class="mt-4">Notes</h3><ul class="list-plain">${c.notes.map((n) => `<li>${esc(n.text)} <span class="xs muted">${dateTime(n.at)}</span></li>`).join('') || '<li class="muted">No notes</li>'}</ul>
    <form class="row mt-4" id="nf"><input class="input" name="text" placeholder="Add a note" style="flex:1" aria-label="Note"><button class="btn btn-sm">Add</button></form>`);
  m.querySelector('#save-st').onclick = async () => { await put(`/api/admin/customers/${id}`, { status: m.querySelector('#cs').value }); toast('Saved (mock)', { type: 'success' }); load(); };
  m.querySelector('#nf').onsubmit = async (e) => { e.preventDefault(); await post(`/api/admin/customers/${id}/notes`, { text: e.target.text.value }); view(id); };
}
async function loadEnq() {
  const list = await get('/api/admin/contacts');
  document.getElementById('enq').innerHTML = list.map((c) => `<tr><td class="small">${dateTime(c.createdAt)}</td><td>${esc(c.name)}<br><span class="xs muted">${esc(c.email)} ${c.phone ? `· ${esc(c.phone)}` : ''}</span></td><td class="small">${esc(c.topic)}${c.orderNo ? `<br>${esc(c.orderNo)}` : ''}</td><td class="small" style="max-width:360px">${esc(c.message)}</td><td>${statusBadge(c.status)}</td><td>${c.status === 'new' ? `<button class="btn btn-sm btn-light" data-resolve="${c.id}">Mark resolved</button>` : ''}</td></tr>`).join('') || empty('No enquiries yet', 6);
}
document.getElementById('rows').onclick = (e) => { const b = e.target.closest('[data-view]'); if (b) view(b.dataset.view); };
document.getElementById('enq').onclick = async (e) => { const b = e.target.closest('[data-resolve]'); if (b) { await put(`/api/admin/contacts/${b.dataset.resolve}`, { status: 'resolved' }); loadEnq(); } };
document.getElementById('q').oninput = debounce(load, 250);
document.getElementById('seg').onchange = load;
load(); loadEnq();
