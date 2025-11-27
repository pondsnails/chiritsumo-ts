/**
 * configService.ts
 * アプリケーション設定のDB永続化サービス
 * 
 * 機能:
 * 1. ハードコードされた定数をDBに移行
 * 2. 動的な設定変更を可能にする
 * 3. デフォルト値のフォールバック
 */

import { DrizzleSystemSettingsRepository } from '../repository/SystemSettingsRepository';
import { logError, ErrorCategory, safeExecute } from '../utils/errorHandler';

const settingsRepo = new DrizzleSystemSettingsRepository();

/**
 * 設定キー定義
 */
export const ConfigKeys = {
  // Lex報酬設定
  BASE_LEX_READ: 'base_lex_read',
  BASE_LEX_SOLVE: 'base_lex_solve',
  BASE_LEX_MEMO: 'base_lex_memo',
  DIFFICULTY_MULTIPLIER: 'difficulty_multiplier',
  RETENTION_BONUS_THRESHOLD: 'retention_bonus_threshold',
  
  // デイリー目標Lex（プリセット）
  DAILY_LEX_TARGET_DEFAULT: 'daily_lex_target_default',
  
  // バックアップ設定
  BACKUP_CHUNK_SIZE: 'backup_chunk_size',
  
  // レイアウトキャッシュ設定
  LAYOUT_CACHE_TTL: 'layout_cache_ttl_ms',
  
  // ページネーション設定
  CARD_PAGE_SIZE: 'card_page_size',
} as const;

/**
 * デフォルト値（DBに値がない場合のフォールバック）
 */
const DEFAULT_VALUES: Record<string, number> = {
  [ConfigKeys.BASE_LEX_READ]: 30,
  [ConfigKeys.BASE_LEX_SOLVE]: 50,
  [ConfigKeys.BASE_LEX_MEMO]: 1,
  [ConfigKeys.DIFFICULTY_MULTIPLIER]: 1.5,
  [ConfigKeys.RETENTION_BONUS_THRESHOLD]: 0.7,
  [ConfigKeys.DAILY_LEX_TARGET_DEFAULT]: 600,
  [ConfigKeys.BACKUP_CHUNK_SIZE]: 1000,
  [ConfigKeys.LAYOUT_CACHE_TTL]: 1000 * 60 * 5, // 5分
  [ConfigKeys.CARD_PAGE_SIZE]: 50,
};

/**
 * 設定値を取得（数値型）
 */
export async function getConfigNumber(
  key: string,
  defaultValue?: number
): Promise<number> {
  return safeExecute(
    async () => {
      const value = await settingsRepo.get(key);
      if (value === null) {
        const fallback = defaultValue ?? DEFAULT_VALUES[key] ?? 0;
        // デフォルト値をDBに保存（次回から高速）
        await settingsRepo.set(key, String(fallback));
        return fallback;
      }
      return Number(value);
    },
    {
      category: ErrorCategory.DATABASE,
      operationName: 'getConfigNumber',
      fallbackValue: defaultValue ?? DEFAULT_VALUES[key] ?? 0,
      metadata: { key },
    }
  );
}

/**
 * 設定値を取得（文字列型）
 */
export async function getConfigString(
  key: string,
  defaultValue: string = ''
): Promise<string> {
  return safeExecute(
    async () => {
      const value = await settingsRepo.get(key);
      if (value === null) {
        await settingsRepo.set(key, defaultValue);
        return defaultValue;
      }
      return value;
    },
    {
      category: ErrorCategory.DATABASE,
      operationName: 'getConfigString',
      fallbackValue: defaultValue,
      metadata: { key },
    }
  );
}

/**
 * 設定値を更新
 */
export async function setConfig(
  key: string,
  value: string | number
): Promise<void> {
  try {
    await settingsRepo.set(key, String(value));
  } catch (error) {
    logError(error, {
      category: ErrorCategory.DATABASE,
      operation: 'setConfig',
      metadata: { key, value },
    });
    throw error;
  }
}

/**
 * 複数の設定を一括取得
 */
