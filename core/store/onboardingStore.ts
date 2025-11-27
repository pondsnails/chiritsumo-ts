import { create } from 'zustand';
import { reportError } from '@core/services/errorReporter';
import type { ISystemSettingsRepository } from '../repository/SystemSettingsRepository';

const ONBOARDING_KEY = '@chiritsumo_onboarding_completed';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  checkOnboardingStatus: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>; // デバッグ用
}

/**
 * オンボーディング状態管理 Store Factory
 * 
 * ⚠️ DI/Singleton競合解消:
 * - 旧実装: export const useOnboardingStore = ... でシングルトンエクスポート
 * - 新実装: factory関数のみエクスポート、ServicesProvider経由で注入
 * 
 * レビュー指摘: "ZustandのStoreは「作成関数（Creator）」のみをエクスポートし、
 * コンポーネント内では必ず `useServices()` フック経由でStoreインスタンスにアクセスするルールを徹底"
 * → factory関数に統一しました
 */
export function createOnboardingStore(settingsRepo: ISystemSettingsRepository) {
  return create<OnboardingState>((set) => ({
    hasCompletedOnboarding: false,
    isLoading: true,

    checkOnboardingStatus: async () => {
      console.log('[OnboardingStore] Starting check...');
      try {
        const value = await settingsRepo.get(ONBOARDING_KEY);
        console.log('[OnboardingStore] Got value:', value);
        set({ 
          hasCompletedOnboarding: value === 'true',
          isLoading: false 
        });
        console.log('[OnboardingStore] State updated');
      } catch (error) {
        reportError(error, { context: 'onboarding:load' });
        set({ 
          hasCompletedOnboarding: false,
          isLoading: false 
        });
      }
    },

    completeOnboarding: async () => {
      try {
        await settingsRepo.set(ONBOARDING_KEY, 'true');
        set({ hasCompletedOnboarding: true });
      } catch (error) {
        reportError(error, { context: 'onboarding:save' });
      }
    },

    resetOnboarding: async () => {
      try {
        await settingsRepo.delete(ONBOARDING_KEY);
        set({ hasCompletedOnboarding: false });
        console.log('Onboarding reset for testing');
      } catch (error) {
        reportError(error, { context: 'onboarding:reset' });
      }
    },
  }));
}

// ❌ シングルトンエクスポート削除（DI統一のため）
// export const useOnboardingStore = createOnboardingStore(defaultSettingsRepo);
