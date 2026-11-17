/**
 * Product gallery with:
 *  - desktop hover lens/magnifier (2.5×)
 *  - swipe between images on touch devices
 *  - fullscreen viewer: tap-to-zoom, double-tap, pinch-zoom and pan (pointer events), copy image link
 */
import { icon } from '../lib/icons.js';
import { esc, absUrl } from '../lib/format.js';
import { copyText } from './share.js';

const ZOOM = 2.5;

export function createGallery(root, images, { name = '', compact = false } = {}) {
  let current = 0;
  root.innerHTML = `<div class="gallery" ${compact ? 'style="grid-template-columns:1fr"' : ''}>
    <div class="thumbs" role="tablist" aria-label="Product images">${images.map((src, i) => `<button role="tab" aria-label="Image ${i + 1} of ${images.length}" aria-current="${i === 0}" data-i="${i}"><img src="${src}" alt=""></button>`).join('')}</div>
    <div class="stage" tabindex="0" aria-label="${esc(name)} image. Press Enter to open full-screen zoom.">
      <img class="main" src="${images[0]}" alt="${esc(name)} – view 1" width="800" height="800">
      <div class="lens" aria-hidden="true"></div>
      <div class="stage-actions"><button class="icon-btn" data-full aria-label="Open full-screen zoom">${icon('expand')}</button><button class="icon-btn" data-copyimg aria-label="Copy image link">${icon('link')}</button></div>
      <span class="hint">${matchMedia('(hover: hover)').matches ? 'Hover to zoom · click for full screen' : 'Tap to zoom · swipe for more'}</span>
    </div></div>`;
  const stage = root.querySelector('.stage'), main = root.querySelector('img.main'), lens = root.querySelector('.lens');
  const show = (i) => {
    current = (i + images.length) % images.length;
    main.src = images[current]; main.alt = `${name} – view ${current + 1}`;
    root.querySelectorAll('.thumbs button').forEach((b, j) => b.setAttribute('aria-current', String(j === current)));
  };
  root.querySelector('.thumbs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) show(Number(b.dataset.i)); });
  root.querySelector('.thumbs').addEventListener('mouseover', (e) => { const b = e.target.closest('button'); if (b && matchMedia('(hover: hover)').matches) show(Number(b.dataset.i)); });

  // Hover lens (mouse only)
  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = stage.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
    const lw = lens.offsetWidth / 2 || 80;
    lens.style.display = 'block';
    lens.style.left = `${x - lw}px`; lens.style.top = `${y - lw}px`;
    lens.style.backgroundImage = `url("${images[current]}")`;
    lens.style.backgroundSize = `${r.width * ZOOM}px ${r.height * ZOOM}px`;
    lens.style.backgroundPosition = `${-(x * ZOOM - lw)}px ${-(y * ZOOM - lw)}px`;
  });
  stage.addEventListener('pointerleave', () => { lens.style.display = 'none'; });

  // Swipe (touch) + tap to open viewer
  let sx = null, sy = null, moved = false;
  stage.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; moved = false; }, { passive: true });
  stage.addEventListener('touchmove', (e) => { if (sx !== null && Math.abs(e.touches[0].clientX - sx) > 10) moved = true; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
    sx = null;
  });
  stage.addEventListener('click', (e) => {
    if (e.target.closest('[data-copyimg]')) { copyText(absUrl(images[current]), 'Image link copied'); return; }
    if (moved) return;
    openViewer(images, current, name);
  });
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openViewer(images, current, name); }
    if (e.key === 'ArrowRight') show(current + 1);
    if (e.key === 'ArrowLeft') show(current - 1);
  });
  return { show, current: () => images[current] };
}

