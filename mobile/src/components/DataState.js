import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RefreshCw, WifiOff } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { useLanguage } from '../i18n';

// RU: Показать русское сообщение об ошибке или отсутствии записей с повторной загрузкой.
// EN: Show a Russian error or empty-state message with a retry action.
export default function DataState({ error, emptyText, onRetry }) {
    const { t } = useLanguage();
    return (
        <View style={styles.container}>
            {error ? <WifiOff color={COLORS.textSecondary} size={28} /> : <RefreshCw color={COLORS.accent} size={26} />}
            <Text style={styles.title}>{error ? t('Нет связи с сервером') : t(emptyText)}</Text>
            {error ? <Text style={styles.description}>{error}</Text> : null}
            {onRetry ? <Pressable accessibilityRole="button" style={styles.button} onPress={onRetry}><Text style={styles.buttonText}>{t('Повторить')}</Text></Pressable> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 38, gap: 10 },
    title: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', textAlign: 'center' },
    description: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center' },
    button: { marginTop: 4, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.primary },
    buttonText: { color: COLORS.background, fontSize: 13, fontWeight: '700' },
});
