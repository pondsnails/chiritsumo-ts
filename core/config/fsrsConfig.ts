// FSRS動的設定 (将来的にはユーザー別・リモート同期想定)
// 現状: メモリ保持 + 変更API

export interface FsrsModeConfig {
  requestRetention: number; // 想起率要求値 (0-1)
}

export interface FsrsConfig {
  read: FsrsModeConfig;
  solve: FsrsModeConfig;
  memo: FsrsModeConfig;
}

// デフォルト値 (暫定)
let config: FsrsConfig = {
  read: { requestRetention: 0.9 },
  solve: { requestRetention: 0.9 },
  memo: { requestRetention: 0.85 },
};

export function getFsrsConfig(): FsrsConfig {
  return config;
}

export function updateFsrsConfig(partial: Partial<FsrsConfig>) {
  config = { ...config, ...partial };
}

// 単一モード値取得ヘルパ
export function getRetentionForMode(mode: 0 | 1 | 2): number {
  return mode === 0 ? config.read.requestRetention : mode === 1 ? config.solve.requestRetention : config.memo.requestRetention;
}
