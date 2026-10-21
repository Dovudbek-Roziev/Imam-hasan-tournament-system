const express = require('express');
const { getTeams, createTeam, getTeam, updateTeam, deleteTeam } = require('../controllers/teamController');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middlewares/auth');

// RU: Чтение публичное, изменение доступно только администратору.
// EN: Reading is public; mutations require an administrator.
router.route('/').get(getTeams).post(authenticate, requireAdmin, createTeam);
router.route('/:id').get(getTeam).put(authenticate, requireAdmin, updateTeam).delete(authenticate, requireAdmin, deleteTeam);

module.exports = router;
