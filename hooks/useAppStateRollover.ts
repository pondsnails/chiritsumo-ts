import { autoSafBackup } from '@core/services/safBackupService';
import { autoIosBackup } from '@core/services/iosBackupService';
import { performCloudBackup } from '@core/services/cloudBackupService';
import { useToast } from '@core/ui/ToastProvider';
import { useEffect, useRef } from 'react';
import { reportError } from '@core/services/errorReporter';
import { AppState, AppStateStatus } from 'react-native';
import { checkAndPerformRollover } from '@core/utils/dailyRollover';
import { useServices } from '@core/di/ServicesProvider';

/**
 * アプリのバックグラウンド復帰や深夜0時を跨いだ際に
 * 日付変更を検知してRollover処理を自動実行するフック
 */
export function useAppStateRollover(onRolloverPerformed?: () => void) {
  const toast = useToast();
  const appState = useRef(AppState.currentState);
  const { useBookStore, cardRepo, ledgerRepo, settingsRepo } = useServices();
  const { books } = useBookStore();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      // バックグラウンド → フォアグラウンドの遷移を検知
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground - checking for daily rollover');
        
        try {
          // Rollover処理は集計データのみ使用（全件取得は不要）
          // checkAndPerformRollover内部でLedgerから最新残高を取得
          const result = await checkAndPerformRollover(cardRepo, ledgerRepo, settingsRepo, 0);
          
          if (result.performed) {
            console.log('Daily rollover performed:', {
              newBalance: result.newBalance,
              targetLex: result.targetLex,
            });
            // コールバックがあれば実行（UI更新用）
            onRolloverPerformed?.();
          }
          // Rollover有無に関わらずバックグラウンド復帰時に自動バックアップ
          try {
            const androidOk = await autoSafBackup();
            const iosOk = await autoIosBackup();
            if (androidOk || iosOk) {
              toast.show('自動バックアップ完了');
            }

            // クラウド自動バックアップ（裏側で実行、エラーでも続行）
            const cloudResult = await performCloudBackup();
            if (cloudResult.success) {
              console.log('[CloudBackup] フォアグラウンド復帰時バックアップ成功');
            } else if (cloudResult.error !== 'Cloud backup disabled by user') {
              console.warn('[CloudBackup] フォアグラウンド復帰時バックアップ失敗:', cloudResult.error);
            }
          } catch (e: any) {
            toast.show(`バックアップ失敗: ${e?.message ?? '不明なエラー'}`);
          }
        } catch (error) {
          reportError(error, { context: 'appStateRollover' });
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [books, onRolloverPerformed]);
}
