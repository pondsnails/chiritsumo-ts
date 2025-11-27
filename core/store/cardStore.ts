import { create } from 'zustand';
import { reportError } from '@core/services/errorReporter';
import type { ICardRepository } from '../repository/CardRepository';
import { processCardReview, processBulkCardReviews } from '../services/StudyTransactionService';
import type { Card } from '../types';

interface CardState {
  isLoading: boolean;
  error: string | null;
  fetchDueCards: (bookIds: string[]) => Promise<Card[]>;
  updateCardReview: (cardId: string, bookId: string, rating: 1 | 2 | 3 | 4, mode: 0 | 1 | 2) => Promise<void>;
  bulkUpdateCardReviews: (cards: Card[], ratings: (1 | 2 | 3 | 4)[], mode: 0 | 1 | 2) => Promise<void>;
  resetAllCards: () => Promise<void>;
}

export function createCardStore(cardRepo: ICardRepository) {
  return create<CardState>((set) => ({
    isLoading: false,
    error: null,

    fetchDueCards: async (bookIds: string[]) => {
      try {
        const dueCards = await cardRepo.findDue(bookIds, new Date());
        return dueCards;
      } catch (error) {
        reportError(error, { context: 'cardStore:fetchDue' });
        return [];
      }
    },

    updateCardReview: async (cardId: string, bookId: string, rating: 1 | 2 | 3 | 4, mode: 0 | 1 | 2) => {
      try {
        const cards = await cardRepo.findByBook(bookId);
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

    resetAllCards: async () => {
      try {
        set({ isLoading: true });
        await cardRepo.resetAll();
        set({ isLoading: false });
      } catch (error) {
        reportError(error, { context: 'cardStore:reset' });
        set({ error: 'Failed to reset cards', isLoading: false });
        throw error;
      }
    },
  }));
}

// Export factory for use with ServicesProvider
export { createCardStore };
