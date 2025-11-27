import { velocityMeasurements } from '../database/schema';
import type { VelocityMeasurement, NewVelocityMeasurement } from '../database/schema';
import { getDrizzleDb } from '../database/drizzleClient';
import { eq, desc, sql } from 'drizzle-orm';

export interface IVelocityMeasurementRepository {
  findByDate(date: number): Promise<VelocityMeasurement | null>;
  findRecent(limit: number): Promise<VelocityMeasurement[]>;
  upsert(measurement: NewVelocityMeasurement): Promise<void>;
  getAverageVelocity(days: number): Promise<{ avgVelocity: number; totalMeasurements: number } | null>;
  deleteOlderThan(dateEpoch: number): Promise<void>;
}

export class DrizzleVelocityMeasurementRepository implements IVelocityMeasurementRepository {
  private async db() {
    return await getDrizzleDb();
  }

  async findByDate(date: number): Promise<VelocityMeasurement | null> {
    const db = await this.db();
    const result = await db
      .select()
      .from(velocityMeasurements)
      .where(eq(velocityMeasurements.date, date))
      .get();
    
    return result || null;
  }

  async findRecent(limit: number): Promise<VelocityMeasurement[]> {
    const db = await this.db();
    const results = await db
      .select()
      .from(velocityMeasurements)
      .orderBy(desc(velocityMeasurements.date))
      .limit(limit)
      .all();
    
    return results;
  }

  async upsert(measurement: NewVelocityMeasurement): Promise<void> {
    const db = await this.db();
    await db
      .insert(velocityMeasurements)
      .values(measurement)
      .onConflictDoUpdate({
        target: velocityMeasurements.date,
        set: {
          earned_lex: measurement.earned_lex,
          minutes_spent: measurement.minutes_spent,
          created_at: sql`CURRENT_TIMESTAMP`,
        },
      })
      .run();
  }

  /**
   * 指定日数分の平均学習速度を取得（Lex/分）
   */
  async getAverageVelocity(days: number): Promise<{ avgVelocity: number; totalMeasurements: number } | null> {
    const db = await this.db();
    const result = await db
      .select({
        totalLex: sql<number>`SUM(${velocityMeasurements.earned_lex})`,
        totalMinutes: sql<number>`SUM(${velocityMeasurements.minutes_spent})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(velocityMeasurements)
      .orderBy(desc(velocityMeasurements.date))
      .limit(days)
      .get();
    
    if (!result || !result.totalMinutes || result.totalMinutes === 0) {
      return null;
    }

    return {
      avgVelocity: Number(result.totalLex) / Number(result.totalMinutes),
      totalMeasurements: Number(result.count),
    };
  }

  /**
   * 指定日付より古いデータを削除
   */
  async deleteOlderThan(dateEpoch: number): Promise<void> {
    const db = await this.db();
    await db
      .delete(velocityMeasurements)
      .where(sql`${velocityMeasurements.date} < ${dateEpoch}`)
      .run();
  }
}
