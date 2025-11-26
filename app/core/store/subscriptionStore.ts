import { create } from 'zustand';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { Platform } from 'react-native';

interface SubscriptionState {
  isProUser: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;
  isLoading: boolean;
  
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
  isProUser: false,
  customerInfo: null,
  offerings: null,
  isLoading: false,

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
      console.error('Failed to initialize purchases:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  checkSubscriptionStatus: async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const isProUser = 
        customerInfo.entitlements.active['pro'] !== undefined ||
        customerInfo.entitlements.active['premium'] !== undefined;

      set({ customerInfo, isProUser });
      
      return isProUser;
    } catch (error) {
      console.error('Failed to check subscription status:', error);
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
        console.error('Purchase failed:', error);
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
      console.error('Failed to restore purchases:', error);
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
