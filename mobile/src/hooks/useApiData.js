import { useCallback, useEffect, useRef, useState } from 'react';
import { getLanguage } from '../i18n';

// RU: Загружать данные API, поддерживать повторный запрос и отменять устаревшие вызовы.
// EN: Load API data, support retries, and cancel stale requests.
export default function useApiData(loader, initialData = []) {
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const request = useRef(null);

    // RU: Запустить запрос и применить ответ только пока он остаётся актуальным.
    // EN: Start a request and apply its response only while it remains current.
    const refresh = useCallback(async (pullToRefresh = false) => {
        request.current?.abort();
        const controller = new AbortController();
        request.current = controller;
        setError('');
        if (pullToRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const result = await loader(controller.signal);
            if (!controller.signal.aborted) setData(result);
        } catch (failure) {
            if (!controller.signal.aborted) {
                const message = failure.response?.data?.message || (failure.name === 'ApiResponseError' ? failure.message : getLanguage() === 'ky' ? 'Маалыматты жүктөө мүмкүн болгон жок. Серверге туташууну текшериңиз.' : 'Не удалось загрузить данные. Проверьте подключение к серверу.');
                setError(message);
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [loader]);

    useEffect(() => {
        refresh();
        return () => request.current?.abort();
    }, [refresh]);

    return { data, loading, refreshing, error, refresh };
}
