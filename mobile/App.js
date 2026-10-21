import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { LanguageProvider } from './src/i18n';

// RU: Главный компонент приложения
// EN: Main application component
export default function App() {
  return (
    <LanguageProvider><SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <AppNavigator />
        </SafeAreaView>
      </NavigationContainer>
    </SafeAreaProvider></LanguageProvider>
  );
}
