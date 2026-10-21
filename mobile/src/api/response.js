import { getLanguage } from '../i18n';

// RU: Безопасно получить список из стандартного конверта ответа API.
// EN: Safely read a list from the standard API response envelope.
export function readDataArray(response) {
    const data = response?.data?.data;
    if (Array.isArray(data)) return data;
    const error = new Error(getLanguage() === 'ky'
        ? 'Сервер күтүлбөгөн тизмени кайтарды. Кайра жүктөп көрүңүз.'
        : 'Сервер вернул список в неожиданном формате. Повторите загрузку.');
    error.name = 'ApiResponseError';
    throw error;
}
