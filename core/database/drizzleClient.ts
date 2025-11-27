/**
 * Drizzle Client Factory (Expo SQLite)
 * Migration Phase: introduces type-safe query builder alongside legacy adapters.
 */
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

let _db: ExpoSQLiteDatabase | null = null;

export function getDrizzleDb(): ExpoSQLiteDatabase {
  if (_db) return _db;
  // Reuse same physical database file used by legacy adapter
  const sqlite = SQLite.openDatabaseSync('chiritsumo.db');
  _db = drizzle(sqlite);
  return _db;
}

// Convenience for future injection
export const drizzleDb = getDrizzleDb();
