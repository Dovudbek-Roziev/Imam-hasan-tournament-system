import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, MessageCircle, Plus, RefreshCw, Send } from 'lucide-react-native';
import api from '../api/axios';
import { conversationToken } from '../support/token';
import { useLanguage } from '../i18n';
import { COLORS } from '../constants/theme';
import useApiData from '../hooks/useApiData';

const roles = [['player', 'Игрок'], ['parent', 'Родитель'], ['supporter', 'Болельщик']];
async function request(signal) {
    const token = await conversationToken();
    const response = await api.get('/conversations/mine', { headers: { 'X-Conversation-Token': token }, signal });
    if (!Array.isArray(response.data?.data)) throw new Error('Invalid response');
    return response.data.data;
}
export default function MessagesScreen({ navigation }) {
    const { t, locale } = useLanguage();
    const { data, loading, error, refresh } = useApiData(request);
    const [selected, setSelected] = useState('');
    const [creating, setCreating] = useState(false);
    const [role, setRole] = useState('player');
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState('');
    useFocusEffect(useCallback(() => { const timer = setInterval(() => refresh(), 30000); return () => clearInterval(timer); }, [refresh]));
    const active = data.find(item => item._id === selected);
    const compose = creating || Boolean(active);
    async function open(item) {
        setSelected(item._id); setCreating(false);
        if (!item.unreadVisitor) return;
        try { const token = await conversationToken(); await api.post(`/conversations/mine/${item._id}/read`, {}, { headers: { 'X-Conversation-Token': token } }); await refresh(); } catch { setSendError(t('Не удалось обновить обращение.')); }
    }
    async function send() {
        if (!text.trim() || sending) return;
        setSending(true); setSendError('');
        try {
            const token = await conversationToken();
            const url = creating ? '/conversations/mine' : `/conversations/mine/${active._id}/messages`;
            const response = await api.post(url, creating ? { role, text } : { text }, { headers: { 'X-Conversation-Token': token } });
            setText(''); setCreating(false); setSelected(response.data.data._id); await refresh();
        } catch (failure) { setSendError(failure.response?.data?.message || t('Не удалось отправить сообщение.')); }
        finally { setSending(false); }
    }
    return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel={t('Назад')} onPress={() => compose ? (setCreating(false), setSelected(''), setSendError('')) : navigation.navigate('Home')}><ArrowLeft color={COLORS.primary} size={23} /></Pressable><Text style={styles.title}>{t('Связаться с администратором')}</Text><Pressable accessibilityRole="button" accessibilityLabel={t('Обновить')} onPress={() => refresh()}><RefreshCw color={COLORS.primary} size={20} /></Pressable></View>
        {loading && !data.length ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} /> : null}
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        {!compose ? <><View style={styles.intro}><MessageCircle color={COLORS.primary} size={22} /><Text style={styles.introText}>{t('Задайте вопрос организатору. Переписку видите только вы и администратор.')}</Text></View><Pressable style={styles.primary} onPress={() => { setCreating(true); setSelected(''); }}><Plus color="#fff" size={19} /><Text style={styles.primaryText}>{t('Новое обращение')}</Text></Pressable><Text style={styles.hint}>{t('Переписка привязана к этому устройству. При удалении приложения доступ может быть потерян.')}</Text><FlatList data={data} keyExtractor={item => item._id} contentContainerStyle={styles.list} ListEmptyComponent={!loading ? <Text style={styles.empty}>{t('Обращений пока нет.')}</Text> : null} renderItem={({ item }) => <Pressable style={styles.card} onPress={() => open(item)}><View style={styles.row}><Text style={styles.cardTitle}>{t(roles.find(([key]) => key === item.role)?.[1] || 'Обращение')}</Text>{item.unreadVisitor && <Text style={styles.badge}>{t('Есть ответ')}</Text>}</View><Text style={styles.cardText} numberOfLines={2}>{item.messages?.at(-1)?.text}</Text></Pressable>} /></> : <>{creating ? <View style={styles.roles}><Text style={styles.label}>{t('Кто вы?')}</Text><View style={styles.row}>{roles.map(([key, label]) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: role === key }} onPress={() => setRole(key)} style={[styles.role, role === key && styles.roleActive]}><Text style={styles.roleText}>{t(label)}</Text></Pressable>)}</View></View> : <FlatList data={active?.messages || []} keyExtractor={(_, i) => String(i)} contentContainerStyle={styles.thread} renderItem={({ item }) => <View style={[styles.bubble, item.sender === 'visitor' && styles.mine]}><Text style={styles.bubbleText}>{item.text}</Text><Text style={styles.time}>{new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Bishkek' }).format(new Date(item.createdAt))}</Text></View>} />}{sendError ? <Text style={styles.error} accessibilityRole="alert">{sendError}</Text> : null}<View style={styles.compose}><TextInput multiline maxLength={2000} value={text} onChangeText={setText} placeholder={t('Напишите сообщение…')} style={styles.input} accessibilityLabel={t('Напишите сообщение…')} /><Pressable accessibilityRole="button" accessibilityLabel={t('Отправить')} disabled={sending || !text.trim()} onPress={send} style={[styles.send, (sending || !text.trim()) && { opacity: .45 }]}><Send color="#fff" size={20} /></Pressable></View></>}
    </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ root:{flex:1,backgroundColor:COLORS.background}, header:{flexDirection:'row',alignItems:'center',gap:12,padding:18}, title:{flex:1,fontSize:17,fontWeight:'800',color:COLORS.textPrimary}, intro:{marginHorizontal:18,flexDirection:'row',gap:12,backgroundColor:'#eaf4ed',borderRadius:16,padding:16,alignItems:'center'}, introText:{flex:1,color:COLORS.textPrimary,fontSize:13,lineHeight:19}, primary:{margin:18,marginBottom:8,backgroundColor:COLORS.primary,borderRadius:14,padding:14,flexDirection:'row',gap:8,justifyContent:'center',alignItems:'center'},primaryText:{color:'#fff',fontWeight:'800'},hint:{marginHorizontal:18,color:COLORS.textSecondary,fontSize:11,lineHeight:16},list:{padding:18,gap:10},card:{padding:15,borderRadius:14,backgroundColor:COLORS.card,borderWidth:1,borderColor:COLORS.border},row:{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'},cardTitle:{flex:1,fontWeight:'800',color:COLORS.textPrimary},cardText:{color:COLORS.textSecondary,marginTop:7},badge:{color:COLORS.primary,fontSize:11,fontWeight:'800'},empty:{textAlign:'center',color:COLORS.textSecondary,marginTop:24},roles:{padding:18,gap:12},label:{fontWeight:'800',color:COLORS.textPrimary},role:{paddingHorizontal:12,paddingVertical:10,borderWidth:1,borderColor:COLORS.border,borderRadius:12},roleActive:{borderColor:COLORS.primary,backgroundColor:'#eaf4ed'},roleText:{color:COLORS.textPrimary},thread:{padding:18,gap:10,flexGrow:1},bubble:{backgroundColor:'#eef3ef',borderRadius:14,padding:12,maxWidth:'85%',alignSelf:'flex-start'},mine:{backgroundColor:'#dff3e6',alignSelf:'flex-end'},bubbleText:{color:COLORS.textPrimary,fontSize:14,lineHeight:20},time:{color:COLORS.textSecondary,fontSize:10,marginTop:6},compose:{padding:14,flexDirection:'row',alignItems:'flex-end',gap:10},input:{flex:1,minHeight:48,maxHeight:120,backgroundColor:COLORS.card,borderColor:COLORS.border,borderWidth:1,borderRadius:14,padding:12,color:COLORS.textPrimary},send:{backgroundColor:COLORS.primary,borderRadius:14,width:48,height:48,alignItems:'center',justifyContent:'center'},error:{color:'#b42318',paddingHorizontal:18,paddingVertical:8} });
