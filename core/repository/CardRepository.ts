import { cards } from '../database/schema';
import type { Card as RawCard } from '../database/schema';
import type { Card } from '../types';

export interface ICardRepository {
  findAll(): Promise<Card[]>;
  findByBook(bookId: string): Promise<Card[]>;
  findDue(bookIds: string[], now: Date): Promise<Card[]>;
  findNew(limit: number): Promise<Card[]>;
  create(card: Card): Promise<void>;
  bulkCreate(cards: Card[]): Promise<void>;
  update(id: string, updates: Partial<Card>): Promise<void>;
  deleteByBook(bookId: string): Promise<void>;
  deleteAll(): Promise<void>;
}

function mapRow(row: RawCard): Card {
  return {
    id: row.id,
    bookId: row.book_id,
    unitIndex: row.unit_index,
    state: row.state as 0 | 1 | 2 | 3,
    stability: row.stability,
    difficulty: row.difficulty,
    due: new Date(row.due),
    lastReview: row.last_review ? new Date(row.last_review) : null,
    reps: row.reps,
    photoPath: row.photo_path ?? null,
  };
}

export class DrizzleCardRepository implements ICardRepository {
  async findAll(): Promise<Card[]> { return []; }
  async findByBook(bookId: string): Promise<Card[]> { return []; }
  async findDue(bookIds: string[], now: Date): Promise<Card[]> { return []; }
  async findNew(limit: number): Promise<Card[]> { return []; }
  async create(card: Card): Promise<void> {}
  async bulkCreate(cards: Card[]): Promise<void> {}
  async update(id: string, updates: Partial<Card>): Promise<void> {}
  async deleteByBook(bookId: string): Promise<void> {}
  async deleteAll(): Promise<void> {}
}
