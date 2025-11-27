import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Zap, Route, Wallet, BookOpen, Settings } from 'lucide-react-native';
import { colors } from '@core/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const baseBarHeight = 58; // content area height excluding safe area
  const bottomInset = Math.max(insets.bottom, 12);
  const barHeight = baseBarHeight + bottomInset;
  const renderTabBarBackground = React.useCallback(() => {
    if (Platform.OS === 'ios') {
      return (
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={styles.tabBarBackground} />
        </BlurView>
      );
    }
    return <View style={[StyleSheet.absoluteFill, styles.androidTabBarBackground]} />;
  }, []);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: barHeight,
          paddingBottom: bottomInset,
          paddingTop: 8,
        },
        tabBarHideOnKeyboard: true,
        tabBarBackground: renderTabBarBackground,
        lazy: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="quest"
        options={{
          title: 'Quest',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Zap color={color} size={24} strokeWidth={2.5} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          title: 'Route',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Route color={color} size={24} strokeWidth={2.5} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="bank"
        options={{
          title: 'Bank',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Wallet color={color} size={24} strokeWidth={2.5} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
              <Settings color={color} size={24} strokeWidth={2.5} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="books"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  androidTabBarBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  iconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
  },
});
