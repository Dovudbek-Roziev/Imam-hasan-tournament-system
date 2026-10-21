const mongoose = require('mongoose');

// RU: Хранить небольшой публичный файл изображения отдельно от документов турнира.
// EN: Store a small public image file separately from tournament records.
const mediaSchema = new mongoose.Schema({
    contentType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp'], required: true },
    data: { type: Buffer, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, strict: 'throw' });

module.exports = mongoose.model('Media', mediaSchema);
