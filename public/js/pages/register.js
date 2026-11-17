import { initPage } from '../lib/page.js';
import { post } from '../lib/api.js';
import { mergeGuestCart } from '../lib/cart.js';

const s = await initPage({ active: 'account' });
const next = new URLSearchParams(location.search).get('next');
if (s.user) location.replace('/account.html');
const root = document.getElementById('auth-root');
root.innerHTML = `<div class="card card-pad"><h1 style="font-size:1.7rem">Create your account</h1><p class="muted">Get 10% off your first order with WELCOME10.</p>
  <form id="reg" novalidate>
    <div class="field"><label for="name">Full name</label><input class="input" id="name" name="name" autocomplete="name" required><span class="field-error" data-e="name"></span></div>
    <div class="field"><label for="email">Email</label><input class="input" id="email" name="email" type="email" autocomplete="email" required><span class="field-error" data-e="email"></span></div>
    <div class="field"><label for="phone">Mobile (optional)</label><div class="input-group"><span class="prefix">+91</span><input class="input" id="phone" name="phone" inputmode="numeric" maxlength="10" autocomplete="tel-national"></div><span class="field-error" data-e="phone"></span></div>
    <div class="field"><label for="password">Password</label><input class="input" id="password" name="password" type="password" autocomplete="new-password" required><span class="field-hint">At least 8 characters with letters and numbers</span><span class="field-error" data-e="password"></span></div>
    <div class="alert alert-danger hidden" id="err" role="alert"></div>
    <button class="btn btn-block btn-lg">Create account</button>
  </form><p class="small mt-4">Already have an account? <a href="/login.html${next ? `?next=${encodeURIComponent(next)}` : ''}">Log in</a></p></div>`;
const form = root.querySelector('#reg');
form.onsubmit = async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(form)); const errs = {};
  if (!d.name.trim()) errs.name = 'Name is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) errs.email = 'Enter a valid email';
  if (d.phone && !/^[6-9]\d{9}$/.test(d.phone)) errs.phone = 'Enter a valid 10-digit mobile number';
  if (!(d.password.length >= 8 && /[A-Za-z]/.test(d.password) && /\d/.test(d.password))) errs.password = 'Use at least 8 characters with letters and numbers';
  const show = (x) => form.querySelectorAll('[data-e]').forEach((el) => { el.textContent = x[el.dataset.e] || ''; form[el.dataset.e]?.classList.toggle('is-invalid', !!x[el.dataset.e]); });
  show(errs); if (Object.keys(errs).length) return;
  const b = e.submitter; b.classList.add('is-loading');
  try { await post('/api/auth/register', d); await mergeGuestCart(); location.href = next && next.startsWith('/') ? next : '/account.html?welcome=1'; }
  catch (ex) { show(ex.details || {}); const er = root.querySelector('#err'); er.textContent = ex.message; er.classList.remove('hidden'); b.classList.remove('is-loading'); }
};
