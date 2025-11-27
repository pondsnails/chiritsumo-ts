/**
 * enums.ts
 * マジックナンバー撲滅：型安全な定数定義
 */

/**
 * 学習モード
 */
export enum BookMode {
  READ = 0,   // 読書モード（3分想定）
  SOLVE = 1,  // 問題演習モード（5分想定）
  MEMO = 2    // 暗記モード（6秒想定）
}

export const BookModeLabel: Record<BookMode, string> = {
  [BookMode.READ]: '読書',
  [BookMode.SOLVE]: '演習',
  [BookMode.MEMO]: '暗記',
};

/**
 * 書籍ステータス
 */
export enum BookStatus {
  ACTIVE = 0,    // アクティブ（学習中）
  COMPLETED = 1, // 完了
  FROZEN = 2     // 凍結（一時停止）
}

export const BookStatusLabel: Record<BookStatus, string> = {
  [BookStatus.ACTIVE]: '学習中',
  [BookStatus.COMPLETED]: '完了',
  [BookStatus.FROZEN]: '凍結',
};

/**
 * カード状態（FSRS）
 */
export enum CardState {
  NEW = 0,       // 新規
  LEARNING = 1,  // 学習中
  REVIEW = 2,    // 復習中
  RELEARNING = 3 // 再学習中
}

export const CardStateLabel: Record<CardState, string> = {
  [CardState.NEW]: '新規',
  [CardState.LEARNING]: '学習中',
  [CardState.REVIEW]: '復習中',
  [CardState.RELEARNING]: '再学習中',
};

/**
 * 書籍優先度
 */
export enum BookPriority {
  NORMAL = 0,  // 通常
  HIGH = 1     // 高優先度
}

export const BookPriorityLabel: Record<BookPriority, string> = {
  [BookPriority.NORMAL]: '通常',
  [BookPriority.HIGH]: '高優先度',
};

/**
 * FSRS評価（Grade）
 */
export enum FSRSGrade {
  AGAIN = 1,     // もう一度
  HARD = 2,      // 難しい
  GOOD = 3,      // 普通
  EASY = 4       // 簡単
}

export const FSRSGradeLabel: Record<FSRSGrade, string> = {
  [FSRSGrade.AGAIN]: 'もう一度',
  [FSRSGrade.HARD]: '難しい',
  [FSRSGrade.GOOD]: '普通',
  [FSRSGrade.EASY]: '簡単',
};

/**
 * 型ガード関数
 */
export function isValidBookMode(value: number): value is BookMode {
  return value === BookMode.READ || value === BookMode.SOLVE || value === BookMode.MEMO;
}

export function isValidBookStatus(value: number): value is BookStatus {
  return value === BookStatus.ACTIVE || value === BookStatus.COMPLETED || value === BookStatus.FROZEN;
}

export function isValidCardState(value: number): value is CardState {
  return value >= CardState.NEW && value <= CardState.RELEARNING;
}

export function isValidFSRSGrade(value: number): value is FSRSGrade {
  return value >= FSRSGrade.AGAIN && value <= FSRSGrade.EASY;
}

/**
 * 型変換ヘルパー
 */
export function toBookMode(value: number): BookMode {
  if (!isValidBookMode(value)) {
    throw new Error(`Invalid BookMode: ${value}`);
  }
  return value;
}

export function toBookStatus(value: number): BookStatus {
  if (!isValidBookStatus(value)) {
    throw new Error(`Invalid BookStatus: ${value}`);
  }
  return value;
}

export function toCardState(value: number): CardState {
  if (!isValidCardState(value)) {
    throw new Error(`Invalid CardState: ${value}`);
  }
  return value;
}

export function toFSRSGrade(value: number): FSRSGrade {
  if (!isValidFSRSGrade(value)) {
    throw new Error(`Invalid FSRSGrade: ${value}`);
  }
  return value;
}
