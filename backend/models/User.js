const mongoose = require('mongoose');

// RU: Учётная запись администратора; хеш пароля не выбирается обычными запросами.
// EN: An administrator account; ordinary queries never select the password hash.
const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['Администратор', 'Наблюдатель'], default: 'Администратор' },
    active: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0, min: 0, select: false },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
