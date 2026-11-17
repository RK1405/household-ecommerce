/** Common bootstrap for every storefront page: session, header, footer, cart drawer, chatbot. */
import { loadSession } from './session.js';
import { loadCart } from './cart.js';
import { mountHeader } from '../components/header.js';
import { mountFooter } from '../components/footer.js';
import { mountCartDrawer } from '../components/cartDrawer.js';
import { mountChatbot } from '../components/chatbot.js';

export async function initPage({ active } = {}) {
  document.body.classList.add('store');
  const s = await loadSession();
  document.title = document.title.replace('{store}', s.cms.store.name);
  mountHeader(s, { active });
  mountFooter(s);
  mountCartDrawer();
  mountChatbot(s);
  loadCart().catch((e) => console.warn('cart', e));
  return s;
}

export function requireLogin(s) {
  if (!s.user) { location.href = `/login.html?next=${encodeURIComponent(location.pathname + location.search + location.hash)}`; return false; }
  return true;
}
