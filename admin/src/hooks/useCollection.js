import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { useLanguage } from '../i18n';

// RU: Загружать одну страницу API и отменять устаревший запрос при смене фильтра.
// EN: Load one API page and cancel stale requests when a filter changes.
// RU: Загружать страницу списка с серверными поиском, фильтрами и отменой запросов.
// EN: Load collection pages with server-side search, filters, and request cancellation.
export function useCollection(resource, filters = {}) {
  const { language, t } = useLanguage();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [revision, setRevision] = useState(0);
  const filterKey = JSON.stringify(filters);
  const params = useMemo(() => { const values = JSON.parse(filterKey); return { ...values, page, limit: values.limit || 10, ...(search.trim() ? { search: search.trim() } : {}), ...(filter ? { status: filter } : {}) }; }, [filterKey, page, search, filter]);
  const requestUrl = `/${resource}?${new URLSearchParams(params)}`;
  const key = JSON.stringify(params);
  const [state, setState] = useState({ data: [], pagination: null, loading: true, error: '', key: '' });

  useEffect(() => {
    const controller = new AbortController();
    api.get(requestUrl, { signal: controller.signal })
      .then(({ data }) => {
        const pagination = data?.pagination;
        if (!Array.isArray(data?.data) || !pagination ||
          !['page', 'limit', 'total', 'pages'].every((field) => Number.isSafeInteger(pagination[field]) && pagination[field] >= 0) ||
          typeof pagination.hasNext !== 'boolean') {
          throw new Error('Некорректный формат списка. Обновите страницу.');
        }
        if (!controller.signal.aborted) setState({ data: data.data, pagination: data.pagination, loading: false, error: '', key });
      }).catch((error) => {
        if (!controller.signal.aborted) setState((current) => ({ ...current, loading: false, error: error.response?.data?.message || t('Не удалось загрузить данные. Проверьте подключение к серверу.'), key }));
      });
    return () => controller.abort();
  }, [requestUrl, key, revision, language, t]);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  // RU: Обновить поиск и вернуться на первую страницу результатов.
  // EN: Update the search term and return to the first result page.
  function setSearchValue(value) { setSearch(value); setPage(1); }
  // RU: Обновить фильтр и вернуть список на первую страницу.
  // EN: Update the filter and reset the list to its first page.
  function setFilterValue(value) { setFilter(value); setPage(1); }
  // RU: Не передавать внутренний ключ запроса в JSX как обычный prop.
  // EN: Keep the internal request key out of JSX props.
  const { key: loadedKey, ...collection } = state;
  return { ...collection, loading: loadedKey !== key || state.loading, error: loadedKey === key ? state.error : '', page, search, setPage, setSearch: setSearchValue, filter, setFilter: setFilterValue, refresh };
}
