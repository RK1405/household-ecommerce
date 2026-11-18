'use strict';
const returnPolicy = require('../utils/returnPolicy');
/**
 * Pricing rules (all prices are GST-inclusive, in ₹):
 *   base price  = product.salePrice (if inside its sale window) else product.price
 *   promo       = best active promotion for the product (category-wide or product-specific)
 *   final price = base price − promo discount (rounded to the rupee)
 * Cart totals: subtotal − coupon discount + delivery charge = total. GST shown as "included".
 */
const repo = require('../repositories');

const now = () => Date.now();
const inWindow = (start, end, t = now()) => (!start || Date.parse(start) <= t) && (!end || Date.parse(end) >= t);
const round = (n) => Math.round(n);
const money2 = (n) => Math.round(n * 100) / 100;

function activePromotions(t = now()) {
  return repo.promotions.all().filter((p) => p.active && inWindow(p.startAt, p.endAt, t));
}

function promoDiscount(promo, amount) {
  if (promo.discountType === 'percent') return round((amount * promo.value) / 100);
  return Math.min(amount, Number(promo.value) || 0);
}

function priceProduct(p, promos = activePromotions()) {
  const onSale = p.salePrice && inWindow(p.saleStart, p.saleEnd);
  const basePrice = onSale ? Number(p.salePrice) : Number(p.price);
  let best = null;
  for (const pr of promos) {
    const match = (pr.scope === 'category' && (pr.category === p.category || pr.category === p.subcategory)) || (pr.scope === 'product' && (pr.productIds || []).includes(p.id));
    if (!match) continue;
    const d = promoDiscount(pr, basePrice);
    if (!best || d > best.amount) best = { amount: d, promo: pr };
  }
  const finalPrice = Math.max(1, basePrice - (best ? best.amount : 0));
  const discountPct = p.mrp > finalPrice ? Math.round(((p.mrp - finalPrice) / p.mrp) * 100) : 0;
  const badges = [];
  if (best && best.promo.dealOfDay) badges.push({ type: 'deal', label: 'Deal of the Day' });
  else if (best) badges.push({ type: 'promo', label: best.promo.badge || best.promo.name });
  if (onSale) badges.push({ type: 'sale', label: 'Sale' });
  if ((p.tags || []).includes('new-arrival')) badges.push({ type: 'new', label: 'New' });
  if ((p.tags || []).includes('best-seller')) badges.push({ type: 'best', label: 'Bestseller' });
  return {
    basePrice, finalPrice, discountPct, onSale: !!onSale, saleEnd: onSale ? p.saleEnd : null,
    promotion: best ? { id: best.promo.id, name: best.promo.name, badge: best.promo.badge, amount: best.amount, endAt: best.promo.endAt, dealOfDay: !!best.promo.dealOfDay } : null,
    badges,
    isOffer: discountPct >= 25 || !!best || !!onSale || (p.tags || []).includes('on-offer'),
  };
}

/** Public product view enriched with pricing and stock flags. */
function view(p, promos) {
  const pricing = priceProduct(p, promos);
  const { illustration, ...rest } = p;
  return { ...rest, pricing, price: pricing.finalPrice, returnPolicy: returnPolicy.describe(pricing.finalPrice, p, repo.settings.get()), inStock: p.stock > 0, lowStock: p.stock > 0 && p.stock <= (p.lowStockThreshold || 5) };
}

function deliveryCharge(method, amountAfterDiscount, settings) {
  const d = settings.delivery[method] || settings.delivery.standard;
  if (d.freeAbove && amountAfterDiscount >= d.freeAbove) return 0;
  return Number(d.charge) || 0;
}

/**
 * Validates a coupon for a set of priced lines. Returns { valid, discount, message, coupon }.
 */
