/**
 * Location pin picker. Uses the Google Maps JavaScript API when GOOGLE_MAPS_API_KEY is configured,
 * otherwise falls back to Leaflet + OpenStreetMap (served locally from node_modules) with the same behaviour:
 * draggable pin, click-to-move, and "Use my current location".
 */
import { session } from '../lib/session.js';
import { icon } from '../lib/icons.js';

const DEFAULT = { lat: 13.0827, lng: 80.2707 }; // Chennai
let leafletLoading, googleLoading;

function loadCss(href) { if (!document.querySelector(`link[href="${href}"]`)) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); } }
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }

function loadLeaflet() {
  loadCss('/vendor/leaflet/leaflet.css');
  leafletLoading ||= window.L ? Promise.resolve() : loadScript('/vendor/leaflet/leaflet.js');
  return leafletLoading;
}
function loadGoogle(key) {
  googleLoading ||= new Promise((res, rej) => {
    window.__hhGmapsReady = res;
    loadScript(`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=__hhGmapsReady&loading=async`).catch(rej);
  });
  return googleLoading;
}

export async function mountMapPicker(el, { lat, lng, onChange }) {
  const key = session()?.config.googleMapsApiKey;
  const start = lat != null && lng != null ? { lat: Number(lat), lng: Number(lng) } : DEFAULT;
  el.innerHTML = `<div class="row between" style="margin-bottom:8px"><span class="label">📍 Pin your exact location <span class="xs muted">(optional, helps the delivery partner)</span></span><button type="button" class="btn btn-sm btn-light" data-locate>${icon('locate')} Use my current location</button></div>
    <div class="map-box" data-map role="application" aria-label="Map. Drag the pin to your delivery location."></div>
    <p class="xs muted mt-0" data-coords style="margin-top:6px"></p>
    ${key ? '' : '<p class="map-notice" data-notice>ℹ️ Google Maps key not configured — showing OpenStreetMap (Leaflet) fallback. Add GOOGLE_MAPS_API_KEY in .env to use Google Maps.</p>'}`;
  const box = el.querySelector('[data-map]'), coords = el.querySelector('[data-coords]');
  let setPos;
  const report = (p) => { coords.textContent = `Lat ${p.lat.toFixed(5)}, Lng ${p.lng.toFixed(5)} · `; const a = document.createElement('a'); a.href = `https://www.google.com/maps?q=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Open in Google Maps'; coords.appendChild(a); onChange?.(p); };

  try {
    if (key) {
      await loadGoogle(key);
      const map = new google.maps.Map(box, { center: start, zoom: 15, streetViewControl: false, mapTypeControl: false });
      const marker = new google.maps.Marker({ position: start, map, draggable: true, title: 'Delivery location' });
      setPos = (p) => { marker.setPosition(p); map.panTo(p); report(p); };
      marker.addListener('dragend', () => report({ lat: marker.getPosition().lat(), lng: marker.getPosition().lng() }));
      map.addListener('click', (e) => setPos({ lat: e.latLng.lat(), lng: e.latLng.lng() }));
    } else throw new Error('no key');
  } catch (e) {
    if (key) el.insertAdjacentHTML('beforeend', '<p class="map-notice">⚠️ Google Maps failed to load (check the API key). Using OpenStreetMap instead.</p>');
    await loadLeaflet();
    const L = window.L;
    const map = L.map(box, { scrollWheelZoom: false }).setView([start.lat, start.lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
    const pinIcon = L.divIcon({ className: '', html: '<div style="font-size:34px;line-height:1;transform:translate(-50%,-100%);filter:drop-shadow(0 2px 2px rgba(0,0,0,.35))">📍</div>', iconSize: [0, 0] });
    const marker = L.marker([start.lat, start.lng], { draggable: true, icon: pinIcon, keyboard: true, title: 'Delivery location' }).addTo(map);
    setPos = (p) => { marker.setLatLng([p.lat, p.lng]); map.panTo([p.lat, p.lng]); report(p); };
    marker.on('dragend', () => { const ll = marker.getLatLng(); report({ lat: ll.lat, lng: ll.lng }); });
    map.on('click', (ev) => setPos({ lat: ev.latlng.lat, lng: ev.latlng.lng }));
    setTimeout(() => map.invalidateSize(), 250);
  }
  if (lat != null && lng != null) report(start); else coords.textContent = 'Drag the pin or tap the map to set your location.';
  el.querySelector('[data-locate]').onclick = (ev) => {
    const btn = ev.currentTarget;
    if (!navigator.geolocation) { coords.textContent = 'Location is not supported on this device.'; return; }
    btn.classList.add('is-loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => { btn.classList.remove('is-loading'); setPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      (err) => { btn.classList.remove('is-loading'); coords.textContent = `Couldn't get your location (${err.message}). Please drag the pin instead.`; },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  return { setPos: (p) => setPos(p) };
}
