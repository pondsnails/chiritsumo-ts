import { cards, books } from '../database/schema';
import type { Card as RawCard } from '../database/schema';
import type { Card } from '../types';
import { and, asc, eq, inArray, lte, sql } from 'drizzle-orm';
import { getDrizzleDb } from '../database/drizzleClient';

export interface ICardRepository {
  findAll(): Promise<Card[]>;
  findAllPaginated(options: { limit: number; offset: number }): Promise<Card[]>; // ページネーション対応
  findByBook(bookId: string): Promise<Card[]>;
  findPaginated(limit: number, offset: number, bookId?: string, state?: number): Promise<Card[]>;
  countCards(bookId?: string, state?: number): Promise<number>;
  countByBookAndState(bookId: string, state: number): Promise<number>; // QuestService用
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
  
  // Analytics aggregation methods
  getReviewCountByDate(startDate: string, endDate: string): Promise<{ date: string; count: number }[]>;
  getAverageRetentionStats(): Promise<{ avgRetention: number; totalReviewedCards: number }>;
  getRetentionByElapsedDays(maxDays: number): Promise<{ daysElapsed: number; avgRetention: number; cardCount: number }[]>;
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
    due: Number(row.due),
    lastReview: row.last_review ? Number(row.last_review) : null,
    createdAt: Number((row as any).created_at ?? 0),
    photoPath: row.photo_path ?? null,
  };
}

export class DrizzleCardRepository implements ICardRepository {
  private async db() {
    return await getDrizzleDb();
  }

  async findAll(): Promise<Card[]> {
    const db = await this.db();
    const rows = await db.select().from(cards).orderBy(asc(cards.book_id), asc(cards.unit_index)).all();
    return rows.map(r => mapRow(r as RawCard));
  }

  async findAllPaginated(options: { limit: number; offset: number }): Promise<Card[]> {
    const db = await this.db();
    const rows = await db
      .select()
      .from(cards)
      .orderBy(asc(cards.book_id), asc(cards.unit_index))
      .limit(options.limit)
      .offset(options.offset)
      .all();
    return rows.map(r => mapRow(r as RawCard));
  }

  async findByBook(bookId: string): Promise<Card[]> {
    const db = await this.db();
    const rows = await db.select().from(cards).where(eq(cards.book_id, bookId)).orderBy(asc(cards.unit_index)).all();
    return rows.map(r => mapRow(r as RawCard));
  }

  async findPaginated(limit: number, offset: number, bookId?: string, state?: number): Promise<Card[]> {
    const db = await this.db();
    const conditions = [];
    if (bookId) conditions.push(eq(cards.book_id, bookId));
    if (state !== undefined) conditions.push(eq(cards.state, state));
    
    const query = db.select().from(cards);
    if (conditions.length > 0) {
      query.where(and(...conditions));
    }
    
    const rows = await query
      .orderBy(asc(cards.book_id), asc(cards.unit_index))
      .limit(limit)
      .offset(offset)
      .all();
    
    return rows.map(r => mapRow(r as RawCard));
  }

  async countCards(bookId?: string, state?: number): Promise<number> {
    const db = await this.db();
    const conditions = [];
    if (bookId) conditions.push(eq(cards.book_id, bookId));
    if (state !== undefined) conditions.push(eq(cards.state, state));
    
    const query = db.select({ count: sql<number>`count(*)` }).from(cards);
    if (conditions.length > 0) {
      query.where(and(...conditions));
    }
    
    const result = await query.get();
    return result ? Number(result.count) : 0;
  }

  async countByBookAndState(bookId: string, state: number): Promise<number> {
    return await this.countCards(bookId, state);
  }

