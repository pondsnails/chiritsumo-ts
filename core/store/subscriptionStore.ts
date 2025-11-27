import { create } from 'zustand';
import { reportError } from '@core/services/errorReporter';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { Platform } from 'react-native';

// 開発モード設定
const __DEV__ = process.env.NODE_ENV === 'development';
const DEV_FORCE_PRO = false; // 開発時にPro版として動作させる場合はtrueに

interface SubscriptionState {
  isProUser: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;
  isLoading: boolean;
  
  // 開発用
  devToggleProStatus: () => void; // 開発時のPro/Free切り替え
  
  // Actions
  initializePurchases: () => Promise<void>;
  checkSubscriptionStatus: () => Promise<boolean>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
}

// RevenueCat API Keys (本番環境では環境変数から読み込むこと)
const REVENUECAT_API_KEY_IOS = 'YOUR_IOS_API_KEY';
const REVENUECAT_API_KEY_ANDROID = 'YOUR_ANDROID_API_KEY';

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  isProUser: __DEV__ && DEV_FORCE_PRO, // 開発時はDEV_FORCE_PROに従う
  customerInfo: null,
  offerings: null,
  isLoading: false,

  // 開発用: Pro/Free切り替え
  devToggleProStatus: () => {
    if (!__DEV__) {
      console.warn('devToggleProStatus is only available in development mode');
      return;
    }
    const currentStatus = get().isProUser;
    set({ 
      isProUser: !currentStatus 
    });
    console.log(`[DEV] Pro status toggled: ${currentStatus ? 'PRO → FREE' : 'FREE → PRO'}`);
  },

  initializePurchases: async () => {
    try {
      set({ isLoading: true });
      
      const apiKey = Platform.OS === 'ios' 
        ? REVENUECAT_API_KEY_IOS 
        : REVENUECAT_API_KEY_ANDROID;

      if (apiKey.startsWith('YOUR_')) {
        console.warn('RevenueCat API key not configured');
        set({ isLoading: false });
        return;
      }

      Purchases.configure({ apiKey });

      // 現在のサブスクリプション状態を確認
      await get().checkSubscriptionStatus();

      // Offerings（課金プラン）を取得
      const offerings = await Purchases.getOfferings();
      set({ offerings: offerings.current });

    } catch (error) {
      reportError(error, { context: 'subscription:init' });
    } finally {
      set({ isLoading: false });
    }
  },

  checkSubscriptionStatus: async () => {
    try {
      // 開発モードでDEV_FORCE_PROが有効な場合は常にProとして扱う
      if (__DEV__ && DEV_FORCE_PRO) {
        set({ isProUser: true });
        console.log('[DEV] Force Pro mode enabled');
        return true;
      }

      const customerInfo = await Purchases.getCustomerInfo();
      const isProUser = 
        customerInfo.entitlements.active['pro'] !== undefined ||
        customerInfo.entitlements.active['premium'] !== undefined;

      set({ customerInfo, isProUser });
      
      return isProUser;
    } catch (error) {
      reportError(error, { context: 'subscription:checkStatus' });
      // 開発モードの場合は現在の状態を維持
      if (__DEV__) {
        return get().isProUser;
      }
      return false;
    }
  },

  purchasePackage: async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      set({ isLoading: true });
      
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isProUser = 
        customerInfo.entitlements.active['pro'] !== undefined ||
        customerInfo.entitlements.active['premium'] !== undefined;

      set({ customerInfo, isProUser });
      
      return isProUser;
    } catch (error: any) {
      if (error.userCancelled) {
        console.log('User cancelled purchase');
      } else {
        reportError(error, { context: 'subscription:purchase' });
      }
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  restorePurchases: async (): Promise<boolean> => {
    try {
      set({ isLoading: true });
      
      const customerInfo = await Purchases.restorePurchases();
      const isProUser = 
        customerInfo.entitlements.active['pro'] !== undefined ||
        customerInfo.entitlements.active['premium'] !== undefined;

      set({ customerInfo, isProUser });
      
      return isProUser;
    } catch (error) {
      reportError(error, { context: 'subscription:restore' });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
}));

/**
 * Free Planの制限チェック
 */
export const canAddBook = (currentBookCount: number, isProUser: boolean): boolean => {
  if (isProUser) return true;
  return currentBookCount < 3;
};

/**
 * 借金リセット時のストリーク保持判定
 */
export const canKeepStreak = (isProUser: boolean): boolean => {
  return isProUser;
};
