import type { Book, Card } from '../types';

// 基本Lex値（モード別の最低保証値）
const BASE_LEX = {
  read: 30,  // 3分想定 → 30 Lex
  solve: 50, // 5分想定 → 50 Lex
  memo: 1,   // 6秒想定 → 1 Lex
} as const;

// 難易度係数（difficulty: 1-10の範囲）
const DIFFICULTY_MULTIPLIER = 1.5;

// 忘却係数（久しぶりに復習するほど高い報酬）
const RETENTION_BONUS_THRESHOLD = 0.7; // 想起率70%以下でボーナス

/**
 * カードの難易度と忘却状態を考慮した動的Lex計算
 * 
 * @param mode - 学習モード (0: Read, 1: Solve, 2: Memo)
 * @param difficulty - FSRSの難易度 (1-10)
 * @param stability - FSRSの安定性（日数）
 * @param daysSinceLastReview - 前回復習からの経過日数
 * @returns 獲得Lex
 */
export function calculateDynamicLex(
  mode: 0 | 1 | 2,
  difficulty: number,
  stability: number,
  daysSinceLastReview: number
): number {
  const baseLex = mode === 0 ? BASE_LEX.read : mode === 1 ? BASE_LEX.solve : BASE_LEX.memo;
  
  // 難易度ボーナス（難しいカードほど高報酬）
  const difficultyBonus = 1 + (difficulty / 10) * DIFFICULTY_MULTIPLIER;
  
  // 忘却ボーナス（想起率が低いほど高報酬）
  const retention = calculateRetention(stability, daysSinceLastReview);
  const retentionBonus = retention < RETENTION_BONUS_THRESHOLD 
    ? 1 + (RETENTION_BONUS_THRESHOLD - retention) * 2
    : 1;
  
  // 最終Lex = 基本値 × 難易度ボーナス × 忘却ボーナス
  const finalLex = Math.floor(baseLex * difficultyBonus * retentionBonus);
  
  return Math.max(finalLex, baseLex); // 最低でも基本値は保証
}

/**
 * 想起率を計算（FSRS式）
 * R = exp(ln(0.9) / S * t)
 */
function calculateRetention(stability: number, elapsedDays: number): number {
  if (stability === 0) return 1;
  return Math.exp((Math.log(0.9) / stability) * elapsedDays);
}

/**
 * カードオブジェクトから動的にLexを計算
 */
export function calculateLexForCard(mode: 0 | 1 | 2, card: Card): number {
  const now = new Date();
  const lastReview = card.lastReview ? new Date(card.lastReview) : new Date(card.due);
  const daysSinceLastReview = Math.max(0, (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24));
  
  return calculateDynamicLex(mode, card.difficulty, card.stability, daysSinceLastReview);
}

/**
 * 後方互換性のための固定値計算（旧ロジック）
 * rolloverLogicなどで平均値計算に使用
 */
export function calculateLexPerCard(mode: 0 | 1 | 2): number {
  if (mode === 0) return BASE_LEX.read;
  if (mode === 1) return BASE_LEX.solve;
  return BASE_LEX.memo;
}

/**
 * 書籍の総Lex計算（固定値版）
 */
export function calculateLex(book: Book, cardCount: number): number {
  const lexPerCard = calculateLexPerCard(book.mode);
  return lexPerCard * cardCount;
}

