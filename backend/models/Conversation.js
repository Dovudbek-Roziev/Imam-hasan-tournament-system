const mongoose = require('mongoose');
const messageSchema = new mongoose.Schema({
    sender: { type: String, enum: ['visitor', 'admin'], required: true },
    text: { type: String, trim: true, required: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });
const conversationSchema = new mongoose.Schema({
    ownerHash: { type: String, required: true, select: false, index: true },
    role: { type: String, enum: ['player', 'parent', 'supporter'], required: true },
    messages: { type: [messageSchema], default: [] },
    unreadAdmin: { type: Boolean, default: true },
    unreadVisitor: { type: Boolean, default: false },
}, { timestamps: true, strict: 'throw' });
module.exports = mongoose.model('Conversation', conversationSchema);
