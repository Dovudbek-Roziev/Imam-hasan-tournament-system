// RU: Форматировать время матча по часовому поясу турнира в Оше.
// EN: Format match kickoff time using the tournament timezone in Osh.
export function formatKickoff(value, withTime = true, locale = 'ru-RU') {
    const date = value ? new Date(value) : null;
    if (!date || !Number.isFinite(date.getTime())) return locale === 'ky-KG' ? 'Убактысы такталууда' : 'Время уточняется';
    return new Intl.DateTimeFormat(locale, {
        timeZone: 'Asia/Bishkek', day: 'numeric', month: 'long', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(date);
}

// RU: Преобразовать остаток времени до начала матча в читаемый таймер.
// EN: Convert the remaining time before kickoff into a readable countdown.
export function formatCountdown(startsAt, now, locale = 'ru-RU') {
    const timestamp = new Date(startsAt).getTime();
    if (!Number.isFinite(timestamp)) return locale === 'ky-KG' ? 'Убактысы такталууда' : 'Время уточняется';
    if (timestamp <= now) return locale === 'ky-KG' ? 'Беттеш башталышы керек' : 'Матч должен начаться';
    const totalSeconds = Math.max(0, Math.floor((timestamp - now) / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const clock = [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
    return days ? `${days} ${locale === 'ky-KG' ? 'күн' : 'дн.'} ${clock}` : clock;
}
