import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Check, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api/axios';
import { useLanguage } from '../i18n';
import { setTournament } from './selection';
import { COLORS } from '../constants/theme';
const STORAGE_KEY = 'imam.tournament';
export default function TournamentPicker({ onSelect }) {
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [selected, setSelected] = useState('legacy');
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);
    const restored = useRef(false);
    const load = useCallback(async (signal) => {
        setLoading(true);
        try {
            const [response, saved] = await Promise.all([api.get('/tournaments', { signal }), AsyncStorage.getItem(STORAGE_KEY).catch(() => null)]);
            if (signal?.aborted) return;
            const data = response.data?.data;
            if (!Array.isArray(data)) throw new Error('Invalid response');
            setItems(data); setError(false);
            if (!restored.current) {
                restored.current = true;
                const item = data.find(value => value._id === saved);
                const id = item?._id || 'legacy';
                setTournament(id, item?.format); setSelected(id); onSelect(id);
            }
        } catch { if (!signal?.aborted) setError(true); }
        finally { if (!signal?.aborted) setLoading(false); }
    }, [onSelect]);
    useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load]);
    const name = items.find(item => item._id === selected)?.name || t('Основной турнир');
    function choose(item) {
        const id = item?._id || 'legacy';
        restored.current = true;
        setTournament(id, item?.format); setSelected(id); setOpen(false); onSelect(id);
        AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
    }
    const option = (id, label, item) => <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: selected === id }} onPress={() => choose(item)} style={[styles.item, selected === id && styles.selectedItem]}><Text style={[styles.itemText, selected === id && styles.selectedText]}>{label}</Text>{selected === id ? <Check size={20} color={COLORS.primary} /> : null}</Pressable>;
    return <><Pressable accessibilityRole="button" onPress={() => { setOpen(true); if (!loading) load(); }} style={styles.selector}><Text style={styles.label}>{t('Турнир')}: {name} ▾</Text></Pressable>
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
            <View style={styles.backdrop}><View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
                <View style={styles.header}><Text style={styles.title}>{t('Выберите турнир')}</Text><Pressable accessibilityRole="button" accessibilityLabel={t('Закрыть')} onPress={() => setOpen(false)} style={styles.close}><X size={21} color={COLORS.textPrimary} /></Pressable></View>
                {loading ? <Text style={styles.status}>{t('Загрузка…')}</Text> : null}
                {error ? <Pressable accessibilityRole="button" disabled={loading} onPress={() => load()} style={styles.item}><Text style={styles.itemText}>{t('Не удалось загрузить турниры. Нажмите, чтобы повторить.')}</Text></Pressable> : null}
                <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                    {option('legacy', t('Основной турнир'), null)}
                    {items.map(item => option(item._id, item.name, item))}
                </ScrollView>
            </View></View>
        </Modal></>;
}
const styles = StyleSheet.create({ selector: { paddingHorizontal: 18, paddingVertical: 9, backgroundColor: '#056839' }, label: { color: '#fff', fontWeight: '700' }, backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.4)' }, sheet: { backgroundColor: COLORS.background, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 16, maxHeight: '70%' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, title: { flex: 1, color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' }, close: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F6F3' }, status: { color: COLORS.textSecondary, paddingVertical: 10 }, list: { flexGrow: 0, flexShrink: 1 }, listContent: { gap: 6 }, item: { minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, selectedItem: { backgroundColor: '#EAF4ED' }, itemText: { flex: 1, color: COLORS.textPrimary, fontSize: 15 }, selectedText: { color: COLORS.primary, fontWeight: '700' } });
