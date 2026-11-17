/** Formatting helpers — Indian conventions (₹, en-IN grouping, IST dates). */
const nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const inr = (n) => `₹${nf.format(Math.round(Number(n) || 0))}`;
export const inr2 = (n) => `₹${nf2.format(Number(n) || 0)}`;
export const num = (n) => nf.format(Number(n) || 0);
export const date = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => (iso ? new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', ...opts }) : '—');
export const dateTime = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const qs = (k, url = location.href) => new URL(url).searchParams.get(k);
export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const stars = (r) => { const full = Math.round(Number(r) || 0); return '★'.repeat(full) + '☆'.repeat(5 - full); };
export const productUrl = (slug) => `/product/${slug}`;
export const absUrl = (p) => new URL(p, location.origin).href;
export const statusBadge = (s) => {
  const map = { Placed: 'info', Confirmed: 'info', Packed: 'warning', Shipped: 'warning', 'Out for delivery': 'warning', Delivered: 'success', Cancelled: 'danger', Returned: 'muted', 'Pending Payment': 'accent', paid: 'success', captured: 'success', authorised: 'info', created: 'muted', pending: 'warning', awaiting: 'accent', failed: 'danger', refunded: 'muted', cancelled: 'danger', 'refund-due': 'warning', 'partially-refunded': 'warning', live: 'success', scheduled: 'info', ended: 'muted', paused: 'muted', approved: 'success', rejected: 'danger', new: 'accent', resolved: 'success', outbox: 'info', sent: 'success' };
  return `<span class="badge badge-${map[s] || 'muted'}">${esc(s)}</span>`;
};
