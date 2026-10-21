const mongoose = require('mongoose');

// RU: Прочитать связанные коллекции из одного снимка без изменения данных.
// EN: Read related collections from one snapshot without changing data.
async function readSnapshot(operation) {
    const session = await mongoose.startSession();
    try {
        return await session.withTransaction(() => operation(session), { readConcern: { level: 'snapshot' }, readPreference: 'primary' });
    } finally { await session.endSession(); }
}

module.exports = readSnapshot;
