import React, { useEffect, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowRight, CalendarDays, MapPin, Newspaper } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import api from '../api/axios';
import { readDataArray } from '../api/response';
import Loading from '../components/Loading';
import DataState from '../components/DataState';
import useApiData from '../hooks/useApiData';
import { formatCountdown, formatKickoff } from '../utils/formatting';
import { useLanguage } from '../i18n';
import TeamLogo from '../components/TeamLogo';
import LanguageToggle from '../components/LanguageToggle';

// RU: Получить ближайшие запланированные матчи и последние новости турнира.
// EN: Fetch upcoming scheduled matches and the latest tournament news.
async function loadHome(signal) {
    const [matchesResponse, newsResponse] = await Promise.all([
        api.get('/matches', { params: { status: 'Запланирован', sort: 'date', limit: 100 }, signal }),
        api.get('/news', { params: { sort: '-date', limit: 5 }, signal }),
    ]);
    const upcoming = readDataArray(matchesResponse)
        .filter((match) => match.startsAt && new Date(match.startsAt).getTime() >= Date.now())
        .sort((first, second) => new Date(first.startsAt) - new Date(second.startsAt));
    return { upcoming, news: readDataArray(newsResponse) };
}

// RU: Показать приветствие, ближайшую игру, обратный отсчёт и объявления турнира.
// EN: Show the welcome section, next fixture, countdown, and tournament announcements.
export default function HomeScreen() {
    const { locale, language, t } = useLanguage();
    const { data, loading, refreshing, error, refresh } = useApiData(loadHome, { upcoming: [], news: [] });
    const [now, setNow] = useState(Date.now());
    const upcoming = Array.isArray(data?.upcoming) ? data.upcoming : [];
    const news = Array.isArray(data?.news) ? data.news : [];
    const match = upcoming[0];

    useEffect(() => {
        // RU: Обновлять таймер, не отправляя постоянные запросы на сервер.
        // EN: Update the timer locally without polling the server.
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (loading && !refreshing && !match && !news.length) return <Loading />;

    return (
        <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => refresh(true)} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>
            <View style={styles.welcome}>
                <View style={styles.welcomeText}><Text style={styles.kicker}>{t('ИМАМ ХАСАН · ФУТБОЛЬНЫЙ ТУРНИР')}</Text><Text style={styles.title}>{t('Следим за игрой')}</Text></View>
                <View style={styles.headerActions}><LanguageToggle /><Image source={require('../../assets/club-logo.png')} style={styles.logo} accessibilityLabel={t('Эмблема турнира Имам Хасан')} /></View>
            </View>

            <View style={styles.location}><MapPin size={15} color={COLORS.primary} /><Text style={styles.locationText}>{t('Ош, Кыргызстан · UTC+6')}</Text></View>

            <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{t('Ближайший матч')}</Text><CalendarDays size={18} color={COLORS.primary} /></View>
            {match ? (
                <View style={styles.matchCard}>
                    <View style={styles.matchMeta}><View style={styles.status}><View style={styles.statusDot} /><Text style={styles.statusText}>{t('СКОРО')}</Text></View><Text style={styles.matchDate}>{formatKickoff(match.startsAt, true, locale)}</Text></View>
                    <View style={styles.teams}>
                        <View style={styles.team}><TeamLogo team={match.homeTeam} size={48} style={styles.teamBadge} /><Text style={styles.teamName} numberOfLines={2}>{match.homeTeam?.name || t('Команда')}</Text></View>
                        <View style={styles.versus}><Text style={styles.versusText}>VS</Text></View>
                        <View style={styles.team}><TeamLogo team={match.awayTeam} size={48} style={styles.teamBadge} /><Text style={styles.teamName} numberOfLines={2}>{match.awayTeam?.name || t('Команда')}</Text></View>
                    </View>
                    <View style={styles.divider} />
                    <Text style={styles.countdownLabel}>{t('До начала матча')}</Text>
                    <Text style={styles.countdown}>{formatCountdown(match.startsAt, now, locale)}</Text>
                    <Text style={styles.stadium}>{match.stadium || t('Основной стадион')}</Text>
                </View>
            ) : <View style={styles.surface}><DataState error={error} emptyText="Предстоящих матчей пока нет" onRetry={error ? () => refresh() : undefined} /></View>}

            <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{t('Новости турнира')}</Text><Newspaper size={18} color={COLORS.primary} /></View>
            {error && match ? <View style={styles.surface}><DataState error={error} emptyText="" onRetry={() => refresh()} /></View> : null}
            {!news.length && !loading && !error ? <View style={styles.surface}><Text style={styles.emptyNews}>{t('Пока нет опубликованных новостей.')}</Text></View> : null}
            {news.map((item) => (
                <View style={styles.newsCard} key={item._id}>
                    <View style={styles.newsMark}><Newspaper size={16} color={COLORS.primary} /></View>
                    <View style={styles.newsContent}><Text style={styles.newsTitle}>{language === 'ky' ? item.titleKy || item.title : item.title}</Text><Text style={styles.newsBody} numberOfLines={3}>{language === 'ky' ? item.contentKy || item.content : item.content}</Text><Text style={styles.newsDate}>{formatKickoff(item.date, false, locale)}</Text></View>
                    <ArrowRight size={16} color={COLORS.textSecondary} />
                </View>
            ))}
            <View style={styles.guide}>
                <Text style={styles.guideTitle}>{t('Как пользоваться приложением')}</Text>
                <Text style={styles.guideText}>{t('Матчи — расписание и протоколы встреч')}</Text>
                <Text style={styles.guideText}>{t('Таблица — нажмите на команду, чтобы посмотреть состав')}</Text>
                <Text style={styles.guideText}>{t('Статистика — голы, передачи и карточки')}</Text>
                <Text style={styles.guideNote}>{t('Приложение предназначено для просмотра. Управление турниром доступно администратору в веб-панели.')}</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: COLORS.background, padding: 18, paddingBottom: 32 },
    welcome: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    welcomeText: { flexShrink: 1, paddingRight: 8 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    kicker: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
    title: { color: COLORS.textPrimary, fontSize: 25, fontWeight: '800', marginTop: 5 },
    logo: { width: 58, height: 58, resizeMode: 'contain' },
    guide: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, padding: 14, marginBottom: 18, gap: 5 },
    guideTitle: { color: COLORS.primary, fontSize: 13, fontWeight: '800', marginBottom: 2 },
    guideText: { color: COLORS.textPrimary, fontSize: 11, lineHeight: 17 },
    guideNote: { color: COLORS.textSecondary, fontSize: 10, lineHeight: 15, marginTop: 4 },
    location: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2, marginBottom: 24 },
    locationText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
    sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11, marginTop: 7 },
    sectionTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '800' },
    matchCard: { backgroundColor: COLORS.primary, borderRadius: 20, padding: 18, marginBottom: 14, overflow: 'hidden' },
    matchMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    status: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    statusText: { color: '#E8C95B', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E8C95B' },
    matchDate: { color: '#D9E8DF', fontSize: 11, fontWeight: '600' },
    teams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20 },
    team: { flex: 1, alignItems: 'center', gap: 9 },
    teamBadge: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.2)' },
    teamName: { color: COLORS.background, fontWeight: '700', fontSize: 13, textAlign: 'center', minHeight: 34 },
    versus: { width: 42, alignItems: 'center' },
    versusText: { color: '#D9E8DF', fontSize: 12, fontWeight: '700' },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,.18)' },
    countdownLabel: { textAlign: 'center', marginTop: 14, color: '#D9E8DF', fontSize: 11 },
    countdown: { textAlign: 'center', color: COLORS.background, fontSize: 25, fontWeight: '800', letterSpacing: 1, marginTop: 3 },
    stadium: { textAlign: 'center', color: '#D9E8DF', fontSize: 11, marginTop: 9 },
    surface: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, marginBottom: 22 },
    newsCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, padding: 14, marginBottom: 10 },
    newsMark: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#EAF4ED', alignItems: 'center', justifyContent: 'center' },
    newsContent: { flex: 1 },
    newsTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' },
    newsBody: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 5 },
    newsDate: { color: COLORS.primary, fontSize: 10, fontWeight: '700', marginTop: 8 },
    emptyNews: { color: COLORS.textSecondary, textAlign: 'center', padding: 18, fontSize: 13 },
});
