/**
 * Cart store. Guests: items in localStorage, priced via POST /api/cart/quote.
 * Logged-in users: server cart (GET/PUT /api/cart). On login, mergeGuestCart() merges the guest cart.
 */
import { api, get, post, put } from './api.js';
import { session } from './session.js';

const KEY = 'hh_cart_v1';
const state = { items: [], couponCode: null, deliveryMethod: 'standard', quote: null, loaded: false };
const listeners = new Set();

const isUser = () => !!session()?.user;
function readLocal() { try { return JSON.parse(localStorage.getItem(KEY)) || { items: [], couponCode: null }; } catch { return { items: [], couponCode: null }; } }
function writeLocal() { try { localStorage.setItem(KEY, JSON.stringify({ items: state.items, couponCode: state.couponCode })); } catch { /* storage unavailable */ } }
function emit() { listeners.forEach((fn) => fn(state)); document.dispatchEvent(new CustomEvent('cart:change', { detail: state })); }

export const cartState = () => state;
export function onCart(fn) { listeners.add(fn); if (state.loaded) fn(state); return () => listeners.delete(fn); }
export const count = () => state.items.reduce((a, i) => a + i.qty, 0);

async function requote() {
  state.quote = await post('/api/cart/quote', { items: state.items, couponCode: state.couponCode, deliveryMethod: state.deliveryMethod });
  // drop items the server removed (deleted products)
  const valid = new Set(state.quote.lines.map((l) => l.productId));
  if (state.items.some((i) => !valid.has(i.productId))) { state.items = state.items.filter((i) => valid.has(i.productId)); persistLocalOnly(); }
}
function persistLocalOnly() { if (!isUser()) writeLocal(); }

export async function loadCart() {
  if (isUser()) {
    const r = await get('/api/cart');
    state.items = r.items; state.couponCode = r.couponCode;
  } else {
    const l = readLocal(); state.items = l.items || []; state.couponCode = l.couponCode || null;
  }
  await requote();
  state.loaded = true; emit();
  return state;
}

async function save() {
  if (isUser()) {
    const r = await put('/api/cart', { items: state.items, couponCode: state.couponCode });
    state.items = r.items;
  } else writeLocal();
  await requote();
  emit();
}

export async function addToCart(productId, qty = 1) {
  const ex = state.items.find((i) => i.productId === productId);
  if (ex) ex.qty = Math.min(10, ex.qty + qty); else state.items.push({ productId, qty: Math.min(10, qty) });
  await save();
  return state;
}
export async function setQty(productId, qty) {
  const ex = state.items.find((i) => i.productId === productId);
  if (!ex) return;
  if (qty <= 0) state.items = state.items.filter((i) => i.productId !== productId); else ex.qty = Math.min(10, qty);
  await save();
}
export const removeItem = (productId) => setQty(productId, 0);
export async function applyCoupon(code) { state.couponCode = code ? String(code).trim().toUpperCase() : null; await save(); return state.quote.coupon; }
export async function setDelivery(method) { state.deliveryMethod = method; await requote(); emit(); }
export async function clearLocal() { state.items = []; state.couponCode = null; writeLocal(); }

/** Called right after login/registration. */
export async function mergeGuestCart() {
  const l = readLocal();
  if (l.items?.length || l.couponCode) {
    await api('/api/cart/merge', { method: 'POST', body: { items: l.items, couponCode: l.couponCode } });
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }
}
