/** Sharing: Web Share API (mobile), copy link, WhatsApp, copy image link. */
import { icon } from '../lib/icons.js';
import { esc, absUrl } from '../lib/format.js';
import { toast } from './toast.js';

export async function copyText(text, label = 'Link copied') {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch { /* ignore */ } ta.remove();
  }
  toast(label, { type: 'success' });
}

export const whatsappUrl = (text, url) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;

/** Renders share buttons into `el` for a product. getImage() returns the current image path. */
export function shareButtons(el, { title, text, path, getImage }) {
  const url = absUrl(path);
  const canNative = typeof navigator.share === 'function';
  el.innerHTML = `<div class="share-row">
    ${canNative ? `<button class="btn btn-sm btn-light" data-share="native">${icon('share')} Share</button>` : ''}
    <button class="btn btn-sm btn-light" data-share="copy">${icon('link')} Copy link</button>
    <a class="btn btn-sm btn-light" data-share="wa" href="${esc(whatsappUrl(text || title, url))}" target="_blank" rel="noopener">${icon('whatsapp')} WhatsApp</a>
    ${getImage ? `<button class="btn btn-sm btn-light" data-share="img">${icon('copy')} Copy image link</button>` : ''}
  </div>`;
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-share]'); if (!b) return;
    if (b.dataset.share === 'native') { e.preventDefault(); try { await navigator.share({ title, text, url }); } catch { /* cancelled */ } }
    if (b.dataset.share === 'copy') { e.preventDefault(); copyText(url, 'Product link copied'); }
    if (b.dataset.share === 'img') { e.preventDefault(); copyText(absUrl(getImage()), 'Image link copied'); }
  });
}
