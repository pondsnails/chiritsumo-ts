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

/**
 * CardStore Factory with Dependency Injection
 * 
 * Repository を Store 初期化時に注入し、Store 内部で保持する。
 */
export const createCardStore = (repository: ICardRepository) => {
  return create<CardState>((set) => ({
    isLoading: false,
    error: null,

    fetchDueCards: async (bookIds: string[]) => {
      try {
        const dueCards = await repository.findDue(bookIds, new Date());
        return dueCards;
      } catch (error) {
        reportError(error, { context: 'cardStore:fetchDue' });
        return [];
      }
    },

    updateCardReview: async (cardId: string, bookId: string, rating: 1 | 2 | 3 | 4, mode: 0 | 1 | 2) => {
      try {
        const cards = await repository.findByBook(bookId);
        const card = cards.find((c) => c.id === cardId);
        if (!card) throw new Error('Card not found');

        await processCardReview(card, rating, mode);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update card';
        set({ error: message });
        throw error;
      }
    },

    bulkUpdateCardReviews: async (cards: Card[], ratings: (1 | 2 | 3 | 4)[], mode: 0 | 1 | 2) => {
      try {
        await processBulkCardReviews(cards, ratings, mode);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to bulk update cards';
        set({ error: message });
        throw error;
      }
    },

    resetAllCards: async () => {
      try {
        set({ isLoading: true, error: null });
        await repository.resetAll();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to reset cards';
        set({ error: message });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },
  }));
};
