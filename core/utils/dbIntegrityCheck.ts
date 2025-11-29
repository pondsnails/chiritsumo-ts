/**
 * dbIntegrityCheck.ts
 * 
 * データベース整合性チェック & 自動復旧提案
 * アプリ起動時に実行し、破損検知時はクラウドバックアップから自動復元を提案
 * 
 * データロスト低評価爆撃を防ぐ最終防衛線
 */

import { getDrizzleDb } from '../database/drizzleClient';
import { books, cards, ledger } from '../database/schema';
import { restoreFromCloudBackup } from '../services/cloudBackupService';

export interface IntegrityCheckResult {
  isHealthy: boolean;
  errors: string[];
  warnings: string[];
  canRestore: boolean;
}

/**
 * DB整合性チェック
 * 
 * チェック項目:
 * 1. テーブル存在確認
 * 2. 外部キー制約違反（orphan cards）
 * 3. 不正なデータ型・NULL制約違反
 * 4. インデックス破損
 */
export async function checkDatabaseIntegrity(): Promise<IntegrityCheckResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let canRestore = false;

  try {
    const db = await getDrizzleDb();

    // 1. テーブル存在確認
    try {
      await db.select().from(books).limit(1);
      await db.select().from(cards).limit(1);
      await db.select().from(ledger).limit(1);
    } catch (e: any) {
      errors.push(`テーブルアクセスエラー: ${e.message}`);
      canRestore = true;
      return { isHealthy: false, errors, warnings, canRestore };
    }

    // 2. 外部キー制約違反（orphan cards）
    const { sql } = await import('drizzle-orm');
    const orphanCardsResult = await db.all<{ count: number }>(
      sql`SELECT COUNT(*) as count FROM cards WHERE book_id NOT IN (SELECT id FROM books)`
    );
    const orphanCount = orphanCardsResult[0]?.count ?? 0;
    if (orphanCount > 0) {
      warnings.push(`${orphanCount}件の孤立カードを検出しました（親書籍が削除済み）`);
    }

    // 3. 不正なデータ型チェック（due, created_atなど）
    const invalidDatesResult = await db.all<{ count: number }>(
      sql`SELECT COUNT(*) as count FROM cards WHERE due IS NULL OR due < 0`
    );
    const invalidDatesCount = invalidDatesResult[0]?.count ?? 0;
    if (invalidDatesCount > 0) {
      errors.push(`${invalidDatesCount}件のカードに不正な日付データがあります`);
      canRestore = true;
    }

    // 4. Ledger残高整合性チェック
    const ledgerData = await db.select().from(ledger).orderBy(ledger.date);
    for (let i = 1; i < ledgerData.length; i++) {
      const prev = ledgerData[i - 1];
      const curr = ledgerData[i];
      const expectedBalance = prev.balance + curr.earned_lex - curr.target_lex;
      if (Math.abs(curr.balance - expectedBalance) > 1) {
        warnings.push(`Ledger残高不整合を検出（日付: ${curr.date}）`);
      }
    }

    const isHealthy = errors.length === 0;
    return { isHealthy, errors, warnings, canRestore };
  } catch (e: any) {
    errors.push(`整合性チェック失敗: ${e.message}`);
    canRestore = true;
    return { isHealthy: false, errors, warnings, canRestore };
  }
}

/**
 * 自動復旧実行
 * クラウドバックアップから復元 → 整合性再チェック
 */
export async function performAutoRecovery(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // クラウドバックアップから復元
    const restoreResult = await restoreFromCloudBackup();
    if (!restoreResult.success) {
      return {
        success: false,
        message: `復元失敗: ${restoreResult.error ?? '不明なエラー'}`,
      };
    }

    // 復元後に整合性再チェック
    const checkResult = await checkDatabaseIntegrity();
    if (checkResult.isHealthy) {
      return {
        success: true,
        message: 'データを正常に復元しました！',
      };
    } else {
      return {
        success: false,
        message: `復元後もエラーが残っています: ${checkResult.errors.join(', ')}`,
      };
    }
  } catch (e: any) {
    return {
      success: false,
      message: `復旧処理エラー: ${e.message}`,
    };
  }
}
