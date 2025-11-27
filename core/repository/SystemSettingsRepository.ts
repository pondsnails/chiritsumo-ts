import { eq, sql } from 'drizzle-orm';
import { getDrizzleDb } from '../database/drizzleClient';
import { systemSettings } from '../database/schema';
import type { SystemSetting } from '../database/schema';

export interface ISystemSettingsRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  getAll(): Promise<SystemSetting[]>;
  delete(key: string): Promise<void>;
}

let writeQueue: Promise<void> = Promise.resolve();

async function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = async () => task();
  const p = writeQueue.then(run, run);
  writeQueue = p.then(() => {}, () => {});
  return p;
}

export class DrizzleSystemSettingsRepository implements ISystemSettingsRepository {
  private db = getDrizzleDb();

  private async withRetry<T>(fn: () => Promise<T>, retries = 10, delayMs = 100): Promise<T> {
    try {
      return await fn();
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (retries > 0 && msg.includes('database is locked')) {
        await new Promise((r) => setTimeout(r, delayMs));
        return this.withRetry(fn, retries - 1, delayMs * 2);
      }
      throw e;
    }
  }

  async get(key: string): Promise<string | null> {
    const result = await this.db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);
    
    return result.length > 0 ? result[0].value : null;
  }

  async set(key: string, value: string): Promise<void> {
    await enqueue(
      () => this.withRetry(async () => {
        await this.db
          .insert(systemSettings)
          .values({
            key,
            value,
            updated_at: new Date().toISOString(),
          })
          .onConflictDoUpdate({
            target: systemSettings.key,
            set: {
              value,
              updated_at: sql`CURRENT_TIMESTAMP`,
            },
          })
          .run();
      })
    );
  }

  async getAll(): Promise<SystemSetting[]> {
    return await this.db.select().from(systemSettings);
  }

  async delete(key: string): Promise<void> {
    await this.db
      .delete(systemSettings)
      .where(eq(systemSettings.key, key))
      .run();
  }
}
