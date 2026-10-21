const AppError = require('../utils/AppError');

const FIELD_LABELS = {
    name: 'Название или имя', email: 'Электронная почта', title: 'Заголовок', titleKy: 'Заголовок на кыргызском', content: 'Текст', contentKy: 'Текст на кыргызском',
    team: 'Команда', homeTeam: 'Хозяева', awayTeam: 'Гости', date: 'Дата', time: 'Время',
    homeScore: 'Голы хозяев', awayScore: 'Голы гостей', status: 'Статус', number: 'Номер игрока',
    minute: 'Минута', player: 'Игрок', type: 'Тип события', role: 'Роль', assist: 'Ассистент', protocolComplete: 'Полный протокол',
};

// RU: Перевести ошибку поля без включения введённых пользователем значений.
// EN: Translate a field error without echoing user-supplied values.
function describeFieldError(error, translate = (message) => message) {
    const field = error.path || '';
    const label = translate(FIELD_LABELS[field.split('.').at(-1)] || 'Поле');
    let message = 'Указано недопустимое значение.';
    if (error.kind === 'required') message = 'Обязательно для заполнения.';
    if (error.kind === 'enum') message = 'Выберите допустимый вариант.';
    if (error.kind === 'min' || error.kind === 'max') message = 'Значение вне допустимого диапазона.';
    if (error.kind === 'minlength' || error.kind === 'maxlength') message = 'Недопустимая длина текста.';
    return { field, message: `${label}: ${translate(message)}` };
}

// RU: Преобразовать ошибки API и хранилища в стабильный русский ответ.
// EN: Convert API and storage errors into a consistent Russian response.
function errorHandler(error, req, res, next) {
    if (res.headersSent) return next(error);
    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Внутренняя ошибка сервера. Попробуйте позже.';
    let errors;
    if (error instanceof AppError) {
        status = error.statusCode;
        code = error.code;
        message = error.message;
    } else if (error.name === 'ValidationError') {
        status = 400;
        code = 'VALIDATION_ERROR';
        message = 'Проверьте заполненные поля.';
        errors = Object.values(error.errors || {}).map(item => describeFieldError(item, req.t));
    } else if (error.name === 'CastError') {
        status = 400;
        code = 'INVALID_VALUE';
        message = 'Неверный формат идентификатора или значения поля.';
    } else if (error.name === 'VersionError') {
        status = 409;
        code = 'VERSION_CONFLICT';
        message = 'Запись уже изменена. Обновите данные перед сохранением.';
    } else if (error.name === 'StrictModeError') {
        status = 400;
        code = 'UNSUPPORTED_FIELDS';
        message = 'Запрос содержит недопустимые поля.';
    } else if (error.code === 11000) {
        status = 409;
        code = 'DUPLICATE_RECORD';
        message = 'Запись с такими уникальными данными уже существует.';
    } else if (error.type === 'entity.parse.failed') {
        status = 400;
        code = 'INVALID_JSON';
        message = 'Некорректный формат JSON в запросе.';
    } else if (error.type === 'entity.too.large') {
        status = 413;
        code = 'PAYLOAD_TOO_LARGE';
        message = 'Размер запроса превышает допустимый предел.';
    } else if (error.status === 415) {
        status = 415;
        code = 'UNSUPPORTED_MEDIA';
        message = 'Неподдерживаемый формат или кодировка запроса.';
    } else if (['MongoNetworkError', 'MongoServerSelectionError', 'MongooseServerSelectionError'].includes(error.name)) {
        status = 503;
        code = 'DATABASE_UNAVAILABLE';
        message = 'Хранилище данных временно недоступно. Попробуйте позже.';
    }
    if (status >= 500) {
        // RU: Не записывать токены, тело запроса и адрес подключения к БД в журнал.
        // EN: Never log tokens, request bodies, or database connection strings.
        const logger = req.app?.locals.logger || console;
        logger.error({ message: 'Ошибка обработки запроса', requestId: req.id, name: error.name, code });
    }
    return res.status(status).json({ success: false, code, message: req.t?.(message) || message,
        ...(errors ? { errors } : {}), ...(req.id ? { requestId: req.id } : {}),
    });
}

module.exports = errorHandler;
