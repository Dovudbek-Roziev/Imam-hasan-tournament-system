import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Check, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api/axios';
import { useLanguage } from '../i18n';
import { resolveTournament, setTournament } from './selection';
import { COLORS } from '../constants/theme';
const STORAGE_KEY = 'imam.tournament';
export default function TournamentPicker({ onSelect, onStatusChange }) {
    const { t } = useLanguage();
    const insets = useSafeAreaInsets();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [selected, setSelected] = useState(null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);
    const restored = useRef(false);
    const selectedRef = useRef(null);
    const requestRef = useRef(0);
    const load = useCallback(async (signal) => {
        const request = ++requestRef.current;
        setLoading(true);
        try {
            const [response, saved] = await Promise.all([api.get('/tournaments', { signal }), AsyncStorage.getItem(STORAGE_KEY).catch(() => null)]);
            if (signal?.aborted || request !== requestRef.current) return;
            const data = response.data?.data;
            if (!Array.isArray(data)) throw new Error('Invalid response');
            setItems(data); setError(false);
            const item = resolveTournament(data, restored.current ? selectedRef.current : saved);
            restored.current = true;
            selectedRef.current = item?._id || null;
            setSelected(selectedRef.current);
            if (item) {
                setTournament(item._id, item.format);
                onSelect(item._id);
                onStatusChange('ready');
                AsyncStorage.setItem(STORAGE_KEY, item._id).catch(() => {});
            } else {
                onSelect(null);
                onStatusChange('empty');
            }
        } catch {
            if (!signal?.aborted && request === requestRef.current) {
                setError(true);
                if (!selectedRef.current) onStatusChange('error');
            }
        } finally { if (!signal?.aborted && request === requestRef.current) setLoading(false); }
    }, [onSelect, onStatusChange]);
    useEffect(() => { const controller = new AbortController(); load(controller.signal); return () => controller.abort(); }, [load]);
    const name = items.find(item => item._id === selected)?.name || t(loading ? 'Загрузка…' : 'Выберите турнир');
    function choose(item) {
        const id = item._id;
        restored.current = true;
        selectedRef.current = id;
        setTournament(id, item?.format); setSelected(id); setOpen(false); onSelect(id);
        onStatusChange('ready');
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
                    {items.map(item => option(item._id, item.name, item))}
                </ScrollView>
                {!loading && !error && !items.length ? <Text style={styles.status}>{t('Турниров пока нет.')}</Text> : null}
            </View></View>
        </Modal></>;
}
const styles = StyleSheet.create({ selector: { paddingHorizontal: 18, paddingVertical: 9, backgroundColor: '#056839' }, label: { color: '#fff', fontWeight: '700' }, backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.4)' }, sheet: { backgroundColor: COLORS.background, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 16, maxHeight: '70%' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, title: { flex: 1, color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' }, close: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F6F3' }, status: { color: COLORS.textSecondary, paddingVertical: 10 }, list: { flexGrow: 0, flexShrink: 1 }, listContent: { gap: 6 }, item: { minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, selectedItem: { backgroundColor: '#EAF4ED' }, itemText: { flex: 1, color: COLORS.textPrimary, fontSize: 15 }, selectedText: { color: COLORS.primary, fontWeight: '700' } });
