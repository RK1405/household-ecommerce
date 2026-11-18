'use strict';
/** Return policy rules in one place. Window = days after delivery; 0 means "no returns". */
const DEFAULT_WINDOW_DAYS = 7;
const DEFAULT_MIN_PRICE = 1000;   // products priced below this are never returnable (editable in Store settings)
const MAX_WINDOW_DAYS = 30;

const minPriceOf = (settings) => {
  const v = Number(settings?.returns?.minPrice);
  return Number.isFinite(v) && v >= 0 ? v : DEFAULT_MIN_PRICE;
};
/** Admin's per-product choice (falls back to the default for products created before this field existed). */
const adminWindow = (p) => {
  const v = Number(p?.returnWindowDays);
  return Number.isFinite(v) ? Math.max(0, Math.min(MAX_WINDOW_DAYS, Math.floor(v))) : DEFAULT_WINDOW_DAYS;
};
/** Final window for a unit sold at `unitPrice`: no returns below the minimum price, whatever the admin chose. */
const effectiveWindow = (unitPrice, adminDays, minPrice) => (Number(unitPrice) < minPrice ? 0 : adminDays);
/** Storefront-facing summary. */
function describe(unitPrice, p, settings) {
  const min = minPriceOf(settings), admin = adminWindow(p);
  const days = effectiveWindow(unitPrice, admin, min);
  const reason = days > 0 ? '' : (Number(unitPrice) < min ? 'under-min-price' : 'admin');
  return { days, minPrice: min, reason };
}
module.exports = { DEFAULT_WINDOW_DAYS, DEFAULT_MIN_PRICE, MAX_WINDOW_DAYS, minPriceOf, adminWindow, effectiveWindow, describe };
