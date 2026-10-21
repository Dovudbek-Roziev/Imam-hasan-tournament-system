import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { imageUrl } from '../api/axios';
import { useLanguage } from '../i18n';

// RU: Показать логотип команды или аккуратную метку с первой буквой.
// EN: Render a team logo or a compact fallback mark with its initial.
export default function TeamLogo({ team, size = 40, style }) {
    const [failed, setFailed] = useState(false);
    const { t } = useLanguage();
    useEffect(() => setFailed(false), [team?.logo]);
    const source = team?.logo && !failed ? { uri: imageUrl(team.logo) } : null;
    return <View style={[styles.logo, { width: size, height: size, borderRadius: Math.round(size * 0.28) }, style]}>
        {source ? <Image source={source} onError={() => setFailed(true)} resizeMode="contain" style={styles.image} accessibilityLabel={team?.name || t('Команда')} />
            : <Text style={[styles.initial, { fontSize: Math.round(size * 0.42) }]}>{(team?.name || 'К').slice(0, 1).toUpperCase()}</Text>}
    </View>;
}

const styles = StyleSheet.create({
    logo: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#F4F8F4', borderWidth: 1, borderColor: COLORS.border },
    image: { width: '100%', height: '100%' },
    initial: { color: COLORS.primary, fontWeight: '800' },
});
