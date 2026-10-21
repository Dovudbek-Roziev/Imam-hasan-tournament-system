import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { COLORS } from '../constants/theme';
import { useLanguage } from '../i18n';

// RU: Переключить русский и кыргызский язык приложения.
// EN: Toggle the application between Russian and Kyrgyz.
export default function LanguageToggle() {
    const { language, t, toggleLanguage } = useLanguage();
    return <Pressable accessibilityRole="button" accessibilityLabel={t('Русский / Кыргызча')} onPress={toggleLanguage} style={styles.button}>
        <Text style={styles.label}>{language === 'ru' ? 'РУ' : 'КЫР'}</Text>
    </Pressable>;
}

const styles = StyleSheet.create({
    button: { minWidth: 42, height: 36, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card },
    label: { color: COLORS.primary, fontSize: 11, fontWeight: '800' },
});
