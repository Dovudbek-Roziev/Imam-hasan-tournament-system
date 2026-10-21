const express = require('express');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { uploadImage, getImage, deleteImage } = require('../controllers/mediaController');

const router = express.Router();

// RU: Загрузку может выполнять администратор; просмотр логотипа доступен всем клиентам.
// EN: Only administrators may upload; image retrieval is public for tournament clients.
router.post('/', authenticate, requireAdmin, express.raw({ type: 'image/*', limit: '2mb' }), uploadImage);
router.get('/:id', getImage);
router.delete('/:id', authenticate, requireAdmin, deleteImage);

module.exports = router;
