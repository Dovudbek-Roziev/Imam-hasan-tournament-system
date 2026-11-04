// Fetch every page sequentially, preserving filters and request cancellation.
export async function readAllPages(client, resource, params = {}, signal) {
    let page = 1;
    const records = [];
    let response;
    do {
        signal?.throwIfAborted();
        response = await client.get(resource, { params: { ...params, limit: 100, page }, signal });
        const { data, pagination } = response.data || {};
        if (!Array.isArray(data) || !pagination || pagination.page !== page ||
            !Number.isSafeInteger(pagination.pages) || pagination.pages < 0 ||
            typeof pagination.hasNext !== 'boolean' ||
            (pagination.hasNext && (!data.length || pagination.pages <= page))) {
            const error = new Error('Некорректный формат списка. Повторите загрузку.');
            error.name = 'ApiResponseError';
            throw error;
        }
        records.push(...data);
        if (!pagination.hasNext) break;
        page++;
    } while (page <= 1001);
    if (response.data.pagination.hasNext) throw new Error('Список слишком большой для загрузки.');
    return { ...response, data: { ...response.data, data: records } };
}
