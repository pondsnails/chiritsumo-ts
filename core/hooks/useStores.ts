import { useMemo } from 'react';
import { useServices } from '@core/di/ServicesProvider';
import { createBookStore } from '@core/store/bookStore';
import { createCardStore } from '@core/store/cardStore';

/**
 * DI-injected store hook
 * ServicesProvider context から repository インスタンスを取得し、
 * それを使って store インスタンスを生成
 */
export function useStores() {
  const { bookRepo, cardRepo } = useServices();
  
  // createBookStore(repo) returns the actual zustand hook, not a store instance
  const useBookStore = useMemo(() => createBookStore(bookRepo), [bookRepo]);
  const useCardStore = useMemo(() => createCardStore(cardRepo), [cardRepo]);
  
  return { useBookStore, useCardStore };
}
