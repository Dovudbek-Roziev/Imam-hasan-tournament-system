const express = require('express');
const { getTable, getTopScorers, getTopAssists, getDashboard, getArchive } = require('../controllers/statsController');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const router = express.Router();

router.get('/table', getTable);
router.get('/top-scorers', getTopScorers);
router.get('/top-assists', getTopAssists);
router.get('/dashboard', authenticate, requireAdmin, getDashboard);
router.get('/archive', authenticate, requireAdmin, getArchive);

module.exports = router;
