import { ledger } from '../database/schema';
import type { Ledger as RawLedger } from '../database/schema';
import type { LedgerEntry } from '../types';

export interface ILedgerRepo {
  findAll(): Promise<LedgerEntry[]>;
  findRecent(limit: number): Promise<LedgerEntry[]>;
  upsert(entry: Omit<LedgerEntry,'id'>): Promise<void>;
  add(entry: Omit<LedgerEntry,'id'>): Promise<void>;
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
  async findAll(): Promise<LedgerEntry[]> { return []; }
  async findRecent(limit: number): Promise<LedgerEntry[]> { return []; }
  async upsert(entry: Omit<LedgerEntry,'id'>): Promise<void> {}
  async add(entry: Omit<LedgerEntry,'id'>): Promise<void> {}
  async deleteAll(): Promise<void> {}
}
