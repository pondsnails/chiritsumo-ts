import { cards, books } from '../database/schema';
import type { Card as RawCard } from '../database/schema';
import type { Card } from '../types';
import { and, asc, eq, inArray, lte, sql } from 'drizzle-orm';
import { getDrizzleDb } from '../database/drizzleClient';

export interface ICardRepository {
  findAll(): Promise<Card[]>;
  findByBook(bookId: string): Promise<Card[]>;
  findDue(bookIds: string[], now: Date): Promise<Card[]>;
  findNew(bookIds: string[]): Promise<Card[]>;
  create(card: Card): Promise<void>;
  bulkCreate(cards: Card[]): Promise<void>;
  bulkUpsert(cards: Card[]): Promise<void>; // Upsert multiple cards
  update(id: string, updates: Partial<Card>): Promise<void>;
  deleteByBook(bookId: string): Promise<void>;
  deleteAll(): Promise<void>;
  resetAll(): Promise<void>; // Reset all cards to New state
  getCardCountsByBookMode(): Promise<{ mode: 0 | 1 | 2; count: number }[]>;
}

function mapRow(row: RawCard): Card {
  return {
    id: row.id,
    bookId: row.book_id,
    unitIndex: row.unit_index,
    state: row.state as 0 | 1 | 2 | 3,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsedDays: row.elapsed_days,
    scheduledDays: row.scheduled_days,
    reps: row.reps,
    lapses: row.lapses,
    due: new Date(row.due),
    lastReview: row.last_review ? new Date(row.last_review) : null,
    photoPath: row.photo_path ?? null,
  };
}

export class DrizzleCardRepository implements ICardRepository {
  private get db() {
    return getDrizzleDb();
  }

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

  async findNew(bookIds: string[]): Promise<Card[]> {
    const rows = await this.db
      .select()
      .from(cards)
      .where(and(eq(cards.state, 0), inArray(cards.book_id, bookIds)))
      .orderBy(asc(cards.book_id), asc(cards.unit_index))
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
      elapsed_days: card.elapsedDays,
      scheduled_days: card.scheduledDays,
      reps: card.reps,
      lapses: card.lapses,
      due: card.due.toISOString(),
      last_review: card.lastReview ? card.lastReview.toISOString() : null,
      photo_path: card.photoPath ?? null,
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
      elapsed_days: c.elapsedDays,
      scheduled_days: c.scheduledDays,
      reps: c.reps,
      lapses: c.lapses,
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
    if (updates.elapsedDays !== undefined) patch.elapsed_days = updates.elapsedDays;
    if (updates.scheduledDays !== undefined) patch.scheduled_days = updates.scheduledDays;
    if (updates.reps !== undefined) patch.reps = updates.reps;
    if (updates.lapses !== undefined) patch.lapses = updates.lapses;
    if (updates.due !== undefined) patch.due = updates.due.toISOString();
    if (updates.lastReview !== undefined) patch.last_review = updates.lastReview ? updates.lastReview.toISOString() : null;
    if (updates.photoPath !== undefined) patch.photo_path = updates.photoPath;
    if (Object.keys(patch).length === 0) return;
    await this.db.update(cards).set(patch).where(eq(cards.id, id)).run();
  }

  async bulkUpsert(cardList: Card[]): Promise<void> {
    if (cardList.length === 0) return;
    
    // トランザクションでラップして真のBulk処理を実現
    await this.db.transaction(async (tx) => {
      for (const card of cardList) {
        await tx.insert(cards).values({
          id: card.id,
          book_id: card.bookId,
          unit_index: card.unitIndex,
          due: card.due.toISOString(),
          stability: card.stability,
          difficulty: card.difficulty,
          elapsed_days: card.elapsedDays,
          scheduled_days: card.scheduledDays,
          reps: card.reps,
          lapses: card.lapses,
          state: card.state,
          last_review: card.lastReview ? card.lastReview.toISOString() : null,
          photo_path: card.photoPath ?? null,
        }).onConflictDoUpdate({
          target: cards.id,
          set: {
            book_id: card.bookId,
            unit_index: card.unitIndex,
            due: card.due.toISOString(),
            stability: card.stability,
            difficulty: card.difficulty,
            elapsed_days: card.elapsedDays,
            scheduled_days: card.scheduledDays,
            reps: card.reps,
            lapses: card.lapses,
            state: card.state,
            last_review: card.lastReview ? card.lastReview.toISOString() : null,
            photo_path: card.photoPath ?? null,
          }
        }).run();
      }
    });
  }

  async deleteByBook(bookId: string): Promise<void> {
    await this.db.delete(cards).where(eq(cards.book_id, bookId)).run();
  }

  async deleteAll(): Promise<void> {
    await this.db.delete(cards).run();
  }

  async resetAll(): Promise<void> {
    // すべてのカードを新規状態にリセット
    await this.db.update(cards).set({
      state: 0,
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      due: new Date().toISOString(),
      last_review: null,
    }).run();
  }

  async getCardCountsByBookMode(): Promise<{ mode: 0 | 1 | 2; count: number }[]> {
    const result = await this.db
      .select({
        mode: books.mode,
        count: sql<number>`count(${cards.id})`,
      })
      .from(cards)
      .innerJoin(books, eq(cards.book_id, books.id))
      .groupBy(books.mode);
    
    return result.map(r => ({
      mode: r.mode as 0 | 1 | 2,
      count: Number(r.count),
    }));
  }
}
