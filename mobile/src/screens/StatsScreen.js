import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Award, ShieldAlert, Target } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import api from '../api/axios';
import { readDataArray } from '../api/response';
import Loading from '../components/Loading';
import DataState from '../components/DataState';
import PlayerAvatar from '../components/PlayerAvatar';
import useApiData from '../hooks/useApiData';
import { useLanguage } from '../i18n';
import LanguageToggle from '../components/LanguageToggle';

// RU: Загрузить все страницы игроков, чтобы рейтинг карточек не обрезался после первой сотни.
// EN: Fetch every player page so the cards leaderboard is not limited to the first hundred.
async function loadAllPlayers(signal) {
    const firstPage = await api.get('/players', { params: { limit: 100, page: 1, sort: 'name' }, signal });
    const players = readDataArray(firstPage);
    const pages = Math.max(1, Number(firstPage.data?.pagination?.pages) || 1);
    if (pages === 1) return players;
    const remaining = await Promise.all(Array.from({ length: pages - 1 }, (_, index) =>
        api.get('/players', { params: { limit: 100, page: index + 2, sort: 'name' }, signal })
    ));
    return players.concat(...remaining.map(readDataArray));
}

// RU: Загрузить рейтинги голов, ассистов и карточек публичными маршрутами API.
// EN: Fetch goal, assist, and card leaderboards from the public API routes.
async function loadStatistics(signal, locale = 'ru-RU') {
    const [scorers, assistants, players] = await Promise.all([
        api.get('/stats/top-scorers', { signal }),
        api.get('/stats/top-assists', { signal }),
        loadAllPlayers(signal),
    ]);
    const cards = players
        .filter((player) => (player.yellowCards || 0) + (player.redCards || 0) > 0)
        .sort((first, second) => ((second.yellowCards || 0) + (second.redCards || 0)) - ((first.yellowCards || 0) + (first.redCards || 0)) || first.name.localeCompare(second.name, locale));
    return { scorers: readDataArray(scorers), assistants: readDataArray(assistants), cards };
}

// RU: Показать строку рейтинга с игроком, командой и выбранным показателем.
// EN: Render a leaderboard row with the player, team, and selected metric.
function StatisticRow({ player, rank, metric, t }) {
    const cards = (player.yellowCards || 0) + (player.redCards || 0);
    const value = metric === 'scorers' ? player.goals : metric === 'assists' ? player.assists : cards;
    return (
        <View style={styles.playerRow}>
            <Text style={[styles.rank, rank === 1 && styles.topRank]}>{String(rank).padStart(2, '0')}</Text>
            <PlayerAvatar player={player} size={38} />
            <View style={styles.playerInfo}><Text style={styles.playerName} numberOfLines={1}>{player.name}</Text><Text style={styles.teamName} numberOfLines={1}>{player.team?.name || t('Команда не указана')}</Text></View>
            <View style={styles.valueWrap}><Text style={styles.value}>{value || 0}</Text>{metric === 'cards' ? <Text style={styles.cardBreakdown}>{t('Жёлтые:')} {player.yellowCards || 0} · {t('Красные:')} {player.redCards || 0}</Text> : null}</View>
        </View>
    );
}

// RU: Переключать и обновлять таблицы бомбардиров, ассистентов и карточек.
// EN: Switch and refresh the scorer, assist, and disciplinary leaderboards.
export default function StatsScreen() {
    const { t, locale } = useLanguage();
    const [activeTab, setActiveTab] = useState('scorers');
    const load = useCallback((signal) => loadStatistics(signal, locale), [locale]);
    const { data, loading, refreshing, error, refresh } = useApiData(load, { scorers: [], assistants: [], cards: [] });
    const tabs = [
        { key: 'scorers', label: 'Голы', icon: Target },
        { key: 'assists', label: 'Ассисты', icon: Award },
        { key: 'cards', label: 'Карточки', icon: ShieldAlert },
    ];
    const scorers = Array.isArray(data?.scorers) ? data.scorers : [];
    const assistants = Array.isArray(data?.assistants) ? data.assistants : [];
    const cards = Array.isArray(data?.cards) ? data.cards : [];
    const players = Array.isArray(data?.[activeTab]) ? data[activeTab] : [];

    const header = <View>
        <View style={styles.heading}><Text style={styles.kicker}>{t('ЛИЧНЫЕ ПОКАЗАТЕЛИ')}</Text><LanguageToggle /></View><Text style={styles.title}>{t('Статистика')}</Text>
        <View style={styles.tabs}>{tabs.map(({ key, label, icon: Icon }) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: activeTab === key }} style={[styles.tab, activeTab === key && styles.activeTab]} onPress={() => setActiveTab(key)}><Icon size={14} color={activeTab === key ? COLORS.primary : COLORS.textSecondary} /><Text style={[styles.tabText, activeTab === key && styles.activeTabText]}>{t(label)}</Text></Pressable>)}</View>
        <View style={styles.listHeading}><Text style={styles.listHeadingText}>{t(activeTab === 'scorers' ? 'Бомбардиры турнира' : activeTab === 'assists' ? 'Лучшие ассистенты' : 'Дисциплинарная статистика')}</Text><Text style={styles.listHeadingText}>{activeTab === 'cards' ? `${t('Жёлтые карточки')} / ${t('Красные карточки')}` : t('ИТОГО')}</Text></View>
    </View>;

    if (loading && !refreshing && !scorers.length && !assistants.length && !cards.length) return <Loading />;

    return <FlatList
        style={styles.list}
        contentContainerStyle={styles.container}
        data={players}
        keyExtractor={(player) => player._id}
        renderItem={({ item, index }) => <StatisticRow player={item} rank={index + 1} metric={activeTab} t={t} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={header}
        ListEmptyComponent={<DataState error={error} emptyText={activeTab === 'cards' ? 'Карточек пока нет' : 'Статистика пока пуста'} onRetry={error ? () => refresh() : undefined} />}
        ListFooterComponent={error && players.length ? <DataState error={error} emptyText="" onRetry={() => refresh()} /> : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
    />;
}

const styles = StyleSheet.create({
    list: { flex: 1, backgroundColor: COLORS.background },
    container: { flexGrow: 1, padding: 18, paddingBottom: 30 },
    kicker: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginBottom: 5 },
    heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 16 },
    tabs: { flexDirection: 'row', gap: 7, backgroundColor: COLORS.card, borderRadius: 13, padding: 5, marginBottom: 20 },
    tab: { flex: 1, minHeight: 40, borderRadius: 10, flexDirection: 'row', gap: 5, justifyContent: 'center', alignItems: 'center' },
    activeTab: { backgroundColor: COLORS.background, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: .08, shadowRadius: 3, elevation: 2 },
    tabText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 11 },
    activeTabText: { color: COLORS.primary },
    listHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 3, paddingBottom: 9 },
    listHeadingText: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: .5 },
    playerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 67 },
    rank: { width: 24, color: COLORS.textSecondary, fontSize: 12, fontWeight: '800' },
    topRank: { color: COLORS.accent },
    playerInfo: { flex: 1 },
    playerName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
    teamName: { color: COLORS.textSecondary, fontSize: 10, marginTop: 3 },
    valueWrap: { minWidth: 36, alignItems: 'flex-end' },
    value: { color: COLORS.primary, fontSize: 18, fontWeight: '800' },
    cardBreakdown: { color: COLORS.textSecondary, fontSize: 9, marginTop: 2 },
    separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 34 },
});
