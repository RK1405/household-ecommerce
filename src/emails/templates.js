'use strict';
/** Branded HTML email templates. Each returns { subject, html }. Edit copy here. */
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function layout({ store, baseUrl, preheader, heading, body, cta }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(heading)}</title></head>
<body style="margin:0;background:#f4f1ec;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2d2b">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader || heading)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,.06)">
<tr><td style="background:#0f766e;padding:20px 28px;color:#fff;font-size:22px;font-weight:800;letter-spacing:.3px">🏠 ${esc(store.name)}<div style="font-size:13px;font-weight:400;opacity:.85">${esc(store.tagline || '')}</div></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:22px;color:#0f3d3a">${esc(heading)}</h1>
${body}
${cta ? `<p style="margin:24px 0 0"><a href="${esc(cta.href.startsWith('http') ? cta.href : baseUrl + cta.href)}" style="display:inline-block;background:#f97350;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">${esc(cta.label)}</a></p>` : ''}
</td></tr>
<tr><td style="background:#0b1f24;color:#b6c7c4;padding:18px 28px;font-size:12px;line-height:1.6">You are receiving this email because of activity on your ${esc(store.name)} account.<br>This is a demo store — no real orders, payments or deliveries take place.<br>© ${new Date().getFullYear()} ${esc(store.name)}</td></tr>
</table></td></tr></table></body></html>`;
}

function itemsTable(order) {
  const rows = order.items.map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${esc(i.name)} × ${i.qty}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #eee">${inr(i.lineTotal)}</td></tr>`).join('');
  const t = order.totals;
  return `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:16px 0">${rows}
  <tr><td style="padding-top:10px">Subtotal</td><td align="right" style="padding-top:10px">${inr(t.subtotal)}</td></tr>
  ${t.discount ? `<tr><td>Coupon ${esc(t.couponCode || '')}</td><td align="right" style="color:#0f766e">− ${inr(t.discount)}</td></tr>` : ''}
  <tr><td>Delivery (${esc(order.deliveryMethod)})</td><td align="right">${t.delivery ? inr(t.delivery) : 'FREE'}</td></tr>
  <tr><td style="color:#667">GST included</td><td align="right" style="color:#667">${inr(t.gst)}</td></tr>
  <tr><td style="font-weight:800;padding-top:8px">Total</td><td align="right" style="font-weight:800;padding-top:8px">${inr(t.total)}</td></tr></table>`;
}

const addr = (a) => a ? `<p style="font-size:14px;color:#445;margin:0">${esc(a.name)}, ${esc(a.line1)}${a.line2 ? ', ' + esc(a.line2) : ''}, ${esc(a.city)}, ${esc(a.state)} – ${esc(a.pincode)}<br>📞 +91 ${esc(a.phone)}</p>` : '';

