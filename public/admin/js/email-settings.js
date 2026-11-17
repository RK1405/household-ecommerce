import { initAdmin } from './layout.js';
import { get, put, post } from '/js/lib/api.js';
import { esc, dateTime, statusBadge } from '/js/lib/format.js';
import { openModal, toast, empty } from './ui.js';

await initAdmin('email-settings', 'Email settings');
let s;
async function load() {
  s = await get('/api/admin/email-settings');
  const f = document.getElementById('smtp');
  ['host', 'port', 'user', 'pass', 'from'].forEach((k) => { f[k].value = s.smtp[k] ?? ''; });
  f.secure.checked = !!s.smtp.secure; f.adminEmail.value = s.adminEmail; f.demoMode.checked = s.demoMode !== false;
  const forced = s.envDemoMode;
  document.getElementById('mode').innerHTML = forced || s.demoMode !== false ? '🧪 <strong>Demo mode is ON</strong> — no email is ever sent. All emails are written to the outbox below.' + (forced ? ' (Forced by DEMO_MODE=true in .env.)' : '') : `📨 Live sending via <strong>${esc(s.smtp.host || '(no host set)')}</strong>.`;
  document.getElementById('types').innerHTML = s.types.map((t) => `<li class="row between"><label class="check"><input type="checkbox" data-type="${t.type}" ${t.enabled ? 'checked' : ''}> ${esc(t.label)}</label><button class="btn btn-sm btn-light" data-preview="${t.type}">Preview</button></li>`).join('');
}
async function outbox() {
  const list = await get('/api/admin/outbox');
  document.getElementById('outbox').innerHTML = list.map((e) => `<tr><td class="small">${dateTime(e.createdAt)}</td><td><span class="badge badge-muted">${esc(e.label || e.type)}</span></td><td class="small">${esc(e.to)}</td><td class="small">${esc(e.subject)}</td><td>${statusBadge(e.status)}</td><td><button class="btn btn-sm btn-light" data-view="${e.id}">View</button></td></tr>`).join('') || empty('Outbox is empty', 6);
}
document.getElementById('smtp').onsubmit = async (e) => {
  e.preventDefault(); const f = e.target;
  try { await put('/api/admin/email-settings', { smtp: { host: f.host.value, port: f.port.value, secure: f.secure.checked, user: f.user.value, pass: f.pass.value, from: f.from.value }, adminEmail: f.adminEmail.value, demoMode: f.demoMode.checked }); toast('Email settings saved', { type: 'success' }); load(); } catch (err) { toast(err.message, { type: 'error' }); }
};
document.getElementById('test').onsubmit = async (e) => {
  e.preventDefault();
  try { const r = await post('/api/admin/email-settings/test', { to: e.target.to.value }); document.getElementById('test-result').textContent = r.message; outbox(); } catch (err) { document.getElementById('test-result').textContent = err.message; }
};
document.getElementById('types').onchange = async (e) => { const t = e.target.dataset.type; if (!t) return; await put('/api/admin/email-settings', { enabled: { [t]: e.target.checked } }); toast(`${e.target.checked ? 'Enabled' : 'Disabled'}`, { type: 'success' }); };
const frame = (src, title) => openModal(title, `<iframe class="preview" src="${src}" title="${esc(title)}"></iframe>`);
document.getElementById('types').onclick = (e) => { const b = e.target.closest('[data-preview]'); if (b) frame(`/api/admin/email-templates/${b.dataset.preview}/preview`, `Template preview: ${b.closest('li').textContent.replace('Preview', '').trim()}`); };
document.getElementById('outbox').onclick = (e) => { const b = e.target.closest('[data-view]'); if (b) frame(`/api/admin/outbox/${b.dataset.view}`, 'Email'); };
document.getElementById('refresh').onclick = outbox;
load(); outbox();
