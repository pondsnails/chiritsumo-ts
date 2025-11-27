import { create } from 'zustand';
import { DrizzleSystemSettingsRepository } from '../repository/SystemSettingsRepository';

const ONBOARDING_KEY = '@chiritsumo_onboarding_completed';
const settingsRepo = new DrizzleSystemSettingsRepository();

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  checkOnboardingStatus: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>; // デバッグ用
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasCompletedOnboarding: false,
  isLoading: true,

  checkOnboardingStatus: async () => {
    try {
      const value = await settingsRepo.get(ONBOARDING_KEY);
      set({ 
        hasCompletedOnboarding: value === 'true',
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      set({ isLoading: false });
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
