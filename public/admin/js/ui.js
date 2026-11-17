/** Small admin UI kit: form modal, confirm, table helpers, CSV download, image upload. */
import { api } from '/js/lib/api.js';
import { esc } from '/js/lib/format.js';
import { icon } from '/js/lib/icons.js';
export { toast } from '/js/components/toast.js';

let modal, overlay;
function ensure() {
  if (modal) return;
  overlay = document.createElement('div'); overlay.className = 'overlay';
  modal = document.createElement('div'); modal.className = 'modal form-modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true');
  document.body.append(overlay, modal);
  overlay.onclick = closeModal;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
}
export function closeModal() { modal?.classList.remove('open'); overlay?.classList.remove('open'); document.body.classList.remove('no-scroll'); }
export function openModal(title, html, { wide = true } = {}) {
  ensure();
  modal.classList.toggle('modal-sm', !wide);
  modal.innerHTML = `<div class="modal-head"><strong>${esc(title)}</strong><button class="icon-btn" data-x aria-label="Close">${icon('close')}</button></div><div class="modal-body">${html}</div>`;
  modal.querySelector('[data-x]').onclick = closeModal;
  modal.classList.add('open'); overlay.classList.add('open'); document.body.classList.add('no-scroll');
  return modal;
}

export const toLocalInput = (iso) => { if (!iso) return ''; const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

function fieldHtml(f, v) {
  const id = `f-${f.name}`, req = f.required ? 'required' : '';
  const wrap = (inner) => `<div class="field ${f.span ? 'span-2' : ''}"><label for="${id}">${esc(f.label)}${f.required ? ' *' : ''}</label>${inner}${f.hint ? `<span class="field-hint">${f.hint}</span>` : ''}<span class="field-error" data-err="${f.name}"></span></div>`;
  switch (f.type) {
    case 'textarea': return wrap(`<textarea class="input" id="${id}" name="${f.name}" rows="${f.rows || 4}" ${req}>${esc(v ?? '')}</textarea>`);
    case 'select': return wrap(`<select class="input" id="${id}" name="${f.name}" ${req}>${f.options.map((o) => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(v ?? '') === String(val) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`);
    case 'checkbox': return `<div class="field ${f.span ? 'span-2' : ''}"><label class="check"><input type="checkbox" id="${id}" name="${f.name}" ${v ? 'checked' : ''}> ${esc(f.label)}</label>${f.hint ? `<span class="field-hint">${f.hint}</span>` : ''}</div>`;
    case 'checks': return `<div class="field span-2"><span class="label">${esc(f.label)}</span><div class="check-list">${f.options.map(([val, lab]) => `<label class="check small"><input type="checkbox" name="${f.name}" value="${esc(val)}" ${(v || []).includes(val) ? 'checked' : ''}> ${esc(lab)}</label>`).join('')}</div>${f.hint ? `<span class="field-hint">${f.hint}</span>` : ''}<span class="field-error" data-err="${f.name}"></span></div>`;
    case 'datetime': return wrap(`<input class="input" type="datetime-local" id="${id}" name="${f.name}" value="${toLocalInput(v)}" ${req}>`);
    case 'images': return `<div class="field span-2"><span class="label">${esc(f.label)}</span><div class="img-list" data-images="${f.name}">${(v || []).map((src) => imgItem(src)).join('')}</div>
      <div class="row mt-4"><label class="btn btn-sm btn-light" style="cursor:pointer">⬆️ Upload images<input type="file" accept="image/*" multiple hidden data-upload="${f.name}"></label><input class="input" style="max-width:320px;min-height:36px" placeholder="…or paste an image URL and press Enter" data-imgurl="${f.name}"></div>
      ${f.hint ? `<span class="field-hint">${f.hint}</span>` : ''}<span class="field-error" data-err="${f.name}"></span></div>`;
    case 'image': return `<div class="field ${f.span ? 'span-2' : ''}"><label for="${id}">${esc(f.label)}</label><div class="row"><input class="input" id="${id}" name="${f.name}" value="${esc(v ?? '')}" style="flex:1"><label class="btn btn-sm btn-light" style="cursor:pointer">⬆️ Upload<input type="file" accept="image/*" hidden data-upload-single="${f.name}"></label></div>${v ? `<img src="${esc(v)}" alt="" style="max-height:80px;margin-top:6px;border-radius:8px" data-preview="${f.name}">` : `<img alt="" style="max-height:80px;margin-top:6px;border-radius:8px;display:none" data-preview="${f.name}">`}<span class="field-error" data-err="${f.name}"></span></div>`;
    default: return wrap(`<input class="input" type="${f.type || 'text'}" id="${id}" name="${f.name}" value="${esc(v ?? '')}" ${f.step ? `step="${f.step}"` : ''} ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.maxlength ? `maxlength="${f.maxlength}"` : ''} ${req} ${f.attrs || ''}>`);
  }
}
const imgItem = (src) => `<div class="it" data-src="${esc(src)}"><img src="${esc(src)}" alt=""><button type="button" aria-label="Remove image" data-rmimg>✕</button></div>`;

export async function uploadImages(files) {
  const fd = new FormData(); [...files].forEach((f) => fd.append('images', f));
  return (await api('/api/admin/uploads', { method: 'POST', form: fd })).urls;
}

/** Generic form modal. onSubmit(values) may throw ApiError with .details for field errors. */
export function openForm({ title, fields, values = {}, submitLabel = 'Save', onSubmit, intro = '' }) {
  const m = openModal(title, `${intro}<form novalidate><div class="form-grid cols-2">${fields.map((f) => fieldHtml(f, values[f.name])).join('')}</div><div class="alert alert-danger hidden" data-formerr role="alert"></div><div class="form-actions"><button type="button" class="btn btn-ghost" data-cancel>Cancel</button><button class="btn" type="submit">${esc(submitLabel)}</button></div></form>`);
  const form = m.querySelector('form');
  form.querySelector('[data-cancel]').onclick = closeModal;
  form.querySelector('input,select,textarea')?.focus();
  form.addEventListener('click', (e) => { const b = e.target.closest('[data-rmimg]'); if (b) b.parentElement.remove(); });
  form.addEventListener('change', async (e) => {
    const multi = e.target.dataset.upload, single = e.target.dataset.uploadSingle;
    if (!multi && !single) return;
    try {
      const urls = await uploadImages(e.target.files);
      if (multi) form.querySelector(`[data-images="${multi}"]`).insertAdjacentHTML('beforeend', urls.map(imgItem).join(''));
      else { form[single].value = urls[0]; const p = form.querySelector(`[data-preview="${single}"]`); p.src = urls[0]; p.style.display = 'block'; }
    } catch (err) { alert(err.message); }
  });
  form.addEventListener('keydown', (e) => { if (e.target.dataset.imgurl && e.key === 'Enter') { e.preventDefault(); if (e.target.value.trim()) { form.querySelector(`[data-images="${e.target.dataset.imgurl}"]`).insertAdjacentHTML('beforeend', imgItem(e.target.value.trim())); e.target.value = ''; } } });
  form.onsubmit = async (e) => {
    e.preventDefault();
    const v = {};
    for (const f of fields) {
      if (f.type === 'checkbox') v[f.name] = form[f.name].checked;
      else if (f.type === 'checks') v[f.name] = [...form.querySelectorAll(`input[name="${f.name}"]:checked`)].map((x) => x.value);
      else if (f.type === 'images') v[f.name] = [...form.querySelectorAll(`[data-images="${f.name}"] .it`)].map((x) => x.dataset.src);
      else if (f.type === 'datetime') v[f.name] = form[f.name].value ? new Date(form[f.name].value).toISOString() : '';
      else v[f.name] = form[f.name].value;
    }
    const btn = form.querySelector('[type=submit]'); btn.classList.add('is-loading');
    form.querySelectorAll('[data-err]').forEach((x) => { x.textContent = ''; });
    const fe = form.querySelector('[data-formerr]'); fe.classList.add('hidden');
    try { await onSubmit(v); closeModal(); }
    catch (err) {
      Object.entries(err.details || {}).forEach(([k, msg]) => { const el = form.querySelector(`[data-err="${k}"]`); if (el) el.textContent = msg; });
      fe.textContent = err.message; fe.classList.remove('hidden');
    } finally { btn.classList.remove('is-loading'); }
  };
  return form;
}

export function confirmDialog(message, { okLabel = 'Delete', danger = true } = {}) {
  return new Promise((resolve) => {
    const m = openModal('Please confirm', `<p>${esc(message)}</p><div class="row" style="justify-content:flex-end"><button class="btn btn-ghost" data-no>Cancel</button><button class="btn ${danger ? 'btn-danger' : ''}" data-yes>${esc(okLabel)}</button></div>`, { wide: false });
    m.querySelector('[data-no]').onclick = () => { closeModal(); resolve(false); };
    m.querySelector('[data-yes]').onclick = () => { closeModal(); resolve(true); };
    m.querySelector('[data-yes]').focus();
  });
}

export const empty = (msg, cols) => `<tr><td colspan="${cols}" class="muted" style="text-align:center;padding:24px">${esc(msg)}</td></tr>`;
