import { initAdmin } from './layout.js';
import { get, post, put, del } from '/js/lib/api.js';
import { esc, inr, dateTime, statusBadge } from '/js/lib/format.js';
import { openForm, confirmDialog, toast, empty } from './ui.js';

await initAdmin('promotions', 'Promotions & discounts');
const [cats, products] = await Promise.all([get('/api/admin/categories'), get('/api/admin/products')]);
let list = [];
async function load() {
  list = await get('/api/admin/promotions');
  document.getElementById('rows').innerHTML = list.map((p) => `<tr><td><strong>${esc(p.name)}</strong> ${p.dealOfDay ? '<span class="badge badge-deal">Deal of the day</span>' : ''}</td>
    <td class="small">${p.scope === 'category' ? `Category: ${esc(cats.find((c) => c.slug === p.category)?.name || p.category)}` : `Products: ${esc(p.products.join(', '))}`}</td>
    <td>${p.discountType === 'percent' ? `${p.value}%` : inr(p.value)}</td><td><span class="badge badge-promo">${esc(p.badge || '—')}</span></td>
    <td class="small">${dateTime(p.startAt)}<br>→ ${dateTime(p.endAt)}</td><td>${statusBadge(p.state)}</td>
    <td class="nowrap"><button class="btn btn-sm btn-light" data-edit="${p.id}">Edit</button> <button class="btn btn-sm btn-ghost" data-del="${p.id}" aria-label="Delete">🗑️</button></td></tr>`).join('') || empty('No promotions', 7);
}
function form(p) {
  const f = openForm({
    title: p ? `Edit ${p.name}` : 'New promotion',
    values: p || { scope: 'category', discountType: 'percent', active: true, startAt: new Date().toISOString(), endAt: new Date(Date.now() + 7 * 864e5).toISOString(), productIds: [] },
    fields: [
      { name: 'name', label: 'Name', required: true, span: true },
      { name: 'scope', label: 'Applies to', type: 'select', options: [['category', 'A whole category / subcategory'], ['product', 'Specific products']] },
      { name: 'category', label: 'Category', type: 'select', options: [['', '—'], ...cats.map((c) => [c.slug, `${c.parentId ? '— ' : ''}${c.name}`])] },
      { name: 'discountType', label: 'Discount type', type: 'select', options: [['percent', 'Percentage (%)'], ['flat', 'Flat (₹ per item)']] },
      { name: 'value', label: 'Value', type: 'number', min: 1, required: true },
      { name: 'badge', label: 'Badge text', maxlength: 30, hint: 'e.g. Festive 10% off' },
      { name: 'startAt', label: 'Starts', type: 'datetime', required: true }, { name: 'endAt', label: 'Ends', type: 'datetime', required: true },
      { name: 'productIds', label: 'Products (for "Specific products")', type: 'checks', options: products.map((x) => [x.id, x.name]) },
      { name: 'dealOfDay', label: 'Feature as “Deal of the day”', type: 'checkbox' }, { name: 'active', label: 'Active', type: 'checkbox' },
    ],
    onSubmit: async (v) => { if (p) await put(`/api/admin/promotions/${p.id}`, v); else await post('/api/admin/promotions', v); toast('Promotion saved', { type: 'success' }); load(); },
  });
  return f;
}
document.getElementById('new').onclick = () => form(null);
document.getElementById('rows').onclick = async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.edit) form(list.find((x) => x.id === b.dataset.edit));
  if (b.dataset.del && await confirmDialog('Delete this promotion?')) { await del(`/api/admin/promotions/${b.dataset.del}`); toast('Deleted'); load(); }
};
load();
