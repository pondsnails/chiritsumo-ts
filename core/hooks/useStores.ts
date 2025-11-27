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
  
  const bookStore = useMemo(() => createBookStore(bookRepo)(), [bookRepo]);
  const cardStore = useMemo(() => createCardStore(cardRepo)(), [cardRepo]);
  
  return { bookStore, cardStore };
}
