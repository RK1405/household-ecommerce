import { initAdmin } from './layout.js';
import { api, get, post, put, del } from '/js/lib/api.js';
import { esc, inr, debounce } from '/js/lib/format.js';
import { openForm, confirmDialog, toast, empty } from './ui.js';

await initAdmin('products', 'Products');
const cats = await get('/api/admin/categories');
const top = cats.filter((c) => !c.parentId);
document.getElementById('cat').insertAdjacentHTML('beforeend', top.map((c) => `<option value="${c.slug}">${esc(c.name)}</option>`).join(''));
const params = new URLSearchParams(location.search);
if (params.get('stock')) document.getElementById('stock').value = params.get('stock');
let list = [];

async function load() {
  const p = new URLSearchParams({ q: document.getElementById('q').value, category: document.getElementById('cat').value, stock: document.getElementById('stock').value, status: document.getElementById('status').value });
  list = await get(`/api/admin/products?${p}`);
  document.getElementById('count').textContent = `${list.length} products`;
  document.getElementById('rows').innerHTML = list.map((p) => `<tr>
    <td><img class="thumb" src="${esc(p.images[0])}" alt=""></td>
    <td><a href="/product/${p.slug}" target="_blank" rel="noopener"><strong>${esc(p.name)}</strong></a><br><span class="xs muted">${esc(p.sku)} · ${esc(p.brand)}</span></td>
    <td class="small">${esc(cats.find((c) => c.slug === p.category)?.name || p.category)}<br><span class="muted">${esc(cats.find((c) => c.slug === p.subcategory)?.name || p.subcategory)}</span></td>
    <td class="num">${inr(p.mrp)}</td><td class="num">${inr(p.price)}${p.salePrice ? `<br><span class="xs badge badge-sale">sale ${inr(p.salePrice)}</span>` : ''}</td>
    <td class="num"><strong>${inr(p.pricing.finalPrice)}</strong>${p.pricing.promotion ? `<br><span class="xs muted">${esc(p.pricing.promotion.name)}</span>` : ''}</td>
    <td><input class="input inline-stock" type="number" min="0" value="${p.stock}" data-stock="${p.id}" aria-label="Stock for ${esc(p.name)}">${p.stock <= (p.lowStockThreshold || 5) ? `<br><span class="badge ${p.stock ? 'badge-warning' : 'badge-danger'}">${p.stock ? 'Low' : 'Out'}</span>` : ''}</td>
    <td>${(p.tags || []).map((t) => `<span class="badge badge-muted">${esc(t)}</span>`).join(' ')}</td>
    <td>${p.active !== false ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-muted">Hidden</span>'}</td>
    <td class="nowrap"><button class="btn btn-sm btn-light" data-edit="${p.id}">Edit</button> <button class="btn btn-sm btn-ghost" data-del="${p.id}" aria-label="Delete ${esc(p.name)}">🗑️</button></td></tr>`).join('') || empty('No products match', 10);
}

