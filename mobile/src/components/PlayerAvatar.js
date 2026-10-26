import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { imageUrl } from '../api/axios';

// RU: Показать фотографию футболиста или инициалы, если фото отсутствует.
// EN: Show the player's photo or initials when no photo is available.
export default function PlayerAvatar({ player, size = 38 }) {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [player?.photo]);
    const source = player?.photo && !failed ? { uri: imageUrl(player.photo) } : null;
    return <View accessibilityLabel={player?.name || ''} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        {source ? <Image source={source} onError={() => setFailed(true)} resizeMode="cover" style={styles.image} /> : <Text style={[styles.initial, { fontSize: Math.round(size * 0.42) }]}>{player?.name?.trim()?.charAt(0)?.toLocaleUpperCase('ru') || 'И'}</Text>}
    </View>;
}

const styles = StyleSheet.create({
    avatar: { flex: 0, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF4ED' },
    image: { width: '100%', height: '100%' },
    initial: { color: COLORS.primary, fontWeight: '800' },
});
