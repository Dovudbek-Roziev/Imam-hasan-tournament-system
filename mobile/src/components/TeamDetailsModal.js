import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Shield, X } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import api from '../api/axios';
import { readDataArray } from '../api/response';
import { useLanguage } from '../i18n';
import DataState from './DataState';

// RU: Загрузить состав команды и показать её турнирные показатели.
// EN: Load a team's roster and show its tournament standings.
export default function TeamDetailsModal({ team, onClose }) {
    const { t } = useLanguage();
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);

    // RU: Получить игроков выбранной команды и отменить запрос при закрытии окна.
    // EN: Fetch the selected team's players and cancel the request when the modal closes.
    useEffect(() => {
        const controller = new AbortController();
        async function loadRoster() {
            try { const response = await api.get('/players', { params: { team: team._id, limit: 100, sort: 'number' }, signal: controller.signal }); setPlayers(readDataArray(response)); }
            catch (failure) { if (!controller.signal.aborted) setError(failure.response?.data?.message || t('Не удалось загрузить состав команды.')); }
            finally { if (!controller.signal.aborted) setLoading(false); }
        }
        loadRoster();
        return () => controller.abort();
    }, [team._id, attempt, t]);

    return <Modal visible animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.backdrop}><View style={styles.sheet}>
            <View style={styles.header}><View><Text style={styles.kicker}>{t('УЧАСТНИК ТУРНИРА')}</Text><Text style={styles.title}>{team.name}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={t('Закрыть состав команды')} style={styles.close} onPress={onClose}><X size={20} color={COLORS.textPrimary} /></Pressable></View>
            <ScrollView contentContainerStyle={styles.body}>
                <View style={styles.stats}><View><Text style={styles.statValue}>{team.points}</Text><Text style={styles.statLabel}>{t('очков')}</Text></View><View><Text style={styles.statValue}>{team.played}</Text><Text style={styles.statLabel}>{t('матчей')}</Text></View><View><Text style={styles.statValue}>{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</Text><Text style={styles.statLabel}>{t('разница')}</Text></View></View>
                <Text style={styles.sectionTitle}>{t('Состав команды')}</Text>
                {loading ? <ActivityIndicator color={COLORS.primary} style={styles.loader} /> : error ? <DataState error={error} emptyText="" onRetry={() => { setError(''); setLoading(true); setAttempt((value) => value + 1); }} /> : null}
                {!loading && !error && !players.length ? <Text style={styles.empty}>{t('В команде пока нет игроков.')}</Text> : null}
                {!error && players.map((player) => <View style={styles.player} key={player._id}><View style={styles.number}><Text style={styles.numberText}>{player.number ?? '—'}</Text></View><View style={styles.playerInfo}><Text style={styles.playerName}>{player.name}</Text><Text style={styles.playerStats}>{t('Голы')}: {player.goals} · {t('Ассисты')}: {player.assists}</Text></View><Shield color={COLORS.primary} size={16} /></View>)}
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
    stats: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 21, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    statValue: { textAlign: 'center', color: COLORS.primary, fontSize: 21, fontWeight: '900' },
    statLabel: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 10, marginTop: 3 },
    sectionTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 21, marginBottom: 8 },
    loader: { paddingVertical: 24 },
    empty: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center', paddingVertical: 24 },
    player: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 58, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    number: { width: 35, height: 35, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#EAF4ED' },
    numberText: { color: COLORS.primary, fontWeight: '800', fontSize: 12 },
    playerInfo: { flex: 1 },
    playerName: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 13 },
    playerStats: { color: COLORS.textSecondary, fontSize: 10, marginTop: 3 },
});
