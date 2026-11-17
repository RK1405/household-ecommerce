import { initPage } from '../lib/page.js';
import { post } from '../lib/api.js';
import { esc } from '../lib/format.js';
import { mergeGuestCart } from '../lib/cart.js';

const s = await initPage({ active: 'account' });
const root = document.getElementById('auth-root');
const params = new URLSearchParams(location.search);
const next = params.get('next') && params.get('next').startsWith('/') ? params.get('next') : null;
const resetToken = params.get('reset');
if (s.user && !resetToken) location.replace(next || (s.user.role === 'admin' ? '/admin/dashboard.html' : '/account.html'));

const demo = s.config.demoAccounts.length ? `<div class="demo-creds"><strong>🧪 Demo mode — test accounts</strong><br>${s.config.demoAccounts.map((a) => `<button type="button" class="btn btn-sm btn-light" data-demo="${esc(a.email)}|${esc(a.password)}">${esc(a.role)}: ${esc(a.email)} / ${esc(a.password)}</button>`).join('')}</div>` : '';

function loginView(msg = '') {
  root.innerHTML = `<div class="card card-pad"><h1 style="font-size:1.7rem">Welcome back</h1><p class="muted">Log in to track orders, save addresses and check out faster.</p>${demo}
    ${msg ? `<div class="alert alert-success">${esc(msg)}</div>` : ''}
    <form id="login-form" novalidate><div class="field"><label for="email">Email</label><input class="input" id="email" name="email" type="email" autocomplete="email" required></div>
    <div class="field"><label for="password">Password</label><input class="input" id="password" name="password" type="password" autocomplete="current-password" required></div>
    <div class="alert alert-danger hidden" id="err" role="alert"></div>
    <button class="btn btn-block btn-lg">Log in</button></form>
    <div class="row between mt-4 small"><button class="link-btn" id="forgot">Forgot password?</button><a href="/register.html${next ? `?next=${encodeURIComponent(next)}` : ''}">New here? Create an account</a></div></div>`;
  root.querySelectorAll('[data-demo]').forEach((b) => (b.onclick = () => { const [e, p] = b.dataset.demo.split('|'); root.querySelector('#email').value = e; root.querySelector('#password').value = p; }));
  root.querySelector('#forgot').onclick = forgotView;
  root.querySelector('#login-form').onsubmit = async (e) => {
    e.preventDefault(); const b = e.submitter; b.classList.add('is-loading');
    const err = root.querySelector('#err'); err.classList.add('hidden');
    try {
      const r = await post('/api/auth/login', Object.fromEntries(new FormData(e.target)));
      await mergeGuestCart();
      location.href = next || (r.user.role === 'admin' ? '/admin/dashboard.html' : '/account.html');
    } catch (ex) { err.textContent = ex.message; err.classList.remove('hidden'); b.classList.remove('is-loading'); }
  };
}

function forgotView() {
  root.innerHTML = `<div class="card card-pad"><h1 style="font-size:1.6rem">Forgot password</h1><p class="muted">Enter your email and we'll send a reset link.</p>
    <form id="f-form"><div class="field"><label for="femail">Email</label><input class="input" id="femail" name="email" type="email" required autocomplete="email"></div><div id="f-msg" role="status"></div><button class="btn btn-block">Send reset link</button></form>
    <button class="link-btn mt-4" id="back">← Back to login</button></div>`;
  root.querySelector('#back').onclick = () => loginView();
  root.querySelector('#f-form').onsubmit = async (e) => {
    e.preventDefault();
    const r = await post('/api/auth/forgot', { email: e.target.email.value });
    root.querySelector('#f-msg').innerHTML = `<div class="alert alert-success">${esc(r.message)}</div>`;
  };
}

function resetView() {
  root.innerHTML = `<div class="card card-pad"><h1 style="font-size:1.6rem">Set a new password</h1>
    <form id="r-form"><div class="field"><label for="np">New password</label><input class="input" id="np" name="password" type="password" minlength="8" autocomplete="new-password" required><span class="field-hint">At least 8 characters with letters and numbers</span></div><div id="r-msg" role="alert"></div><button class="btn btn-block">Update password</button></form></div>`;
  root.querySelector('#r-form').onsubmit = async (e) => {
    e.preventDefault();
    try { const r = await post('/api/auth/reset', { token: resetToken, password: e.target.password.value }); history.replaceState(null, '', '/login.html'); loginView(r.message); }
    catch (ex) { root.querySelector('#r-msg').innerHTML = `<div class="alert alert-danger">${esc(ex.message)}</div>`; }
  };
}

resetToken ? resetView() : loginView();
