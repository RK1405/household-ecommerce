/**
 * Native rule-based chatbot (NOT AI). Flows, keywords and copy live in /chatbot/flows.json.
 * Matching: pending prompt (search / track) → order-ID pattern → keyword score → product search → fallback menu.
 */
import { get } from '../lib/api.js';
import { esc, inr, dateTime } from '../lib/format.js';
import { icon } from '../lib/icons.js';

let flows, vars, panel, log, quick, awaiting = null, opened = false;

const fill = (t, extra = {}) => String(t).replace(/\{(\w+)\}/g, (_, k) => (extra[k] ?? vars[k] ?? `{${k}}`));
const norm = (s) => ` ${String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()} `;

export async function mountChatbot(s) {
  const fab = document.createElement('button');
  fab.className = 'chat-fab'; fab.id = 'chat-fab'; fab.setAttribute('aria-label', 'Open chat assistant'); fab.setAttribute('aria-expanded', 'false');
  fab.innerHTML = `${icon('chat')}<span class="dot" aria-hidden="true"></span>`;
  panel = document.createElement('section');
  panel.className = 'chat-panel'; panel.id = 'chat-panel'; panel.setAttribute('aria-label', 'Chat assistant'); panel.setAttribute('aria-hidden', 'true');
  document.body.append(fab, panel);
  fab.addEventListener('click', () => toggle());

  const c = s.cms.contact, d = s.config.delivery;
  vars = {
    storeName: s.cms.store.name, phone: c.phone, phoneRaw: c.phone.replace(/\s/g, ''), email: c.email, whatsapp: c.whatsapp,
    hours: c.hours.map((h) => `${h.days}: ${h.time}`).join(' · '),
    standardCharge: d.standard.charge, freeAbove: Number(d.standard.freeAbove || 0).toLocaleString('en-IN'), standardEta: d.standard.eta,
    expressCharge: d.express.charge, expressEta: d.express.eta, codLimit: Number(s.config.cod.maxOrderValue).toLocaleString('en-IN'),
    couponCodes: 'WELCOME10, FESTIVE250, KITCHEN15',
  };
}

async function ensureFlows() {
  if (flows) return;
  flows = await get('/chatbot/flows.json');
  vars.botName = flows.bot.name;
  panel.innerHTML = `<div class="chat-head"><span class="av" aria-hidden="true">${flows.bot.avatar}</span><div><strong>${esc(flows.bot.name)}</strong><div class="xs" style="opacity:.85">${esc(flows.bot.subtitle)}</div></div><button class="icon-btn" data-close aria-label="Close chat">${icon('close')}</button></div>
    <div class="chat-log" id="chat-log" role="log" aria-live="polite"></div>
    <div class="quick" id="chat-quick" aria-label="Quick replies"></div>
    <form class="chat-input" id="chat-form" autocomplete="off"><label for="chat-text" class="sr-only">Type a message</label><input id="chat-text" placeholder="Type a message…" maxlength="200"><button class="btn btn-sm" aria-label="Send">Send</button></form>`;
  log = panel.querySelector('#chat-log'); quick = panel.querySelector('#chat-quick');
  panel.querySelector('[data-close]').onclick = () => toggle(false);
  panel.querySelector('#chat-form').onsubmit = (e) => { e.preventDefault(); const i = panel.querySelector('#chat-text'); const v = i.value.trim(); if (!v) return; i.value = ''; userSays(v); };
  quick.onclick = (e) => { const b = e.target.closest('button'); if (b) { userSays(b.textContent, b.dataset.intent); } };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) toggle(false); });
}

async function toggle(force) {
  const open = force ?? !panel.classList.contains('open');
  if (open) await ensureFlows();
  panel.classList.toggle('open', open); panel.setAttribute('aria-hidden', String(!open));
  document.getElementById('chat-fab').setAttribute('aria-expanded', String(open));
  if (open && !opened) { opened = true; botSays({ text: fill(flows.greeting.text), quickReplies: flows.greeting.quickReplies }); }
  if (open) setTimeout(() => panel.querySelector('#chat-text').focus(), 50);
}

function add(html, who) { const m = document.createElement('div'); m.className = `msg ${who}`; m.innerHTML = html; log.appendChild(m); log.scrollTop = log.scrollHeight; return m; }

function setQuick(ids = []) {
  quick.innerHTML = ids.map((id) => { const it = flows.intents.find((x) => x.id === id); return it ? `<button type="button" data-intent="${id}">${esc(it.label)}</button>` : ''; }).join('');
}

