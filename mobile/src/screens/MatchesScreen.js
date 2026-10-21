import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, MapPin } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import api from '../api/axios';
import { readDataArray } from '../api/response';
import Loading from '../components/Loading';
import DataState from '../components/DataState';
import MatchDetailsModal from '../components/MatchDetailsModal';
import useApiData from '../hooks/useApiData';
import { formatKickoff } from '../utils/formatting';
import { useLanguage } from '../i18n';
import TeamLogo from '../components/TeamLogo';
import LanguageToggle from '../components/LanguageToggle';
import { getGoalCreditedTeamName } from '../utils/matchEvents';

// RU: Получить расписание с командами и протоколами событий матчей.
// EN: Fetch the fixture list with teams and match event protocols.
async function loadMatches(signal) {
    return readDataArray(await api.get('/matches', { params: { sort: '-date', limit: 100 }, signal }));
}

// RU: Отобразить результативную карточку отдельного матча.
// EN: Render the score card for one match.
function MatchCard({ match, t, locale }) {
    const finished = match.status === 'Завершён';
    const live = match.status === 'Идёт';
    const events = Array.isArray(match?.events) ? match.events : [];
    return (
        <View style={styles.matchCard}>
            <View style={styles.matchMeta}><View style={styles.metaLabel}><CalendarDays size={14} color={COLORS.primary} /><Text style={styles.date}>{formatKickoff(match.startsAt, true, locale)}</Text></View><Text style={[styles.status, finished ? styles.finished : live ? styles.live : styles.scheduled]}>{t(match.status)}</Text></View>
            <Text style={styles.stage}>{t(match.stage || 'Лига')}</Text>
            <View style={styles.scoreRow}>
                <View style={styles.teamBlock}><TeamLogo team={match.homeTeam} size={30} /><Text style={styles.team} numberOfLines={2}>{match.homeTeam?.name || t('Команда')}</Text></View>
                <Text style={[styles.score, (finished || live) && styles.activeScore]}>{finished || live ? `${match.homeScore} : ${match.awayScore}${match.homePenaltyScore != null ? ` (${match.homePenaltyScore}:${match.awayPenaltyScore} ${t('пен.')})` : ''}` : '— : —'}</Text>
                <View style={[styles.teamBlock, styles.awayTeamBlock]}><Text style={[styles.team, styles.awayTeam]} numberOfLines={2}>{match.awayTeam?.name || t('Команда')}</Text><TeamLogo team={match.awayTeam} size={30} /></View>
            </View>
            <View style={styles.stadium}><MapPin size={13} color={COLORS.textSecondary} /><Text style={styles.stadiumText}>{match.stadium || t('Основной стадион')}</Text></View>
            {!!events.length && <View style={styles.events}>{events.slice(0, 4).map((event, index) => {
                const creditedTeam = getGoalCreditedTeamName(match, event);
                return <Text key={event._id || `${event.type}-${index}`} style={styles.event} numberOfLines={2}>{event.minute}′ · {event.player?.name || t('Игрок')} · {t(event.type)}{creditedTeam ? ` · ${t('Гол засчитан команде')}: ${creditedTeam}` : ''}</Text>;
            })}{events.length > 4 ? <Text style={styles.eventMore}>{t('Ещё событий:')} {events.length - 4}</Text> : null}</View>}
        </View>
    );
}

// RU: Показать завершённые или предстоящие игры и дать обновить расписание.
// EN: Display finished or upcoming fixtures and allow the schedule to refresh.
export default function MatchesScreen() {
    const { t, locale } = useLanguage();
    const [activeTab, setActiveTab] = useState('upcoming');
    const [selectedMatch, setSelectedMatch] = useState(null);
    const { data, loading, refreshing, error, refresh } = useApiData(loadMatches);
    const allMatches = Array.isArray(data) ? data : [];
    const matches = useMemo(() => allMatches.filter((match) => activeTab === 'finished'
        ? match.status === 'Завершён'
        : activeTab === 'cancelled' ? match.status === 'Отменён' : ['Запланирован', 'Идёт'].includes(match.status)).sort((first, second) => {
        const direction = activeTab === 'upcoming' ? 1 : -1;
        return direction * ((new Date(first.startsAt || first.date).getTime()) - (new Date(second.startsAt || second.date).getTime()));
    }), [activeTab, allMatches]);

    const header = <View>
        <View style={styles.headerTop}><Text style={styles.kicker}>{t('КАЛЕНДАРЬ ТУРНИРА')}</Text><LanguageToggle /></View><Text style={styles.title}>{t('Матчи')}</Text>
        <View style={styles.tabs}>
            {[['upcoming', 'Предстоящие'], ['finished', 'Завершённые'], ['cancelled', 'Отменённые']].map(([key, label]) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: activeTab === key }} style={[styles.tab, activeTab === key && styles.activeTab]} onPress={() => setActiveTab(key)}><Text style={[styles.tabText, activeTab === key && styles.activeTabText]}>{t(label)}</Text></Pressable>)}
        </View>
    </View>;

    if (loading && !refreshing && !allMatches.length) return <Loading />;

    return <View style={styles.root}><FlatList
        style={styles.list}
        contentContainerStyle={styles.container}
        data={matches}
        keyExtractor={(match) => match._id}
        renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${t('Открыть протокол матча')}: ${item.homeTeam?.name || t('Команда')} — ${item.awayTeam?.name || t('Команда')}`} onPress={() => setSelectedMatch(item)}><MatchCard match={item} t={t} locale={locale} /></Pressable>}
        ListHeaderComponent={header}
        ListEmptyComponent={<DataState error={error} emptyText={activeTab === 'finished' ? 'Завершённых матчей пока нет' : activeTab === 'cancelled' ? 'Отменённых матчей пока нет' : 'Предстоящих матчей пока нет'} onRetry={error ? () => refresh() : undefined} />}
        ListFooterComponent={error && matches.length ? <DataState error={error} emptyText="" onRetry={() => refresh()} /> : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
    />{selectedMatch ? <MatchDetailsModal match={selectedMatch} onClose={() => setSelectedMatch(null)} /> : null}</View>;
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.background },
    list: { flex: 1, backgroundColor: COLORS.background },
    container: { flexGrow: 1, padding: 18, paddingBottom: 30 },
    kicker: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginBottom: 5 },
    title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 17 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    tabs: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 12, padding: 4, marginBottom: 16 },
    tab: { flex: 1, minHeight: 40, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    activeTab: { backgroundColor: COLORS.background, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
    tabText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 12 },
    activeTabText: { color: COLORS.primary },
    matchCard: { padding: 15, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, marginBottom: 12 },
    matchMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    metaLabel: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    date: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
    stage: { color: COLORS.primary, fontSize: 10, fontWeight: '800', marginTop: 9 },
    status: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: .5 },
    scheduled: { color: COLORS.primary },
    live: { color: '#C58700' },
    finished: { color: COLORS.textSecondary },
    scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 17, marginBottom: 13, gap: 8 },
    teamBlock: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
    awayTeamBlock: { justifyContent: 'flex-end' },
    team: { flex: 1, color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
    awayTeam: { textAlign: 'right' },
    score: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '800', minWidth: 60, textAlign: 'center' },
    activeScore: { color: COLORS.primary, fontSize: 17 },
    stadium: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
    stadiumText: { color: COLORS.textSecondary, fontSize: 11 },
    events: { marginTop: 9, gap: 4 },
    event: { color: COLORS.textPrimary, fontSize: 11 },
    eventMore: { color: COLORS.primary, fontSize: 10, fontWeight: '700' },
});
