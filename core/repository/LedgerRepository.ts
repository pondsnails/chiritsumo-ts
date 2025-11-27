import { ledger } from '../database/schema';
import type { Ledger as RawLedger } from '../database/schema';
import type { LedgerEntry } from '../types';
import { eq, desc, asc } from 'drizzle-orm';
import { drizzleDb } from '../database/drizzleClient';

export interface ILedgerRepo {
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

export class DrizzleLedgerRepository implements ILedgerRepo {
  private db = drizzleDb;

  async findAll(): Promise<LedgerEntry[]> {
    const rows = await this.db.select().from(ledger).orderBy(asc(ledger.date)).all();
    return rows.map(r => mapRow(r as RawLedger));
  }
  async findRecent(limit: number): Promise<LedgerEntry[]> {
    const rows = await this.db.select().from(ledger).orderBy(desc(ledger.date)).limit(limit).all();
    return rows.map(r => mapRow(r as RawLedger));
  }
  async upsert(entry: Omit<LedgerEntry,'id'>): Promise<void> {
    const existing = await this.db.select().from(ledger).where(eq(ledger.date, entry.date)).all();
    if (existing.length) {
      await this.db.update(ledger).set({
        earned_lex: entry.earnedLex,
        target_lex: entry.targetLex,
        balance: entry.balance,
        transaction_type: 'daily',
        note: null,
      }).where(eq(ledger.date, entry.date)).run();
    } else {
      await this.db.insert(ledger).values({
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
    const existing = await this.db.select().from(ledger).where(eq(ledger.date, entry.date)).all();
    if (existing.length) return; // ignore duplicate
    await this.db.insert(ledger).values({
      date: entry.date,
      earned_lex: entry.earnedLex,
      target_lex: entry.targetLex,
      balance: entry.balance,
      transaction_type: 'daily',
      note: null,
    }).run();
  }
  
  async bulkAdd(entries: Omit<LedgerEntry,'id'>[]): Promise<void> {
    for (const entry of entries) {
      await this.add(entry); // Reuse add logic to avoid duplicates
    }
  }
  
  async deleteAll(): Promise<void> {
    await this.db.delete(ledger).run();
  }
}
