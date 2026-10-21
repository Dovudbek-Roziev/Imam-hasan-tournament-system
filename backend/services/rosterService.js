const Team = require('../models/Team');
const Player = require('../models/Player');
const Match = require('../models/Match');
const AppError = require('../utils/AppError');
const { objectId, teamInput, playerInput } = require('../utils/input');
const transaction = require('./tournamentTransaction');

// RU: Создать команду, не принимая вычисляемые показатели от клиента.
// EN: Create a team without accepting client-supplied derived totals.
async function createTeam(body) {
    const data = teamInput(body);
    return transaction(async session => {
        const team = new Team(data);
        await team.save({ session });
        return team.toObject();
    });
}

// RU: Изменить только разрешённые поля существующей команды.
// EN: Update only allowed fields of an existing team.
async function updateTeam(id, body) {
    id = objectId(id);
    const data = teamInput(body);
    return transaction(async session => {
        const team = await Team.findById(id).session(session);
        if (!team) throw new AppError(404, 'Команда не найдена.', 'TEAM_NOT_FOUND');
        team.set(data);
        await team.save({ session });
        return team.toObject();
    });
}

// RU: Запретить удаление команды, если на неё ссылаются игроки или матчи.
// EN: Prevent deleting a team referenced by players or matches.
async function deleteTeam(id) {
    id = objectId(id);
    return transaction(async session => {
        if (!await Team.exists({ _id: id }).session(session)) throw new AppError(404, 'Команда не найдена.', 'TEAM_NOT_FOUND');
        const players = await Player.exists({ team: id }).session(session);
        const matches = await Match.exists({ $or: [{ homeTeam: id }, { awayTeam: id }] }).session(session);
        if (players || matches) throw new AppError(409, 'Нельзя удалить команду, у которой есть игроки или матчи.', 'TEAM_IN_USE');
        await Team.deleteOne({ _id: id }, { session });
    });
}

// RU: Проверить команду и занятость номера без гонки с другими изменениями.
// EN: Validate the team and shirt number without racing other mutations.
async function validatePlayer(player, session) {
    await player.validate();
    if (!await Team.exists({ _id: player.team }).session(session)) {
        throw new AppError(400, 'Выбранная команда не существует.', 'INVALID_TEAM');
    }
    if (player.number !== null && player.number !== undefined && await Player.exists({
        team: player.team, number: player.number, _id: { $ne: player._id },
    }).session(session)) throw new AppError(409, 'Этот номер уже занят в выбранной команде.', 'SHIRT_NUMBER_TAKEN');
}

// RU: Найти упоминание игрока как автора события или ассистента.
// EN: Find references to a player as an event author or an assistant.
function playerHistory(id, session) {
    return Match.exists({ $or: [{ 'events.player': id }, { 'events.assist': id }] }).session(session);
}

// RU: Создать игрока с нулевыми вычисляемыми показателями.
// EN: Create a player with zeroed derived totals.
async function createPlayer(body) {
    const data = playerInput(body);
    return transaction(async session => {
        const player = new Player(data);
        await validatePlayer(player, session);
        await player.save({ session });
        return player.toObject();
    });
}

// RU: Защитить историю от перевода участвовавшего игрока в другую команду.
// EN: Protect match history from transferring a referenced player to another team.
async function updatePlayer(id, body) {
    id = objectId(id);
    const data = playerInput(body);
    return transaction(async session => {
        const player = await Player.findById(id).session(session);
        if (!player) throw new AppError(404, 'Игрок не найден.', 'PLAYER_NOT_FOUND');
        if (data.team && data.team !== String(player.team) && await playerHistory(id, session)) {
            throw new AppError(409, 'Нельзя менять команду игрока, указанного в протоколах матчей.', 'PLAYER_IN_MATCHES');
        }
        player.set(data);
        await validatePlayer(player, session);
        await player.save({ session });
        return player.toObject();
    });
}

// RU: Удалить только игрока без событий и голевых передач в истории.
// EN: Delete only a player without events or assists in match history.
async function deletePlayer(id) {
    id = objectId(id);
    return transaction(async session => {
        if (!await Player.exists({ _id: id }).session(session)) throw new AppError(404, 'Игрок не найден.', 'PLAYER_NOT_FOUND');
        if (await playerHistory(id, session)) throw new AppError(409, 'Нельзя удалить игрока, указанного в протоколах матчей.', 'PLAYER_IN_MATCHES');
        await Player.deleteOne({ _id: id }, { session });
    });
}

module.exports = { createTeam, updateTeam, deleteTeam, createPlayer, updatePlayer, deletePlayer };
