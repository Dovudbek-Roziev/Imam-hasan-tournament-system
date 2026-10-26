const GREEN = '#056839';
const GOLD = '#D4AF37';
const INK = '#1F2933';
const MUTED = '#66736B';
const LINE = '#E2EAE4';
const PALE = '#F4F8F5';

const list = (value) => Array.isArray(value) ? value : [];
const idOf = (value) => String(value?._id ?? value ?? '');
const safeText = (value, fallback = '—') => value == null || value === '' ? fallback : String(value);

// RU: Отформатировать дату в часовом поясе турнира.
// EN: Format a date in the tournament's time zone.
function formatDate(value, timeZone, includeTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    day: '2-digit', month: '2-digit', year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

// RU: Создать заголовок раздела PDF-отчёта.
// EN: Create a section heading in the PDF report.
function section(title, note) {
  return {
    columns: [
      { text: title, style: 'sectionTitle' },
      ...(note ? [{ text: note, style: 'sectionNote', alignment: 'right' }] : []),
    ],
    margin: [0, 20, 0, 8],
    columnGap: 8,
    unbreakable: true,
  };
}

// RU: Подготовить таблицу отчёта с повторяемой строкой заголовков.
// EN: Prepare a report table with a repeating header row.
function table(title, headers, rows, widths) {
  const dataRows = rows.length ? rows : [[{ text: 'Нет данных', colSpan: headers.length, style: 'emptyCell' }, ...headers.slice(1).map(() => '')]];
  const body = [
    headers.map((value) => ({ text: value, style: 'tableHeader' })),
    ...dataRows,
  ];
  return [
    section(title, `${rows.length} ${rows.length === 1 ? 'запись' : 'записей'}`),
    {
      table: { headerRows: 1, widths, body, keepWithHeaderRows: 1 },
      layout: {
        fillColor: (rowIndex) => rowIndex === 0 ? GREEN : rowIndex % 2 === 0 ? PALE : null,
        hLineColor: () => LINE,
        vLineColor: () => LINE,
        hLineWidth: (index, node) => index === 0 || index === node.table.body.length ? 0.8 : 0.35,
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: () => 5,
        paddingBottom: () => 5,
      },
      fontSize: 8.5,
      color: INK,
    },
  ];
}

// RU: Собрать русскоязычный PDF-отчёт из выгруженного архива турнира.
// EN: Build a Russian-language PDF report from the downloaded tournament archive.
export function buildTournamentPdfDefinition(archive) {
  const teams = list(archive?.teams);
  const players = list(archive?.players);
  const matches = list(archive?.matches);
  const news = list(archive?.news);
  const timeZone = archive?.timeZone || 'Asia/Bishkek';
  const teamById = new Map(teams.map((team) => [idOf(team._id), team]));
  const playerById = new Map(players.map((player) => [idOf(player._id), player]));
  const finishedMatches = matches.filter((match) => match.status === 'Завершён');
  const totalGoals = finishedMatches.reduce((total, match) => total + (Number(match.homeScore) || 0) + (Number(match.awayScore) || 0), 0);
  const rankedTeams = [...teams].sort((first, second) =>
    (Number(second.points) || 0) - (Number(first.points) || 0) ||
    (Number(second.goalDifference) || 0) - (Number(first.goalDifference) || 0) ||
    (Number(second.goalsFor) || 0) - (Number(first.goalsFor) || 0) ||
    safeText(first.name).localeCompare(safeText(second.name), 'ru-RU'));
  const sortedPlayers = [...players].sort((first, second) => {
    const firstTeam = safeText(teamById.get(idOf(first.team))?.name);
    const secondTeam = safeText(teamById.get(idOf(second.team))?.name);
    return firstTeam.localeCompare(secondTeam, 'ru-RU') ||
      (Number(first.number) || 100) - (Number(second.number) || 100) ||
      safeText(first.name).localeCompare(safeText(second.name), 'ru-RU');
  });
  const sortedMatches = [...matches].sort((first, second) => new Date(first.startsAt || first.date) - new Date(second.startsAt || second.date));
  const eventRows = sortedMatches.flatMap((match) => list(match.events).map((event) => {
    const home = teamById.get(idOf(match.homeTeam));
    const away = teamById.get(idOf(match.awayTeam));
    const player = playerById.get(idOf(event.player));
    const eventTeam = teamById.get(idOf(event.team));
    const assist = playerById.get(idOf(event.assist));
    return [
      `${safeText(home?.name)} — ${safeText(away?.name)}`,
      event.minute == null ? '—' : `${event.minute}′`,
      safeText(player?.name),
      safeText(event.type),
      safeText(eventTeam?.name),
      assist?.name || '—',
    ];
  }));
  const matchRows = sortedMatches.map((match) => {
    const home = teamById.get(idOf(match.homeTeam));
    const away = teamById.get(idOf(match.awayTeam));
    const score = match.status === 'Завершён' || match.status === 'Идёт'
      ? `${match.homeScore ?? 0} : ${match.awayScore ?? 0}${match.homePenaltyScore == null ? '' : ` (${match.homePenaltyScore}:${match.awayPenaltyScore} пен.)`}`
      : '— : —';
    return [
      formatDate(match.startsAt || match.date, match.timeZone || timeZone, true),
      safeText(match.stage, 'Лига'),
      `${safeText(home?.name)} — ${safeText(away?.name)}`,
      score,
      safeText(match.status),
      safeText(match.stadium),
    ];
  });
  const newsRows = [...news]
    .sort((first, second) => new Date(second.date) - new Date(first.date))
    .map((item) => [formatDate(item.date, timeZone), safeText(item.title), safeText(item.content)]);

  const content = [
    { text: 'ИМАМ ХАСАН', style: 'eyebrow' },
    { text: 'Архив турнира', style: 'title' },
    { text: 'Итоги, составы, матчи и новости в одном документе', style: 'subtitle' },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 519, y2: 0, lineWidth: 2, lineColor: GOLD }], margin: [0, 12, 0, 3] },
    {
      columns: [
        { text: `Сформирован: ${formatDate(archive?.exportedAt, timeZone, true)}`, style: 'meta' },
        { text: `Город: Ош · ${timeZone}`, style: 'meta', alignment: 'right' },
      ],
      margin: [0, 8, 0, 16],
    },
    {
      table: {
        widths: ['*', '*', '*', '*'],
        body: [[
          { text: [{ text: String(teams.length), style: 'metricValue' }, { text: '\nКоманд', style: 'metricLabel' }], style: 'metricCell' },
          { text: [{ text: String(players.length), style: 'metricValue' }, { text: '\nФутболистов', style: 'metricLabel' }], style: 'metricCell' },
          { text: [{ text: String(finishedMatches.length), style: 'metricValue' }, { text: '\nЗавершённых игр', style: 'metricLabel' }], style: 'metricCell' },
          { text: [{ text: String(totalGoals), style: 'metricValue' }, { text: '\nЗабито голов', style: 'metricLabel' }], style: 'metricCell' },
        ]],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 3],
    },
    ...table('Турнирная таблица', ['Место', 'Команда', 'И', 'В–Н–П', 'Мячи', 'Очки'], rankedTeams.map((team, index) => [
      String(index + 1), safeText(team.name), String(team.played ?? 0), `${team.won ?? 0}–${team.draw ?? 0}–${team.lost ?? 0}`,
      `${team.goalsFor ?? 0}:${team.goalsAgainst ?? 0}`, String(team.points ?? 0),
    ]), [35, '*', 24, 55, 48, 36]),
    ...table('Составы и статистика футболистов', ['№', 'Футболист', 'Команда', 'Голы', 'Пасы', 'ЖК', 'КК'], sortedPlayers.map((player) => [
      player.number == null ? '—' : String(player.number), safeText(player.name), safeText(teamById.get(idOf(player.team))?.name),
      String(player.goals ?? 0), String(player.assists ?? 0), String(player.yellowCards ?? 0), String(player.redCards ?? 0),
    ]), [28, '*', '*', 34, 34, 28, 28]),
    ...table('Расписание и результаты матчей', ['Дата и время', 'Этап', 'Матч', 'Счёт', 'Статус', 'Место'], matchRows, [65, 64, '*', 48, 60, 67]),
    ...table('События матчей', ['Матч', 'Минута', 'Футболист', 'Событие', 'Команда', 'Ассистент'], eventRows, ['*', 38, 75, 76, 70, 68]),
    ...table('Новости турнира', ['Дата', 'Заголовок', 'Текст'], newsRows, [62, 125, '*']),
  ];

  return {
    info: { title: 'Архив турнира «Имам Хасан»', author: 'Организаторы турнира', subject: 'Таблица, составы, результаты и новости' },
    pageSize: 'A4',
    pageMargins: [38, 54, 38, 42],
    defaultStyle: { font: 'Roboto', fontSize: 9, color: INK, lineHeight: 1.15 },
    header: (currentPage) => currentPage === 1 ? null : ({
      columns: [
        { text: 'ИМАМ ХАСАН · ТУРНИРНЫЙ ОТЧЁТ', color: GREEN, bold: true, fontSize: 8, characterSpacing: 0.6 },
        { text: 'Ош, Кыргызстан', color: MUTED, fontSize: 8, alignment: 'right' },
      ],
      margin: [38, 22, 38, 0],
    }),
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: 'Архив турнира «Имам Хасан» · Ош, Кыргызстан', color: MUTED, fontSize: 8 },
        { text: `${currentPage} / ${pageCount}`, color: MUTED, fontSize: 8, alignment: 'right' },
      ],
      margin: [38, 0, 38, 18],
    }),
    content,
    styles: {
      eyebrow: { color: GREEN, bold: true, fontSize: 9, characterSpacing: 1.5, margin: [0, 2, 0, 5] },
      title: { color: INK, bold: true, fontSize: 27, margin: [0, 0, 0, 2] },
      subtitle: { color: MUTED, fontSize: 11 },
      meta: { color: MUTED, fontSize: 8.5 },
      metricCell: { fillColor: PALE, margin: [8, 10, 8, 10], alignment: 'center' },
      metricValue: { color: GREEN, bold: true, fontSize: 19 },
      metricLabel: { color: MUTED, fontSize: 8 },
      sectionTitle: { color: GREEN, bold: true, fontSize: 13 },
      sectionNote: { color: MUTED, fontSize: 8 },
      tableHeader: { color: '#FFFFFF', bold: true, fontSize: 8 },
      emptyCell: { color: MUTED, italics: true, colSpan: 1 },
    },
  };
}
