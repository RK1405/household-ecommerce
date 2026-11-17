import { initAdmin } from './layout.js';
import { get, post, del } from '/js/lib/api.js';
import { esc, date, statusBadge, debounce } from '/js/lib/format.js';
import { openForm, confirmDialog, toast, empty } from './ui.js';

await initAdmin('reviews', 'Reviews');
let items = [];
async function load() {
  const p = new URLSearchParams({ q: document.getElementById('q').value, status: document.getElementById('st').value, rating: document.getElementById('rt').value });
  const r = await get(`/api/admin/reviews?${p}`); items = r.items;
  document.getElementById('count').textContent = `${r.total} reviews`;
  document.getElementById('rows').innerHTML = r.items.slice(0, 200).map((x) => `<tr><td class="small"><a href="/product/${x.productSlug}" target="_blank" rel="noopener">${esc(x.productName)}</a></td><td><span class="rating-pill">${x.rating} ★</span></td><td class="small" style="max-width:380px"><strong>${esc(x.title)}</strong><br>${esc(x.body)}${x.reply ? `<br><em class="muted">Reply: ${esc(x.reply.text)}</em>` : ''}</td><td class="small">${esc(x.name)}<br><span class="muted">${date(x.createdAt)}</span></td><td>${statusBadge(x.status)}</td>
    <td class="nowrap">${x.status !== 'approved' ? `<button class="btn btn-sm btn-light" data-mod="approved" data-id="${x.id}">Approve</button>` : ''} ${x.status !== 'rejected' ? `<button class="btn btn-sm btn-light" data-mod="rejected" data-id="${x.id}">Reject</button>` : ''} <button class="btn btn-sm btn-light" data-reply="${x.id}">Reply</button> <button class="btn btn-sm btn-ghost" data-del="${x.id}" aria-label="Delete review">🗑️</button></td></tr>`).join('') || empty('No reviews', 6);
}
document.getElementById('rows').onclick = async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.mod) { await post(`/api/admin/reviews/${b.dataset.id}/moderate`, { status: b.dataset.mod }); toast(`Review ${b.dataset.mod} (mock)`, { type: 'success' }); load(); }
  if (b.dataset.reply) openForm({ title: 'Reply to review', fields: [{ name: 'text', label: 'Public reply', type: 'textarea', span: true, required: true }], values: { text: items.find((x) => x.id === b.dataset.reply)?.reply?.text || '' }, onSubmit: async (v) => { await post(`/api/admin/reviews/${b.dataset.reply}/reply`, v); toast('Reply saved (mock)', { type: 'success' }); load(); } });
  if (b.dataset.del && await confirmDialog('Delete this review?')) { await del(`/api/admin/reviews/${b.dataset.del}`); load(); }
};
document.getElementById('q').oninput = debounce(load, 250);
document.getElementById('st').onchange = load; document.getElementById('rt').onchange = load;
load();
