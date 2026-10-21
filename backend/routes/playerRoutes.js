const express = require('express');
const { getPlayers, createPlayer, getPlayer, updatePlayer, deletePlayer } = require('../controllers/playerController');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middlewares/auth');

// RU: Чтение публичное, изменение доступно только администратору.
// EN: Reading is public; mutations require an administrator.
router.route('/').get(getPlayers).post(authenticate, requireAdmin, createPlayer);
router.route('/:id').get(getPlayer).put(authenticate, requireAdmin, updatePlayer).delete(authenticate, requireAdmin, deletePlayer);

module.exports = router;
