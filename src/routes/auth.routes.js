'use strict';
const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const repo = require('../repositories');
const config = require('../config');
const email = require('../services/email.service');
const { issue, clear, requireAuth } = require('../middleware/auth');
const { HttpError } = require('../middleware/errors');
const { isEmail, isMobile, normPhone, strongPassword } = require('../utils/validate');
const { id } = require('../utils/ids');

const me = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role });

// naive in-memory rate limit for login attempts
const attempts = new Map();
function limited(key) {
  const now = Date.now();
  const a = (attempts.get(key) || []).filter((t) => now - t < 10 * 60e3);
  attempts.set(key, a);
  return a.length >= 10;
}

router.post('/register', (req, res) => {
  const { name, email: em, phone, password } = req.body || {};
  const errors = {};
  if (!String(name || '').trim()) errors.name = 'Name is required';
  if (!isEmail(em)) errors.email = 'Enter a valid email address';
  if (phone && !isMobile(phone)) errors.phone = 'Enter a valid 10-digit mobile number';
  if (!strongPassword(password)) errors.password = 'Use at least 8 characters with letters and numbers';
  if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields', errors);
  if (repo.users.findByEmail(em)) throw new HttpError(409, 'An account with this email already exists. Try logging in.', { email: 'Already registered' });
  const user = repo.users.create({ id: id('u_'), name: String(name).trim(), email: String(em).trim().toLowerCase(), phone: phone ? normPhone(phone) : '', role: 'user', passwordHash: bcrypt.hashSync(password, 10), addresses: [], createdAt: new Date().toISOString() });
  issue(res, user);
  email.queue('welcome', user.email, { user });
  res.status(201).json({ user: me(user) });
});

router.post('/login', (req, res) => {
  const { email: em, password } = req.body || {};
  const key = `${req.ip}|${String(em).toLowerCase()}`;
  if (limited(key)) throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
  const user = repo.users.findByEmail(em || '');
  if (!user || !bcrypt.compareSync(String(password || ''), user.passwordHash)) {
    attempts.get(key).push(Date.now());
    throw new HttpError(401, 'Incorrect email or password.');
  }
  if (user.status === 'blocked') throw new HttpError(403, 'This account is blocked. Please contact support.');
  if (req.body.adminOnly && user.role !== 'admin') throw new HttpError(403, 'This account does not have admin access.');
  issue(res, user);
  res.json({ user: me(user) });
});

router.post('/logout', (req, res) => { clear(res); res.json({ ok: true }); });

router.get('/me', (req, res) => res.json({ user: req.user ? me(req.user) : null }));

router.post('/forgot', (req, res) => {
  const user = repo.users.findByEmail(req.body?.email || '');
  if (user) {
    const token = crypto.randomBytes(24).toString('hex');
    repo.users.update(user.id, { reset: { tokenHash: crypto.createHash('sha256').update(token).digest('hex'), expires: Date.now() + 30 * 60e3 } });
    const link = `${config.baseUrl || `http://localhost:${config.port}`}/login.html?reset=${token}`;
    email.queue('password_reset', user.email, { user, link });
  }
  // Same response either way (no account enumeration)
  res.json({ message: 'If an account exists for that email, a reset link has been sent.' + (config.demoMode ? ' (Demo: open Admin → Email settings → Outbox to view it.)' : '') });
});

router.post('/reset', (req, res) => {
  const { token, password } = req.body || {};
  if (!strongPassword(password)) throw new HttpError(400, 'Use at least 8 characters with letters and numbers');
  const hash = crypto.createHash('sha256').update(String(token || '')).digest('hex');
  const user = repo.users.all().find((u) => u.reset && u.reset.tokenHash === hash && u.reset.expires > Date.now());
  if (!user) throw new HttpError(400, 'This reset link is invalid or has expired.');
  repo.users.update(user.id, { passwordHash: bcrypt.hashSync(password, 10), reset: null });
  res.json({ message: 'Password updated. You can now log in.' });
});

router.put('/password', requireAuth, (req, res) => {
  const { current, password } = req.body || {};
  if (!bcrypt.compareSync(String(current || ''), req.user.passwordHash)) throw new HttpError(400, 'Current password is incorrect');
  if (!strongPassword(password)) throw new HttpError(400, 'Use at least 8 characters with letters and numbers');
  repo.users.update(req.user.id, { passwordHash: bcrypt.hashSync(password, 10) });
  res.json({ message: 'Password changed' });
});

module.exports = router;
