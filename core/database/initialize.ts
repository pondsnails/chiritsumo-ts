/**
 * Database initialization utility
 * 
 * @deprecated This file is deprecated. Database schema is now managed by drizzle-kit migrations.
 * The migration system automatically runs on first getDrizzleDb() call.
 * See: drizzle/migrations.ts and drizzleClient.ts
 */
import { getDrizzleDb } from './drizzleClient';

/**
 * @deprecated Use getDrizzleDb() instead. Migrations run automatically.
 */
export async function initializeDatabase(): Promise<void> {
  console.warn('[DEPRECATED] initializeDatabase is deprecated. Use getDrizzleDb() instead.');
  console.log('Initializing database via migration system...');
  
  // Simply call getDrizzleDb() to trigger migration
  await getDrizzleDb();
  
  console.log('Database initialization complete (via migrations)');
}
