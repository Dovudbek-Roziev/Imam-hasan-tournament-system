const mongoose = require('mongoose');
const TournamentState = require('../models/TournamentState');
const AppError = require('../utils/AppError');

const STATE_ID = 'Основной турнир';

// RU: Атомарно выполнить изменение; общая запись предотвращает гонки связанных сущностей.
// EN: Execute a mutation atomically; the shared record prevents races between related entities.
async function tournamentTransaction(operation) {
    // RU: Инициализация идемпотентна; конкурирующее первое создание допустимо.
    // EN: Initialization is idempotent; competing first-time insertion is harmless.
    try {
        await TournamentState.updateOne({ _id: STATE_ID }, { $setOnInsert: { revision: 0 } }, { upsert: true });
    } catch (error) {
        if (error.code !== 11000) throw error;
    }
    const session = await mongoose.startSession();
    try {
        // RU: Документы создаются заново при повторе; driver не восстанавливает __v вложенных событий.
        // EN: Documents are recreated on retry; the driver does not reset embedded event version keys.
        return await session.withTransaction(async () => {
            // RU: Эта запись должна предшествовать всем чтениям внутри транзакции.
            // EN: This write must precede all reads within the transaction.
            await TournamentState.updateOne({ _id: STATE_ID }, { $inc: { revision: 1 } }, { session });
            return operation(session);
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, readPreference: 'primary', maxCommitTimeMS: 10000 });
    } catch (error) {
        if (error.code === 20) throw new AppError(503, 'Для изменения данных требуется MongoDB с поддержкой транзакций.', 'TRANSACTIONS_REQUIRED');
        throw error;
    } finally {
        await session.endSession();
    }
}

module.exports = tournamentTransaction;
