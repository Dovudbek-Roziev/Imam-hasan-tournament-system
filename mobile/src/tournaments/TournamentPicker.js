import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import api from '../api/axios';
import { useLanguage } from '../i18n';
import { setTournament } from './selection';
export default function TournamentPicker({ onSelect }) {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [selected, setSelected] = useState('legacy');
    useEffect(() => { const controller = new AbortController(); api.get('/tournaments', { signal: controller.signal }).then(response => setItems(response.data.data)).catch(() => {}); return () => controller.abort(); }, []);
    const name = items.find(item => item._id === selected)?.name || t('Основной турнир');
    function choose(id) { setTournament(id); setSelected(id); setOpen(false); onSelect(id); }
    return <><Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.selector}><Text style={styles.label}>{t('Турнир')}: {name} ▾</Text></Pressable><Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}><View style={styles.backdrop}><View style={styles.sheet}><Text style={styles.title}>{t('Выберите турнир')}</Text><ScrollView><Pressable onPress={() => choose('legacy')} style={styles.item}><Text>{t('Основной турнир')}</Text></Pressable>{items.map(item => <Pressable key={item._id} onPress={() => choose(item._id)} style={styles.item}><Text>{item.name}</Text></Pressable>)}</ScrollView><Pressable style={styles.item} onPress={() => setOpen(false)}><Text>{t('Закрыть')}</Text></Pressable></View></View></Modal></>;
}
const styles = StyleSheet.create({ selector: { paddingHorizontal: 18, paddingVertical: 9, backgroundColor: '#056839' }, label: { color: '#fff', fontWeight: '700' }, backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.4)' }, sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' }, title: { fontSize: 18, fontWeight: '800', marginBottom: 12 }, item: { paddingVertical: 14, borderBottomWidth: 1, borderColor: '#eee' } });
