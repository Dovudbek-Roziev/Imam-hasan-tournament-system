import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { LanguageProvider } from './src/i18n';
import TournamentPicker from './src/tournaments/TournamentPicker';
import { COLORS } from './src/constants/theme';

// RU: Главный компонент приложения
// EN: Main application component
export default function App() {
  const [tournament, setTournament] = useState('legacy');
  return (
    <LanguageProvider><SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor={COLORS.primary} translucent={false} />
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.primary }}>
          <TournamentPicker onSelect={setTournament} />
          <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: COLORS.background }}>
            <AppNavigator key={tournament} />
          </SafeAreaView>
        </SafeAreaView>
      </NavigationContainer>
    </SafeAreaProvider></LanguageProvider>
  );
}

