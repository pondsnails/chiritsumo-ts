/**
 * useQuestData v3.0 - Composition Pattern
 * 
 * God Hook を以下の小さなフックに分解:
 * - useQuestCards: カードデータ取得
 * - useLexStats: Lex統計計算
 * - useQuestFilters: プリセットフィルター管理
 * - useQuestData: 上記を組み合わせた統合フック
 */
import { useEffect, useState, useMemo } from 'react';
import { useServices } from '@core/di/ServicesProvider';
import { useQuestCards } from './useQuestCards';
import { useLexStats } from './useLexStats';
import { useQuestFilters } from './useQuestFilters';
import { computeRecommendedNewAllocation } from '@core/services/recommendationService';
import { getDailyLexTarget } from '@core/services/lexSettingsService';
import type { Card } from '@core/types';

interface QuestData {
  isLoading: boolean;
  dueCards: Card[];
  newCards: Card[];
  presets: any[];
  activePresetId: number | null;
  setActivePresetId: (id: number | null) => void;
  refreshAll: () => Promise<void>;
  refreshDue: () => Promise<void>;
  refreshNew: () => Promise<void>;
  dailyTargetLex: number;
  initialDueCount: number;
  reviewLex: number;
  newLexCurrent: number;
  targetLex: number;
  combinedLex: number;
  recommended: { total: number; perBook: Record<string, number> };
  groupedReviewCards: { book: any; cards: Card[] }[];
  groupedNewCards: { book: any; cards: Card[] }[];
  selectedBookIds: string[];
  globalNext: Card | null;
  globalNextBook: any | null;
}

export function useQuestData(): QuestData {
  const { useBookStore, questService } = useServices();
  const { books, fetchBooks } = useBookStore();
  const [isLoading, setIsLoading] = useState(true);
  const [dailyTargetLex, setDailyTargetLex] = useState<number>(600);

  // 分解されたフック群
  const filters = useQuestFilters(books);
  const cards = useQuestCards();
  const lexStats = useLexStats(cards.dueCards, cards.newCards, books, dailyTargetLex);

  const refreshAll = async () => {
    setIsLoading(true);
    try {
      await fetchBooks();
      await filters.refreshPresets();
      
      try {
        const val = await getDailyLexTarget();
        setDailyTargetLex(val);
      } catch {
        setDailyTargetLex(600);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshDue = async () => {
    await cards.refreshDue(filters.selectedBookIds);
  };

  const refreshNew = async () => {
    await cards.refreshNew(filters.selectedBookIds);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (books.length > 0) {
      refreshDue();
      refreshNew();
    }
  }, [books.length, filters.activePresetId]);

  // グループ化と次のカード計算
  const computed = useMemo(() => {
    const groupedReviewCards = questService.groupCardsByBook(cards.dueCards, books);
    const groupedNewCards = questService.groupCardsByBook(cards.newCards, books);
    const globalNext = questService.getGlobalNextCard(cards.dueCards);
    const globalNextBook = globalNext ? books.find(b => b.id === globalNext.bookId) ?? null : null;

    return {
      groupedReviewCards,
      groupedNewCards,
      globalNext,
      globalNextBook,
    };
  }, [cards.dueCards, cards.newCards, books, questService]);

  const recommended = useMemo(
    () =>
      computeRecommendedNewAllocation({
        books,
        selectedBookIds: filters.selectedBookIds,
        reviewLex: lexStats.reviewLex,
        newLexCurrent: lexStats.newLexCurrent,
        targetLex: dailyTargetLex,
      }),
    [books, filters.selectedBookIds, lexStats.reviewLex, lexStats.newLexCurrent, dailyTargetLex]
  );

  return {
    isLoading,
    dueCards: cards.dueCards,
    newCards: cards.newCards,
    presets: filters.presets,
    activePresetId: filters.activePresetId,
    setActivePresetId: filters.setActivePresetId,
    refreshAll,
    refreshDue,
    refreshNew,
    dailyTargetLex,
    initialDueCount: cards.initialDueCount,
    reviewLex: lexStats.reviewLex,
    newLexCurrent: lexStats.newLexCurrent,
    targetLex: lexStats.targetLex,
    combinedLex: lexStats.combinedLex,
    recommended,
    groupedReviewCards: computed.groupedReviewCards,
    groupedNewCards: computed.groupedNewCards,
    selectedBookIds: filters.selectedBookIds,
    globalNext: computed.globalNext,
    globalNextBook: computed.globalNextBook,
  };
}
