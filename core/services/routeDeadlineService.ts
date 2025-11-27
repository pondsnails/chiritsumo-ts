/**
 * ルート全体の目標完了日管理サービス
 * ルートの終着点の完了日を設定すると、チェーン内の各書籍に
 * 適切な完了日を自動で配分する
 * 
 * 完了日 = すべての書籍の記憶定着率が目標値以上になる日
 */

import type { Book, Card } from '../types';

// ---------------------------------------------------------
// 記憶定着率の計算（FSRS v5）
// ---------------------------------------------------------

/**
 * 記憶定着率を計算（FSRS v5の忘却曲線）
 * R(t) = (1 + t/(9*S))^(-1)
 * @param stability - 安定性（日数）
 * @param elapsedDays - 経過日数
 */
function calculateRetrievability(stability: number, elapsedDays: number): number {
  if (stability === 0) return 0;
  return Math.pow(1 + elapsedDays / (9 * stability), -1);
}

/**
 * 指定日数後の記憶定着率を推定
 * @param currentStability - 現在の安定性
 * @param currentElapsed - 現在の経過日数
 * @param additionalDays - 追加する日数
 */
function predictRetrievability(
  currentStability: number,
  currentElapsed: number,
  additionalDays: number
): number {
  const totalElapsed = currentElapsed + additionalDays;
  return calculateRetrievability(currentStability, totalElapsed);
}

// ---------------------------------------------------------
// 記憶定着率の目標設定
// ---------------------------------------------------------

export type RetentionTarget = 'recommended' | 'relaxed' | 'strict' | 'custom';

export interface RetentionConfig {
  target: RetentionTarget;
  customValue?: number; // 0.0 - 1.0
}

/** 推奨設定（Free版はこれのみ） */
export const RECOMMENDED_RETENTION = 0.85;

/** プリセット選択肢 */
export const RETENTION_PRESETS = {
  recommended: 0.85,  // 推奨（バランス型）
  relaxed: 0.75,      // ゆるめ（負担軽減）
  strict: 0.95,       // 厳しめ（完璧主義）
} as const;

export function getRetentionValue(config: RetentionConfig): number {
  if (config.target === 'custom') {
    return Math.max(0.5, Math.min(0.99, config.customValue || RECOMMENDED_RETENTION));
  }
  return RETENTION_PRESETS[config.target];
}

// ---------------------------------------------------------
// ルートチェーンの構築
// ---------------------------------------------------------

export interface RouteDeadlineInput {
  /** ルートの終着書籍ID（最後に学習する書籍） */
  finalBookId: string;
  /** ルート全体の目標完了日（すべての書籍が目標定着率以上になる日） */
  targetDate: Date;
  /** 目標記憶定着率の設定 */
  retentionConfig: RetentionConfig;
}

export interface RouteDeadlineResult {
  /** 更新すべき書籍とその完了日のマップ */
  bookDeadlines: Map<string, Date>;
  /** ルート内の書籍ID配列（順序付き） */
  routeChain: string[];
  /** 各書籍に割り当てられた日数 */
  allocatedDays: Map<string, number>;
}

/**
 * 指定された書籍から遡ってルートチェーンを構築
 */
function buildRouteChain(finalBookId: string, books: Book[]): Book[] {
  const bookMap = new Map(books.map(b => [b.id, b]));
  const chain: Book[] = [];
  const visited = new Set<string>();
  
  let currentId: string | null = finalBookId;
  
  while (currentId) {
    // 循環検出
    if (visited.has(currentId)) {
      console.warn('[RouteDeadline] 循環参照を検出:', currentId);
      break;
    }
    
    const book = bookMap.get(currentId);
    if (!book) break;
    
    visited.add(currentId);
    chain.unshift(book); // 先頭に追加（逆順で構築）
    currentId = book.previousBookId;
  }
  
  return chain;
}

/**
 * 書籍のすべてのカードが目標定着率以上になるまでの日数を推定
 * @param book - 書籍
 * @param cards - 書籍に属するカード一覧
 * @param targetRetention - 目標記憶定着率（0.0 - 1.0）
 */
