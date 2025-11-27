import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { DrizzleCardRepository } from '@core/repository/CardRepository';
import { DrizzleBookRepository } from '@core/repository/BookRepository';
import { DrizzleInventoryPresetRepository } from '@core/repository/InventoryPresetRepository';
import { DrizzleLedgerRepository } from '@core/repository/LedgerRepository';
import { DrizzleSystemSettingsRepository } from '@core/repository/SystemSettingsRepository';
import { QuestService } from '@core/services/QuestService';
import { LearningSessionService } from '@core/services/LearningSessionService';
import { createBookStore } from '@core/store/createBookStore';
import { createCardStore } from '@core/store/createCardStore';
import type { StoreApi, UseBoundStore } from 'zustand';

interface BookState {
  books: any[];
  isLoading: boolean;
  error: string | null;
  fetchBooks: () => Promise<void>;
  addBook: (book: any) => Promise<void>;
  updateBook: (id: string, updates: Partial<any>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  resetStore: () => void;
}

interface CardState {
  isLoading: boolean;
  error: string | null;
  fetchDueCards: (bookIds: string[]) => Promise<any[]>;
  updateCardReview: (cardId: string, bookId: string, rating: 1 | 2 | 3 | 4, mode: 0 | 1 | 2) => Promise<void>;
  bulkUpdateCardReviews: (cards: any[], ratings: (1 | 2 | 3 | 4)[], mode: 0 | 1 | 2) => Promise<void>;
  resetAllCards: () => Promise<void>;
}

interface ServicesContextValue {
  // Legacy repositories (段階的移行のため残す)
  cardRepo: DrizzleCardRepository;
  bookRepo: DrizzleBookRepository;
  presetRepo: DrizzleInventoryPresetRepository;
  ledgerRepo: DrizzleLedgerRepository;
  settingsRepo: DrizzleSystemSettingsRepository;
  // Services
  questService: QuestService;
  learningSessionService: LearningSessionService;
  // Zustand Stores with DI (NEW)
  useBookStore: UseBoundStore<StoreApi<BookState>>;
  useCardStore: UseBoundStore<StoreApi<CardState>>;
}

const ServicesContext = createContext<ServicesContextValue | null>(null);

export const ServicesProvider = ({ children }: { children: ReactNode }) => {
  const value = useMemo(() => {
    const cardRepo = new DrizzleCardRepository();
    const bookRepo = new DrizzleBookRepository();
    const presetRepo = new DrizzleInventoryPresetRepository();
    const ledgerRepo = new DrizzleLedgerRepository();
    const settingsRepo = new DrizzleSystemSettingsRepository();
    const questService = new QuestService(cardRepo, bookRepo, presetRepo);
    const learningSessionService = new LearningSessionService(cardRepo, bookRepo);
    
    // Store作成時にRepositoryを注入（DI）
    const useBookStore = createBookStore(bookRepo);
    const useCardStore = createCardStore(cardRepo);
    
    return {
      cardRepo,
      bookRepo,
      presetRepo,
      ledgerRepo,
      settingsRepo,
      questService,
      learningSessionService,
      useBookStore,
      useCardStore,
    };
  }, []);
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
};

export const useServices = (): ServicesContextValue => {
  const ctx = useContext(ServicesContext);
  if (!ctx) {
    throw new Error('useServices must be used within ServicesProvider');
  }
  return ctx;
};