export async function getBatchConfig(
  keys: string[]
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  
  await Promise.all(
    keys.map(async (key) => {
      result[key] = await getConfigNumber(key);
    })
  );
  
  return result;
}

/**
 * Lex報酬設定を取得
 */
export async function getLexConfig(): Promise<{
  read: number;
  solve: number;
  memo: number;
  difficultyMultiplier: number;
  retentionBonusThreshold: number;
}> {
  const [read, solve, memo, difficultyMultiplier, retentionBonusThreshold] = 
    await Promise.all([
      getConfigNumber(ConfigKeys.BASE_LEX_READ),
      getConfigNumber(ConfigKeys.BASE_LEX_SOLVE),
      getConfigNumber(ConfigKeys.BASE_LEX_MEMO),
      getConfigNumber(ConfigKeys.DIFFICULTY_MULTIPLIER),
      getConfigNumber(ConfigKeys.RETENTION_BONUS_THRESHOLD),
    ]);
  
  return {
    read,
    solve,
    memo,
    difficultyMultiplier,
    retentionBonusThreshold,
  };
}

/**
 * デイリー目標Lex設定を取得
 * （注: lexSettingsService.tsのgetDailyLexTarget()を優先使用してください）
 */
export async function getDailyLexTargetFallback(): Promise<number> {
  return getConfigNumber(ConfigKeys.DAILY_LEX_TARGET_DEFAULT);
}

/**
 * デイリー目標Lex設定を更新
 */
export async function setDailyLexTarget(value: number): Promise<void> {
  await setConfig(ConfigKeys.DAILY_LEX_TARGET_DEFAULT, value);
}

/**
 * すべての設定をデフォルト値にリセット
 */
export async function resetAllConfig(): Promise<void> {
  try {
    for (const [key, value] of Object.entries(DEFAULT_VALUES)) {
      await settingsRepo.set(key, String(value));
    }
  } catch (error) {
    logError(error, {
      category: ErrorCategory.DATABASE,
      operation: 'resetAllConfig',
    });
    throw error;
  }
}

/**
 * 設定の妥当性チェック（範囲外の値を修正）
 */
export async function validateAndFixConfig(): Promise<void> {
  try {
    // Lex報酬は正の値である必要がある
    const lexRead = await getConfigNumber(ConfigKeys.BASE_LEX_READ);
    if (lexRead <= 0) {
      await setConfig(ConfigKeys.BASE_LEX_READ, DEFAULT_VALUES[ConfigKeys.BASE_LEX_READ]);
    }
    
    const lexSolve = await getConfigNumber(ConfigKeys.BASE_LEX_SOLVE);
    if (lexSolve <= 0) {
      await setConfig(ConfigKeys.BASE_LEX_SOLVE, DEFAULT_VALUES[ConfigKeys.BASE_LEX_SOLVE]);
    }
    
    const lexMemo = await getConfigNumber(ConfigKeys.BASE_LEX_MEMO);
    if (lexMemo <= 0) {
      await setConfig(ConfigKeys.BASE_LEX_MEMO, DEFAULT_VALUES[ConfigKeys.BASE_LEX_MEMO]);
    }
    
    // 難易度係数は1.0以上である必要がある
    const diffMultiplier = await getConfigNumber(ConfigKeys.DIFFICULTY_MULTIPLIER);
    if (diffMultiplier < 1.0) {
      await setConfig(ConfigKeys.DIFFICULTY_MULTIPLIER, DEFAULT_VALUES[ConfigKeys.DIFFICULTY_MULTIPLIER]);
    }
    
    // 忘却ボーナス閾値は0-1の範囲
    const retentionThreshold = await getConfigNumber(ConfigKeys.RETENTION_BONUS_THRESHOLD);
    if (retentionThreshold < 0 || retentionThreshold > 1) {
      await setConfig(ConfigKeys.RETENTION_BONUS_THRESHOLD, DEFAULT_VALUES[ConfigKeys.RETENTION_BONUS_THRESHOLD]);
    }
  } catch (error) {
    logError(error, {
      category: ErrorCategory.VALIDATION,
      operation: 'validateAndFixConfig',
    });
  }
}
