/**
 * useQuestData v2.0（DI対応版）
 * クエスト画面のデータ取得と管理を担当
 * 
 * リファクタリング完了:
 * - QuestServiceクラス（DI対応）を利用
 * - Repository層への依存を明示的に注入
 * - ビジネスロジックをService層に完全委譲
 */
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useBookStore } from '@core/store/bookStore';
import { useServices } from '@core/di/ServicesProvider';
import { computeRecommendedNewAllocation } from '@core/services/recommendationService';
import { getDailyLexTarget } from '@core/services/lexSettingsService';
import type { Card, InventoryPreset } from '@core/types';

interface QuestData {
  isLoading: boolean;
  dueCards: Card[];
  newCards: Card[];
  presets: InventoryPreset[];
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
  groupedReviewCards: { book: import('@core/types').Book; cards: Card[] }[];
  groupedNewCards: { book: import('@core/types').Book; cards: Card[] }[];
  selectedBookIds: string[];
  globalNext: Card | null;
  globalNextBook: import('@core/types').Book | null;
}

export function useQuestData(): QuestData {
  const { books, fetchBooks } = useBookStore();
  const [isLoading, setIsLoading] = useState(true);
  const [dueCards, setDueCards] = useState<Card[]>([]);
  const [newCards, setNewCards] = useState<Card[]>([]);
  const [presets, setPresets] = useState<InventoryPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<number | null>(null);
  const [dailyTargetLex, setDailyTargetLex] = useState<number>(600);
  const [initialDueCount, setInitialDueCount] = useState<number>(0);
  
  const isInitialized = useRef(false);

  // DIコンテキストからサービス取得（Repositoryの直接newを排除）
  const { questService } = useServices();

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetchBooks();
      const loaded = await questService.getInventoryPresets();
      setPresets(loaded);
      const def = loaded.find(p => p.isDefault);
      if (def && !activePresetId) setActivePresetId(def.id);
      
      try {
        const val = await getDailyLexTarget();
        setDailyTargetLex(val);
      } catch {
        setDailyTargetLex(600);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchBooks, questService, activePresetId]);

  const refreshDue = useCallback(async () => {
    const ids = questService.resolveTargetBookIds(books, presets, activePresetId);
    if (ids.length === 0) { 
      setDueCards([]); 
      return; 
    }
    
    // Service層でDueカード取得（内部でRepository呼び出し）
    const cards = await questService.getDueCardsForToday();
    // 対象書籍のみにフィルタ
    const filtered = cards.filter(c => ids.includes(c.bookId));
    setDueCards(filtered);
    setInitialDueCount(prev => prev === 0 ? filtered.length : prev);
  }, [questService, books, activePresetId, presets]);

  const refreshNew = useCallback(async () => {
    const ids = questService.resolveTargetBookIds(books, presets, activePresetId);
    if (ids.length === 0) { 
      setNewCards([]); 
      return; 
    }
    
    // すべての対象書籍から新規カードを一括取得（Service層経由）
    const allNew = await questService.getNewCardsForBooks(ids);
    
    // 今日作成されたカードのみにフィルタ
    const todayNew = questService.filterTodayNewCards(allNew);
    setNewCards(todayNew);
  }, [questService, books, activePresetId, presets]);

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      refreshAll();
    }
  }, [refreshAll]);
  
  useEffect(() => { 
    if (isInitialized.current && books.length > 0) { 
      refreshDue(); 
      refreshNew(); 
    }
  }, [books.length, activePresetId, refreshDue, refreshNew]);

  // 計算ロジックはQuestServiceに委譲
  const computed = useMemo(() => {
    const reviewLex = questService.calculateTotalLex(dueCards, books);
    const newLexCurrent = questService.calculateTotalLex(newCards, books);
    const combinedLex = reviewLex + newLexCurrent;
    
    const groupedReviewCards = questService.groupCardsByBook(dueCards, books);
    const groupedNewCards = questService.groupCardsByBook(newCards, books);
    
    const globalNext = questService.getGlobalNextCard(dueCards);
    const globalNextBook = globalNext ? books.find(b => b.id === globalNext.bookId) ?? null : null;
    
    return {
      reviewLex,
      newLexCurrent,
      combinedLex,
      groupedReviewCards,
      groupedNewCards,
      globalNext,
      globalNextBook,
    };
  }, [dueCards, newCards, books, questService]);

  const selectedBookIds = useMemo(
    () => questService.resolveTargetBookIds(books, presets, activePresetId),
    [questService, books, presets, activePresetId]
  );

  const recommended = useMemo(() => computeRecommendedNewAllocation({
    books, 
    selectedBookIds, 
    reviewLex: computed.reviewLex, 
    newLexCurrent: computed.newLexCurrent, 
    targetLex: dailyTargetLex,
  }), [books, selectedBookIds, computed.reviewLex, computed.newLexCurrent, dailyTargetLex]);

  return {
    isLoading,
    dueCards,
    newCards,
    presets,
    activePresetId,
    setActivePresetId,
    refreshAll,
    refreshDue,
    refreshNew,
    dailyTargetLex,
    initialDueCount,
    reviewLex: computed.reviewLex,
    newLexCurrent: computed.newLexCurrent,
    targetLex: dailyTargetLex,
    combinedLex: computed.combinedLex,
    recommended,
    groupedReviewCards: computed.groupedReviewCards,
    groupedNewCards: computed.groupedNewCards,
    selectedBookIds,
    globalNext: computed.globalNext,
    globalNextBook: computed.globalNextBook,
  };
}
