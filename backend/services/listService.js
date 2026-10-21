const { parseListQuery } = require('../utils/listQuery');

// RU: Получить страницу и её общее количество одним проходом, сохраняя массив data для клиентов.
// EN: Fetch a page and its total in one pipeline, preserving the data array for clients.
async function listRecords(Model, resource, query, populations = []) {
    const { filter, sort, page, limit, skip } = parseListQuery(resource, query);
    const [result] = await Model.aggregate([
        { $match: filter }, { $sort: sort },
        { $facet: { data: [{ $skip: skip }, { $limit: limit }], count: [{ $count: 'total' }] } },
    ]).option({ maxTimeMS: 10000 });
    const data = result.data.map(record => Model.hydrate(record));
    for (const population of populations) await Model.populate(data, population);
    const total = result.count[0]?.total || 0;
    return { success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit), hasNext: skip + limit < total } };
}

module.exports = listRecords;
