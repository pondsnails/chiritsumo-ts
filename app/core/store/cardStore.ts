import { create } from 'zustand';
import { cardsDB, ledgerDB } from '../database/db';
import { createScheduler } from '../fsrs/scheduler';
import { calculateLexForCard } from '../logic/lexCalculator';
import type { Card } from '../types';

interface CardState {
  cards: Card[];
  isLoading: boolean;
  error: string | null;
  fetchDueCards: (bookIds: string[]) => Promise<Card[]>;
  updateCardReview: (cardId: string, bookId: string, rating: 1 | 2 | 3 | 4, mode: 0 | 1 | 2) => Promise<void>;
  bulkUpdateCardReviews: (cards: Card[], ratings: (1 | 2 | 3 | 4)[], mode: 0 | 1 | 2) => Promise<void>;
}

export const useCardStore = create<CardState>((set) => ({
  cards: [],
  isLoading: false,
  error: null,

  fetchDueCards: async (bookIds: string[]) => {
    try {
      const dueCards = await cardsDB.getDueCards(bookIds);
      return dueCards;
    } catch (error) {
      console.error('Failed to fetch due cards:', error);
      return [];
    }
  },

  updateCardReview: async (cardId: string, bookId: string, rating: 1 | 2 | 3 | 4, mode: 0 | 1 | 2) => {
    try {
      const cards = await cardsDB.getByBookId(bookId);
      const card = cards.find((c) => c.id === cardId);
      if (!card) throw new Error('Card not found');

      const scheduler = createScheduler(mode);
      const updatedCard = scheduler.review(card, rating);

      await cardsDB.upsert(updatedCard);

      if (rating === 3 || rating === 4) {
        const lexEarned = calculateLexForCard(mode, updatedCard);
        const ledgerEntries = await ledgerDB.getRecent(1);
        const today = ledgerEntries.length > 0 ? ledgerEntries[0] : null;
        const currentEarned = today?.earnedLex || 0;
        const currentTarget = today?.targetLex || 100;
        const currentBalance = today?.balance || 0;

        const todayDate = new Date().toISOString().split('T')[0];
        await ledgerDB.upsert({
          date: todayDate,
          earnedLex: currentEarned + lexEarned,
          targetLex: currentTarget,
          balance: currentBalance + lexEarned,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update card';
      set({ error: message });
      throw error;
    }
  },

  bulkUpdateCardReviews: async (cards: Card[], ratings: (1 | 2 | 3 | 4)[], mode: 0 | 1 | 2) => {
    try {
      const scheduler = createScheduler(mode);
      const updatedCards = scheduler.bulkReview(cards, ratings);

      await cardsDB.bulkUpsert(updatedCards);

      // 成功した復習のLexを個別に計算して合算
      const lexEarned = updatedCards.reduce((total, card, index) => {
        if (ratings[index] === 3 || ratings[index] === 4) {
          return total + calculateLexForCard(mode, card);
        }
        return total;
      }, 0);

      if (lexEarned > 0) {
        const ledgerEntries = await ledgerDB.getRecent(1);
        const today = ledgerEntries.length > 0 ? ledgerEntries[0] : null;
        const currentEarned = today?.earnedLex || 0;
        const currentTarget = today?.targetLex || 100;
        const currentBalance = today?.balance || 0;

        const todayDate = new Date().toISOString().split('T')[0];
        await ledgerDB.upsert({
          date: todayDate,
          earnedLex: currentEarned + lexEarned,
          targetLex: currentTarget,
          balance: currentBalance + lexEarned,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to bulk update cards';
      set({ error: message });
      throw error;
    }
  },
}));