  /**
   * 期限切れカードを取得（完全SQL最適化版）
   * 
   * パフォーマンス改善:
   * - ✅ JavaScript ソート完全削除
   * - ✅ SQL で ORDER BY due ASC を実行
   * - ✅ LIMIT 1000 をSQLレベルで適用
   * - ✅ メモリ使用量を最小化
   * 
   * レビュー指摘: "SQLiteはソートが得意です。メモリ上で数千〜数万件のオブジェクトをソートするのは自殺行為"
   * → SQLに完全委譲しました
   */
  async findDue(bookIds: string[], now: Date): Promise<Card[]> {
    if (bookIds.length === 0) return [];
    const nowUnix = Math.floor(now.getTime() / 1000);
    const db = await this.db();
    
    // SQLite IN clause limit対策: 900個ずつチャンク分割
    const CHUNK_SIZE = 900;
    const MAX_DUE_CARDS = 1000; // OOM防止
    
    // ⚡ 完全SQL最適化: ORDER BY + LIMIT を各チャンクで実行
    const allRows: RawCard[] = [];
    
    for (let i = 0; i < bookIds.length; i += CHUNK_SIZE) {
      const chunk = bookIds.slice(i, i + CHUNK_SIZE);
      
      // 🔥 SQL が全てを処理: WHERE + ORDER BY + LIMIT
      const rows = await db
        .select()
        .from(cards)
        .where(and(inArray(cards.book_id, chunk), lte(cards.due, nowUnix)))
        .orderBy(asc(cards.due)) // ✅ SQLソート
        .limit(MAX_DUE_CARDS - allRows.length) // ✅ SQL LIMIT
        .all();
      
      allRows.push(...(rows as RawCard[]));
      
      // すでに上限に達したら以降のチャンクをスキップ
      if (allRows.length >= MAX_DUE_CARDS) break;
    }
    
    // JavaScript側では型変換のみ（ソート不要）
    return allRows.map(r => mapRow(r));
  }

  async findNew(bookIds: string[]): Promise<Card[]> {
    if (bookIds.length === 0) return [];
    const db = await this.db();
    
    // SQLite IN clause limit対策: 900個ずつチャンク分割
    const CHUNK_SIZE = 900;
    const allRows: RawCard[] = [];
    
    for (let i = 0; i < bookIds.length; i += CHUNK_SIZE) {
      const chunk = bookIds.slice(i, i + CHUNK_SIZE);
      const rows = await db
        .select()
        .from(cards)
        .where(and(eq(cards.state, 0), inArray(cards.book_id, chunk)))
        .orderBy(asc(cards.book_id), asc(cards.unit_index))
        .all();
      allRows.push(...(rows as RawCard[]));
    }
    
    return allRows
      .map(r => mapRow(r))
      .sort((a, b) => {
        if (a.bookId === b.bookId) return a.unitIndex - b.unitIndex;
        return a.bookId.localeCompare(b.bookId);
      });
  }

  async create(card: Card): Promise<void> {
    const db = await this.db();
    await db.insert(cards).values({
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
      due: card.due,
      last_review: card.lastReview ?? null,
      created_at: card.createdAt,
      photo_path: card.photoPath ?? null,
    }).run();
  }

