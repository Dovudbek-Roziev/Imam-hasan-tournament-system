const mongoose = require('mongoose');

// RU: Новость хранит обязательный русский текст и необязательный перевод на кыргызский; дату задаёт сервер.
// EN: A news item stores required Russian text and an optional Kyrgyz translation; the server assigns its date.
const newsSchema = new mongoose.Schema({
    title: { type: String, required: [true, 'Введите заголовок новости.'], trim: true, maxlength: 200 },
    content: { type: String, required: [true, 'Введите текст новости.'], trim: true, maxlength: 20000 },
    titleKy: { type: String, default: '', trim: true, maxlength: 200 },
    contentKy: { type: String, default: '', trim: true, maxlength: 20000 },
    date: { type: Date, default: Date.now },
}, { timestamps: true, strict: 'throw' });

newsSchema.index({ date: -1, _id: -1 });

module.exports = mongoose.model('News', newsSchema);
