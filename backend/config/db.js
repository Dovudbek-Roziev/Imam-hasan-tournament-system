const mongoose = require('mongoose');
const { ConfigError } = require('./env');

// RU: Подключиться к MongoDB без скрытой очереди запросов при недоступности БД.
// EN: Connect to MongoDB without silently buffering requests while it is unavailable.
async function connectDB(config) {
    mongoose.set('bufferCommands', false);
    await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 10000,
        autoIndex: config.nodeEnv !== 'production',
    });
    // RU: Атомарная запись результата требует replica set или sharded cluster.
    // EN: Atomic result persistence requires a replica set or sharded cluster.
    const topology = await mongoose.connection.db.admin().command({ hello: 1 });
    if (!topology.setName && topology.msg !== 'isdbgrid') {
        throw new ConfigError('Для работы турнира настройте MongoDB replica set или используйте MongoDB Atlas.');
    }
    return mongoose.connection;
}

module.exports = connectDB;
