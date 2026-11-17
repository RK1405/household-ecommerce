import { initAdmin } from './layout.js';
import { get, post, put, del } from '/js/lib/api.js';
import { esc } from '/js/lib/format.js';
import { openForm, confirmDialog, toast } from './ui.js';

await initAdmin('categories', 'Categories');
let cats = [];
async function load() {
  cats = await get('/api/admin/categories');
  const top = cats.filter((c) => !c.parentId);
  document.getElementById('rows').innerHTML = top.map((c) => [c, ...cats.filter((s) => s.parentId === c.id)]).flat().map((c) => `<tr>
    <td>${c.parentId ? '<span class="muted">↳</span> ' : `${c.icon || ''} `}<strong>${esc(c.name)}</strong></td><td><span class="code">${esc(c.slug)}</span></td>
    <td class="small">${c.parentId ? esc(cats.find((x) => x.id === c.parentId)?.name) : '—'}</td><td class="num">${c.productCount}</td><td class="num">${c.order}</td>
    <td>${c.active !== false ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-muted">Hidden</span>'}</td>
    <td class="nowrap"><button class="btn btn-sm btn-light" data-edit="${c.id}">Edit</button> ${c.parentId ? '' : `<button class="btn btn-sm btn-light" data-addsub="${c.id}">+ Sub</button>`} <button class="btn btn-sm btn-ghost" data-del="${c.id}" aria-label="Delete ${esc(c.name)}">🗑️</button></td></tr>`).join('');
}
function form(c, parentId) {
  const parents = [['', '— Top-level category —'], ...cats.filter((x) => !x.parentId).map((x) => [x.id, x.name])];
  openForm({
    title: c ? `Edit ${c.name}` : 'Add category',
    values: c || { parentId: parentId || '', active: true, order: 10 },
    fields: [
      { name: 'name', label: 'Name', required: true }, ...(c ? [] : [{ name: 'slug', label: 'Slug (optional)' }]),
      { name: 'parentId', label: 'Parent', type: 'select', options: parents }, { name: 'order', label: 'Sort order', type: 'number' },
      { name: 'icon', label: 'Icon (emoji)' }, { name: 'color', label: 'Accent colour', type: 'color' },
      { name: 'image', label: 'Tile image', type: 'image', span: true }, { name: 'active', label: 'Active', type: 'checkbox' },
    ],
    onSubmit: async (v) => { if (c) await put(`/api/admin/categories/${c.id}`, v); else await post('/api/admin/categories', v); toast('Saved', { type: 'success' }); load(); },
  });
}
document.getElementById('new').onclick = () => form(null);
document.getElementById('rows').onclick = async (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.edit) form(cats.find((c) => c.id === b.dataset.edit));
  if (b.dataset.addsub) form(null, b.dataset.addsub);
  if (b.dataset.del && await confirmDialog('Delete this category?')) { try { await del(`/api/admin/categories/${b.dataset.del}`); toast('Deleted'); load(); } catch (err) { toast(err.message, { type: 'error', timeout: 6000 }); } }
};
load();
