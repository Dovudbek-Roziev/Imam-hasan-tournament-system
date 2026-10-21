const Media = require('../models/Media');
const Team = require('../models/Team');
const AppError = require('../utils/AppError');

const IMAGE_TYPES = new Map([
    ['image/jpeg', (data) => data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff],
    ['image/png', (data) => data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))],
    ['image/webp', (data) => data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP'],
]);

// RU: Проверить тип и содержимое файла до его сохранения в MongoDB.
// EN: Validate the file type and signature before storing it in MongoDB.
function inspectImage(req) {
    const data = req.body;
    const contentType = req.get('Content-Type')?.split(';')[0].trim().toLowerCase();
    const matches = IMAGE_TYPES.get(contentType);
    if (!Buffer.isBuffer(data) || !data.length) throw new AppError(400, 'Выберите файл изображения.', 'IMAGE_REQUIRED');
    if (data.length > 2 * 1024 * 1024) throw new AppError(413, 'Размер изображения не должен превышать 2 МБ.', 'IMAGE_TOO_LARGE');
    if (!matches || !matches(data)) throw new AppError(415, 'Поддерживаются только изображения JPEG, PNG и WebP.', 'INVALID_IMAGE_TYPE');
    return { data, contentType };
}

// RU: Сохранить проверенное изображение и вернуть адрес для поля логотипа команды.
// EN: Store a validated image and return the URL for a team logo field.
exports.uploadImage = async (req, res, next) => {
    try {
        const image = inspectImage(req);
        const media = await Media.create({ ...image, uploadedBy: req.user._id });
        res.status(201).json({ success: true, data: { path: `/api/media/${media._id}` } });
    } catch (error) {
        next(error);
    }
};

// RU: Отдать публичный логотип с правильным MIME-типом и безопасным кэшированием.
// EN: Serve a public logo with its correct MIME type and safe caching headers.
exports.getImage = async (req, res, next) => {
    try {
        if (!/^[a-f\d]{24}$/i.test(req.params.id)) throw new AppError(404, 'Изображение не найдено.', 'IMAGE_NOT_FOUND');
        const media = await Media.findById(req.params.id).select('contentType data');
        if (!media) throw new AppError(404, 'Изображение не найдено.', 'IMAGE_NOT_FOUND');
        res.set({ 'Content-Type': media.contentType, 'Cache-Control': 'public, max-age=86400, immutable', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'cross-origin' });
        res.send(media.data);
    } catch (error) {
        next(error);
    }
};

// RU: Удалить неиспользуемое изображение, не нарушая ссылки команд.
// EN: Delete an unused image without breaking team logo references.
exports.deleteImage = async (req, res, next) => {
    try {
        if (!/^[a-f\d]{24}$/i.test(req.params.id)) throw new AppError(404, 'Изображение не найдено.', 'IMAGE_NOT_FOUND');
        const path = `/api/media/${req.params.id}`;
        if (await Team.exists({ logo: path })) throw new AppError(409, 'Нельзя удалить логотип, используемый командой.', 'IMAGE_IN_USE');
        const media = await Media.findByIdAndDelete(req.params.id);
        if (!media) throw new AppError(404, 'Изображение не найдено.', 'IMAGE_NOT_FOUND');
        res.json({ success: true, message: 'Изображение удалено.' });
    } catch (error) {
        next(error);
    }
};
