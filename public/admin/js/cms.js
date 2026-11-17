import { initAdmin } from './layout.js';
import { get, put } from '/js/lib/api.js';
import { esc, dateTime, statusBadge } from '/js/lib/format.js';
import { openForm, confirmDialog, toast } from './ui.js';

await initAdmin('cms', 'Website content (CMS)');
let cms = await get('/api/admin/cms');
const panel = document.getElementById('panel');
const save = async (section, value, msg = 'Saved — live on the storefront') => { await put(`/api/admin/cms/${section}`, value); cms = await get('/api/admin/cms'); toast(msg, { type: 'success' }); };
const live = (b) => b.active && (!b.startAt || Date.parse(b.startAt) <= Date.now()) && (!b.endAt || Date.parse(b.endAt) >= Date.now());

const views = {
  banners() {
    const list = cms.banners.slice().sort((a, b) => a.order - b.order);
    panel.innerHTML = `<div class="panel-head"><h2>Hero slider banners</h2><button class="btn btn-sm" data-add>+ Add banner</button></div><p class="small muted">Recommended image size 1600×640. Active banners within their date window are shown in order.</p>
      ${list.map((b, i) => `<div class="sortable-row"><img src="${esc(b.image)}" alt=""><div><strong>${esc(b.title)}</strong> ${statusBadge(live(b) ? 'live' : b.active ? 'scheduled' : 'paused')}<br><span class="small muted">${esc(b.subtitle)}</span><br><span class="xs muted">CTA: ${esc(b.ctaText)} → ${esc(b.ctaLink)} · ${dateTime(b.startAt)} – ${dateTime(b.endAt)}</span></div>
      <div class="row nowrap" style="flex-wrap:nowrap"><button class="btn btn-sm btn-ghost" data-up="${i}" aria-label="Move up" ${i ? '' : 'disabled'}>↑</button><button class="btn btn-sm btn-ghost" data-down="${i}" aria-label="Move down" ${i < list.length - 1 ? '' : 'disabled'}>↓</button><button class="btn btn-sm btn-light" data-edit="${b.id}">Edit</button><button class="btn btn-sm btn-ghost" data-del="${b.id}" aria-label="Delete banner">🗑️</button></div></div>`).join('')}`;
    const edit = (b) => openForm({
      title: b ? 'Edit banner' : 'Add banner', values: b || { active: true, order: list.length + 1, startAt: new Date().toISOString(), endAt: new Date(Date.now() + 60 * 864e5).toISOString(), image: '/images/banners/festive.jpg' },
      fields: [{ name: 'title', label: 'Title', required: true, span: true }, { name: 'subtitle', label: 'Subtitle', span: true }, { name: 'ctaText', label: 'Button text' }, { name: 'ctaLink', label: 'Button link', hint: 'e.g. /products.html?category=bath' }, { name: 'image', label: 'Background image', type: 'image', span: true }, { name: 'startAt', label: 'Show from', type: 'datetime' }, { name: 'endAt', label: 'Show until', type: 'datetime' }, { name: 'order', label: 'Order', type: 'number' }, { name: 'active', label: 'Active', type: 'checkbox' }],
      onSubmit: async (v) => { const next = b ? cms.banners.map((x) => (x.id === b.id ? { ...x, ...v } : x)) : [...cms.banners, v]; await save('banners', next); views.banners(); },
    });
    panel.onclick = async (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.add !== undefined) edit(null);
      if (t.dataset.edit) edit(cms.banners.find((x) => x.id === t.dataset.edit));
      if (t.dataset.del && await confirmDialog('Delete this banner?')) { await save('banners', cms.banners.filter((x) => x.id !== t.dataset.del)); views.banners(); }
      if (t.dataset.up || t.dataset.down) { const i = Number(t.dataset.up ?? t.dataset.down), j = t.dataset.up ? i - 1 : i + 1; [list[i], list[j]] = [list[j], list[i]]; await save('banners', list.map((x, k) => ({ ...x, order: k + 1 })), 'Order updated'); views.banners(); }
    };
  },
  bento() {
    const blocks = cms.bento.blocks.slice().sort((a, b) => a.order - b.order);
    panel.innerHTML = `<h2>Homepage bento blocks</h2><p class="small muted">Products in each block come from catalogue data (tags, promotions, newest). Coupon block shows the coupon marked “Highlight”.</p>
      <div class="table-wrap"><table class="table"><thead><tr><th>Block</th><th>Title</th><th>Subtitle</th><th class="num">Items</th><th class="num">Order</th><th>Active</th><th></th></tr></thead><tbody>${blocks.map((b) => `<tr><td><span class="code">${esc(b.type)}</span></td><td>${esc(b.title)}</td><td class="small">${esc(b.subtitle)}</td><td class="num">${b.limit ?? '—'}</td><td class="num">${b.order}</td><td>${b.active ? '✅' : '—'}</td><td><button class="btn btn-sm btn-light" data-edit="${b.key}">Edit</button></td></tr>`).join('')}</tbody></table></div>`;
    panel.onclick = (e) => {
      const t = e.target.closest('[data-edit]'); if (!t) return;
      const b = blocks.find((x) => x.key === t.dataset.edit);
      openForm({ title: `Edit block: ${b.title}`, values: b, fields: [{ name: 'title', label: 'Title', required: true }, { name: 'subtitle', label: 'Subtitle' }, ...(b.limit !== undefined ? [{ name: 'limit', label: 'Number of items', type: 'number', min: 1 }] : []), { name: 'order', label: 'Order', type: 'number' }, ...(b.type === 'promo' ? [{ name: 'ctaText', label: 'Button text' }, { name: 'ctaLink', label: 'Button link' }] : []), { name: 'active', label: 'Show on home page', type: 'checkbox' }],
        onSubmit: async (v) => { const next = cms.bento.blocks.map((x) => (x.key === b.key ? { ...x, ...v, limit: v.limit !== undefined ? Number(v.limit) : x.limit, order: Number(v.order) } : x)); await save('bento', { blocks: next }); views.bento(); } });
    };
  },
  announcement() {
    const a = cms.announcement;
    panel.innerHTML = `<h2>Announcement bar</h2><form id="f" style="max-width:720px"><div class="field"><label for="t">Text</label><input class="input" id="t" name="text" value="${esc(a.text)}"></div><div class="field"><label for="l">Link (optional)</label><input class="input" id="l" name="link" value="${esc(a.link || '')}"></div><label class="check"><input type="checkbox" name="active" ${a.active ? 'checked' : ''}> Show the announcement bar</label><button class="btn mt-4">Save</button></form>`;
    panel.querySelector('#f').onsubmit = async (e) => { e.preventDefault(); const f = e.target; await save('announcement', { text: f.text.value, link: f.link.value, active: f.active.checked }); };
  },
  store() {
    const s = cms.store;
    panel.innerHTML = `<h2>Store identity</h2><p class="small muted">The store name is set here only — it updates the header, footer, emails, invoices, page titles and share previews.</p><form id="f" style="max-width:720px">
      <div class="field"><label for="n">Store name</label><input class="input" id="n" name="name" value="${esc(s.name)}" required></div><div class="field"><label for="tg">Tagline</label><input class="input" id="tg" name="tagline" value="${esc(s.tagline)}"></div>
      <div class="field"><label for="lt">Logo text</label><input class="input" id="lt" name="logoText" value="${esc(s.logoText)}"></div>
      <div class="field"><label for="lu">Logo image URL</label><div class="row"><input class="input" id="lu" name="logoUrl" value="${esc(s.logoUrl)}" style="flex:1"><label class="btn btn-sm btn-light" style="cursor:pointer">⬆️ Upload<input type="file" accept="image/*" hidden id="lf"></label></div><img src="${esc(s.logoUrl)}" alt="" id="lp" style="height:48px;margin-top:8px"></div>
      <button class="btn">Save</button></form>`;
    panel.querySelector('#lf').onchange = async (e) => { const { uploadImages } = await import('./ui.js'); const [u] = await uploadImages(e.target.files); panel.querySelector('#lu').value = u; panel.querySelector('#lp').src = u; };
    panel.querySelector('#f').onsubmit = async (e) => { e.preventDefault(); await save('store', { ...s, ...Object.fromEntries(new FormData(e.target)) }); };
  },
  pages() {
    panel.innerHTML = `<div class="panel-head"><h2>Static pages</h2><button class="btn btn-sm" data-add>+ New page</button></div><p class="small muted">Shown at <span class="code">/page.html?slug=…</span>. Content accepts basic HTML (headings, lists, links).</p>
      <div class="table-wrap"><table class="table"><thead><tr><th>Title</th><th>URL</th><th>Status</th><th></th></tr></thead><tbody>${cms.pages.map((p) => `<tr><td><strong>${esc(p.title)}</strong></td><td><a href="/page.html?slug=${esc(p.slug)}" target="_blank" rel="noopener">/page.html?slug=${esc(p.slug)}</a></td><td>${p.active ? statusBadge('live') : statusBadge('paused')}</td><td class="nowrap"><button class="btn btn-sm btn-light" data-edit="${esc(p.slug)}">Edit</button> <button class="btn btn-sm btn-ghost" data-del="${esc(p.slug)}" aria-label="Delete page">🗑️</button></td></tr>`).join('')}</tbody></table></div>`;
    const edit = (p) => openForm({ title: p ? `Edit ${p.title}` : 'New page', values: p || { active: true, content: '<p></p>' }, fields: [{ name: 'title', label: 'Title', required: true }, { name: 'slug', label: 'Slug', hint: 'lowercase-with-dashes' }, { name: 'content', label: 'Content (HTML)', type: 'textarea', rows: 14, span: true }, { name: 'active', label: 'Published', type: 'checkbox' }],
      onSubmit: async (v) => { const next = p ? cms.pages.map((x) => (x.slug === p.slug ? v : x)) : [...cms.pages, v]; await save('pages', next); views.pages(); } });
    panel.onclick = async (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.add !== undefined) edit(null);
      if (t.dataset.edit) edit(cms.pages.find((x) => x.slug === t.dataset.edit));
      if (t.dataset.del && await confirmDialog('Delete this page?')) { await save('pages', cms.pages.filter((x) => x.slug !== t.dataset.del)); views.pages(); }
    };
  },
  footer() {
    const f = cms.footer;
    const cols = f.columns.map((c) => `## ${c.title}\n${c.links.map((l) => `${l.label} | ${l.href}`).join('\n')}`).join('\n\n');
    panel.innerHTML = `<h2>Footer</h2><form id="f" style="max-width:820px"><div class="field"><label for="ab">About text</label><textarea class="input" id="ab" name="about">${esc(f.about)}</textarea></div>
      <div class="field"><label for="cl">Link columns</label><textarea class="input" id="cl" name="columns" rows="14" style="font-family:monospace">${esc(cols)}</textarea><span class="field-hint">Start each column with “## Title”, then one link per line as “Label | /url”.</span></div>
      <div class="field"><label for="cp">Copyright line</label><input class="input" id="cp" name="copyright" value="${esc(f.copyright)}"><span class="field-hint">{year} is replaced automatically.</span></div><button class="btn">Save footer</button></form>`;
    panel.querySelector('#f').onsubmit = async (e) => {
      e.preventDefault(); const fm = e.target; const columns = [];
      fm.columns.value.split('\n').forEach((line) => { const l = line.trim(); if (!l) return; if (l.startsWith('##')) columns.push({ title: l.replace(/^##\s*/, ''), links: [] }); else if (columns.length) { const [label, href] = l.split('|').map((x) => x.trim()); if (label && href) columns[columns.length - 1].links.push({ label, href }); } });
      await save('footer', { ...f, about: fm.about.value, copyright: fm.copyright.value, columns });
    };
  },
  contact() {
    const c = cms.contact;
    panel.innerHTML = `<h2>Contact info, hours & FAQ</h2><form id="f" style="max-width:820px"><div class="form-grid cols-2">
      <div class="field span-2"><label for="ad">Address</label><input class="input" id="ad" name="address" value="${esc(c.address)}"></div>
      <div class="field"><label for="ph">Phone</label><input class="input" id="ph" name="phone" value="${esc(c.phone)}"></div><div class="field"><label for="em">Email</label><input class="input" id="em" name="email" value="${esc(c.email)}"></div>
      <div class="field"><label for="wa">WhatsApp number (with country code, digits only)</label><input class="input" id="wa" name="whatsapp" value="${esc(c.whatsapp)}"></div><div></div>
      <div class="field"><label for="la">Map latitude</label><input class="input" id="la" name="lat" type="number" step="any" value="${c.lat}"></div><div class="field"><label for="ln">Map longitude</label><input class="input" id="ln" name="lng" type="number" step="any" value="${c.lng}"></div>
      <div class="field span-2"><label for="hr">Business hours (one per line: Days | Time)</label><textarea class="input" id="hr" name="hours">${esc(c.hours.map((h) => `${h.days} | ${h.time}`).join('\n'))}</textarea></div>
      <div class="field span-2"><label for="fq">FAQ (one per line: Question | Answer)</label><textarea class="input" id="fq" name="faqs" rows="8">${esc(c.faqs.map((x) => `${x.q} | ${x.a}`).join('\n'))}</textarea></div></div><button class="btn">Save</button></form>`;
    panel.querySelector('#f').onsubmit = async (e) => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
      const pairs = (t, a, b) => t.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((x) => x[0] && x[1]).map(([x, y]) => ({ [a]: x, [b]: y }));
      await save('contact', { ...c, ...d, lat: Number(d.lat), lng: Number(d.lng), hours: pairs(d.hours, 'days', 'time'), faqs: pairs(d.faqs, 'q', 'a') });
    };
  },
};
const tabs = document.getElementById('tabs');
const show = (t) => { tabs.querySelectorAll('[data-t]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.t === t))); panel.onclick = null; views[t](); history.replaceState(null, '', `#${t}`); };
tabs.onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) show(b.dataset.t); };
show(views[location.hash.slice(1)] ? location.hash.slice(1) : 'banners');
