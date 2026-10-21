import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MapPin, X } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import api from '../api/axios';
import DataState from './DataState';
import { formatKickoff } from '../utils/formatting';
import { useLanguage } from '../i18n';
import { getGoalCreditedTeamName } from '../utils/matchEvents';

// RU: Загрузить полный протокол матча и показать его в мобильном окне деталей.
// EN: Load a match's full protocol and show it in a mobile details sheet.
export default function MatchDetailsModal({ match, onClose }) {
    const { t, locale } = useLanguage();
    const [details, setDetails] = useState(match || {});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);

    // RU: Получить свежую карточку матча; отмена защищает от ответа после закрытия окна.
    // EN: Fetch the latest match record and cancel it if the modal closes.
    useEffect(() => {
        const controller = new AbortController();
        async function loadDetails() {
            try {
                const response = await api.get(`/matches/${match._id}`, { signal: controller.signal });
                const record = response?.data?.data;
                if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error(t('Сервер вернул некорректный протокол матча.'));
                setDetails({ ...record, events: Array.isArray(record.events) ? record.events : [] });
            }
            catch (failure) { if (!controller.signal.aborted) setError(failure.response?.data?.message || t('Не удалось загрузить протокол матча.')); }
            finally { if (!controller.signal.aborted) setLoading(false); }
        }
        loadDetails();
        return () => controller.abort();
    }, [match._id, attempt, t]);

    return <Modal visible animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.backdrop}><View style={styles.sheet}>
            <View style={styles.header}><View><Text style={styles.kicker}>{t('ПРОТОКОЛ МАТЧА')}</Text><Text style={styles.title}>{t('Детали встречи')}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={t('Закрыть детали матча')} style={styles.close} onPress={onClose}><X size={20} color={COLORS.textPrimary} /></Pressable></View>
            <ScrollView contentContainerStyle={styles.body}>
                <Text style={styles.date}>{formatKickoff(details.startsAt || details.date, true, locale)}</Text>
                <Text style={styles.stage}>{t(details.stage || 'Лига')} · {t(details.status)}</Text>
                <View style={styles.scoreCard}><Text style={styles.team}>{details.homeTeam?.name || t('Команда')}</Text><Text style={styles.score}>{['Завершён', 'Идёт'].includes(details.status) ? `${details.homeScore} : ${details.awayScore}` : '— : —'}</Text><Text style={[styles.team, styles.away]}>{details.awayTeam?.name || t('Команда')}</Text></View>
                <View style={styles.stadium}><MapPin size={15} color={COLORS.primary} /><Text style={styles.stadiumText}>{details.stadium || t('Основной стадион')}</Text></View>
                <Text style={styles.sectionTitle}>{t('События')}</Text>
                {loading ? <ActivityIndicator color={COLORS.primary} style={styles.loader} /> : error ? <DataState error={error} emptyText="" onRetry={() => { setError(''); setLoading(true); setAttempt((value) => value + 1); }} /> : null}
                {!loading && !error && !(Array.isArray(details.events) && details.events.length) ? <Text style={styles.empty}>{t('В протоколе пока нет событий.')}</Text> : null}
                {!error && (Array.isArray(details.events) ? details.events : []).map((event, index) => {
                    const creditedTeam = getGoalCreditedTeamName(details, event);
                    return <View style={styles.event} key={event._id || `${event.minute}-${index}`}><Text style={styles.minute}>{event.minute}′</Text><View style={styles.eventInfo}><Text style={styles.eventTitle}>{t(event.type)}</Text><Text style={styles.eventPerson}>{event.player?.name || t('Игрок')}{creditedTeam ? ` · ${t('Гол засчитан команде')}: ${creditedTeam}` : ''}{event.assist?.name ? ` · ${t('Пасы:')} ${event.assist.name}` : ''}</Text></View></View>;
                })}
            </ScrollView>
        </View></View>
    </Modal>;
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,30,24,.38)' },
    sheet: { maxHeight: '88%', borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: COLORS.background, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 28 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottomWidth: 1, borderColor: COLORS.border },
    kicker: { color: COLORS.primary, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
    title: { color: COLORS.textPrimary, fontSize: 19, fontWeight: '800', marginTop: 4 },
    close: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.card },
    body: { paddingBottom: 14 },
    date: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginVertical: 18 },
    stage: { color: COLORS.primary, fontSize: 10, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
    scoreCard: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    team: { flex: 1, color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
    away: { textAlign: 'right' },
    score: { color: COLORS.primary, fontSize: 20, fontWeight: '900' },
    stadium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 13 },
    stadiumText: { color: COLORS.textSecondary, fontSize: 11 },
    sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 25, marginBottom: 10 },
    loader: { paddingVertical: 24 },
    empty: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center', paddingVertical: 24 },
    event: { flexDirection: 'row', gap: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 11 },
    minute: { width: 34, color: COLORS.primary, fontSize: 13, fontWeight: '800' },
    eventInfo: { flex: 1 },
    eventTitle: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
    eventPerson: { color: COLORS.textSecondary, fontSize: 11, marginTop: 3 },
});
