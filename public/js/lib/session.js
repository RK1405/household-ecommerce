/** Session-wide state: public config, CMS basics and the logged-in user. */
import { get, post } from './api.js';

let cache = null;
export async function loadSession(force = false) {
  if (cache && !force) return cache;
  const [config, cms, me] = await Promise.all([get('/api/config/public'), get('/api/cms'), get('/api/auth/me')]);
  cache = { config, cms, user: me.user };
  document.dispatchEvent(new CustomEvent('session:ready', { detail: cache }));
  return cache;
}
export const session = () => cache;
export async function logout() {
  await post('/api/auth/logout');
  location.href = '/';
}
