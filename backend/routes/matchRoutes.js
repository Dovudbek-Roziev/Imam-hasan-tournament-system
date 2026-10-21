const express = require('express');
const { getMatches, createMatch, getMatch, updateMatch, deleteMatch } = require('../controllers/matchController');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middlewares/auth');

// RU: Чтение публичное, изменение доступно только администратору.
// EN: Reading is public; mutations require an administrator.
router.route('/').get(getMatches).post(authenticate, requireAdmin, createMatch);
router.route('/:id').get(getMatch).put(authenticate, requireAdmin, updateMatch).delete(authenticate, requireAdmin, deleteMatch);

module.exports = router;
