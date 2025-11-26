import { create } from 'zustand';
import { localDB } from '../database/localStorage';
import { calculateNextInterval } from '../fsrs/scheduler';
import { calculateLexPerCard } from '../logic/lexCalculator';
import type { Card } from '../types';

interface CardState {
  cards: Card[];
  isLoading: boolean;
  error: string | null;
  fetchDueCards: (bookIds: string[]) => Promise<Card[]>;
  updateCardReview: (
    cardId: string,
    bookId: string,
    rating: 1 | 3,
    mode: 0 | 1 | 2
  ) => Promise<void>;
}

export const useCardStore = create<CardState>((set) => ({
  cards: [],
  isLoading: false,
  error: null,

  fetchDueCards: async (bookIds: string[]) => {
    try {
      const dueCards = await localDB.cards.getDue(bookIds);
      return dueCards;
    } catch (error) {
      console.error('Failed to fetch due cards:', error);
      return [];
    }
  },

  updateCardReview: async (
    cardId: string,
    bookId: string,
    rating: 1 | 3,
    mode: 0 | 1 | 2
  ) => {
    try {
      const cards = await localDB.cards.getAll();
      const card = cards.find(c => c.id === cardId);
      if (!card) throw new Error('Card not found');

      const now = new Date();
      const lastReview = card.lastReview ? new Date(card.lastReview) : now;
      const daysElapsed = Math.max(1, Math.floor((now.getTime() - lastReview.getTime()) / (24 * 60 * 60 * 1000)));

      const result = calculateNextInterval({
        currentStability: card.stability,
        currentDifficulty: card.difficulty,
        currentState: card.state,
        rating,
        daysElapsed,
        requestRetention: 0.9,
      });

      await localDB.cards.update(cardId, {
        state: result.nextState,
        stability: result.nextStability,
        difficulty: result.nextDifficulty,
        due: result.nextDue,
        lastReview: now.toISOString(),
        reps: card.reps + 1,
      });

      const lexEarned = calculateLexPerCard(mode);
      const ledger = await localDB.ledger.getAll();
      const today = ledger.find(e => e.date.startsWith(new Date().toISOString().split('T')[0]));
      const currentEarned = today?.earnedLex || 0;
      const currentTarget = today?.targetLex || 100;

      await localDB.ledger.updateToday(currentEarned + lexEarned, currentTarget);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update card';
      set({ error: message });
      throw error;
    }
  },
}));
