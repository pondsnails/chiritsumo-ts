import type { Card, LedgerEntry } from '../types';

export interface BankruptcyResult {
  isInDebt: boolean; // 破産 → 借金状態に変更
  deficit: number;
  debtLevel: number; // 借金レベル (0-3)
  restrictions: string[]; // 制限内容
}

/**
 * 借金レベルによる制限
 * Level 0: 制限なし
 * Level 1: 一部機能制限（新規参考書3冊まで）
 * Level 2: 学習のみ可能（新規追加不可）
 * Level 3: 全機能停止（学習で返済のみ）
 */
export function checkBankruptcy(
  balance: number,
  cards: Card[]
): BankruptcyResult {
  if (balance >= 0) {
    return {
      isInDebt: false,
      deficit: 0,
      debtLevel: 0,
      restrictions: [],
    };
  }

  const deficit = Math.abs(balance);
  let debtLevel = 0;
  const restrictions: string[] = [];

  // 借金レベルの判定
  if (deficit >= 1000) {
    debtLevel = 3;
    restrictions.push('参考書の追加・編集が制限されています');
    restrictions.push('学習して Lex を返済してください');
  } else if (deficit >= 500) {
    debtLevel = 2;
    restrictions.push('新しい参考書の追加ができません');
    restrictions.push('既存の参考書の学習のみ可能です');
  } else if (deficit >= 100) {
    debtLevel = 1;
    restrictions.push('参考書は3冊までしか追加できません');
  }

  return {
    isInDebt: true,
    deficit,
    debtLevel,
    restrictions,
  };
}

export function getSellPrice(card: Card): number {
  const basePrice = 10;
  const stateMultiplier = [0, 1, 1.5, 2, 2.5];
  return Math.floor(basePrice * stateMultiplier[card.state]);
}

/**
 * 借金による利息計算（廃止）
 * 代わりにログインボーナスで救済
 */
export function calculatePenalty(deficit: number): number {
  return 0; // ペナルティ廃止
}

/**
 * 破産処理（進捗リセット廃止）
 * マイナス残高を許容し、機能制限のみ実施
 */
export async function executeBankruptcy(
  cards: Card[],
  currentBalance: number,
  updateCard: (id: string, updates: Partial<Card>) => Promise<void>,
  addLedgerEntry: (entry: Omit<LedgerEntry, 'id' | 'createdAt'>) => Promise<void>
): Promise<void> {
  const result = checkBankruptcy(currentBalance, cards);

  // 借金状態でも進捗はリセットしない
  // ユーザーは学習を続けることで借金を返済できる
  if (!result.isInDebt) return;

  // 警告ログのみ記録（任意）
  console.warn(`Debt level ${result.debtLevel}: ${result.restrictions.join(', ')}`);
}

/**
 * ログインボーナス機能（救済措置）
 */
export function getDailyLoginBonus(consecutiveDays: number): number {
  // 連続ログイン日数に応じてボーナス
  const baseBonus = 50;
  const streakBonus = Math.min(consecutiveDays * 10, 100);
  return baseBonus + streakBonus;
}
