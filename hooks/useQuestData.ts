/**
 * useQuestData - Composition Pattern (分解版)
 * 
 * God Hook を以下の小さなフックに分解:
 * - useQuestCards: カードデータ取得
 * - useLexStats: Lex統計計算
 * - useQuestFilters: プリセットフィルター管理
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useServices } from '@core/di/ServicesProvider';
import { useQuestCards } from './useQuestCards';
import { useLexStats } from './useLexStats';
import { useQuestFilters } from './useQuestFilters';
import { computeRecommendedNewAllocation } from '@core/services/recommendationService';
import { getDailyLexTarget } from '@core/services/lexSettingsService';
import type { Card, Book } from '@core/types';

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
  groupedReviewCards: { book: Book; cards: Card[] }[];
  groupedNewCards: { book: Book; cards: Card[] }[];
  selectedBookIds: string[];
  globalNext: Card | null;
  globalNextBook: Book | null;
}

export function useQuestData(): QuestData {
  console.log('[useQuestData] Hook initialized');
  const { useBookStore, questService } = useServices();
  const { books, fetchBooks } = useBookStore();
  const [isLoading, setIsLoading] = useState(true);
  const [dailyTargetLex, setDailyTargetLex] = useState<number>(600);

  console.log('[useQuestData] Books count:', books.length);
  
  // 分解されたフック群
  console.log('[useQuestData] Calling useQuestFilters...');
  const filters = useQuestFilters(books);
  console.log('[useQuestData] Calling useQuestCards...');
  const cards = useQuestCards();
  console.log('[useQuestData] Calling useLexStats...');
  const lexStats = useLexStats(cards.dueCards, cards.newCards, books, dailyTargetLex);
  console.log('[useQuestData] All hooks initialized');

  const refreshAll = useCallback(async () => {
    console.log('[useQuestData] refreshAll started');
    setIsLoading(true);
    try {
      console.log('[useQuestData] Fetching books...');
      await fetchBooks();
      console.log('[useQuestData] Refreshing presets...');
      await filters.refreshPresets();
      
      try {
        console.log('[useQuestData] Getting daily lex target...');
        const val = await getDailyLexTarget();
        setDailyTargetLex(val);
        console.log('[useQuestData] Daily lex target:', val);
      } catch (e) {
        console.log('[useQuestData] Failed to get daily lex target, using default 600');
        setDailyTargetLex(600);
      }
    } finally {
      console.log('[useQuestData] refreshAll completed, setting isLoading to false');
      setIsLoading(false);
    }
  }, [fetchBooks, filters.refreshPresets]);

  const refreshDue = useCallback(async () => {
    await cards.refreshDue(filters.selectedBookIds);
  }, [cards.refreshDue, filters.selectedBookIds]);

  const refreshNew = useCallback(async () => {
    await cards.refreshNew(filters.selectedBookIds);
  }, [cards.refreshNew, filters.selectedBookIds]);

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (books.length > 0) {
      refreshDue();
      refreshNew();
    }
  }, [books.length, filters.activePresetId]);

  // IDの配列を作成（プリミティブ値の配列なので安定）
  const bookIds = useMemo(() => {
    const ids = books.map(b => b.id).join(',');
    console.log('[useQuestData] bookIds memo:', ids);
    return ids;
  }, [books]);
  
  const dueCardIds = useMemo(() => {
    const ids = cards.dueCards.map(c => c.id).join(',');
    console.log('[useQuestData] dueCardIds memo:', ids.substring(0, 50));
    return ids;
  }, [cards.dueCards]);
  
  const newCardIds = useMemo(() => {
    const ids = cards.newCards.map(c => c.id).join(',');
    console.log('[useQuestData] newCardIds memo:', ids.substring(0, 50));
    return ids;
  }, [cards.newCards]);
  
  const selectedIds = useMemo(() => {
    const ids = filters.selectedBookIds.join(',');
    console.log('[useQuestData] selectedIds memo:', ids);
    return ids;
  }, [filters.selectedBookIds]);

  // グループ化と次のカード計算
  const computed = useMemo(() => {
    console.log('[useQuestData] Computing groupedCards...');
    const groupedReviewCards = questService.groupCardsByBook(cards.dueCards, books);
    const groupedNewCards = questService.groupCardsByBook(cards.newCards, books);
    const globalNext = questService.getGlobalNextCard(cards.dueCards);
    const globalNextBook = globalNext ? books.find(b => b.id === globalNext.bookId) ?? null : null;

    console.log('[useQuestData] Computed groups - review:', groupedReviewCards.length, 'new:', groupedNewCards.length);
    return {
      groupedReviewCards,
      groupedNewCards,
      globalNext,
      globalNextBook,
    };
  }, [dueCardIds, newCardIds, bookIds]);

  const recommended = useMemo(
    () => {
      console.log('[useQuestData] Computing recommended allocation...');
      const result = computeRecommendedNewAllocation({
        books,
        selectedBookIds: filters.selectedBookIds,
        reviewLex: lexStats.reviewLex,
        newLexCurrent: lexStats.newLexCurrent,
        targetLex: dailyTargetLex,
      });
      console.log('[useQuestData] Recommended total:', result.total);
      return result;
    },
    [bookIds, selectedIds, lexStats.reviewLex, lexStats.newLexCurrent, dailyTargetLex]
  );

  console.log('[useQuestData] Returning data, isLoading:', isLoading);
  
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
