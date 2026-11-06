import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { LanguageProvider, useLanguage } from './src/i18n';
import Loading from './src/components/Loading';
import TournamentPicker from './src/tournaments/TournamentPicker';
import { COLORS } from './src/constants/theme';

// RU: Главный компонент приложения
// EN: Main application component
function TournamentApp() {
  const [tournament, setTournament] = useState(null);
  const [status, setStatus] = useState('loading');
  const { t } = useLanguage();
  return (
      <NavigationContainer>
        <StatusBar style="light" backgroundColor={COLORS.primary} translucent={false} />
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.primary }}>
          <TournamentPicker onSelect={setTournament} onStatusChange={setStatus} />
          <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: COLORS.background }}>
            {tournament ? <AppNavigator key={tournament} /> : status === 'loading' ? <Loading /> : <View style={styles.empty}><Text style={styles.emptyTitle}>{t(status === 'error' ? 'Не удалось загрузить турниры.' : 'Турниров пока нет.')}</Text><Text style={styles.emptyHint}>{t('Нажмите на название турнира выше, чтобы обновить список.')}</Text></View>}
          </SafeAreaView>
        </SafeAreaView>
      </NavigationContainer>
  );
}

export default function App() {
  return <LanguageProvider><SafeAreaProvider><TournamentApp /></SafeAreaProvider></LanguageProvider>;
}

const styles = StyleSheet.create({ empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10, backgroundColor: COLORS.background }, emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', textAlign: 'center' }, emptyHint: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center' } });

