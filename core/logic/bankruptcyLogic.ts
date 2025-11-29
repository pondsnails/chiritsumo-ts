import type { Card, LedgerEntry } from '../types';

export interface BankruptcyStatus {
  isInDebt: boolean;
  deficit: number;
  warningLevel: 0 | 1 | 2 | 3; // 0: 健全, 1: 注意, 2: 警告, 3: 重度（ボーナス最大）
  isFunctionLocked: boolean; // 機能制限フラグ（常にfalseに変更）
  message: string;
}

// 機能制限は廃止。しきい値はボーナス演出のみに使用（UI目的）。
const BONUS_LEVEL_1 = 200;   // 軽度
const BONUS_LEVEL_2 = 500;   // 中程度
const BONUS_LEVEL_3 = 1000;  // 重度

/**
 * 改善版破産判定
 * - Pro版: 借金上限なし（無制限にマイナス可能）
 * - Free版: -1000 Lexで機能制限（新規カード追加不可、データは保持）
 * 
 * 【変更点】データ削除ではなく機能制限に変更してユーザー体験を改善
 */
export function checkBankruptcyStatus(
  balance: number,
  isProUser: boolean
): BankruptcyStatus {
  if (balance >= 0) {
    return {
      isInDebt: false,
      deficit: 0,
      warningLevel: 0,
      isFunctionLocked: false,
      message: '健全な状態です',
    };
  }

  const deficit = Math.abs(balance);
  // すべてのユーザーで機能制限は行わず、ボーナス段階のみ付与
  let warningLevel: 0 | 1 | 2 | 3 = 1;
  if (deficit >= BONUS_LEVEL_3) warningLevel = 3;
  else if (deficit >= BONUS_LEVEL_2) warningLevel = 2;
  else if (deficit >= BONUS_LEVEL_1) warningLevel = 1;

  return {
    isInDebt: true,
    deficit,
    warningLevel,
    isFunctionLocked: false,
    message: `遅れ: ${deficit} XP（学習ボーナス適用）`,
  };
}

/**
 * @deprecated 破産処理（全データリセット）は廃止
 * 機能制限に変更したため、この関数は使用しない
 */
export async function executeBankruptcy(
  resetAllData: () => Promise<void>
): Promise<void> {
  await resetAllData();
  console.log('Bankruptcy executed: All data has been reset.');
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

/**
 * 徳政令（借金救済措置）
 * 一定のLexを支払うことで借金を減免
 */
export function applyDebtForgiveness(
  currentDeficit: number,
  debtLevel: number
): { cost: number; newDeficit: number } {
  let cost = 0;
  let reductionRate = 0.5; // 50%減免

  if (debtLevel === 3) {
    cost = 500;
  } else if (debtLevel === 2) {
    cost = 300;
  } else if (debtLevel === 1) {
    cost = 150;
  }

  const newDeficit = Math.floor(currentDeficit * reductionRate);
  return { cost, newDeficit };
}

/**
 * 借金時の学習ボーナス倍率を取得
 */
export function getDebtBonusMultiplier(debtLevel: number): number {
  switch (debtLevel) {
    case 3: return 3.0; // 3倍
    case 2: return 2.0; // 2倍
    case 1: return 1.5; // 1.5倍
    default: return 1.0; // 通常
  }
}
