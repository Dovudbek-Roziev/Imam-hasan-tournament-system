import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTournamentPdfDefinition } from '../src/utils/tournamentPdf.js';

function findTable(document, heading) {
  const index = document.content.findIndex((item) => item?.columns?.some((column) => column.text === heading));
  assert.notEqual(index, -1, `Expected section: ${heading}`);
  return document.content[index + 1].table.body;
}

test('PDF report formats Russian tournament standings, match protocols, and news', () => {
  const report = buildTournamentPdfDefinition({
    exportedAt: '2026-10-25T10:00:00.000Z',
    timeZone: 'Asia/Bishkek',
    teams: [
      { _id: 'team-a', name: 'Алга', points: 3, played: 1, won: 1, draw: 0, lost: 0, goalsFor: 2, goalsAgainst: 1, goalDifference: 1 },
      { _id: 'team-b', name: 'Достук', points: 0, played: 1, won: 0, draw: 0, lost: 1, goalsFor: 1, goalsAgainst: 2, goalDifference: -1 },
    ],
    players: [{ _id: 'player-a', team: 'team-a', name: 'Иван', number: 7, goals: 1, assists: 1, yellowCards: 0, redCards: 0 }],
    matches: [{
      _id: 'match-a', homeTeam: 'team-a', awayTeam: 'team-b', startsAt: '2026-10-24T10:00:00.000Z',
      date: '2026-10-24T00:00:00.000Z', time: '16:00', timeZone: 'Asia/Bishkek', stadium: 'Центральный стадион',
      status: 'Завершён', stage: 'Лига', homeScore: 2, awayScore: 1,
      events: [{ minute: 12, player: 'player-a', team: 'team-a', type: 'Гол', assist: null }],
    }],
    news: [{ date: '2026-10-20T10:00:00.000Z', title: 'Начало турнира', content: 'Турнир стартует в городе Ош.' }],
  });

  assert.equal(report.info.title, 'Архив турнира «Имам Хасан»');
  assert.equal(report.defaultStyle.font, 'Roboto');
  assert.deepEqual(findTable(report, 'Турнирная таблица')[1], ['1', 'Алга', '1', '1–0–0', '2:1', '3']);
  assert.deepEqual(findTable(report, 'Составы и статистика футболистов')[1], ['7', 'Иван', 'Алга', '1', '1', '0', '0']);
  assert.deepEqual(findTable(report, 'События матчей')[1], ['Алга — Достук', '12′', 'Иван', 'Гол', 'Алга', '—']);
  assert.deepEqual(findTable(report, 'Новости турнира')[1], ['20.10.2026', 'Начало турнира', 'Турнир стартует в городе Ош.']);
});

test('PDF report handles an empty tournament without omitting sections', () => {
  const report = buildTournamentPdfDefinition({ teams: [], players: [], matches: [], news: [] });
  assert.equal(report.content[1].text, 'Архив турнира');
  assert.ok(report.content.some((item) => item?.columns?.some((column) => column.text === 'Расписание и результаты матчей')));
});
