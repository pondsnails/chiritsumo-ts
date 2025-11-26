import type { Card, LedgerEntry } from '../types';

export interface BankruptcyResult {
  isInDebt: boolean;
  deficit: number;
  debtLevel: number; // 借金レベル (0-3)
  bonusQuests: string[]; // ボーナスクエスト（返済を促すポジティブな施策）
  rescueOptions: string[]; // 救済オプション
}

/**
 * 借金レベルによるボーナスクエスト・救済措置
 * 機能制限ではなく、ポジティブな行動で返済を促す設計
 * 
 * Level 0: 健全な状態
 * Level 1: 軽度の借金 - ボーナスクエスト提案
 * Level 2: 中度の借金 - 返済ボーナス2倍
 * Level 3: 重度の借金 - 徳政令（救済措置）が利用可能
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
      bonusQuests: [],
      rescueOptions: [],
    };
  }

  const deficit = Math.abs(balance);
  let debtLevel = 0;
  const bonusQuests: string[] = [];
  const rescueOptions: string[] = [];

  // 借金レベルの判定（機能制限なし）
  if (deficit >= 1000) {
    debtLevel = 3;
    bonusQuests.push('今日の学習で獲得したLexが3倍になります');
    bonusQuests.push('ブラックマーケットでカードを売却できます');
    rescueOptions.push('徳政令: 500 Lex で借金を半額に減免');
    rescueOptions.push('強化合宿: 通常の2倍学習すれば全額免除');
  } else if (deficit >= 500) {
    debtLevel = 2;
    bonusQuests.push('今日の学習で獲得したLexが2倍になります');
    bonusQuests.push('ブラックマーケットでカードを売却できます');
    rescueOptions.push('徳政令: 300 Lex で借金を半額に減免');
  } else if (deficit >= 100) {
    debtLevel = 1;
    bonusQuests.push('今日の学習で獲得したLexが1.5倍になります');
    rescueOptions.push('連続学習: 3日連続でノルマ達成すれば借金帳消し');
  }

  return {
    isInDebt: true,
    deficit,
    debtLevel,
    bonusQuests,
    rescueOptions,
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
 * 破産処理（進捗リセット廃止、機能制限も廃止）
 * マイナス残高を許容し、ボーナスクエストで返済を促す
 */
export async function executeBankruptcy(
  cards: Card[],
  currentBalance: number,
  updateCard: (id: string, updates: Partial<Card>) => Promise<void>,
  addLedgerEntry: (entry: Omit<LedgerEntry, 'id' | 'createdAt'>) => Promise<void>
): Promise<void> {
  const result = checkBankruptcy(currentBalance, cards);

  // 借金状態でも進捗はリセットしない、機能制限もしない
  // ユーザーは学習を続けることで借金を返済し、ボーナスLexを獲得できる
  if (!result.isInDebt) return;

  // ログ出力のみ（ボーナスクエストの通知）
  console.log(`Debt level ${result.debtLevel}: Bonus quests available -`, result.bonusQuests.join(', '));
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
