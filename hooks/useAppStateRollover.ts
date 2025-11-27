import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { checkAndPerformRollover } from '@core/utils/dailyRollover';
import { useBookStore } from '@core/store/bookStore';

/**
 * アプリのバックグラウンド復帰や深夜0時を跨いだ際に
 * 日付変更を検知してRollover処理を自動実行するフック
 */
export function useAppStateRollover(onRolloverPerformed?: () => void) {
  const appState = useRef(AppState.currentState);
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
          const result = await checkAndPerformRollover(0);
          
          if (result.performed) {
            console.log('Daily rollover performed:', {
              newBalance: result.newBalance,
              targetLex: result.targetLex,
            });
            
            // コールバックがあれば実行（UI更新用）
            onRolloverPerformed?.();
          }
        } catch (error) {
          console.error('Failed to check rollover on app state change:', error);
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [books, onRolloverPerformed]);
}