function evaluateCoupon(code, lines, user) {
  if (!code) return { valid: false, discount: 0, message: '' };
  const c = repo.coupons.findByCode(code);
  if (!c || !c.active) return { valid: false, discount: 0, message: `Coupon "${String(code).toUpperCase()}" is not valid.` };
  const t = now();
  if (c.startAt && Date.parse(c.startAt) > t) return { valid: false, discount: 0, message: `Coupon ${c.code} is not active yet.` };
  if (c.endAt && Date.parse(c.endAt) < t) return { valid: false, discount: 0, message: `Coupon ${c.code} has expired.` };
  if (c.usageLimit && c.usedCount >= c.usageLimit) return { valid: false, discount: 0, message: `Coupon ${c.code} has reached its usage limit.` };
  if (user && c.perUserLimit) {
    const used = repo.orders.byUser(user.id).filter((o) => o.totals.couponCode === c.code && o.status !== 'Cancelled').length;
    if (used >= c.perUserLimit) return { valid: false, discount: 0, message: `You have already used ${c.code} the maximum number of times (${c.perUserLimit}).` };
  }
  const cats = c.categories || [];
  const eligible = lines.filter((l) => !cats.length || cats.includes(l.category) || cats.includes(l.subcategory));
  const eligibleTotal = eligible.reduce((a, l) => a + l.lineTotal, 0);
  if (cats.length && !eligibleTotal) {
    const names = cats.map((s) => (repo.categories.findBySlug(s) || { name: s }).name).join(', ');
    return { valid: false, discount: 0, message: `${c.code} applies only to ${names} products.` };
  }
  if (c.minOrder && eligibleTotal < c.minOrder) {
    return { valid: false, discount: 0, message: `Add items worth ₹${(c.minOrder - eligibleTotal).toLocaleString('en-IN')} more${cats.length ? ' from eligible categories' : ''} to use ${c.code} (minimum ₹${Number(c.minOrder).toLocaleString('en-IN')}).` };
  }
  let discount = c.type === 'percent' ? round((eligibleTotal * c.value) / 100) : Number(c.value);
  if (c.maxDiscount) discount = Math.min(discount, Number(c.maxDiscount));
  discount = Math.min(discount, eligibleTotal);
  return { valid: true, discount, coupon: { id: c.id, code: c.code, description: c.description }, message: `${c.code} applied — you save ₹${discount.toLocaleString('en-IN')}.` };
}

/**
 * Builds a full cart quote from [{productId, qty}].
 */
function quote(items, { couponCode, user, deliveryMethod = 'standard', paymentMethod } = {}) {
  const settings = repo.settings.get();
  const promos = activePromotions();
  const lines = [];
  const issues = [];
  for (const it of items || []) {
    const p = repo.products.findById(it.productId);
    if (!p || p.active === false) { issues.push({ productId: it.productId, message: 'A product in your cart is no longer available and was removed.' }); continue; }
    const qty = Math.max(1, Math.min(10, Number(it.qty) || 1));
    const pr = priceProduct(p, promos);
    if (p.stock <= 0) issues.push({ productId: p.id, message: `${p.name} is out of stock.` });
    else if (qty > p.stock) issues.push({ productId: p.id, message: `Only ${p.stock} left of ${p.name}.` });
    lines.push({
      productId: p.id, name: p.name, slug: p.slug, sku: p.sku, brand: p.brand, image: p.images[0], category: p.category, subcategory: p.subcategory,
      mrp: p.mrp, price: pr.finalPrice, returnWindowDays: returnPolicy.effectiveWindow(pr.finalPrice, returnPolicy.adminWindow(p), returnPolicy.minPriceOf(repo.settings.get())), qty, stock: p.stock, gstRate: p.gstRate, hsn: p.hsn, lineTotal: pr.finalPrice * qty, lineMrp: p.mrp * qty, badges: pr.badges,
    });
  }
  const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);
  const mrpTotal = lines.reduce((a, l) => a + l.lineMrp, 0);
  const coupon = evaluateCoupon(couponCode, lines, user);
  const discount = coupon.valid ? coupon.discount : 0;
  const afterDiscount = subtotal - discount;
  const method = settings.delivery[deliveryMethod] ? deliveryMethod : 'standard';
  const delivery = lines.length ? deliveryCharge(method, afterDiscount, settings) : 0;
  const total = afterDiscount + delivery;
  // GST included in item prices, apportioned after coupon discount
  const ratio = subtotal ? afterDiscount / subtotal : 0;
  const gst = money2(lines.reduce((a, l) => a + (l.lineTotal * ratio * l.gstRate) / (100 + l.gstRate), 0));
  const cod = settings.cod;
  let codAvailable = cod.enabled && total <= cod.maxOrderValue && total >= (cod.minOrderValue || 0);
  const codMessage = !cod.enabled ? 'Cash on Delivery is currently unavailable.' : total > cod.maxOrderValue ? `Cash on Delivery is available only for orders up to ₹${cod.maxOrderValue.toLocaleString('en-IN')}.` : '';
  const deliveryOptions = Object.entries(settings.delivery).map(([key, d]) => ({ key, label: d.label, eta: d.eta, charge: lines.length ? deliveryCharge(key, afterDiscount, settings) : 0, baseCharge: d.charge, freeAbove: d.freeAbove }));
  return {
    lines, issues, itemCount: lines.reduce((a, l) => a + l.qty, 0),
    mrpTotal, subtotal, savings: mrpTotal - subtotal + discount,
    coupon: couponCode ? { code: String(couponCode).toUpperCase(), valid: coupon.valid, message: coupon.message, discount } : null,
    discount, deliveryMethod: method, delivery, deliveryOptions, gst, total,
    codAvailable, codMessage, paymentMethod: paymentMethod || null,
    freeDeliveryGap: settings.delivery.standard.freeAbove && afterDiscount < settings.delivery.standard.freeAbove ? settings.delivery.standard.freeAbove - afterDiscount : 0,
  };
}

module.exports = { priceProduct, view, quote, evaluateCoupon, activePromotions, inWindow };
