import type { Card, LedgerEntry } from '../types';

export interface BankruptcyResult {
  isBankrupt: boolean;
  deficit: number;
  cardsToReset: Card[];
  estimatedRecovery: number;
}

export function checkBankruptcy(
  balance: number,
  cards: Card[]
): BankruptcyResult {
  if (balance >= 0) {
    return {
      isBankrupt: false,
      deficit: 0,
      cardsToReset: [],
      estimatedRecovery: 0,
    };
  }

  const deficit = Math.abs(balance);
  const sellableCards = cards
    .filter(card => card.state !== 0)
    .sort((a, b) => a.state - b.state);

  let totalRecovery = 0;
  const cardsToReset: Card[] = [];

  for (const card of sellableCards) {
    if (totalRecovery >= deficit) break;

    const sellPrice = getSellPrice(card);
    totalRecovery += sellPrice;
    cardsToReset.push(card);
  }

  return {
    isBankrupt: totalRecovery < deficit,
    deficit,
    cardsToReset,
    estimatedRecovery: totalRecovery,
  };
}

export function getSellPrice(card: Card): number {
  const basePrice = 10;
  const stateMultiplier = [0, 1, 1.5, 2, 2.5];
  return Math.floor(basePrice * stateMultiplier[card.state]);
}

export function calculatePenalty(deficit: number): number {
  return Math.floor(deficit * 0.5);
}

export async function executeBankruptcy(
  cards: Card[],
  currentBalance: number,
  updateCard: (id: string, updates: Partial<Card>) => Promise<void>,
  addLedgerEntry: (entry: Omit<LedgerEntry, 'id' | 'createdAt'>) => Promise<void>
): Promise<void> {
  const result = checkBankruptcy(currentBalance, cards);

  if (!result.isBankrupt) return;

  for (const card of result.cardsToReset) {
    await updateCard(card.id, {
      state: 0,
      due: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
    });
  }

  const penalty = calculatePenalty(result.deficit);
  const recoveredAmount = result.estimatedRecovery;
  const finalBalance = currentBalance + recoveredAmount - penalty;

  await addLedgerEntry({
    userId: 'local',
    date: new Date().toISOString(),
    targetLex: 0,
    earnedLex: recoveredAmount - penalty,
    balance: finalBalance,
  });
}
