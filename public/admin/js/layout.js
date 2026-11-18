/** Admin shell: sidebar navigation, top bar, auth check. Every admin page calls initAdmin(). */
import { get, post } from '/js/lib/api.js';
import { esc } from '/js/lib/format.js';
import { icon } from '/js/lib/icons.js';

const NAV = [
  ['Overview', [['dashboard', '📊', 'Dashboard'], ['reports', '📈', 'Sales reports']]],
  ['Catalogue', [['products', '📦', 'Products'], ['categories', '🗂️', 'Categories']]],
  ['Sales', [['orders', '🧾', 'Orders'], ['payments', '💳', 'Payments'], ['returns', '↩️', 'Returns'], ['customers', '👥', 'Customers'], ['reviews', '⭐', 'Reviews']]],
  ['Marketing', [['coupons', '🎟️', 'Coupons'], ['promotions', '🏷️', 'Promotions & discounts'], ['cms', '🖼️', 'Website content (CMS)']]],
  ['Configuration', [['email-settings', '✉️', 'Email settings'], ['settings', '⚙️', 'Store settings']]],
];

export async function initAdmin(page, title) {
  document.body.classList.add('admin');
  const [{ user }, cfg] = await Promise.all([get('/api/auth/me'), get('/api/config/public')]);
  if (!user || user.role !== 'admin') { location.href = `/admin/login.html?next=${encodeURIComponent(location.pathname + location.search)}`; await new Promise(() => {}); }
  const shell = document.getElementById('admin-shell');
  const content = shell.innerHTML;
  shell.className = 'admin-shell';
  shell.innerHTML = `<aside class="admin-side" id="admin-side" aria-label="Admin navigation">
      <a class="brand" href="/admin/dashboard.html"><img src="${esc(cfg.store.logoUrl)}" alt="" width="32" height="32"><span>${esc(cfg.store.name)}<small>Admin</small></span></a>
      <nav class="admin-nav">${NAV.map(([g, items]) => `<div class="grp">${g}</div>${items.map(([k, ic, l]) => `<a href="/admin/${k}.html" ${k === page ? 'aria-current="page"' : ''}><span aria-hidden="true">${ic}</span>${l}</a>`).join('')}`).join('')}
        <div class="grp">Store</div><a href="/" target="_blank" rel="noopener"><span aria-hidden="true">🛍️</span>View storefront ↗</a></nav>
    </aside>
    <div class="admin-main">
      <header class="admin-top"><button class="icon-btn menu-btn" id="side-btn" aria-label="Open navigation">${icon('menu')}</button><h1>${esc(title)}</h1>
        ${cfg.demoMode ? '<span class="badge badge-warning" title="Emails go to the outbox; payments are simulated">DEMO MODE</span>' : ''}
        <span class="small muted desktop-only" style="display:none">${esc(user.name)}</span><button class="btn btn-sm btn-light" id="admin-logout">${icon('logout')} Logout</button></header>
      <div class="admin-content" id="admin-content">${content}</div>
    </div><div class="overlay" id="side-ov"></div>`;
  document.title = `${title} · ${cfg.store.name} Admin`;
  const side = document.getElementById('admin-side'), ov = document.getElementById('side-ov');
  document.getElementById('side-btn').onclick = () => { side.classList.add('open'); ov.classList.add('open'); };
  ov.onclick = () => { side.classList.remove('open'); ov.classList.remove('open'); };
  document.getElementById('admin-logout').onclick = async () => { await post('/api/auth/logout'); location.href = '/admin/login.html'; };
  return { user, cfg };
}
