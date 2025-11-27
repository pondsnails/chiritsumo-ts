import type { Card, LedgerEntry } from '../types';

export interface BankruptcyStatus {
  isInDebt: boolean;
  deficit: number;
  warningLevel: 0 | 1 | 2 | 3; // 0: 健全, 1: 注意, 2: 警告, 3: 破産寸前
  canBankrupt: boolean; // 破産可能か（Free版のみ）
  message: string;
}

// BankruptcyWarning component用の拡張型
export interface BankruptcyResult {
  isInDebt: boolean;
  deficit: number;
  debtLevel: 0 | 1 | 2 | 3;
  bonusQuests: string[];
  rescueOptions: string[];
}

// 借金の上限設定（Free版のみ）
const BANKRUPTCY_THRESHOLD_FREE = -1000; // -1000 Lexで強制破産

/**
 * 簡素化された破産判定
 * - Pro版: 借金上限なし（無制限にマイナス可能）
 * - Free版: -1000 Lexで強制破産（全データリセット）
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
      canBankrupt: false,
      message: '健全な状態です',
    };
  }

  const deficit = Math.abs(balance);

  // Pro版は借金上限なし
  if (isProUser) {
    let warningLevel: 0 | 1 | 2 | 3 = 1;
    if (deficit >= 2000) warningLevel = 3;
    else if (deficit >= 1000) warningLevel = 2;
    else if (deficit >= 500) warningLevel = 1;

    return {
      isInDebt: true,
      deficit,
      warningLevel,
      canBankrupt: false,
      message: `借金: ${deficit} Lex（Pro版は上限なし）`,
    };
  }

  // Free版は-1000で強制破産
  if (balance <= BANKRUPTCY_THRESHOLD_FREE) {
    return {
      isInDebt: true,
      deficit,
      warningLevel: 3,
      canBankrupt: true,
      message: '破産状態です。全データをリセットして再出発できます。',
    };
  }

  // 破産寸前の警告レベル
  let warningLevel: 0 | 1 | 2 | 3 = 1;
  if (deficit >= 800) warningLevel = 3;
  else if (deficit >= 500) warningLevel = 2;
  else if (deficit >= 200) warningLevel = 1;

  return {
    isInDebt: true,
    deficit,
    warningLevel,
    canBankrupt: false,
    message: `借金: ${deficit} Lex（残り ${Math.abs(BANKRUPTCY_THRESHOLD_FREE) - deficit} Lex で破産）`,
  };
}

/**
 * 破産処理（全データリセット）
 * Free版のみ実行可能
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
