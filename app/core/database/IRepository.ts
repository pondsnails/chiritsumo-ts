/**
 * Database Repository Interfaces
 * Web版(IndexedDB)とNative版(SQLite)の実装を抽象化
 */

import type { Book, Card, LedgerEntry, InventoryPreset } from '../types';

/**
 * Books Repository Interface
 */
export interface IBooksRepository {
  getAll(): Promise<Book[]>;
  getById(id: string): Promise<Book | null>;
  add(book: Book): Promise<void>;
  update(id: string, updates: Partial<Book>): Promise<void>;
  delete(id: string): Promise<void>;
}

/**
 * Cards Repository Interface
 */
export interface ICardsRepository {
  getAll(): Promise<Card[]>;
  getByBookId(bookId: string): Promise<Card[]>;
  getByState(state: number): Promise<Card[]>;
  getDueCards(bookIds: string[]): Promise<Card[]>;
  getNewCards(limit: number): Promise<Card[]>; // state=0の新規カードを優先度順に取得
  getSellableCards(): Promise<Card[]>; // state > 0
  upsert(card: Card): Promise<void>;
  bulkUpsert(cards: Card[]): Promise<void>;
  update(id: string, updates: Partial<Card>): Promise<void>;
}

/**
 * Ledger Repository Interface
 */
export interface ILedgerRepository {
  getAll(): Promise<LedgerEntry[]>;
  getRecent(limit: number): Promise<LedgerEntry[]>;
  add(entry: LedgerEntry): Promise<void>;
  upsert(entry: Omit<LedgerEntry, 'id' | 'userId' | 'createdAt'>): Promise<void>;
}

/**
 * Inventory Presets Repository Interface
 */
export interface IPresetsRepository {
  getAll(): Promise<InventoryPreset[]>;
  add(preset: Omit<InventoryPreset, 'id'>): Promise<void>;
  update(id: number, updates: Partial<InventoryPreset>): Promise<void>;
  delete(id: number): Promise<void>;
}

/**
 * Database Manager Interface
 * すべてのRepositoryを統合
 */
export interface IDatabaseManager {
  books: IBooksRepository;
  cards: ICardsRepository;
  ledger: ILedgerRepository;
  presets: IPresetsRepository;
  initialize(): Promise<void>;
}
