// Lex報酬プロファイル定数 (将来 RemoteConfig / DB 永続化差し替え予定)
// 1分 = 10 Lex 基準換算
export const BASE_LEX = {
  read: 30,  // 3分想定 → 30 Lex
  solve: 50, // 5分想定 → 50 Lex
  memo: 1,   // 6秒想定 → 1 Lex
} as const;

// 難易度係数（difficulty: 1-10）
export const DIFFICULTY_MULTIPLIER = 1.5;

// 忘却ボーナス閾値（想起率 70% 未満で追加倍率）
export const RETENTION_BONUS_THRESHOLD = 0.7;

export type ModeLexKey = keyof typeof BASE_LEX;

// 変更を安全に行うための更新API（現状メモリのみ）
export function overrideBaseLex(partial: Partial<Record<ModeLexKey, number>>): void {
  Object.assign(BASE_LEX, partial); // NOTE: 再起動でリセットされるため永続化は別途
}
