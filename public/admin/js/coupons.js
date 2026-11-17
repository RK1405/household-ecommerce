import { initAdmin } from './layout.js';
import { get, post, put, del } from '/js/lib/api.js';
import { esc, inr, date, statusBadge } from '/js/lib/format.js';
import { openForm, confirmDialog, toast, empty } from './ui.js';

await initAdmin('coupons', 'Coupons');
const cats = (await get('/api/admin/categories')).filter((c) => !c.parentId);
let list = [];
async function load() {
  list = await get('/api/admin/coupons');
  document.getElementById('rows').innerHTML = list.map((c) => `<tr><td><span class="code" style="font-size:14px;font-weight:800">${esc(c.code)}</span> ${c.highlight ? '<span class="badge badge-deal">Highlight</span>' : ''}<br><span class="xs muted">${esc(c.description)}</span></td>
    <td>${c.type === 'percent' ? `${c.value}%${c.maxDiscount ? ` (max ${inr(c.maxDiscount)})` : ''}` : `Flat ${inr(c.value)}`}</td>
    <td class="small">Min order ${inr(c.minOrder)}<br>${c.categories.length ? `Only: ${esc(c.categories.map((s) => cats.find((x) => x.slug === s)?.name || s).join(', '))}` : 'All categories'}<br>Per user: ${c.perUserLimit || '∞'} · Total: ${c.usageLimit || '∞'}</td>
    <td class="small">${date(c.startAt)} → ${date(c.endAt)}</td><td class="num">${c.usedCount}</td>
    <td>${c.live ? statusBadge('live') : c.active ? (Date.parse(c.startAt) > Date.now() ? statusBadge('scheduled') : statusBadge('ended')) : statusBadge('paused')}</td>
    <td class="nowrap"><button class="btn btn-sm btn-light" data-edit="${c.id}">Edit</button> <button class="btn btn-sm btn-ghost" data-del="${c.id}" aria-label="Delete ${esc(c.code)}">🗑️</button></td></tr>`).join('') || empty('No coupons', 7);
}
function form(c) {
  openForm({
    title: c ? `Edit ${c.code}` : 'New coupon',
    values: c || { type: 'percent', active: true, minOrder: 0, perUserLimit: 1, startAt: new Date().toISOString(), endAt: new Date(Date.now() + 30 * 864e5).toISOString(), categories: [] },
    fields: [
      { name: 'code', label: 'Code', required: true, hint: '3–20 letters/numbers, e.g. DIWALI20' },
      { name: 'type', label: 'Type', type: 'select', options: [['percent', 'Percentage (%)'], ['flat', 'Flat amount (₹)']] },
      { name: 'value', label: 'Value', type: 'number', min: 1, required: true },
      { name: 'maxDiscount', label: 'Maximum discount (₹)', type: 'number', min: 0, hint: 'For percentage coupons' },
      { name: 'minOrder', label: 'Minimum order value (₹)', type: 'number', min: 0 },
      { name: 'description', label: 'Description (shown to customers)' },
      { name: 'startAt', label: 'Valid from', type: 'datetime' }, { name: 'endAt', label: 'Valid until', type: 'datetime' },
      { name: 'usageLimit', label: 'Overall usage limit', type: 'number', min: 0, hint: 'Blank = unlimited' },
      { name: 'perUserLimit', label: 'Uses per customer', type: 'number', min: 0 },
      { name: 'categories', label: 'Restrict to categories (none = all)', type: 'checks', options: cats.map((x) => [x.slug, x.name]) },
      { name: 'active', label: 'Active', type: 'checkbox' }, { name: 'highlight', label: 'Highlight on home page', type: 'checkbox' },
    ],
    onSubmit: async (v) => { if (c) await put(`/api/admin/coupons/${c.id}`, v); else await post('/api/admin/coupons', v); toast('Coupon saved', { type: 'success' }); load(); },
  });
}
document.getElementById('new').onclick = () => form(null);
document.getElementById('rows').onclick = async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.edit) form(list.find((x) => x.id === b.dataset.edit));
  if (b.dataset.del && await confirmDialog('Delete this coupon?')) { await del(`/api/admin/coupons/${b.dataset.del}`); toast('Deleted'); load(); }
};
load();
