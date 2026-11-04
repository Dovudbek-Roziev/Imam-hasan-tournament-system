const Team = require('../models/Team');
const { parseListQuery } = require('../utils/listQuery');

// RU: Получить страницу и её общее количество одним проходом, сохраняя массив data для клиентов.
// EN: Fetch a page and its total in one pipeline, preserving the data array for clients.
async function listRecords(Model, resource, query, populations = []) {
    const { filter, sort, page, limit, skip } = parseListQuery(resource, query);
    if (resource === 'matches' && query.search !== undefined) {
        const pattern = filter.stadium;
        const teams = await Team.find({ name: pattern }).select('_id').lean().maxTimeMS(10000);
        delete filter.stadium;
        const searchFilter = { $or: [{ stadium: pattern }, { homeTeam: { $in: teams.map(team => team._id) } }, { awayTeam: { $in: teams.map(team => team._id) } }] };
        filter.$and = [...(filter.$and || []), searchFilter];
    }
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

