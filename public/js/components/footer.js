import { esc } from '../lib/format.js';
import { icon } from '../lib/icons.js';

export function mountFooter(s) {
  const { footer, contact, store } = s.cms;
  const el = document.getElementById('site-footer') || document.body.appendChild(document.createElement('div'));
  el.outerHTML = `<footer class="site-footer" id="site-footer"><div class="container">
    <div class="footer-grid">
      <div><a class="brand" href="/" style="color:#fff"><img src="${esc(store.logoUrl || '/images/brand/logo.svg')}" alt="" width="36" height="36"><span>${esc(store.name)}</span></a><p class="mt-4">${esc(footer.about)}</p></div>
      ${footer.columns.map((c) => `<div><h4>${esc(c.title)}</h4><ul>${c.links.map((l) => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('')}</ul></div>`).join('')}
      <div><h4>Get in touch</h4><ul>
        <li>${icon('phone', 'icon')} <a href="tel:${esc(contact.phone.replace(/\s/g, ''))}">${esc(contact.phone)}</a></li>
        <li>${icon('mail', 'icon')} <a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a></li>
        <li>${icon('whatsapp', 'icon')} <a href="https://wa.me/${esc(contact.whatsapp)}" target="_blank" rel="noopener">WhatsApp us</a></li>
        <li>${icon('clock', 'icon')} ${esc(contact.hours[0].days)}: ${esc(contact.hours[0].time)}</li>
      </ul></div>
    </div>
    <div class="footer-bottom"><span>${esc(footer.copyright.replace('{year}', new Date().getFullYear()))}</span><div class="pay-icons" aria-label="Payment methods"><span>UPI</span><span>RuPay</span><span>Visa</span><span>Mastercard</span><span>COD</span></div></div>
  </div></footer>`;
}
