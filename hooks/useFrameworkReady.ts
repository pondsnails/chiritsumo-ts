import { useEffect } from 'react';
import { Platform } from 'react-native';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export function useFrameworkReady() {
  useEffect(() => {
    // Web環境でのみ実行（React Nativeにはwindowオブジェクトがない）
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.frameworkReady?.();
    }
  }, []);
}
