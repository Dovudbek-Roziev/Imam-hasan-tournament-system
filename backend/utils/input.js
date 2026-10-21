const AppError = require('./AppError');
const { STATUS, EVENT, STAGE, normalizeStatus, normalizeEvent, normalizeStage } = require('../domain/matchRules');

// RU: Принимать только JSON-объект с явно разрешёнными полями.
// EN: Accept only a JSON object containing explicitly allowed fields.
function fields(input, allowed) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new AppError(400, 'Ожидается объект с данными.', 'INVALID_BODY');
    }
    if (Object.keys(input).some(key => !allowed.includes(key))) {
        throw new AppError(400, 'Запрос содержит поля, которые нельзя изменять этим действием.', 'UNSUPPORTED_FIELDS');
    }
    return { ...input };
}

// RU: Проверить ObjectId до запроса, исключив операторы вместо значения.
// EN: Validate an ObjectId before querying, rejecting operators in place of values.
function objectId(value) {
    if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) {
        throw new AppError(400, 'Неверный формат идентификатора.', 'INVALID_VALUE');
    }
    return value.toLowerCase();
}

// RU: Не допускать неявного преобразования строк и логических значений в числа.
// EN: Prevent implicit conversion of strings and booleans to numbers.
function integer(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
    if (!Number.isSafeInteger(value) || value < min || value > max) {
        throw new AppError(400, 'Числовое поле должно содержать целое число в допустимом диапазоне.', 'INVALID_NUMBER');
    }
    return value;
}

// RU: Проверить текст без автоматического преобразования объектов в строки.
// EN: Validate text without automatically converting objects into strings.
function text(value) {
    if (typeof value !== 'string') throw new AppError(400, 'Текстовое поле должно содержать строку.', 'INVALID_TEXT');
    return value.trim();
}

// RU: Проверить настоящую календарную дату, включая длину месяцев и високосный год.
// EN: Validate a real calendar date, including month lengths and leap years.
function calendarDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new AppError(400, 'Дата должна иметь формат ГГГГ-ММ-ДД.', 'INVALID_DATE');
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        throw new AppError(400, 'Указана несуществующая дата.', 'INVALID_DATE');
    }
    return date;
}

// RU: Разрешить редактирование только названия и логотипа команды.
// EN: Allow editing only the team name and logo.
function teamInput(body) {
    const data = fields(body, ['name', 'logo']);
    for (const key of Object.keys(data)) data[key] = text(data[key]);
    return data;
}

// RU: Исключить ручное изменение голов, передач и карточек игрока.
// EN: Exclude manual changes to player goal, assist, and card totals.
function playerInput(body) {
    const data = fields(body, ['name', 'team', 'number']);
    if ('name' in data) data.name = text(data.name);
    if ('team' in data) data.team = objectId(data.team);
    if ('number' in data && data.number !== null) integer(data.number, 1, 99);
    return data;
}

// RU: Проверить одно событие; команда автора определяется сервером.
// EN: Validate one event; the server determines the author's team.
function eventInput(body) {
    const data = fields(body, ['minute', 'player', 'type', 'assist']);
    integer(data.minute, 0, 180);
    data.player = objectId(data.player);
    data.type = normalizeEvent(data.type);
    if (!Object.values(EVENT).includes(data.type)) throw new AppError(400, 'Выберите допустимый тип события.', 'INVALID_EVENT');
    if (data.assist !== undefined && data.assist !== null) data.assist = objectId(data.assist);
    return data;
}

// RU: Проверить поля матча и обязательную версию для защиты от устаревшей формы.
// EN: Validate match fields and require a revision to protect against stale forms.
function matchInput(body, update = false) {
    const allowed = ['homeTeam', 'awayTeam', 'homeScore', 'awayScore', 'homePenaltyScore', 'awayPenaltyScore', 'stage', 'date', 'time', 'stadium', 'status', 'events', 'protocolComplete'];
    const data = fields(body, update ? [...allowed, 'version'] : allowed);
    if (update) integer(data.version);
    for (const key of ['homeTeam', 'awayTeam']) if (key in data) data[key] = objectId(data[key]);
    for (const key of ['homeScore', 'awayScore']) if (key in data) integer(data[key], 0, 999);
    for (const key of ['homePenaltyScore', 'awayPenaltyScore']) if (key in data && data[key] !== null) integer(data[key], 0, 99);
    if ('stage' in data) {
        data.stage = normalizeStage(data.stage);
        if (!Object.values(STAGE).includes(data.stage)) throw new AppError(400, 'Выберите допустимый этап турнира.', 'INVALID_STAGE');
    }
    if ('date' in data) data.date = calendarDate(data.date);
    for (const key of ['time', 'stadium']) if (key in data) data[key] = text(data[key]);
    if ('status' in data) {
        data.status = normalizeStatus(data.status);
        if (!Object.values(STATUS).includes(data.status)) throw new AppError(400, 'Выберите допустимый статус матча.', 'INVALID_STATUS');
    }
    if ('protocolComplete' in data && typeof data.protocolComplete !== 'boolean') {
        throw new AppError(400, 'Признак полного протокола должен быть логическим значением.', 'INVALID_PROTOCOL');
    }
    if ('events' in data) {
        if (!Array.isArray(data.events) || data.events.length > 500) throw new AppError(400, 'Протокол должен содержать массив не более 500 событий.', 'INVALID_EVENTS');
        data.events = data.events.map(eventInput);
    }
    return data;
}

// RU: Проверить русский текст и необязательный кыргызский перевод, оставив дату серверу.
// EN: Validate the Russian text and optional Kyrgyz translation while leaving the date to the server.
function newsInput(body) {
    const data = fields(body, ['title', 'content', 'titleKy', 'contentKy']);
    for (const key of Object.keys(data)) data[key] = text(data[key]);
    return data;
}

module.exports = { objectId, integer, calendarDate, teamInput, playerInput, matchInput, newsInput };
