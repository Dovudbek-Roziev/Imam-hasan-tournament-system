import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getLanguage } from '../i18n';

// RU: Определить адрес компьютера, на котором запущен Expo Metro.
// EN: Resolve the computer address running the Expo Metro server.
function getDevelopmentApiUrl() {
    const hostUri = Constants.expoConfig?.hostUri
        || Constants.manifest2?.extra?.expoGo?.debuggerHost
        || Constants.manifest?.debuggerHost;
    const host = typeof hostUri === 'string' ? hostUri.split(':')[0] : '';
    if (Platform.OS === 'android' && (!host || host === 'localhost' || host === '127.0.0.1')) {
        return 'http://10.0.2.2:5000/api';
    }
    return host ? `http://${host}:5000/api` : 'http://localhost:5000/api';
}

// RU: Использовать явный адрес API или автоматически подключиться к backend на компьютере разработчика.
// EN: Use the configured API URL or connect to the developer computer's backend automatically.
const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim()
    || (__DEV__ ? getDevelopmentApiUrl() : 'http://localhost:5000/api');

// RU: Настройка Axios для подключения к Backend API
// EN: Axios setup to connect to Backend API
const instance = axios.create({
    baseURL: apiUrl,
    timeout: 12000,
    headers: { Accept: 'application/json' },
});

// RU: Передать выбранный язык API для локализации сообщений об ошибках.
// EN: Send the selected language to the API to localize error messages.
instance.interceptors.request.use((config) => {
    config.headers = config.headers || {};
    config.headers['Accept-Language'] = getLanguage();
    return config;
});

export default instance;

// RU: Преобразовать сохранённый путь логотипа в полный адрес API.
// EN: Resolve a stored logo path to its full API URL.
export function imageUrl(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const baseUrl = (instance.defaults.baseURL || 'http://localhost:5000/api').replace(/\/+$/, '');
    const origin = baseUrl.replace(/\/api$/i, '');
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}
