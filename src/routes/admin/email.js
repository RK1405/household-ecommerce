'use strict';
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const repo = require('../../repositories');
const config = require('../../config');
const email = require('../../services/email.service');
const { wrap, HttpError } = require('../../middleware/errors');
const { isEmail } = require('../../utils/validate');

router.get('/email-settings', (req, res) => {
  const s = repo.settings.get().email;
  res.json({ ...s, smtp: { ...s.smtp, pass: s.smtp.pass ? '********' : '' }, envDemoMode: config.demoMode, types: email.TYPES.map((t) => ({ type: t, label: email.LABELS[t], enabled: s.enabled[t] !== false })) });
});

router.put('/email-settings', (req, res) => {
  const cur = repo.settings.get();
  const b = req.body || {};
  const smtp = { ...cur.email.smtp, ...b.smtp };
  if (b.smtp && b.smtp.pass === '********') smtp.pass = cur.email.smtp.pass;
  smtp.port = Number(smtp.port) || 587;
  smtp.secure = !!smtp.secure;
  if (b.adminEmail && !isEmail(b.adminEmail)) throw new HttpError(400, 'Admin email is invalid', { adminEmail: 'Invalid' });
  const next = { ...cur.email, smtp, demoMode: b.demoMode !== undefined ? !!b.demoMode : cur.email.demoMode, adminEmail: b.adminEmail || cur.email.adminEmail, enabled: { ...cur.email.enabled, ...(b.enabled || {}) } };
  repo.settings.patch({ email: next });
  res.json({ ok: true });
});

router.post('/email-settings/test', wrap(async (req, res) => {
  const to = req.body.to || email.smtpSettings().adminEmail;
  if (!isEmail(to)) throw new HttpError(400, 'Enter a valid email address');
  const r = await email.send('test', to, {});
  res.json({ ...r, message: r.status === 'sent' ? `Test email sent to ${to}` : r.status === 'failed' ? `SMTP error: ${r.error}` : `Demo mode: test email written to the outbox (${r.file})` });
}));

router.get('/email-templates/:type/preview', (req, res) => {
  if (!email.TYPES.includes(req.params.type)) throw new HttpError(404, 'Unknown template');
  res.type('html').send(email.preview(req.params.type).html);
});

router.get('/outbox', (req, res) => res.json(repo.emails.all().slice(0, 300)));
router.get('/outbox/:id', (req, res) => {
  const e = repo.emails.findById(req.params.id);
  if (!e) throw new HttpError(404, 'Email not found');
  const f = path.join(config.paths.outbox, path.basename(e.file));
  if (!fs.existsSync(f)) throw new HttpError(404, 'Email file missing');
  res.type('html').send(fs.readFileSync(f, 'utf8'));
});

module.exports = router;
