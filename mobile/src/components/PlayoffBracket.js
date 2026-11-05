import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { playoffFixtures, playoffLoser, playoffScore, playoffWinner } from '../utils/playoff';

function Fixture({ label, match, first, second, firstPending, secondPending, t }) {
    const home = match?.homeTeam || first;
    const away = match?.awayTeam || second;
    const winner = playoffWinner(match);
    const score = playoffScore(match, t('пен.'));
    return <View style={styles.fixture}>
        <Text style={styles.stage}>{t(label)}</Text>
        <Text style={[styles.team, winner && String(winner._id) === String(home?._id) && styles.winner]}>{home?.name || t(firstPending)}</Text>
        <Text style={styles.score}>{score || '— : —'}</Text>
        <Text style={[styles.team, winner && String(winner._id) === String(away?._id) && styles.winner]}>{away?.name || t(secondPending)}</Text>
    </View>;
}

export default function PlayoffBracket({ teams, matches, t }) {
    const bracket = playoffFixtures(teams, matches);
    if (!bracket) return null;
    const { leaders, semi1, semi2, final, thirdPlace } = bracket;
    return <View style={styles.card}>
        <Text style={styles.title}>{t('Путь к финалу')}</Text>
        <Text style={styles.caption}>{t('Пары плей-офф показаны по текущей таблице: 1-е место играет с 4-м, 2-е — с 3-м.')}</Text>
        <View style={styles.grid}>
            <Fixture t={t} label="Полуфинал" match={semi1} first={leaders[0]} second={leaders[3]} firstPending="Матч ещё не назначен" secondPending="Матч ещё не назначен" />
            <Fixture t={t} label="Полуфинал" match={semi2} first={leaders[1]} second={leaders[2]} firstPending="Матч ещё не назначен" secondPending="Матч ещё не назначен" />
        </View>
        <Fixture t={t} label="Матч за 3-е место" match={thirdPlace} first={playoffLoser(semi1)} second={playoffLoser(semi2)} firstPending="Проигравший 1-го полуфинала" secondPending="Проигравший 2-го полуфинала" />
        <Fixture t={t} label="Финал" match={final} first={playoffWinner(semi1)} second={playoffWinner(semi2)} firstPending="Победитель 1-го полуфинала" secondPending="Победитель 2-го полуфинала" />
    </View>;
}

const styles = StyleSheet.create({
    card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, marginTop: 20 },
    title: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '800' },
    caption: { color: COLORS.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 5, marginBottom: 11 },
    grid: { gap: 8, marginBottom: 8 },
    fixture: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 10, marginTop: 8, minWidth: 0 },
    stage: { color: COLORS.primary, fontSize: 10, fontWeight: '800', marginBottom: 6 },
    team: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700', paddingVertical: 2, lineHeight: 18 },
    winner: { color: COLORS.primary },
    score: { color: COLORS.accent, fontSize: 12, fontWeight: '800', marginVertical: 2 },
});
