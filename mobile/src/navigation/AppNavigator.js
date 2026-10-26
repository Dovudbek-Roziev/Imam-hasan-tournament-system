import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Trophy, CalendarDays, BarChart2, CodeXml } from 'lucide-react-native';
import { COLORS } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';
import TableScreen from '../screens/TableScreen';
import MatchesScreen from '../screens/MatchesScreen';
import StatsScreen from '../screens/StatsScreen';
import DeveloperScreen from '../screens/DeveloperScreen';
import { useLanguage } from '../i18n';

const Tab = createBottomTabNavigator();

// RU: Настроить русские нижние вкладки и светлую тему приложения.
// EN: Configure Russian bottom tabs and the app's light theme.
export default function AppNavigator() {
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                headerStyle: { backgroundColor: COLORS.background },
                headerTintColor: COLORS.textPrimary,
                headerTitleStyle: {
                    color: COLORS.primary,
                    fontWeight: '800',
                },
                headerShadowVisible: false,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textSecondary,
                tabBarStyle: {
                    backgroundColor: COLORS.background,
                    borderTopColor: COLORS.border,
                    height: 56 + Math.max(insets.bottom, 6),
                    paddingTop: 6,
                    paddingBottom: Math.max(insets.bottom, 6),
                },
                tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
                sceneStyle: { backgroundColor: COLORS.background },
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    title: t('Главная'),
                    tabBarIcon: ({ color, size }) => <Home color={color} size={size} />
                }}
            />
            <Tab.Screen
                name="Table"
                component={TableScreen}
                options={{
                    title: t('Таблица'),
                    tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} />
                }}
            />
            <Tab.Screen
                name="Matches"
                component={MatchesScreen}
                options={{
                    title: t('Матчи'),
                    tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />
                }}
            />
            <Tab.Screen
                name="Stats"
                component={StatsScreen}
                options={{
                    title: t('Статистика'),
                    tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} />
                }}
            />
            <Tab.Screen
                name="Developer"
                component={DeveloperScreen}
                options={{
                    title: 'Автор',
                    tabBarIcon: ({ color, size }) => <CodeXml color={color} size={size} />
                }}
            />
        </Tab.Navigator>
    );
}
