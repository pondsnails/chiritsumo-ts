import React, { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { useServices } from '@core/di/ServicesProvider';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Zap, Route, Wallet, BookOpen, Settings } from 'lucide-react-native';
import { colors } from '@core/theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { useBookStore, ledgerRepo } = useServices();
  const { books } = useBookStore();

  // 進捗メトリクス算出（軽量）
  const progress = useMemo(() => {
    const bookCount = books.length;
    const activeBooks = books.filter(b => b.status === 0).length;
    return { bookCount, activeBooks };
  }, [books]);

  // Ledger残高（失敗時は0）
  const [balance, setBalance] = React.useState<number>(0);
  React.useEffect(() => {
    (async () => {
      try {
        const all = await ledgerRepo.findAll();
        if (all.length) {
          setBalance(all[all.length - 1].balance);
        }
      } catch {}
    })();
  }, [ledgerRepo]);

  // ゲーティング条件
  const gate = {
    showRoute: progress.bookCount >= 1, // 1冊以上登録でルート解放
    showBank: balance > 0 || progress.activeBooks >= 1, // LEX発生または稼働中書籍あり
    showSettings: progress.bookCount >= 2, // 2冊で詳細設定解放
  };
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
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused}><Zap color={color} size={24} strokeWidth={2.5} /></TabIcon>,
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          title: 'Route',
          // gateがfalseのときはルートを非表示にする
          href: gate.showRoute ? undefined : null,
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused}><Route color={color} size={24} strokeWidth={2.5} /></TabIcon>,
        }}
      />
      <Tabs.Screen
        name="bank"
        options={{
          title: 'Stats',
          href: gate.showBank ? undefined : null,
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused}><Wallet color={color} size={24} strokeWidth={2.5} /></TabIcon>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          href: gate.showSettings ? undefined : null,
          tabBarIcon: ({ color, focused }) => <TabIcon focused={focused}><Settings color={color} size={24} strokeWidth={2.5} /></TabIcon>,
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

function TabIcon({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(focused ? 1.05 : 1, { stiffness: 220, damping: 18 }) }],
    opacity: withSpring(focused ? 1 : 0.8, { stiffness: 220, damping: 18 }),
  }));
  return (
    <Animated.View style={[styles.iconContainer, focused && styles.iconContainerActive, style]}>
      {children}
    </Animated.View>
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
