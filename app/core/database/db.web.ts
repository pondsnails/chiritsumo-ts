// Web版はIndexedDBベースの実装（Local First）
import type { Book, Card, LedgerEntry, InventoryPreset } from '../types';
import type { IBooksRepository, ICardsRepository, ILedgerRepository, IPresetsRepository } from './IRepository';
import {
  initIndexedDB,
  indexedBooksDB,
  indexedCardsDB,
  indexedLedgerDB,
  indexedPresetsDB,
  migrateFromLocalStorage,
} from './indexedDB';

let initialized = false;

export async function initializeDatabase() {
  if (initialized) return;

  console.log('Using IndexedDB for web platform (Local First)');
  
  await initIndexedDB();
  
  // Check if migration from localStorage is needed
  const hasLocalStorageData = localStorage.getItem('chiritsumo_books') !== null;
  if (hasLocalStorageData) {
    console.log('Migrating data from localStorage to IndexedDB...');
    await migrateFromLocalStorage();
    
    // Clear localStorage after successful migration
    localStorage.removeItem('chiritsumo_books');
    localStorage.removeItem('chiritsumo_cards');
    localStorage.removeItem('chiritsumo_ledger');
    localStorage.removeItem('chiritsumo_presets');
  }

  initialized = true;
}

// Repository implementations (型安全性を保証)
export const booksDB: IBooksRepository = indexedBooksDB;
export const cardsDB: ICardsRepository = indexedCardsDB;
export const ledgerDB: ILedgerRepository = indexedLedgerDB;
export const inventoryPresetsDB: IPresetsRepository = indexedPresetsDB;
