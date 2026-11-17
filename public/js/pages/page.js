/** CMS-driven static pages: /page.html?slug=about|shipping-returns|privacy|terms */
import { initPage } from '../lib/page.js';
import { get } from '../lib/api.js';
import { esc } from '../lib/format.js';

const s = await initPage();
const slug = new URLSearchParams(location.search).get('slug') || 'about';
const root = document.getElementById('page-root');
try {
  const p = await get(`/api/cms/pages/${encodeURIComponent(slug)}`);
  document.title = `${p.title} | ${s.cms.store.name}`;
  document.getElementById('crumbs').innerHTML = `<li><a href="/">Home</a></li><li aria-current="page">${esc(p.title)}</li>`;
  // Content is authored by admins in the CMS (trusted HTML).
  root.innerHTML = `<h1 style="font-size:var(--fs-2xl)">${esc(p.title)}</h1>${p.content}`;
} catch {
  root.innerHTML = `<div class="empty"><div class="emoji">📄</div><h1 style="font-size:1.5rem">Page not found</h1><a class="btn" href="/">Go home</a></div>`;
}
