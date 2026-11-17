/** Add/edit address modal with Indian validation (6-digit PIN, +91 mobile, state dropdown) + map pin. */
import { api } from '../lib/api.js';
import { esc } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { session } from '../lib/session.js';
import { mountMapPicker } from './mapPicker.js';

export const formatAddress = (a) => `${esc(a.line1)}${a.line2 ? `, ${esc(a.line2)}` : ''}${a.landmark ? `, near ${esc(a.landmark)}` : ''}, ${esc(a.city)}, ${esc(a.state)} – ${esc(a.pincode)}`;

export function addressCard(a, { selectable = false, name = 'address', checked = false, actions = true } = {}) {
  const inner = `<div class="addr-card"><div class="row between"><span class="lbl">${esc(a.label)} ${a.isDefault ? '<span class="badge">Default</span>' : ''}</span></div>
    <div><strong>${esc(a.name)}</strong> · +91 ${esc(a.phone)}</div><div class="muted">${formatAddress(a)}</div>
    ${a.mapsUrl ? `<a class="xs" href="${esc(a.mapsUrl)}" target="_blank" rel="noopener">📍 View pin on Google Maps</a>` : '<span class="xs muted">No map pin</span>'}
    ${actions ? `<div class="row" style="margin-top:8px;gap:12px"><button type="button" class="link-btn small" data-edit="${a.id}">${icon('edit', 'icon')} Edit</button><button type="button" class="link-btn small" data-del="${a.id}" style="color:var(--c-danger)">Delete</button>${a.isDefault ? '' : `<button type="button" class="link-btn small" data-default="${a.id}">Set as default</button>`}</div>` : ''}</div>`;
  return selectable ? `<label class="choice"><input type="radio" name="${name}" value="${a.id}" ${checked ? 'checked' : ''}>${inner}</label>` : `<div class="card card-pad">${inner}</div>`;
}

let modal, overlay;
export function openAddressForm(existing, { onSaved } = {}) {
  const states = session().config.states;
  const a = existing || { label: 'Home', name: session().user?.name || '', phone: session().user?.phone || '', state: '', lat: null, lng: null };
  if (!modal) { overlay = document.createElement('div'); overlay.className = 'overlay'; modal = document.createElement('div'); modal.className = 'modal'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'addr-title'); document.body.append(overlay, modal); }
  const close = () => { modal.classList.remove('open'); overlay.classList.remove('open'); document.body.classList.remove('no-scroll'); };
  overlay.onclick = close;
  const f = (k, label, attrs = '', hint = '') => `<div class="field"><label for="ad-${k}">${label}</label><input class="input" id="ad-${k}" name="${k}" value="${esc(a[k] ?? '')}" ${attrs}>${hint ? `<span class="field-hint">${hint}</span>` : ''}<span class="field-error" data-err="${k}"></span></div>`;
  modal.innerHTML = `<div class="modal-head"><strong id="addr-title">${existing ? 'Edit address' : 'Add a new address'}</strong><button class="icon-btn" data-close aria-label="Close">${icon('close')}</button></div>
  <form class="modal-body" novalidate id="addr-form">
    <div class="form-grid cols-2">
      ${f('name', 'Full name *', 'autocomplete="name" required')}
      <div class="field"><label for="ad-phone">Mobile number *</label><div class="input-group"><span class="prefix">+91</span><input class="input" id="ad-phone" name="phone" value="${esc(a.phone || '')}" inputmode="numeric" maxlength="10" autocomplete="tel-national" pattern="[6-9][0-9]{9}" required></div><span class="field-error" data-err="phone"></span></div>
      <div class="span-2">${f('line1', 'Flat / house no., building, street *', 'autocomplete="address-line1" required')}</div>
      <div class="span-2">${f('line2', 'Area, locality', 'autocomplete="address-line2"')}</div>
      ${f('landmark', 'Landmark')}
      ${f('pincode', 'PIN code *', 'inputmode="numeric" maxlength="6" autocomplete="postal-code" pattern="[1-9][0-9]{5}" required', '6 digits, e.g. 600090')}
      ${f('city', 'City / town *', 'autocomplete="address-level2" required')}
      <div class="field"><label for="ad-state">State / UT *</label><select class="input" id="ad-state" name="state" required><option value="">Select state</option>${states.map((s) => `<option ${a.state === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select><span class="field-error" data-err="state"></span></div>
      <div class="field span-2"><span class="label">Address type</span><div class="row">${['Home', 'Office', 'Other'].map((l) => `<label class="check"><input type="radio" name="label" value="${l}" ${a.label === l ? 'checked' : ''}> ${l}</label>`).join('')}<label class="check" style="margin-left:auto"><input type="checkbox" name="isDefault" ${a.isDefault ? 'checked' : ''}> Make this my default address</label></div></div>
    </div>
    <div data-map-picker></div>
    <input type="hidden" name="lat" value="${a.lat ?? ''}"><input type="hidden" name="lng" value="${a.lng ?? ''}">
    <div class="alert alert-danger hidden" data-form-err></div>
    <div class="row mt-4"><button class="btn" type="submit">${existing ? 'Save changes' : 'Save address'}</button><button class="btn btn-ghost" type="button" data-close>Cancel</button></div>
  </form>`;
  modal.querySelectorAll('[data-close]').forEach((b) => (b.onclick = close));
  modal.classList.add('open'); overlay.classList.add('open'); document.body.classList.add('no-scroll');
  const form = modal.querySelector('form');
  form.name.focus();
  mountMapPicker(modal.querySelector('[data-map-picker]'), { lat: a.lat, lng: a.lng, onChange: (p) => { form.lat.value = p.lat.toFixed(6); form.lng.value = p.lng.toFixed(6); } });
  form.pincode.addEventListener('input', () => { form.pincode.value = form.pincode.value.replace(/\D/g, '').slice(0, 6); });
  form.phone.addEventListener('input', () => { form.phone.value = form.phone.value.replace(/\D/g, '').slice(-10); });

  const showErrors = (errs) => {
    form.querySelectorAll('[data-err]').forEach((e) => { e.textContent = errs[e.dataset.err] || ''; const inp = form.querySelector(`[name="${e.dataset.err}"]`); inp?.classList.toggle('is-invalid', !!errs[e.dataset.err]); inp?.setAttribute('aria-invalid', String(!!errs[e.dataset.err])); });
    const first = Object.keys(errs)[0]; if (first) form.querySelector(`[name="${first}"]`)?.focus();
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form)); d.isDefault = !!form.isDefault.checked;
    const errs = {};
    if (!d.name.trim()) errs.name = 'Full name is required';
    if (!/^[6-9]\d{9}$/.test(d.phone)) errs.phone = 'Enter a valid 10-digit Indian mobile number';
    if (!d.line1.trim()) errs.line1 = 'House / flat / street is required';
    if (!/^[1-9]\d{5}$/.test(d.pincode)) errs.pincode = 'PIN code must be 6 digits';
    if (!d.city.trim()) errs.city = 'City is required';
    if (!d.state) errs.state = 'Select a state';
    showErrors(errs);
    if (Object.keys(errs).length) return;
    const btn = form.querySelector('[type=submit]'); btn.classList.add('is-loading');
    try {
      const saved = await api(existing ? `/api/account/addresses/${existing.id}` : '/api/account/addresses', { method: existing ? 'PUT' : 'POST', body: d });
      close(); onSaved?.(saved);
    } catch (err) { showErrors(err.details || {}); const fe = form.querySelector('[data-form-err]'); fe.textContent = err.message; fe.classList.remove('hidden'); }
    finally { btn.classList.remove('is-loading'); }
  };
}