const T = {
  welcome: ({ user }) => ({ subject: 'Welcome to {store} 🎉', heading: `Welcome, ${user.name.split(' ')[0]}!`, body: `<p>Thanks for creating your account. Save addresses, track orders and enjoy member-only offers.</p><p style="background:#fff7ed;border:1px dashed #f97350;padding:12px 16px;border-radius:10px">Use <strong>WELCOME10</strong> for 10% off your first order (up to ₹200).</p>`, cta: { label: 'Start shopping', href: '/products.html' } }),
  password_reset: ({ user, link }) => ({ subject: 'Reset your {store} password', heading: 'Reset your password', body: `<p>Hi ${esc(user.name)}, we received a request to reset your password. This link is valid for 30 minutes.</p><p style="font-size:12px;color:#667;word-break:break-all">${esc(link)}</p><p>If you didn't request this, you can ignore this email.</p>`, cta: { label: 'Reset password', href: link } }),
  order_placed: ({ order }) => ({ subject: 'Order {orderNo} placed — thank you!', heading: `Order ${order.orderNo} placed`, body: `<p>Hi ${esc(order.customer.name)}, thanks for shopping with us. Payment: <strong>${order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online'}</strong>.</p>${itemsTable(order)}<h3 style="font-size:15px;margin:16px 0 6px">Delivering to</h3>${addr(order.shippingAddress)}`, cta: { label: 'View order', href: `/account.html#orders` } }),
  payment_success: ({ order, payment }) => ({ subject: 'Payment received for order {orderNo}', heading: 'Payment successful ✅', body: `<p>We received <strong>${inr(payment.amount)}</strong> via ${esc(payment.method)} for order <strong>${order.orderNo}</strong>.</p><p style="font-size:13px;color:#667">Payment ID: ${esc(payment.id)}</p>`, cta: { label: 'Track order', href: `/account.html#orders` } }),
  payment_failed: ({ order, payment }) => ({ subject: 'Payment failed for order {orderNo}', heading: 'Payment failed', body: `<p>Your payment of <strong>${inr(payment.amount)}</strong> for order <strong>${order.orderNo}</strong> could not be completed${payment.failureReason ? `: ${esc(payment.failureReason)}` : ''}.</p><p>No money was deducted. You can retry the payment or choose Cash on Delivery.</p>`, cta: { label: 'Retry payment', href: `/payment.html?order=${order.id}` } }),
  order_shipped: ({ order }) => ({ subject: 'Order {orderNo} has shipped 🚚', heading: 'Your order is on its way', body: `<p>Order <strong>${order.orderNo}</strong> has been shipped${order.tracking ? ` via ${esc(order.tracking.courier)} (AWB ${esc(order.tracking.awb)})` : ''}.</p>${addr(order.shippingAddress)}`, cta: { label: 'Track order', href: '/account.html#orders' } }),
  out_for_delivery: ({ order }) => ({ subject: 'Order {orderNo} is out for delivery', heading: 'Out for delivery today', body: `<p>Our delivery partner will reach you today with order <strong>${order.orderNo}</strong>.${order.paymentMethod === 'COD' ? ` Please keep <strong>${inr(order.totals.total)}</strong> ready (cash/UPI on delivery).` : ''}</p>` }),
  delivered: ({ order }) => ({ subject: 'Order {orderNo} delivered', heading: 'Delivered! 🎁', body: `<p>Order <strong>${order.orderNo}</strong> has been delivered. We hope you love it.</p><p>Not happy? Returns are easy within 7 days.</p>`, cta: { label: 'Rate your products', href: `/product/${order.items[0]?.slug || ''}#reviews` } }),
  cancelled: ({ order }) => ({ subject: 'Order {orderNo} cancelled', heading: 'Order cancelled', body: `<p>Order <strong>${order.orderNo}</strong> has been cancelled.${order.paymentMethod === 'ONLINE' && order.paymentStatus !== 'failed' ? ' Any amount paid will be refunded to the original payment method within 5–7 working days.' : ''}</p>` }),
  refund: ({ order, refund }) => ({ subject: 'Refund processed for order {orderNo}', heading: 'Refund processed', body: `<p>We have processed a refund of <strong>${inr(refund ? refund.amount : order.totals.total)}</strong> for order <strong>${order.orderNo}</strong>. It will reflect in 5–7 working days.</p>${refund ? `<p style="font-size:13px;color:#667">Refund ID: ${esc(refund.id)}</p>` : ''}` }),
  contact_admin: ({ contact }) => ({ subject: 'New contact enquiry: {topic}', heading: 'New contact form enquiry', body: `<table style="font-size:14px">${['name', 'email', 'phone', 'topic', 'orderNo'].map((k) => `<tr><td style="color:#667;padding-right:12px">${k}</td><td>${esc(contact[k] || '—')}</td></tr>`).join('')}</table><p style="background:#f6f6f6;padding:12px;border-radius:8px">${esc(contact.message)}</p>` }),
  test: () => ({ subject: 'Test email from {store}', heading: 'SMTP test', body: '<p>If you can read this, your email configuration works. 🎉</p>' }),
};

const LABELS = { welcome: 'Registration welcome', password_reset: 'Password reset', order_placed: 'Order placed', payment_success: 'Payment success', payment_failed: 'Payment failed', order_shipped: 'Order shipped', out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Order cancelled', refund: 'Refund processed', contact_admin: 'Contact form (to admin)', test: 'Test email' };

function render(type, data, { store, baseUrl }) {
  const t = T[type];
  if (!t) throw new Error(`Unknown email template ${type}`);
  const r = t(data);
  const vars = { store: store.name, orderNo: data.order?.orderNo || '', topic: data.contact?.topic || '' };
  const subject = r.subject.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  return { subject, html: layout({ store, baseUrl, heading: r.heading, body: r.body, cta: r.cta, preheader: subject }) };
}

module.exports = { render, LABELS, TYPES: Object.keys(T) };
