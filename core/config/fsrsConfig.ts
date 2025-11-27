/**
 * fsrsConfig.ts
 * FSRS動的設定（DB永続化対応）
 * 
 * ⚠️ 重要: 設定変更は即座にDBに保存されます
 * アプリ再起動後も設定は維持されます
 */

import { getConfigNumber, setConfig, ConfigKeys } from '@core/services/configService';

export interface FsrsModeConfig {
  requestRetention: number; // 想起率要求値 (0-1)
}

export interface FsrsConfig {
  read: FsrsModeConfig;
  solve: FsrsModeConfig;
  memo: FsrsModeConfig;
}

/**
 * 設定キー拡張（FSRS専用）
 */
const FSRS_CONFIG_KEYS = {
  READ_RETENTION: 'fsrs_read_retention',
  SOLVE_RETENTION: 'fsrs_solve_retention',
  MEMO_RETENTION: 'fsrs_memo_retention',
} as const;

/**
 * デフォルト値
 */
const DEFAULT_RETENTION = {
  READ: 0.9,
  SOLVE: 0.9,
  MEMO: 0.85,
};

/**
 * FSRS設定を取得（DBから読み込み）
 */
export async function getFsrsConfig(): Promise<FsrsConfig> {
  const [readRetention, solveRetention, memoRetention] = await Promise.all([
    getConfigNumber(FSRS_CONFIG_KEYS.READ_RETENTION, DEFAULT_RETENTION.READ),
    getConfigNumber(FSRS_CONFIG_KEYS.SOLVE_RETENTION, DEFAULT_RETENTION.SOLVE),
    getConfigNumber(FSRS_CONFIG_KEYS.MEMO_RETENTION, DEFAULT_RETENTION.MEMO),
  ]);
  
  return {
    read: { requestRetention: readRetention },
    solve: { requestRetention: solveRetention },
    memo: { requestRetention: memoRetention },
  };
}

/**
 * FSRS設定を更新（DBに保存）
 */
export async function updateFsrsConfig(partial: Partial<FsrsConfig>): Promise<void> {
  const updates: Promise<void>[] = [];
  
  if (partial.read?.requestRetention !== undefined) {
    updates.push(setConfig(FSRS_CONFIG_KEYS.READ_RETENTION, partial.read.requestRetention));
  }
  
  if (partial.solve?.requestRetention !== undefined) {
    updates.push(setConfig(FSRS_CONFIG_KEYS.SOLVE_RETENTION, partial.solve.requestRetention));
  }
  
  if (partial.memo?.requestRetention !== undefined) {
    updates.push(setConfig(FSRS_CONFIG_KEYS.MEMO_RETENTION, partial.memo.requestRetention));
  }
  
  await Promise.all(updates);
}

/**
 * 単一モード値取得ヘルパ（非同期）
 */
export async function getRetentionForMode(mode: 0 | 1 | 2): Promise<number> {
  const config = await getFsrsConfig();
  
  switch (mode) {
    case 0:
      return config.read.requestRetention;
    case 1:
      return config.solve.requestRetention;
    case 2:
      return config.memo.requestRetention;
    default:
      return DEFAULT_RETENTION.READ;
  }
}

/**
 * 設定リセット（デフォルト値に戻す）
 */
export async function resetFsrsConfig(): Promise<void> {
  await updateFsrsConfig({
    read: { requestRetention: DEFAULT_RETENTION.READ },
    solve: { requestRetention: DEFAULT_RETENTION.SOLVE },
    memo: { requestRetention: DEFAULT_RETENTION.MEMO },
  });
}
