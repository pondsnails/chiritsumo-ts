import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import type { Href } from 'expo-router';
import { checkAndPerformRollover } from '@core/utils/dailyRollover';
import { checkDatabaseIntegrity } from '@core/utils/dbIntegrityCheck';
import { RolloverNotification } from '@core/components/RolloverNotification';
import { useServices } from '@core/di/ServicesProvider';

export default function Index() {
  const [showRollover, setShowRollover] = useState(false);
  const [rolloverData, setRolloverData] = useState({ targetLex: 0, newBalance: 0 });
  const [ready, setReady] = useState(false);
  const [destination, setDestination] = useState<Href | null>(null);
  const router = useRouter();
  const { useOnboardingStore, cardRepo, ledgerRepo, settingsRepo } = useServices();
  const { hasCompletedOnboarding, isLoading, checkOnboardingStatus } = useOnboardingStore();
  const onboardingStore = useOnboardingStore; // getState用

  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      console.log('[Index] Step 1: Check onboarding');
      try {
        await checkOnboardingStatus();
      } catch (error) {
        console.error('[Index] Onboarding check failed:', error);
        if (mounted) {
          setDestination('/onboarding');
          setReady(true);
        }
        return;
      }
      
      if (!mounted) return;
      
      console.log('[Index] Step 2: Navigate');
      const { hasCompletedOnboarding } = onboardingStore.getState();
      
      if (hasCompletedOnboarding) {
        console.log('[Index] User completed onboarding, checking rollover');
        try {
          await checkRollover();
        } catch (error) {
          console.error('[Index] Rollover failed:', error);
        }
        // 起動時DB整合性チェック → 破損検知時は復旧UIへ
        try {
          const integrity = await checkDatabaseIntegrity();
          if (!integrity.isHealthy) {
            console.warn('[Index] DB integrity issues detected:', integrity.errors);
            if (mounted) {
              setDestination('/recovery' as Href);
              setReady(true);
            }
            return;
          }
        } catch (e) {
          console.warn('[Index] Integrity check failed, proceeding to quest:', e);
        }

        // 初回起動時のバックアップ設定促進(必須ステップ・スキップ可)
        try {
          const setupDone = await settingsRepo.get('@chiritsumo_backup_setup_done');
          if (setupDone !== 'true') {
            if (mounted) {
              setDestination('/backup-setup' as Href);
              setReady(true);
            }
            return;
          }
        } catch (e) {
          console.warn('[Index] backup setup check error, proceeding:', e);
        }

        // プリセットルート選択（初回起動時のみ表示）
        try {
          const presetSelected = await settingsRepo.get('@chiritsumo_preset_route_selected');
          if (!presetSelected) {
            if (mounted) {
              setDestination('/preset-routes' as Href);
              setReady(true);
            }
            return;
          }
        } catch (e) {
          console.warn('[Index] preset route check error, proceeding:', e);
        }

        console.log('[Index] Setting destination to /(tabs)/quest');
        if (mounted) {
          setDestination('/(tabs)/quest' as Href);
          setReady(true);
        }
      } else {
        console.log('[Index] Setting destination to /onboarding');
        if (mounted) {
          setDestination('/onboarding' as Href);
          setReady(true);
        }
      }
    };
    
    initialize();
    
    return () => {
      mounted = false;
    };
  }, []);

  const checkRollover = async () => {
    console.log('[Index] checkRollover started');
    try {
      console.log('[Index] Fetching ledger...');
      const summaryEntries = await ledgerRepo.findRecent(1);
      const currentBalance = summaryEntries.length > 0 ? summaryEntries[0].balance : 0;
      console.log('[Index] Ledger fetched, balance:', currentBalance);

      console.log('[Index] Checking rollover...');
      const result = await checkAndPerformRollover(cardRepo, ledgerRepo, settingsRepo, currentBalance);
      console.log('[Index] Rollover check complete, performed:', result.performed);

      if (result.performed) {
        setRolloverData({
          targetLex: result.targetLex,
          newBalance: result.newBalance,
        });
        setShowRollover(true);
      }
    } catch (error) {
      console.error('[Index] Rollover error:', error);
      // エラーでも続行
    }
  console.log('[Index] checkRollover finished');
  };

  useEffect(() => {
    if (ready && destination && !showRollover) {
      console.log('[Index] Navigation ready. Destination:', destination);
      // 少し遅延を入れてナビゲーションを実行（レイアウトのマウント待ち）
      const timer = setTimeout(() => {
        console.log('[Index] Executing router.replace to:', destination);
        router.replace(destination);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [ready, destination, showRollover]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#00F260" />

      <RolloverNotification
        visible={showRollover}
        targetLex={rolloverData.targetLex}
        newBalance={rolloverData.newBalance}
        onClose={() => setShowRollover(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