function form(p) {
  const subOpts = (catSlug) => cats.filter((c) => c.parentId === `cat_${catSlug}` || cats.find((x) => x.id === c.parentId)?.slug === catSlug).map((c) => [c.slug, c.name]);
  const f = openForm({
    title: p ? `Edit: ${p.name}` : 'Add product',
    values: p ? { ...p, highlights: (p.highlights || []).join('\n'), tags: p.tags } : { gstRate: 18, stock: 10, active: true, category: top[0].slug, images: [] },
    fields: [
      { name: 'name', label: 'Product name', required: true, span: true },
      { name: 'sku', label: 'SKU', required: true, hint: 'Unique, e.g. HH-KIT-COO-051' },
      { name: 'slug', label: 'URL slug', hint: 'Leave blank to generate from the name. Changing it changes the share link.' },
      { name: 'brand', label: 'Brand', required: true },
      { name: 'hsn', label: 'HSN code' },
      { name: 'category', label: 'Category', type: 'select', options: top.map((c) => [c.slug, c.name]), required: true },
      { name: 'subcategory', label: 'Subcategory', type: 'select', options: subOpts(p?.category || top[0].slug), required: true },
      { name: 'mrp', label: 'MRP (₹, incl. GST)', type: 'number', min: 1, required: true },
      { name: 'price', label: 'Selling price (₹)', type: 'number', min: 1, required: true },
      { name: 'salePrice', label: 'Sale price (₹, optional)', type: 'number', min: 1 },
      { name: 'gstRate', label: 'GST rate', type: 'select', options: [[0, '0%'], [5, '5%'], [12, '12%'], [18, '18%'], [28, '28%']] },
      { name: 'saleStart', label: 'Sale starts', type: 'datetime' },
      { name: 'saleEnd', label: 'Sale ends', type: 'datetime' },
      { name: 'stock', label: 'Stock', type: 'number', min: 0 },
      { name: 'lowStockThreshold', label: 'Low-stock alert at', type: 'number', min: 0 },
      { name: 'rating', label: 'Rating (placeholder)', type: 'number', step: '0.1', min: 0 },
      { name: 'ratingCount', label: 'Rating count (placeholder)', type: 'number', min: 0 },
      { name: 'tags', label: 'Tags', type: 'checks', options: [['new-arrival', 'New arrival'], ['on-offer', 'On offer'], ['best-seller', 'Best seller']] },
      { name: 'description', label: 'Description', type: 'textarea', span: true },
      { name: 'highlights', label: 'Highlights (one per line)', type: 'textarea', span: true },
      { name: 'images', label: 'Images (first = main image; at least 3 recommended)', type: 'images', hint: 'Uploads are saved to /public/uploads. Drag order = display order.' },
      { name: 'featured', label: 'Featured', type: 'checkbox' },
      { name: 'active', label: 'Visible on storefront', type: 'checkbox' },
    ],
    onSubmit: async (v) => {
      if (p) await put(`/api/admin/products/${p.id}`, v); else await post('/api/admin/products', v);
      toast(p ? 'Product updated' : 'Product created', { type: 'success' }); load();
    },
  });
  f.category.onchange = () => { f.subcategory.innerHTML = subOpts(f.category.value).map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join(''); };
}

document.getElementById('rows').addEventListener('click', async (e) => {
  const ed = e.target.closest('[data-edit]'); if (ed) form(await get(`/api/admin/products/${ed.dataset.edit}`));
  const d = e.target.closest('[data-del]');
  if (d && await confirmDialog(`Delete "${list.find((x) => x.id === d.dataset.del).name}"? This cannot be undone. Tip: untick "Visible" to hide it instead.`)) { await del(`/api/admin/products/${d.dataset.del}`); toast('Product deleted'); load(); }
});
document.getElementById('rows').addEventListener('change', async (e) => {
  if (!e.target.dataset.stock) return;
  try { await api(`/api/admin/products/${e.target.dataset.stock}/stock`, { method: 'PATCH', body: { stock: e.target.value } }); toast('Stock updated', { type: 'success' }); load(); } catch (err) { toast(err.message, { type: 'error' }); }
});
document.getElementById('new').onclick = () => form(null);
document.getElementById('import').onchange = async (e) => {
  const fd = new FormData(); fd.append('file', e.target.files[0]);
  try {
    const r = await api('/api/admin/products/import', { method: 'POST', form: fd });
    document.getElementById('import-result').innerHTML = `<div class="alert ${r.errors.length ? 'alert-warning' : 'alert-success'}">Import finished: ${r.created} created, ${r.updated} updated${r.errors.length ? `, ${r.errors.length} rows skipped:<br>${r.errors.slice(0, 10).map((x) => `Row ${x.row} (${esc(x.sku || '?')}): ${esc(Object.entries(x.errors).map(([k, v]) => `${k} – ${v}`).join('; '))}`).join('<br>')}` : '.'}</div>`;
    load();
  } catch (err) { toast(err.message, { type: 'error' }); }
  e.target.value = '';
};
['q', 'cat', 'stock', 'status'].forEach((id) => document.getElementById(id).addEventListener(id === 'q' ? 'input' : 'change', debounce(load, 250)));
load();
