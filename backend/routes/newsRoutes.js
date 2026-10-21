const express = require('express');
const { getNews, createNews, getNewsById, updateNews, deleteNews } = require('../controllers/newsController');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middlewares/auth');

// RU: Чтение публичное, изменение доступно только администратору.
// EN: Reading is public; mutations require an administrator.
router.route('/').get(getNews).post(authenticate, requireAdmin, createNews);
router.route('/:id').get(getNewsById).put(authenticate, requireAdmin, updateNews).delete(authenticate, requireAdmin, deleteNews);

module.exports = router;
