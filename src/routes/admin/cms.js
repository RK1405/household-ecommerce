'use strict';
const router = require('express').Router();
const repo = require('../../repositories');
const { HttpError } = require('../../middleware/errors');
const { id, slugify } = require('../../utils/ids');

const SECTIONS = ['store', 'announcement', 'banners', 'bento', 'footer', 'contact', 'pages'];

router.get('/cms', (req, res) => res.json(repo.cms.get()));

router.put('/cms/:section', (req, res) => {
  const { section } = req.params;
  if (!SECTIONS.includes(section)) throw new HttpError(404, 'Unknown CMS section');
  let value = req.body;
  if (section === 'store' && !String(value.name || '').trim()) throw new HttpError(400, 'Store name is required', { name: 'Required' });
  if (section === 'banners') {
    if (!Array.isArray(value)) throw new HttpError(400, 'Banners must be a list');
    value = value.map((b, i) => {
      if (!String(b.title || '').trim()) throw new HttpError(400, `Banner ${i + 1}: title is required`);
      if (!b.image) throw new HttpError(400, `Banner ${i + 1}: image is required`);
      return { id: b.id || id('b_'), title: b.title, subtitle: b.subtitle || '', ctaText: b.ctaText || '', ctaLink: b.ctaLink || '', image: b.image, order: Number(b.order) || i + 1, active: !!b.active, startAt: b.startAt ? new Date(b.startAt).toISOString() : null, endAt: b.endAt ? new Date(b.endAt).toISOString() : null, theme: b.theme || 'dark' };
    });
  }
  if (section === 'pages') {
    if (!Array.isArray(value)) throw new HttpError(400, 'Pages must be a list');
    const seen = new Set();
    value = value.map((p) => {
      const slug = slugify(p.slug || p.title);
      if (!slug || seen.has(slug)) throw new HttpError(400, `Duplicate or empty page slug: ${slug}`);
      seen.add(slug);
      return { slug, title: String(p.title || slug), content: String(p.content || ''), active: p.active !== false };
    });
  }
  repo.cms.setSection(section, value);
  res.json(repo.cms.get()[section]);
});

module.exports = router;
