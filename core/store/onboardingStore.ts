import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@chiritsumo_onboarding_completed';

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
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
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
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      set({ hasCompletedOnboarding: true });
    } catch (error) {
      console.error('Failed to save onboarding status:', error);
    }
  },

  resetOnboarding: async () => {
    try {
      await AsyncStorage.removeItem(ONBOARDING_KEY);
      set({ hasCompletedOnboarding: false });
      console.log('Onboarding reset for testing');
    } catch (error) {
      console.error('Failed to reset onboarding:', error);
    }
  },
}));
