import { fsrs, generatorParameters, Rating, State, Card as FSRSCard } from 'ts-fsrs';
import type { Card } from '../types';

const READ_RETENTION = 0.85;
const SOLVE_RETENTION = 0.9;
const MEMO_RETENTION = 0.8;

function getRetentionByMode(mode: 0 | 1 | 2): number {
  if (mode === 0) return READ_RETENTION;
  if (mode === 1) return SOLVE_RETENTION;
  return MEMO_RETENTION;
}

export class FSRSScheduler {
  private mode: 0 | 1 | 2;
  private scheduler: ReturnType<typeof fsrs>;

  constructor(mode: 0 | 1 | 2) {
    this.mode = mode;
    const params = generatorParameters({ request_retention: getRetentionByMode(mode) });
    this.scheduler = fsrs(params);
  }

  createNewCard(bookId: string, unitIndex: number): Card {
    const id = `${bookId}_${unitIndex}`;
    return {
      id,
      bookId,
      unitIndex,
      state: 0,
      stability: 0,
      difficulty: 0,
      due: new Date(),
      lastReview: null,
      reps: 0,
      photoPath: null,
    };
  }

  private toFSRSCard(card: Card): FSRSCard {
    return {
      due: card.due,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: card.reps,
      lapses: 0,
      state: card.state as State,
      last_review: card.lastReview || undefined,
    } as FSRSCard;
  }

  review(card: Card, rating: 1 | 2 | 3 | 4, reviewTime?: Date): Card {
    const fsrsCard = this.toFSRSCard(card);
    const now = reviewTime || new Date();

    const recordLog = this.scheduler.repeat(fsrsCard, now)[rating];

    return {
      ...card,
      state: recordLog.card.state as 0 | 1 | 2 | 3,
      stability: recordLog.card.stability,
      difficulty: recordLog.card.difficulty,
      due: recordLog.card.due,
      lastReview: now,
      reps: recordLog.card.reps,
    };
  }

  reviewAgain(card: Card, reviewTime?: Date): Card {
    return this.review(card, Rating.Again, reviewTime);
  }

  reviewHard(card: Card, reviewTime?: Date): Card {
    return this.review(card, Rating.Hard, reviewTime);
  }

  reviewGood(card: Card, reviewTime?: Date): Card {
    return this.review(card, Rating.Good, reviewTime);
  }

  reviewEasy(card: Card, reviewTime?: Date): Card {
    return this.review(card, Rating.Easy, reviewTime);
  }

  bulkReview(cards: Card[], ratings: (1 | 2 | 3 | 4)[], reviewTime?: Date): Card[] {
    if (cards.length !== ratings.length) {
      throw new Error('Cards and ratings arrays must have the same length');
    }

    return cards.map((card, index) => this.review(card, ratings[index], reviewTime));
  }
}

export function createScheduler(mode: 0 | 1 | 2): FSRSScheduler {
  return new FSRSScheduler(mode);
}

export function getDueCardsCount(cards: Card[]): number {
  const now = new Date();
  return cards.filter(card => card.due <= now).length;
}