// ---------- Fullscreen viewer with pinch zoom ----------
let viewer;
function openViewer(images, start, name) {
  if (!viewer) { viewer = document.createElement('div'); viewer.className = 'viewer'; viewer.setAttribute('role', 'dialog'); viewer.setAttribute('aria-modal', 'true'); document.body.appendChild(viewer); }
  let idx = start, scale = 1, tx = 0, ty = 0;
  viewer.innerHTML = `<div class="viewer-top"><span class="small">${esc(name)} · <span data-pos></span></span><div class="row" style="gap:4px"><button class="icon-btn" data-z="in" aria-label="Zoom in">${icon('zoom')}</button><button class="icon-btn" data-copy aria-label="Copy image link">${icon('link')}</button><button class="icon-btn" data-close aria-label="Close viewer">${icon('close')}</button></div></div>
    <div class="viewer-stage"><img alt=""></div>
    <div class="viewer-thumbs">${images.map((s, i) => `<button data-i="${i}" aria-label="Image ${i + 1}"><img src="${s}" alt=""></button>`).join('')}</div>`;
  const stage = viewer.querySelector('.viewer-stage'), img = stage.querySelector('img');
  const apply = () => { img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`; };
  const reset = () => { scale = 1; tx = 0; ty = 0; img.style.transformOrigin = 'center center'; apply(); };
  const show = (i) => { idx = (i + images.length) % images.length; img.src = images[idx]; img.alt = `${name} – view ${idx + 1}`; viewer.querySelector('[data-pos]').textContent = `${idx + 1} / ${images.length}`; viewer.querySelectorAll('.viewer-thumbs button').forEach((b, j) => b.setAttribute('aria-current', String(j === idx))); reset(); };
  const zoomAt = (s) => { scale = Math.min(4, Math.max(1, s)); if (scale === 1) { tx = 0; ty = 0; } apply(); };
  show(idx);
  viewer.classList.add('open'); document.body.classList.add('no-scroll');
  const close = () => { viewer.classList.remove('open'); document.body.classList.remove('no-scroll'); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') show(idx + 1); if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === '+') zoomAt(scale + .5); if (e.key === '-') zoomAt(scale - .5); };
  document.addEventListener('keydown', onKey);
  viewer.querySelector('[data-close]').onclick = close;
  viewer.querySelector('[data-copy]').onclick = () => copyText(absUrl(images[idx]), 'Image link copied');
  viewer.querySelector('[data-z]').onclick = () => zoomAt(scale >= 3 ? 1 : scale + 1);
  viewer.querySelector('.viewer-thumbs').onclick = (e) => { const b = e.target.closest('button'); if (b) show(Number(b.dataset.i)); };
  viewer.querySelector('[data-close]').focus();

  // Pointer-based pinch / pan / double-tap
  const pts = new Map(); let startDist = 0, startScale = 1, last = null, lastTap = 0, swipeX = null;
  stage.onpointerdown = (e) => {
    stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; startDist = Math.hypot(a.x - b.x, a.y - b.y); startScale = scale; }
    last = { x: e.clientX, y: e.clientY }; swipeX = e.clientX;
    const now = Date.now(); if (now - lastTap < 300 && pts.size === 1) { zoomAt(scale > 1 ? 1 : 2.5); } lastTap = now;
  };
  stage.onpointermove = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; zoomAt(startScale * (Math.hypot(a.x - b.x, a.y - b.y) / startDist)); }
    else if (scale > 1 && last) { tx += e.clientX - last.x; ty += e.clientY - last.y; apply(); }
    last = { x: e.clientX, y: e.clientY };
  };
  const up = (e) => {
    pts.delete(e.pointerId);
    if (scale === 1 && swipeX !== null && pts.size === 0) { const dx = e.clientX - swipeX; if (Math.abs(dx) > 60) show(idx + (dx < 0 ? 1 : -1)); }
    if (pts.size === 0) { last = null; swipeX = null; }
  };
  stage.onpointerup = up; stage.onpointercancel = up;
  stage.onwheel = (e) => { e.preventDefault(); zoomAt(scale + (e.deltaY < 0 ? .3 : -.3)); };
}
export { openViewer };