async function botSays({ text, links, extraHtml, quickReplies }) {
  const t = add('<span class="typing" aria-label="typing"><i></i><i></i><i></i></span>', 'bot');
  await new Promise((r) => setTimeout(r, 350));
  t.innerHTML = esc(text).replace(/\n/g, '<br>') + (extraHtml || '') + (links?.length ? `<div class="links">${links.map((l) => `<a href="${esc(fill(l.href))}" ${/^https?:/.test(fill(l.href)) ? 'target="_blank" rel="noopener"' : ''}>${esc(fill(l.label))}</a>`).join('')}</div>` : '');
  log.scrollTop = log.scrollHeight;
  setQuick(quickReplies || flows.fallback.quickReplies.slice(0, 5));
}

function userSays(text, intentId) {
  add(esc(text), 'user');
  if (intentId) { awaiting = null; return runIntent(flows.intents.find((i) => i.id === intentId)); }
  return respond(text);
}

function matchIntent(text) {
  const t = norm(text);
  let best = null, score = 0;
  for (const it of flows.intents) {
    let sc = 0;
    for (const k of it.keywords) if (t.includes(norm(k))) sc += k.includes(' ') ? 3 : 2;
    if (sc > score) { score = sc; best = it; }
  }
  return best;
}

async function respond(text) {
  const orderId = /\bhh\s?-?\d{6}\b/i.exec(text);
  if (awaiting === 'track' || orderId) { awaiting = null; return trackOrder(orderId ? orderId[0].replace(/[\s-]/g, '') : text.trim()); }
  const it = matchIntent(text);
  if (awaiting === 'search' && (!it || it.id === 'find')) { awaiting = null; return searchProducts(text.replace(/^(find|search|looking for|i want|show me)\s+/i, '')); }
  awaiting = null;
  if (it) return runIntent(it);
  // unknown text: try it as a product search before falling back
  const r = await get(`/api/search/suggest?q=${encodeURIComponent(text)}`).catch(() => []);
  if (r.length) return productsReply(text, r);
  return botSays({ text: flows.fallback.text, quickReplies: flows.fallback.quickReplies });
}

async function runIntent(it) {
  if (it.await) awaiting = it.await;
  if (it.action === 'list_categories') {
    const cats = await get('/api/categories');
    return botSays({ text: fill(it.text), extraHtml: `<div class="links">${cats.map((c) => `<a href="/products.html?category=${c.slug}">${c.icon || ''} ${esc(c.name)} (${c.count})</a>`).join('')}</div>`, quickReplies: it.quickReplies });
  }
  if (it.action === 'show_offers') {
    const r = await get('/api/products?offers=1&sort=discount&limit=4');
    const coupon = (await get('/api/home')).blocks.find((b) => b.type === 'coupon')?.coupon;
    const html = (r.items.length ? `<div class="prods">${r.items.map(prodLink).join('')}</div>` : `<p>${esc(flows.messages.offersNone)}</p>`) + (coupon ? `<p style="margin-top:8px">🎟️ Coupon <strong>${esc(coupon.code)}</strong>: ${esc(coupon.description)}</p>` : '');
    return botSays({ text: fill(it.text), extraHtml: html, links: it.links, quickReplies: it.quickReplies });
  }
  return botSays({ text: fill(it.text), links: it.links, quickReplies: it.await ? [] : it.quickReplies });
}

const prodLink = (p) => `<a href="/product/${p.slug}"><img src="${p.images ? p.images[0] : p.image}" alt=""><span>${esc(p.name)}<br>${inr(p.price)}</span></a>`;

async function productsReply(q, items) {
  return botSays({ text: fill(flows.messages.searchResults, { q }), extraHtml: `<div class="prods">${items.slice(0, 4).map(prodLink).join('')}</div><div class="links"><a href="/products.html?q=${encodeURIComponent(q)}">See all results →</a></div>`, quickReplies: ['find', 'offers', 'browse'] });
}

async function searchProducts(q) {
  const r = await get(`/api/search/suggest?q=${encodeURIComponent(q)}`).catch(() => []);
  if (!r.length) return botSays({ text: fill(flows.messages.searchNone, { q }), quickReplies: ['find', 'browse', 'human'] });
  return productsReply(q, r);
}

async function trackOrder(q) {
  try {
    const o = await get(`/api/orders/track/${encodeURIComponent(q)}`);
    return botSays({
      text: fill(flows.messages.trackFound, { orderNo: o.orderNo, status: o.status, payment: `${o.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online'} (${o.paymentStatus})`, items: o.items, deliveryMethod: o.deliveryMethod, eta: o.eta, lastUpdate: dateTime(o.lastUpdate.at), tracking: o.tracking ? `\nCourier: ${o.tracking.courier} · AWB ${o.tracking.awb}` : '' }),
      links: [{ label: 'View in My Account →', href: '/account.html#orders' }], quickReplies: ['returns', 'human'],
    });
  } catch {
    awaiting = 'track';
    return botSays({ text: fill(flows.messages.trackNotFound, { q }), quickReplies: ['human'] });
  }
}
