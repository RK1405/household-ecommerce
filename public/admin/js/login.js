import { get, post } from '/js/lib/api.js';
import { esc } from '/js/lib/format.js';
const [cfg, me] = await Promise.all([get('/api/config/public'), get('/api/auth/me')]);
const next = new URLSearchParams(location.search).get('next');
const dest = next && next.startsWith('/admin') ? next : '/admin/dashboard.html';
if (me.user?.role === 'admin') location.replace(dest);
document.getElementById('store-name').textContent = cfg.store.name;
const admin = cfg.demoAccounts.find((a) => a.role === 'Admin');
if (admin) {
  document.getElementById('demo').innerHTML = `<div class="alert alert-warning">🧪 Demo admin: <strong>${esc(admin.email)}</strong> / <strong>${esc(admin.password)}</strong> <button type="button" class="btn btn-sm btn-light" id="fill">Fill</button></div>`;
  document.getElementById('fill').onclick = () => { document.getElementById('email').value = admin.email; document.getElementById('password').value = admin.password; };
}
document.getElementById('login').onsubmit = async (e) => {
  e.preventDefault();
  const b = e.submitter; b.classList.add('is-loading');
  const err = document.getElementById('err'); err.classList.add('hidden');
  try { await post('/api/auth/login', { ...Object.fromEntries(new FormData(e.target)), adminOnly: true }); location.href = dest; }
  catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); b.classList.remove('is-loading'); }
};
