const DEFAULT_TIME_ZONE = 'Asia/Bishkek';

// RU: Проверить поддержку часового пояса в установленной базе IANA среды Node.js.
// EN: Check time zone support in the Node.js runtime's IANA database.
function validTimeZone(value) {
    if (typeof value !== 'string' || value.length > 100) return false;
    try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); return true; }
    catch { return false; }
}

// RU: Получить локальные компоненты времени без зависимости от часового пояса сервера.
// EN: Get local time components independently of the server's time zone.
function localParts(instant, timeZone) {
    const formatter = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit',
        day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    return Object.fromEntries(formatter.formatToParts(instant).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
}

// RU: Преобразовать календарное расписание в UTC; неоднозначное или пропущенное время не принимать.
// EN: Convert a calendar schedule to UTC; reject ambiguous or skipped local times.
function startsAt(date, time, timeZone = DEFAULT_TIME_ZONE) {
    if (!date || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '') || !validTimeZone(timeZone)) return null;
    const parsed = new Date(date);
    if (!Number.isFinite(parsed.getTime())) return null;
    const day = parsed.toISOString().slice(0, 10);
    const target = new Date(`${day}T${time}:00.000Z`).getTime();
    const offsets = new Set();
    for (const hours of [-36, 0, 36]) {
        const instant = target + hours * 3600000;
        const part = localParts(instant, timeZone);
        const local = new Date(`${part.year}-${part.month}-${part.day}T${part.hour}:${part.minute}:${part.second}.000Z`).getTime();
        offsets.add(local - instant);
    }
    const candidates = [];
    for (const offset of offsets) {
        const instant = new Date(target - offset), part = localParts(instant, timeZone);
        if (`${part.year}-${part.month}-${part.day}` === day && `${part.hour}:${part.minute}` === time) candidates.push(instant);
    }
    return candidates.length === 1 ? candidates[0].toISOString() : null;
}

module.exports = { DEFAULT_TIME_ZONE, validTimeZone, startsAt };
