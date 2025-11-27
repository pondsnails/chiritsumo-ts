/**
 * useQuestCards - カードデータの取得と管理
 */
import { useState, useCallback, useRef } from 'react';
import { useServices } from '@core/di/ServicesProvider';
import type { Card } from '@core/types';

interface UseQuestCardsReturn {
  dueCards: Card[];
  newCards: Card[];
  initialDueCount: number;
  refreshDue: (bookIds: string[]) => Promise<void>;
  refreshNew: (bookIds: string[]) => Promise<void>;
}

export function useQuestCards(): UseQuestCardsReturn {
  const { questService } = useServices();
  const [dueCards, setDueCards] = useState<Card[]>([]);
  const [newCards, setNewCards] = useState<Card[]>([]);
  const [initialDueCount, setInitialDueCount] = useState<number>(0);

  const refreshDue = useCallback(async (bookIds: string[]) => {
    if (bookIds.length === 0) {
      setDueCards([]);
      return;
    }

    const cards = await questService.getDueCardsForToday();
    const filtered = cards.filter(c => bookIds.includes(c.bookId));
    setDueCards(filtered);
    setInitialDueCount(prev => prev === 0 ? filtered.length : prev);
  }, [questService]);

  const refreshNew = useCallback(async (bookIds: string[]) => {
    if (bookIds.length === 0) {
      setNewCards([]);
      return;
    }

    const allNew = await questService.getNewCardsForBooks(bookIds);
    const todayNew = questService.filterTodayNewCards(allNew);
    setNewCards(todayNew);
  }, [questService]);

  return {
    dueCards,
    newCards,
    initialDueCount,
    refreshDue,
    refreshNew,
  };
}