  async bulkCreate(batch: Card[]): Promise<void> {
    if (batch.length === 0) return;
    const db = await this.db();
    await db.insert(cards).values(batch.map(c => ({
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
      due: c.due,
      last_review: c.lastReview ?? null,
      created_at: c.createdAt,
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
    if (updates.due !== undefined) (patch as any).due = updates.due;
    if (updates.lastReview !== undefined) (patch as any).last_review = updates.lastReview ?? null;
    if ((updates as any).createdAt !== undefined) (patch as any).created_at = (updates as any).createdAt;
    if (updates.photoPath !== undefined) patch.photo_path = updates.photoPath;
    if (Object.keys(patch).length === 0) return;
    const db = await this.db();
    await db.update(cards).set(patch).where(eq(cards.id, id)).run();
  }

  async bulkUpsert(cardList: Card[]): Promise<void> {
    if (cardList.length === 0) return;
    
    // トランザクションでラップして真のBulk処理を実現
    const db = await this.db();
    await db.transaction(async (tx) => {
      for (const card of cardList) {
        await tx.insert(cards).values({
          id: card.id,
          book_id: card.bookId,
          unit_index: card.unitIndex,
          due: card.due,
          stability: card.stability,
          difficulty: card.difficulty,
          elapsed_days: card.elapsedDays,
          scheduled_days: card.scheduledDays,
          reps: card.reps,
          lapses: card.lapses,
          state: card.state,
          last_review: card.lastReview,
          photo_path: card.photoPath ?? null,
        }).onConflictDoUpdate({
          target: cards.id,
          set: {
            book_id: card.bookId,
            unit_index: card.unitIndex,
            due: card.due,
            stability: card.stability,
            difficulty: card.difficulty,
            elapsed_days: card.elapsedDays,
            scheduled_days: card.scheduledDays,
            reps: card.reps,
            lapses: card.lapses,
            state: card.state,
            last_review: card.lastReview,
            photo_path: card.photoPath ?? null,
          }
        }).run();
      }
    });
  }

  async deleteByBook(bookId: string): Promise<void> {
    const db = await this.db();
    await db.delete(cards).where(eq(cards.book_id, bookId)).run();
  }

  async deleteAll(): Promise<void> {
    const db = await this.db();
    await db.delete(cards).run();
  }

  async resetAll(): Promise<void> {
    // すべてのカードを新規状態にリセット
    const db = await this.db();
    await db.update(cards).set({
      state: 0,
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      due: Math.floor(Date.now() / 1000),
      last_review: null,
    }).run();
  }

  async getCardCountsByBookMode(): Promise<{ mode: 0 | 1 | 2; count: number }[]> {
    const db = await this.db();
    const result = await db
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

  /**
   * 日付ごとの復習カード数を取得（ヒートマップ用）
   * last_reviewはUNIX Timestamp（秒）なので、unixepoch修飾子が必須
   */
  async getReviewCountByDate(startDate: string, endDate: string): Promise<{ date: string; count: number }[]> {
    const db = await this.db();
    const result = await db
      .select({
        date: sql<string>`DATE(${cards.last_review}, 'unixepoch')`,
        count: sql<number>`count(*)`,
      })
      .from(cards)
      .where(
        and(
          sql`${cards.last_review} IS NOT NULL`,
          sql`DATE(${cards.last_review}, 'unixepoch') >= ${startDate}`,
          sql`DATE(${cards.last_review}, 'unixepoch') <= ${endDate}`
        )
      )
      .groupBy(sql`DATE(${cards.last_review}, 'unixepoch')`)
      .all();
    
    return result.map(r => ({
      date: r.date,
      count: Number(r.count),
    }));
  }

  /**
   * 平均保持率統計を取得
   */
  async getAverageRetentionStats(): Promise<{ avgRetention: number; totalReviewedCards: number }> {
    const db = await this.db();
    
    // 復習済みカード（reps > 0）の統計を計算
    const result = await db
      .select({
        totalCards: sql<number>`count(*)`,
        // FSRS保持率推定: MIN(100, stability / (days_since_review + 1) * 100)
        avgRetention: sql<number>`
          AVG(
            MIN(100, 
              ${cards.stability} / 
              (CAST((julianday('now') - julianday(${cards.last_review})) AS INTEGER) + 1) * 100
            )
          )
        `,
      })
      .from(cards)
      .where(
        and(
          sql`${cards.reps} > 0`,
          sql`${cards.last_review} IS NOT NULL`
        )
      )
      .get();
    
    return {
      avgRetention: result ? Number(result.avgRetention || 0) : 0,
      totalReviewedCards: result ? Number(result.totalCards || 0) : 0,
    };
  }

  /**
   * 経過日数ごとの平均保持率を取得（忘却曲線用）
   */
  async getRetentionByElapsedDays(maxDays: number): Promise<{ daysElapsed: number; avgRetention: number; cardCount: number }[]> {
    const db = await this.db();
    
    const result = await db
      .select({
        daysElapsed: sql<number>`CAST((julianday('now') - julianday(${cards.last_review})) AS INTEGER)`,
        avgRetention: sql<number>`
          AVG(
            MIN(100, 
              ${cards.stability} / 
              (CAST((julianday('now') - julianday(${cards.last_review})) AS INTEGER) + 1) * 100
            )
          )
        `,
        cardCount: sql<number>`count(*)`,
      })
      .from(cards)
      .where(
        and(
          sql`${cards.reps} > 0`,
          sql`${cards.last_review} IS NOT NULL`,
          sql`CAST((julianday('now') - julianday(${cards.last_review})) AS INTEGER) <= ${maxDays}`
        )
      )
      .groupBy(sql`CAST((julianday('now') - julianday(${cards.last_review})) AS INTEGER)`)
      .orderBy(sql`CAST((julianday('now') - julianday(${cards.last_review})) AS INTEGER)`)
      .all();
    
    return result.map(r => ({
      daysElapsed: Number(r.daysElapsed),
      avgRetention: Number(r.avgRetention || 0),
      cardCount: Number(r.cardCount),
    }));
  }
}
