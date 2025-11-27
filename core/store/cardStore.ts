import { create } from 'zustand';
import { reportError } from '@core/services/errorReporter';
import type { ICardRepository } from '../repository/CardRepository';
import { processCardReview, processBulkCardReviews } from '../services/StudyTransactionService';
import type { Card } from '../types';

interface CardState {
  isLoading: boolean;
  error: string | null;
  fetchDueCards: (repo: ICardRepository, bookIds: string[]) => Promise<Card[]>;
  updateCardReview: (repo: ICardRepository, cardId: string, bookId: string, rating: 1 | 2 | 3 | 4, mode: 0 | 1 | 2) => Promise<void>;
  bulkUpdateCardReviews: (cards: Card[], ratings: (1 | 2 | 3 | 4)[], mode: 0 | 1 | 2) => Promise<void>;
  resetAllCards: (repo: ICardRepository) => Promise<void>;
}

/**
 * Zustand Singleton Store (Repository を関数引数で受け取るパターン)
 */
export const useCardStore = create<CardState>((set) => ({
  isLoading: false,
  error: null,

  fetchDueCards: async (repo: ICardRepository, bookIds: string[]) => {
    try {
      const dueCards = await repo.findDue(bookIds, new Date());
      return dueCards;
    } catch (error) {
      reportError(error, { context: 'cardStore:fetchDue' });
      return [];
    }
  },

  updateCardReview: async (repo: ICardRepository, cardId: string, bookId: string, rating: 1 | 2 | 3 | 4, mode: 0 | 1 | 2) => {
    try {
      const cards = await repo.findByBook(bookId);
      const card = cards.find((c) => c.id === cardId);
      if (!card) throw new Error('Card not found');

      // トランザクション内でCard更新とLedger更新をアトミックに実行
      await processCardReview(card, rating, mode);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update card';
      set({ error: message });
      throw error;
    }
  },

  bulkUpdateCardReviews: async (cards: Card[], ratings: (1 | 2 | 3 | 4)[], mode: 0 | 1 | 2) => {
    try {
      // トランザクション内で全カード更新と合算Lex加算をアトミックに実行
      await processBulkCardReviews(cards, ratings, mode);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to bulk update cards';
      set({ error: message });
      throw error;
    }
  },

  resetAllCards: async (repo: ICardRepository) => {
    try {
      set({ isLoading: true });
      await repo.resetAll();
      set({ isLoading: false });
    } catch (error) {
      reportError(error, { context: 'cardStore:reset' });
      set({ error: 'Failed to reset cards', isLoading: false });
      throw error;
    }
  },
}));
