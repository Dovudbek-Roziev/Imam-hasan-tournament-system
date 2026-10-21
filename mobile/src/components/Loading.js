import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { COLORS } from '../constants/theme';
import { useLanguage } from '../i18n';

// RU: Компонент загрузки
// EN: Loading component
export default function Loading() {
    const { t } = useLanguage();
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.label}>{t('Загружаем данные турнира…')}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        gap: 12,
    },
    label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
});
