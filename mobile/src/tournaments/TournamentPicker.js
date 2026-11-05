import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios';
import { useLanguage } from '../i18n';
import { setTournament } from './selection';
const STORAGE_KEY = 'imam.tournament';
export default function TournamentPicker({ onSelect }) {
    const { t } = useLanguage();
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
    return <><Pressable accessibilityRole="button" onPress={() => { setOpen(true); if (!loading) load(); }} style={styles.selector}><Text style={styles.label}>{t('Турнир')}: {name} ▾</Text></Pressable><Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}><View style={styles.backdrop}><View style={styles.sheet}><Text style={styles.title}>{t('Выберите турнир')}</Text>{loading ? <Text>{t('Загрузка…')}</Text> : null}{error ? <Pressable accessibilityRole="button" disabled={loading} onPress={() => load()} style={styles.item}><Text>{t('Не удалось загрузить турниры. Нажмите, чтобы повторить.')}</Text></Pressable> : null}<ScrollView><Pressable onPress={() => choose(null)} style={styles.item}><Text>{t('Основной турнир')}</Text></Pressable>{items.map(item => <Pressable key={item._id} onPress={() => choose(item)} style={styles.item}><Text>{item.name}</Text></Pressable>)}</ScrollView><Pressable style={styles.item} onPress={() => setOpen(false)}><Text>{t('Закрыть')}</Text></Pressable></View></View></Modal></>;
}
const styles = StyleSheet.create({ selector: { paddingHorizontal: 18, paddingVertical: 9, backgroundColor: '#056839' }, label: { color: '#fff', fontWeight: '700' }, backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.4)' }, sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' }, title: { fontSize: 18, fontWeight: '800', marginBottom: 12 }, item: { paddingVertical: 14, borderBottomWidth: 1, borderColor: '#eee' } });
