import { initPage } from '../lib/page.js';
import { post } from '../lib/api.js';
import { esc } from '../lib/format.js';
import { icon } from '../lib/icons.js';

const s = await initPage();
const c = s.cms.contact;
const root = document.getElementById('contact-root');
root.innerHTML = `<section class="card card-pad" aria-labelledby="form-h"><h2 id="form-h" style="font-size:1.3rem">Send us a message</h2>
  <form id="contact-form" novalidate><div class="form-grid cols-2">
    <div class="field"><label for="c-name">Name *</label><input class="input" id="c-name" name="name" autocomplete="name" value="${esc(s.user?.name || '')}"><span class="field-error" data-e="name"></span></div>
    <div class="field"><label for="c-email">Email *</label><input class="input" id="c-email" name="email" type="email" autocomplete="email" value="${esc(s.user?.email || '')}"><span class="field-error" data-e="email"></span></div>
    <div class="field"><label for="c-phone">Mobile</label><div class="input-group"><span class="prefix">+91</span><input class="input" id="c-phone" name="phone" inputmode="numeric" maxlength="10"></div><span class="field-error" data-e="phone"></span></div>
    <div class="field"><label for="c-topic">Topic</label><select class="input" id="c-topic" name="topic"><option>Order help</option><option>Returns & refunds</option><option>Product question</option><option>Bulk / corporate order</option><option>Feedback</option><option>Other</option></select></div>
    <div class="field span-2"><label for="c-order">Order ID (if any)</label><input class="input" id="c-order" name="orderNo" placeholder="HH100012"></div>
    <div class="field span-2"><label for="c-msg">Message *</label><textarea class="input" id="c-msg" name="message"></textarea><span class="field-error" data-e="message"></span></div>
    <input type="text" name="website" tabindex="-1" autocomplete="off" class="sr-only" aria-hidden="true">
  </div><div id="c-result" role="status"></div><button class="btn btn-lg">Send message</button></form></section>
  <aside class="stack">
    <div class="card card-pad"><h2 style="font-size:1.2rem">Reach us</h2>
      <p class="small">${icon('pin', 'icon')} ${esc(c.address)}</p>
      <p class="small">${icon('phone', 'icon')} <a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a></p>
      <p class="small">${icon('mail', 'icon')} <a href="mailto:${esc(c.email)}">${esc(c.email)}</a></p>
      <a class="btn btn-sm" style="background:#1f9d55" href="https://wa.me/${esc(c.whatsapp)}?text=${encodeURIComponent(`Hi ${s.cms.store.name}, I need help`)}" target="_blank" rel="noopener">${icon('whatsapp')} Chat on WhatsApp</a>
      <h3 class="mt-5">Business hours</h3><table class="table"><tbody>${c.hours.map((h) => `<tr><th scope="row">${esc(h.days)}</th><td>${esc(h.time)}</td></tr>`).join('')}</tbody></table></div>
    <div class="card card-pad"><h3>Find us</h3><div class="map-box" id="store-map" aria-label="Store location map"></div><a class="xs" href="https://www.google.com/maps?q=${c.lat},${c.lng}" target="_blank" rel="noopener">Open in Google Maps →</a></div>
  </aside>
  <section class="card card-pad faq" style="grid-column:1/-1" aria-labelledby="faq-h"><h2 id="faq-h" style="font-size:1.3rem">Frequently asked questions</h2>${c.faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p class="small mt-4 mb-0">${esc(f.a)}</p></details>`).join('')}</section>`;

// Store map (Google if a key is set, otherwise Leaflet/OSM)
(async () => {
  const el = document.getElementById('store-map');
  const key = s.config.googleMapsApiKey;
  try {
    if (!key) throw new Error('no key');
    await new Promise((res, rej) => { window.__hhStoreMap = res; const sc = document.createElement('script'); sc.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=__hhStoreMap`; sc.onerror = rej; document.head.appendChild(sc); });
    const map = new google.maps.Map(el, { center: { lat: c.lat, lng: c.lng }, zoom: 15 });
    new google.maps.Marker({ position: { lat: c.lat, lng: c.lng }, map, title: s.cms.store.name });
  } catch {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/vendor/leaflet/leaflet.css'; document.head.appendChild(l);
    await new Promise((res) => { const sc = document.createElement('script'); sc.src = '/vendor/leaflet/leaflet.js'; sc.onload = res; document.head.appendChild(sc); });
    const map = window.L.map(el, { scrollWheelZoom: false }).setView([c.lat, c.lng], 15);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);
    window.L.marker([c.lat, c.lng], { icon: window.L.divIcon({ className: '', html: '<div style="font-size:32px;transform:translate(-50%,-100%)">📍</div>', iconSize: [0, 0] }) }).addTo(map).bindPopup(esc(s.cms.store.name));
  }
})();

const form = document.getElementById('contact-form');
form.onsubmit = async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(form));
  const errs = {};
  if (!d.name.trim()) errs.name = 'Name is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) errs.email = 'Enter a valid email';
  if (d.phone && !/^[6-9]\d{9}$/.test(d.phone)) errs.phone = 'Enter a valid 10-digit mobile number';
  if (d.message.trim().length < 10) errs.message = 'Please write at least 10 characters';
  const show = (x) => form.querySelectorAll('[data-e]').forEach((el) => { el.textContent = x[el.dataset.e] || ''; });
  show(errs); if (Object.keys(errs).length) return;
  const b = e.submitter; b.classList.add('is-loading');
  try { const r = await post('/api/contact', d); document.getElementById('c-result').innerHTML = `<div class="alert alert-success">${esc(r.message)}</div>`; form.reset(); }
  catch (ex) { show(ex.details || {}); document.getElementById('c-result').innerHTML = `<div class="alert alert-danger">${esc(ex.message)}</div>`; }
  finally { b.classList.remove('is-loading'); }
};
