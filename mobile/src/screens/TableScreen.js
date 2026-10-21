import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Award, TrendingUp } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import api from '../api/axios';
import { readDataArray } from '../api/response';
import Loading from '../components/Loading';
import DataState from '../components/DataState';
import TeamDetailsModal from '../components/TeamDetailsModal';
import useApiData from '../hooks/useApiData';
import { useLanguage } from '../i18n';
import TeamLogo from '../components/TeamLogo';
import LanguageToggle from '../components/LanguageToggle';
import PlayoffBracket from '../components/PlayoffBracket';

// RU: Загрузить стадии плей-офф для турнирной схемы.
// EN: Load playoff fixtures for the tournament bracket.
async function loadPlayoffMatches(signal) {
    return readDataArray(await api.get('/matches', { params: { limit: 100, sort: 'date' }, signal }));
}

// RU: Загрузить полную турнирную таблицу с публичного API.
// EN: Load the complete standings table from the public API.
export default function TableScreen() {
    const { t } = useLanguage();
    const [selectedTeam, setSelectedTeam] = useState(null);
    const loadTable = useCallback(async (signal) => readDataArray(await api.get('/stats/table', { signal })), []);
    const { data, loading, refreshing, error, refresh } = useApiData(loadTable);
    const { data: matchData } = useApiData(loadPlayoffMatches);
    const teams = Array.isArray(data) ? data : [];
    const matches = Array.isArray(matchData) ? matchData : [];

    if (loading && !refreshing && !teams.length) return <Loading />;

    return (
        <View style={styles.root}><ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
            <View style={styles.heading}><View><Text style={styles.kicker}>{t('СЕЗОН · ОШ')}</Text><Text style={styles.title}>{t('Турнирная таблица')}</Text></View><View style={styles.headerActions}><LanguageToggle /><View style={styles.icon}><Award color={COLORS.accent} size={22} /></View></View></View>
            <View style={styles.legend}><TrendingUp color={COLORS.primary} size={15} /><Text style={styles.legendText}>{t('Сортировка: очки, разница мячей, голы')}</Text></View>
            <Text style={styles.scrollHint}>{t('Проведите по таблице влево, чтобы увидеть все показатели.')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator>
                <View style={styles.table}>
                    <View style={[styles.row, styles.header]}>
                        <Text style={[styles.cell, styles.rank]}>№</Text><Text style={[styles.cell, styles.teamCell]}>{t('КОМАНДА')}</Text>
                        <Text style={styles.cell}>{t('И')}</Text><Text style={styles.cell}>{t('В')}</Text><Text style={styles.cell}>{t('Н')}</Text><Text style={styles.cell}>{t('П')}</Text>
                        <Text style={[styles.cell, styles.goalsCell]}>{t('З-П')}</Text><Text style={[styles.cell, styles.pointsCell]}>{t('О')}</Text>
                    </View>
                    {teams.map((team, index) => (
                        <View key={team._id} style={[styles.row, index === 0 && styles.firstRow]}>
                            <View style={[styles.cell, styles.rank]}><Text style={[styles.rankText, index === 0 && styles.topRank]}>{index + 1}</Text></View>
                            <Pressable accessibilityRole="button" accessibilityLabel={`${t('Открыть состав команды')} ${team.name}`} style={[styles.cell, styles.teamCell, styles.teamNameWrap]} onPress={() => setSelectedTeam(team)}><TeamLogo team={team} size={29} /><Text numberOfLines={1} style={styles.teamName}>{team.name}</Text></Pressable>
                            <Text style={styles.cell}>{team.played}</Text><Text style={styles.cell}>{team.won}</Text><Text style={styles.cell}>{team.draw}</Text><Text style={styles.cell}>{team.lost}</Text>
                            <Text style={[styles.cell, styles.goalsCell]}>{team.goalsFor}-{team.goalsAgainst}</Text><Text style={[styles.cell, styles.pointsCell]}>{team.points}</Text>
                        </View>
                    ))}
                    {!teams.length && !error ? <DataState emptyText="Турнирная таблица пока пуста" /> : null}
                </View>
            </ScrollView>
            {error ? <View style={styles.message}><DataState error={error} emptyText="" onRetry={() => refresh()} /></View> : null}
            <Text style={styles.footnote}>{t('И — матчи · В — победы · Н — ничьи · П — поражения · З-П — голы · О — очки')}</Text>
            <PlayoffBracket teams={teams} matches={matches} t={t} />
        </ScrollView>{selectedTeam ? <TeamDetailsModal team={selectedTeam} onClose={() => setSelectedTeam(null)} /> : null}</View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.background },
    container: { flexGrow: 1, backgroundColor: COLORS.background, padding: 18, paddingBottom: 32 },
    heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    kicker: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
    title: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 5 },
    icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F8F3E2', alignItems: 'center', justifyContent: 'center' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    legend: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 12 },
    legendText: { color: COLORS.textSecondary, fontSize: 11 },
    scrollHint: { color: COLORS.textSecondary, fontSize: 11, lineHeight: 16, marginBottom: 9 },
    table: { width: 520, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', backgroundColor: COLORS.card },
    row: { minHeight: 53, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingHorizontal: 8 },
    header: { minHeight: 42, backgroundColor: '#F5F7F6' },
    firstRow: { backgroundColor: '#F7FBF8' },
    cell: { width: 38, color: COLORS.textSecondary, fontSize: 12, textAlign: 'center', fontWeight: '600' },
    rank: { width: 32 },
    rankText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', textAlign: 'center' },
    topRank: { color: COLORS.primary, fontSize: 14 },
    teamCell: { width: 174, textAlign: 'left' },
    teamNameWrap: { justifyContent: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7 },
    teamName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
    goalsCell: { width: 55 },
    pointsCell: { width: 50, color: COLORS.primary, fontSize: 14, fontWeight: '800' },
    message: { marginTop: 12, borderRadius: 14, backgroundColor: COLORS.card },
    footnote: { color: COLORS.textSecondary, fontSize: 10, lineHeight: 16, marginTop: 12 },
});
