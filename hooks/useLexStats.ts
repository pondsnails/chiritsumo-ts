/**
 * useLexStats - Lex統計情報の計算
 */
import { useMemo } from 'react';
import { useServices } from '@core/di/ServicesProvider';
import type { Card, Book } from '@core/types';

interface UseLexStatsReturn {
  reviewLex: number;
  newLexCurrent: number;
  combinedLex: number;
  targetLex: number;
}

export function useLexStats(
  dueCards: Card[],
  newCards: Card[],
  books: Book[],
  dailyTargetLex: number
): UseLexStatsReturn {
  const { questService } = useServices();

  return useMemo(() => {
    const reviewLex = questService.calculateTotalLex(dueCards, books);
    const newLexCurrent = questService.calculateTotalLex(newCards, books);
    const combinedLex = reviewLex + newLexCurrent;

    return {
      reviewLex,
      newLexCurrent,
      combinedLex,
      targetLex: dailyTargetLex,
    };
  }, [dueCards, newCards, books, dailyTargetLex, questService]);
}
