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

export class DrizzleSystemSettingsRepository implements ISystemSettingsRepository {
  private db = getDrizzleDb();

  async get(key: string): Promise<string | null> {
    const result = await this.db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);
    
    return result.length > 0 ? result[0].value : null;
  }

  async set(key: string, value: string): Promise<void> {
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
