import { ledger } from '../database/schema';
import type { Ledger as RawLedger } from '../database/schema';
import type { LedgerEntry } from '../types';
import { eq, desc, asc } from 'drizzle-orm';
import { getDrizzleDb } from '../database/drizzleClient';

export interface ILedgerRepository {
  findAll(): Promise<LedgerEntry[]>;
  findRecent(limit: number): Promise<LedgerEntry[]>;
  upsert(entry: Omit<LedgerEntry,'id'>): Promise<void>;
  add(entry: Omit<LedgerEntry,'id'>): Promise<void>;
  bulkAdd(entries: Omit<LedgerEntry,'id'>[]): Promise<void>; // Bulk add for backup restore
  deleteAll(): Promise<void>;
}

function mapRow(row: RawLedger): LedgerEntry {
  return {
    id: Number(row.id), // TODO: schema id型再検討
    date: row.date,
    earnedLex: row.earned_lex,
    targetLex: row.target_lex,
    balance: row.balance,
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
        }).run();
      }
    });
  }
  
  async deleteAll(): Promise<void> {
    const db = await this.db();
    await db.delete(ledger).run();
  }
}
