/** Shared header: announcement bar, logo, search with suggestions, category mega-nav, account, cart, mobile drawer + bottom nav. */
import { get } from '../lib/api.js';
import { esc, inr, debounce } from '../lib/format.js';
import { icon } from '../lib/icons.js';
import { logout } from '../lib/session.js';
import { count, onCart } from '../lib/cart.js';
import { openCartDrawer } from './cartDrawer.js';

export async function mountHeader(s, { active } = {}) {
  const { store, announcement } = s.cms;
  const user = s.user;
  const host = document.getElementById('site-header') || document.body.insertAdjacentElement('afterbegin', document.createElement('div'));
  const q = new URLSearchParams(location.search).get('q') || '';
  host.outerHTML = `
  <a class="skip-link" href="#main">Skip to content</a>
  ${announcement?.active ? `<div class="announce">${announcement.link ? `<a href="${esc(announcement.link)}">${esc(announcement.text)}</a>` : esc(announcement.text)}</div>` : ''}
  <header class="site-header" id="site-header">
    <div class="container header-row">
      <button class="icon-btn mobile-only" id="menu-btn" aria-label="Open menu" aria-controls="mobile-menu" aria-expanded="false">${icon('menu')}</button>
      <a class="brand" href="/" aria-label="${esc(store.name)} home"><img src="${esc(store.logoUrl || '/images/brand/logo.svg')}" alt="" width="36" height="36"><span>${esc(store.logoText || store.name)}</span></a>
      <form class="search" role="search" action="/products.html" autocomplete="off">
        <label class="sr-only" for="q">Search products</label>
        <input id="q" name="q" type="search" placeholder="Search kadai, bedsheets, kettles…" value="${esc(q)}" aria-autocomplete="list" aria-controls="suggest">
        <button type="submit" aria-label="Search">${icon('search', 'icon')}</button>
        <div class="suggest hidden" id="suggest" role="listbox"></div>
      </form>
      <nav class="header-actions" aria-label="Account and cart">
        ${user
          ? `<a class="btn btn-ghost btn-sm account-link" href="${user.role === 'admin' ? '/admin/dashboard.html' : '/account.html'}">${icon('user')} ${esc(user.name.split(' ')[0])}${user.role === 'admin' ? ' (Admin)' : ''}</a>
             <button class="btn btn-ghost btn-sm desktop-only" id="logout-btn">${icon('logout')} Logout</button>`
          : `<a class="btn btn-ghost btn-sm account-link" href="/login.html">${icon('user')} Login</a>`}
        <button class="icon-btn" id="cart-btn" aria-label="Open cart">${icon('cart')}<span class="count-badge hidden" id="cart-count">0</span></button>
      </nav>
    </div>
    <nav class="nav-cats" aria-label="Categories"><div class="container"><ul id="cat-nav"><li><a href="/products.html">All products</a></li></ul></div></nav>
  </header>
  <div class="overlay" id="menu-overlay"></div>
  <aside class="drawer left" id="mobile-menu" aria-label="Menu" aria-hidden="true">
    <div class="drawer-head"><a class="brand" href="/"><img src="${esc(store.logoUrl || '/images/brand/logo.svg')}" alt="" width="32" height="32"><span>${esc(store.name)}</span></a><button class="icon-btn" id="menu-close" aria-label="Close menu">${icon('close')}</button></div>
    <div class="drawer-body mnav" id="mnav">
      <a href="/">${icon('home')} Home</a><a href="/products.html">${icon('grid')} All products</a><a href="/products.html?offers=1">${icon('tag')} Offers</a>
      <div id="mnav-cats"></div>
      <hr class="divider">
      ${user ? `<a href="/account.html">${icon('user')} My account</a><a href="/account.html#orders">${icon('truck')} My orders</a>${user.role === 'admin' ? `<a href="/admin/dashboard.html">${icon('grid')} Admin panel</a>` : ''}<a href="#" id="m-logout">${icon('logout')} Logout</a>` : `<a href="/login.html">${icon('user')} Login</a><a href="/register.html">${icon('user')} Create account</a>`}
      <a href="/contact.html">${icon('phone')} Contact us</a>
    </div>
  </aside>
  <nav class="bottom-nav" aria-label="Mobile navigation">
    <a href="/" class="${active === 'home' ? 'active' : ''}">${icon('home')}Home</a>
    <a href="/products.html" class="${active === 'shop' ? 'active' : ''}">${icon('grid')}Shop</a>
    <a href="/products.html?offers=1" class="${active === 'offers' ? 'active' : ''}">${icon('tag')}Offers</a>
    <a href="${user ? '/account.html' : '/login.html'}" class="${active === 'account' ? 'active' : ''}">${icon('user')}${user ? 'Account' : 'Login'}</a>
    <button id="bn-cart" aria-label="Cart">${icon('cart')}Cart<span class="count-badge hidden" id="cart-count-2">0</span></button>
  </nav>`;

  // Cart badge
  const badges = [document.getElementById('cart-count'), document.getElementById('cart-count-2')];
  onCart(() => { const n = count(); badges.forEach((b) => { b.textContent = n; b.classList.toggle('hidden', !n); }); });
  document.getElementById('cart-btn').addEventListener('click', openCartDrawer);
  document.getElementById('bn-cart').addEventListener('click', openCartDrawer);
  document.getElementById('logout-btn')?.addEventListener('click', logout);
  document.getElementById('m-logout')?.addEventListener('click', (e) => { e.preventDefault(); logout(); });

  // Mobile menu
  const menu = document.getElementById('mobile-menu'), ov = document.getElementById('menu-overlay'), mb = document.getElementById('menu-btn');
  const setMenu = (open) => { menu.classList.toggle('open', open); ov.classList.toggle('open', open); menu.setAttribute('aria-hidden', String(!open)); mb.setAttribute('aria-expanded', String(open)); document.body.classList.toggle('no-scroll', open); if (open) document.getElementById('menu-close').focus(); };
  mb.addEventListener('click', () => setMenu(true));
  document.getElementById('menu-close').addEventListener('click', () => setMenu(false));
  ov.addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });

  // Categories (desktop mega-nav + mobile accordion)
  get('/api/categories').then((cats) => {
    document.getElementById('cat-nav').innerHTML = cats.map((c) => `<li><a href="/products.html?category=${c.slug}">${esc(c.name)}</a><div class="sub">${c.children.map((s) => `<a href="/products.html?category=${c.slug}&subcategory=${s.slug}">${esc(s.name)}</a>`).join('')}<a href="/products.html?category=${c.slug}"><strong>View all ${esc(c.name)} →</strong></a></div></li>`).join('') + '<li><a class="nav-offers" href="/products.html?offers=1">🔥 Offers</a></li>';
    document.getElementById('mnav-cats').innerHTML = cats.map((c) => `<details><summary>${c.icon || ''} ${esc(c.name)}</summary>${c.children.map((s) => `<a href="/products.html?category=${c.slug}&subcategory=${s.slug}">${esc(s.name)}</a>`).join('')}<a href="/products.html?category=${c.slug}">All ${esc(c.name)}</a></details>`).join('');
  });

  // Search suggestions
  const input = document.getElementById('q'), box = document.getElementById('suggest');
  let idx = -1;
  const render = (items) => {
    idx = -1;
    if (!items.length) { box.classList.add('hidden'); return; }
    box.innerHTML = items.map((p) => `<a role="option" href="/product/${p.slug}"><img src="${p.image}" alt=""><span><span class="small">${esc(p.name)}</span><br><strong class="small">${inr(p.price)}</strong></span></a>`).join('') + `<a href="/products.html?q=${encodeURIComponent(input.value)}" class="small"><strong>See all results for “${esc(input.value)}” →</strong></a>`;
    box.classList.remove('hidden');
  };
  input.addEventListener('input', debounce(async () => { const v = input.value.trim(); if (v.length < 2) return render([]); render(await get(`/api/search/suggest?q=${encodeURIComponent(v)}`)); }, 200));
  input.addEventListener('keydown', (e) => {
    const links = [...box.querySelectorAll('a')];
    if (!links.length || box.classList.contains('hidden')) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length; links.forEach((l, i) => l.classList.toggle('active', i === idx)); }
    else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); location.href = links[idx].href; }
    else if (e.key === 'Escape') box.classList.add('hidden');
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.search')) box.classList.add('hidden'); });
}
