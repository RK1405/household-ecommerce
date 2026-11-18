'use strict';
const router = require('express').Router();
const { requireAdmin } = require('../../middleware/auth');
router.use(requireAdmin);
for (const m of ['dashboard', 'catalog', 'orders', 'marketing', 'cms', 'reports', 'payments', 'returns', 'email', 'settings', 'people']) router.use(require(`./${m}`));
module.exports = router;
