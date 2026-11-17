'use strict';
/** Session = signed JWT in an httpOnly, SameSite=Lax cookie. Roles: user | admin. */
const jwt = require('jsonwebtoken');
const config = require('../config');
const repo = require('../repositories');

function issue(res, user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, config.session.secret, { expiresIn: `${config.session.ttlHours}h` });
  res.cookie(config.session.cookieName, token, {
    httpOnly: true, sameSite: 'lax', secure: config.env === 'production', maxAge: config.session.ttlHours * 3600e3, path: '/',
  });
}

function clear(res) { res.clearCookie(config.session.cookieName, { path: '/' }); }

function attachUser(req, _res, next) {
  const token = req.cookies?.[config.session.cookieName];
  if (token) {
    try {
      const payload = jwt.verify(token, config.session.secret);
      const user = repo.users.findById(payload.sub);
      if (user && user.status !== 'blocked') req.user = user;
    } catch { /* invalid/expired token → anonymous */ }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please log in to continue.' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Admin login required.' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only.' });
  next();
}

/** Server-side guard for /admin/*.html pages (except the login page). */
function adminPageGuard(req, res, next) {
  const p = req.path;
  const isPage = p === '/' || p.endsWith('.html');
  if (!isPage || p === '/login.html') return next();
  if (req.user && req.user.role === 'admin') return next();
  return res.redirect(`/admin/login.html?next=${encodeURIComponent(req.originalUrl)}`);
}

module.exports = { issue, clear, attachUser, requireAuth, requireAdmin, adminPageGuard };
