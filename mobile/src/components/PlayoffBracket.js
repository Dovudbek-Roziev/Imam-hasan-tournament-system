import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/theme';

// RU: Определить команду, прошедшую в следующий этап, включая серию пенальти.
// EN: Resolve the team advancing to the next stage, including a penalty shootout.
function getWinner(match) {
    if (!match || match.status !== 'Завершён') return null;
    if (match.homeScore !== match.awayScore) return match.homeScore > match.awayScore ? match.homeTeam : match.awayTeam;
    if (match.homePenaltyScore == null || match.awayPenaltyScore == null || match.homePenaltyScore === match.awayPenaltyScore) return null;
    return match.homePenaltyScore > match.awayPenaltyScore ? match.homeTeam : match.awayTeam;
}

// RU: Определить проигравшую команду полуфинала, включая результат пенальти.
// EN: Resolve the losing semifinal team, including the penalty-shootout result.
function getLoser(match) {
    const winner = getWinner(match);
    if (!winner) return null;
    return String(winner._id) === String(match.homeTeam?._id) ? match.awayTeam : match.homeTeam;
}

// RU: Показать путь четырёх лидеров текущей таблицы до финала.
// EN: Show how the current top four teams can reach the final.
export default function PlayoffBracket({ teams, matches, t }) {
    const leaders = teams.slice(0, 4);
    const semifinals = matches.filter((match) => match.stage === 'Полуфинал');
    const final = matches.find((match) => match.stage === 'Финал');
    const thirdPlace = matches.find((match) => match.stage === 'Матч за 3-е место');
    if (leaders.length < 4 && !semifinals.length && !final) return null;

    // RU: Найти матч полуфинала для заданной пары независимо от порядка хозяев.
    // EN: Find a semifinal for a seed pair regardless of home and away order.
    function findSemi(first, second) {
        return semifinals.find((match) => [
            [match.homeTeam?._id, match.awayTeam?._id], [match.awayTeam?._id, match.homeTeam?._id],
        ].some(([home, away]) => home === first?._id && away === second?._id));
    }

    // RU: Отобразить пару участников, счёт и уже определившегося победителя матча.
    // EN: Display a fixture, score, and its resolved winner when available.
    function Fixture({ label, match, first, second, pending }) {
        const home = match?.homeTeam || first;
        const away = match?.awayTeam || second;
        const winner = getWinner(match);
        const score = match && match.status !== 'Запланирован'
            ? `${match.homeScore} : ${match.awayScore}${match.homePenaltyScore != null ? ` (${match.homePenaltyScore}:${match.awayPenaltyScore} ${t('пен.')})` : ''}`
            : null;
        return <View style={styles.fixture}>
            <Text style={styles.stage}>{t(label)}</Text>
            <Text style={[styles.team, winner && String(winner._id) === String(home?._id) && styles.winner]} numberOfLines={1}>{home?.name || t(pending)}</Text>
            <Text style={styles.score}>{score || '— : —'}</Text>
            <Text style={[styles.team, winner && String(winner._id) === String(away?._id) && styles.winner]} numberOfLines={1}>{away?.name || t(pending)}</Text>
        </View>;
    }

    return <View style={styles.card}>
        <Text style={styles.title}>{t('Путь к финалу')}</Text>
        <Text style={styles.caption}>{t('Пары плей-офф показаны по текущей таблице: 1-е место играет с 4-м, 2-е — с 3-м.')}</Text>
        <View style={styles.grid}>
            <Fixture label="Полуфинал" match={findSemi(leaders[0], leaders[3])} first={leaders[0]} second={leaders[3]} pending="Матч ещё не назначен" />
            <Fixture label="Полуфинал" match={findSemi(leaders[1], leaders[2])} first={leaders[1]} second={leaders[2]} pending="Матч ещё не назначен" />
        </View>
        <Fixture label="Финал" match={final} first={getWinner(semifinals[0])} second={getWinner(semifinals[1])} pending="Финалисты определятся после полуфиналов" />
        {semifinals.length === 2 ? <Fixture label="Матч за 3-е место" match={thirdPlace} first={getLoser(semifinals[0])} second={getLoser(semifinals[1])} pending="Матч ещё не назначен" /> : null}
    </View>;
}

const styles = StyleSheet.create({
    card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, marginTop: 20 },
    title: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '800' },
    caption: { color: COLORS.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 5, marginBottom: 11 },
    grid: { gap: 8, marginBottom: 8 },
    fixture: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 10, marginTop: 8, minWidth: 0 },
    stage: { color: COLORS.primary, fontSize: 10, fontWeight: '800', marginBottom: 6 },
    team: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700', paddingVertical: 2 },
    winner: { color: COLORS.primary },
    score: { color: COLORS.accent, fontSize: 12, fontWeight: '800', marginVertical: 2 },
});
