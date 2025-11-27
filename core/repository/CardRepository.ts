import { cards } from '../database/schema';
import type { Card as RawCard } from '../database/schema';
import type { Card } from '../types';
import { and, asc, eq, inArray, lte } from 'drizzle-orm';
import { drizzleDb } from '../database/drizzleClient';

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
  private db = drizzleDb;

  async findAll(): Promise<Card[]> {
    const rows = await this.db.select().from(cards).orderBy(asc(cards.book_id), asc(cards.unit_index)).all();
    return rows.map(r => mapRow(r as RawCard));
  }

  async findByBook(bookId: string): Promise<Card[]> {
    const rows = await this.db.select().from(cards).where(eq(cards.book_id, bookId)).orderBy(asc(cards.unit_index)).all();
    return rows.map(r => mapRow(r as RawCard));
  }

  async findDue(bookIds: string[], now: Date): Promise<Card[]> {
    if (bookIds.length === 0) return [];
    const nowIso = now.toISOString();
    const rows = await this.db
      .select()
      .from(cards)
      .where(and(inArray(cards.book_id, bookIds), lte(cards.due, nowIso)))
      .orderBy(asc(cards.due))
      .all();
    return rows.map(r => mapRow(r as RawCard));
  }

  async findNew(limit: number): Promise<Card[]> {
    const rows = await this.db
      .select()
      .from(cards)
      .where(eq(cards.state, 0))
      .orderBy(asc(cards.book_id), asc(cards.unit_index))
      .limit(limit)
      .all();
    return rows.map(r => mapRow(r as RawCard));
  }

  async create(card: Card): Promise<void> {
    await this.db.insert(cards).values({
      id: card.id,
      book_id: card.bookId,
      unit_index: card.unitIndex,
      state: card.state,
      stability: card.stability,
      difficulty: card.difficulty,
      reps: card.reps,
      due: card.due.toISOString(),
      last_review: card.lastReview ? card.lastReview.toISOString() : null,
      photo_path: card.photoPath ?? null,
      // elapsed_days, scheduled_days, lapses は現行ドメイン型に未統合のため未設定
    }).run();
  }

  async bulkCreate(batch: Card[]): Promise<void> {
    if (batch.length === 0) return;
    await this.db.insert(cards).values(batch.map(c => ({
      id: c.id,
      book_id: c.bookId,
      unit_index: c.unitIndex,
      state: c.state,
      stability: c.stability,
      difficulty: c.difficulty,
      reps: c.reps,
      due: c.due.toISOString(),
      last_review: c.lastReview ? c.lastReview.toISOString() : null,
      photo_path: c.photoPath ?? null,
    }))).run();
  }

  async update(id: string, updates: Partial<Card>): Promise<void> {
    const patch: Partial<RawCard> = {};
    if (updates.state !== undefined) patch.state = updates.state;
    if (updates.stability !== undefined) patch.stability = updates.stability;
    if (updates.difficulty !== undefined) patch.difficulty = updates.difficulty;
    if (updates.reps !== undefined) patch.reps = updates.reps;
    if (updates.due !== undefined) patch.due = updates.due.toISOString();
    if (updates.lastReview !== undefined) patch.last_review = updates.lastReview ? updates.lastReview.toISOString() : null;
    if (updates.photoPath !== undefined) patch.photo_path = updates.photoPath;
    if (Object.keys(patch).length === 0) return;
    await this.db.update(cards).set(patch).where(eq(cards.id, id)).run();
  }

  async deleteByBook(bookId: string): Promise<void> {
    await this.db.delete(cards).where(eq(cards.book_id, bookId)).run();
  }

  async deleteAll(): Promise<void> {
    await this.db.delete(cards).run();
  }
}
