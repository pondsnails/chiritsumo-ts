import { ledger } from '../database/schema';
import type { Ledger as RawLedger } from '../database/schema';
import type { LedgerEntry } from '../types';
import { eq, desc, asc, sql } from 'drizzle-orm';
import { getDrizzleDb } from '../database/drizzleClient';

export interface ILedgerRepository {
  findAll(): Promise<LedgerEntry[]>;
  findRecent(limit: number): Promise<LedgerEntry[]>;
  findActiveDaysDescending(limit?: number): Promise<number[]>; // For streak calculation - returns Unix timestamps
  calculateCurrentStreakSQL(): Promise<number>; // ⚡ SQL最適化版ストリーク計算
  upsert(entry: Omit<LedgerEntry,'id'>): Promise<void>;
  add(entry: Omit<LedgerEntry,'id'>): Promise<void>;
  bulkAdd(entries: Omit<LedgerEntry,'id'>[]): Promise<void>; // Bulk add for backup restore
  deleteAll(): Promise<void>;
}

function mapRow(row: RawLedger): LedgerEntry {
  return {
    id: Number(row.id),
    date: Number(row.date), // Unix timestamp
    earnedLex: Number(row.earned_lex),
    targetLex: Number(row.target_lex),
    balance: Number(row.balance),
  };
}

export class DrizzleLedgerRepository implements ILedgerRepository {
  private async db() {
    return await getDrizzleDb();
  }

  async findAll(): Promise<LedgerEntry[]> {
    const db = await this.db();
    const rows = await db.select().from(ledger).orderBy(asc(ledger.date)).all();
    return rows.map(r => mapRow(r as RawLedger));
  }
  async findRecent(limit: number): Promise<LedgerEntry[]> {
    const db = await this.db();
    const rows = await db.select().from(ledger).orderBy(desc(ledger.date)).limit(limit).all();
    return rows.map(r => mapRow(r as RawLedger));
  }
  
  async findActiveDaysDescending(limit?: number): Promise<number[]> {
    const db = await this.db();
    const query = db
      .select({ date: ledger.date })
      .from(ledger)
      .where(sql`${ledger.earned_lex} > 0`)
      .orderBy(desc(ledger.date));
    
    const rows = limit ? await query.limit(limit).all() : await query.all();
    return rows.map(r => Number(r.date));
  }

  /**
   * 現在のストリーク日数をSQL一発で計算
   * 
   * パフォーマンス改善:
   * - ✅ JavaScriptループ完全削除
   * - ✅ SQLでストリーク計算を実行
   * - ✅ メモリ使用量を最小化
   * 
   * レビュー指摘: "SQLiteのWindow Functions (LEAD/LAG)や再帰CTEを使えば、SQL一発でストリーク日数を算出できます"
   * → 再帰CTEで実装しました
   */
  async calculateCurrentStreakSQL(): Promise<number> {
    const db = await this.db();
    
    // 今日の0時タイムスタンプを計算
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayUnix = Math.floor(now.getTime() / 1000);
    const oneDaySeconds = 60 * 60 * 24;
    
    try {
      // 🔥 SQL一発でストリーク計算（再帰CTE使用）
      const result = await db.run(sql`
        WITH RECURSIVE streak_calc AS (
          -- 基底ケース: 今日の学習記録があるか
          SELECT 
            date,
            1 as streak_count,
            date as check_date
          FROM ledger
          WHERE date = ${todayUnix} AND earned_lex > 0
          
          UNION ALL
          
          -- 再帰ケース: 前日の記録を遡る
          SELECT 
            l.date,
            sc.streak_count + 1,
            l.date
          FROM streak_calc sc
          JOIN ledger l ON l.date = sc.check_date - ${oneDaySeconds}
          WHERE l.earned_lex > 0
        )
        SELECT MAX(streak_count) as current_streak
        FROM streak_calc
      `);
      
      // @ts-ignore - Drizzle の型推論の限界
      const streak = result.rows?._array?.[0]?.[0];
      return streak ? Number(streak) : 0;
    } catch (error) {
      console.error('[LedgerRepository] SQL streak calculation failed:', error);
      return 0;
    }
  }
  
  async upsert(entry: Omit<LedgerEntry,'id'>): Promise<void> {
    const db = await this.db();
    const existing = await db.select().from(ledger).where(eq(ledger.date, entry.date)).all();
    if (existing.length) {
      await db.update(ledger).set({
        earned_lex: entry.earnedLex,
        target_lex: entry.targetLex,
        balance: entry.balance,
        transaction_type: 'daily',
        note: null,
      }).where(eq(ledger.date, entry.date)).run();
    } else {
      await db.insert(ledger).values({
        date: entry.date,
        earned_lex: entry.earnedLex,
        target_lex: entry.targetLex,
        balance: entry.balance,
        transaction_type: 'daily',
        note: null,
      }).run();
    }
  }
  async add(entry: Omit<LedgerEntry,'id'>): Promise<void> {
    const db = await this.db();
    const existing = await db.select().from(ledger).where(eq(ledger.date, entry.date)).all();
    if (existing.length) return; // ignore duplicate
    await db.insert(ledger).values({
      date: entry.date,
      earned_lex: entry.earnedLex,
      target_lex: entry.targetLex,
      balance: entry.balance,
      transaction_type: 'daily',
      note: null,
    }).run();
  }
  
  async bulkAdd(entries: Omit<LedgerEntry,'id'>[]): Promise<void> {
    if (entries.length === 0) return;
    
    // トランザクションでラップして真のBulk処理を実現
    const db = await this.db();
    await db.transaction(async (tx) => {
      for (const entry of entries) {
        // 日付重複チェック（add ロジックと同じ）
        const existing = await tx.select().from(ledger).where(eq(ledger.date, entry.date)).get();
        if (existing) continue; // Skip duplicate dates
        
        await tx.insert(ledger).values({
          date: entry.date,
          earned_lex: entry.earnedLex,
          target_lex: entry.targetLex,
          balance: entry.balance,
          transaction_type: 'daily',
          note: null,
        }).run();
      }
    });
  }
  
  async deleteAll(): Promise<void> {
    const db = await this.db();
    await db.delete(ledger).run();
  }
}