function estimateDaysToTargetRetention(
  book: Book,
  cards: Card[],
  targetRetention: number
): number {
  const bookCards = cards.filter(c => c.bookId === book.id);
  
  if (bookCards.length === 0) {
    // カードがない場合は未学習と見なし、初回学習の日数を見積もる
    const remainingUnits = book.totalUnit - (book.completedUnit || 0);
    const dailyCapacity = { 0: 30, 1: 20, 2: 15 };
    const capacity = dailyCapacity[book.mode] || 20;
    return Math.max(Math.ceil(remainingUnits / capacity), 1);
  }
  
  let maxDaysNeeded = 0;
  
  for (const card of bookCards) {
    // 現在の記憶定着率
    const currentRetention = calculateRetrievability(card.stability, card.elapsedDays);
    
    if (currentRetention >= targetRetention) {
      // すでに目標達成
      continue;
    }
    
    // 目標定着率に達するまでの推定日数を計算
    // R(t) = (1 + t/(9*S))^(-1) >= targetRetention
    // → t <= 9*S * ((1/targetRetention) - 1)
    const stability = Math.max(card.stability, 0.1);
    const daysToTarget = Math.ceil(9 * stability * (1 / targetRetention - 1));
    const additionalDays = Math.max(daysToTarget - card.elapsedDays, 0);
    
    maxDaysNeeded = Math.max(maxDaysNeeded, additionalDays);
  }
  
  // 未学習カードがある場合の追加日数
  const remainingUnits = book.totalUnit - bookCards.length;
  if (remainingUnits > 0) {
    const dailyCapacity = { 0: 30, 1: 20, 2: 15 };
    const capacity = dailyCapacity[book.mode] || 20;
    const learningDays = Math.ceil(remainingUnits / capacity);
    maxDaysNeeded = Math.max(maxDaysNeeded, learningDays);
  }
  
  return Math.max(maxDaysNeeded, 1);
}

/**
 * ルート全体の目標完了日から各書籍の完了日を自動配分
 * 完了日 = すべてのカードが目標記憶定着率以上になる日
 */
export function calculateRouteDeadlines(
  input: RouteDeadlineInput,
  books: Book[],
  cards: Card[]
): RouteDeadlineResult {
  const chain = buildRouteChain(input.finalBookId, books);
  
  if (chain.length === 0) {
    throw new Error('ルートチェーンが見つかりません');
  }
  
  const targetRetention = getRetentionValue(input.retentionConfig);
  
  // 各書籍が目標定着率に達するまでの日数を計算
  const bookDays = new Map<string, number>();
  let totalEstimatedDays = 0;
  
  for (const book of chain) {
    const days = estimateDaysToTargetRetention(book, cards, targetRetention);
    bookDays.set(book.id, days);
    totalEstimatedDays += days;
  }
  
  // 今日から目標日までの日数
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(input.targetDate);
  targetDate.setHours(0, 0, 0, 0);
  
  const availableDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (availableDays <= 0) {
    throw new Error('目標完了日は未来の日付を指定してください');
  }
  
  // 利用可能日数が予想日数より少ない場合は警告（実装は続行）
  if (availableDays < totalEstimatedDays) {
    console.warn(
      `[RouteDeadline] 期限が厳しいです。予想: ${totalEstimatedDays}日、利用可能: ${availableDays}日`
    );
  }
  
  // 各書籍に日数を比例配分
  const bookDeadlines = new Map<string, Date>();
  const allocatedDays = new Map<string, number>();
  let currentDate = new Date(today);
  
  for (let i = 0; i < chain.length; i++) {
    const book = chain[i];
    const estimatedDays = bookDays.get(book.id) || 1;
    
    // 最後の書籍は目標日に合わせる
    if (i === chain.length - 1) {
      allocatedDays.set(book.id, availableDays - Array.from(allocatedDays.values()).reduce((sum, d) => sum + d, 0));
      bookDeadlines.set(book.id, new Date(targetDate));
    } else {
      // 比例配分
      const ratio = estimatedDays / totalEstimatedDays;
      const assignedDays = Math.max(Math.floor(availableDays * ratio), 1);
      
      allocatedDays.set(book.id, assignedDays);
      
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + assignedDays);
      bookDeadlines.set(book.id, new Date(currentDate));
    }
  }
  
  return {
    bookDeadlines,
    routeChain: chain.map(b => b.id),
    allocatedDays,
  };
}

/**
 * ルート内の特定の書籍の完了日を調整すると、
 * それ以降の書籍の完了日を自動でシフトする
 */
export function adjustRouteDeadline(
  bookId: string,
  newDeadline: Date,
  books: Book[],
  cards: Card[],
  retentionConfig: RetentionConfig
): RouteDeadlineResult {
  // この書籍をルート終点として扱い、再計算
  return calculateRouteDeadlines(
    { finalBookId: bookId, targetDate: newDeadline, retentionConfig },
    books,
    cards
  );
}

/**
 * 複数ルートが存在する場合、各ルートの終点を検出
 */
export function findRouteFinalBooks(books: Book[]): Book[] {
  const bookMap = new Map(books.map(b => [b.id, b]));
  const hasChild = new Set<string>();
  
  // 誰かの親になっている書籍を記録
  books.forEach(b => {
    if (b.previousBookId) {
      hasChild.add(b.previousBookId);
    }
  });
  
  // 誰の親にもなっていない = 終点
  return books.filter(b => !hasChild.has(b.id));
}
