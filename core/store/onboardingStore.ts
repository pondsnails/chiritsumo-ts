import { create } from 'zustand';
import { DrizzleSystemSettingsRepository, type ISystemSettingsRepository } from '../repository/SystemSettingsRepository';

const ONBOARDING_KEY = '@chiritsumo_onboarding_completed';

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  checkOnboardingStatus: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>; // デバッグ用
}

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
        console.error('[OnboardingStore] Error:', error);
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
        console.error('Failed to save onboarding status:', error);
      }
    },

    resetOnboarding: async () => {
      try {
        await settingsRepo.delete(ONBOARDING_KEY);
        set({ hasCompletedOnboarding: false });
        console.log('Onboarding reset for testing');
      } catch (error) {
        console.error('Failed to reset onboarding:', error);
      }
    },
  }));
}

const defaultSettingsRepo = new DrizzleSystemSettingsRepository();
export const useOnboardingStore = createOnboardingStore(defaultSettingsRepo);
