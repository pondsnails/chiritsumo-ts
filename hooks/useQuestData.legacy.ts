import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useBookStore } from '@core/store/bookStore';
import { useCardStore } from '@core/store/cardStore';
import { DrizzleInventoryPresetRepository } from '@core/repository/InventoryPresetRepository';
import { DrizzleCardRepository } from '@core/repository/CardRepository';
import { computeRecommendedNewAllocation } from '@core/services/recommendationService';
import { getDailyLexTarget } from '@core/services/lexSettingsService';
import { 
  computeQuestData, 
  resolveTargetBookIds, 
  filterTodayNewCards 
} from '@core/services/QuestService';
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
  const { fetchDueCards } = useCardStore();
  const [isLoading, setIsLoading] = useState(true);
  const [dueCards, setDueCards] = useState<Card[]>([]);
  const [newCards, setNewCards] = useState<Card[]>([]);
  const [presets, setPresets] = useState<InventoryPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<number | null>(null);
  const [dailyTargetLex, setDailyTargetLex] = useState<number>(600);
  const [initialDueCount, setInitialDueCount] = useState<number>(0);
  
  const isInitialized = useRef(false);
  const presetRepo = useMemo(() => new DrizzleInventoryPresetRepository(), []);
  const cardRepo = useMemo(() => new DrizzleCardRepository(), []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetchBooks();
      const loaded = await presetRepo.findAll();
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
  }, [fetchBooks, presetRepo, activePresetId]);

  const refreshDue = useCallback(async () => {
    const ids = resolveBookIds();
    if (ids.length === 0) { setDueCards([]); return; }
    const cards = await fetchDueCards(ids);
    setDueCards(cards);
    setInitialDueCount(prev => prev === 0 ? cards.length : prev);
  }, [fetchDueCards, books, activePresetId, presets]);

  const refreshNew = useCallback(async () => {
    const ids = resolveTargetBookIds(activePresetId, presets, books);
    if (ids.length === 0) { setNewCards([]); return; }
    
    const allNew = await cardRepo.findNew(ids);
    const todayNew = filterTodayNewCards(allNew, ids);
    setNewCards(todayNew);
  }, [cardRepo, books, activePresetId, presets]);
  
  const resolveBookIds = useCallback((): string[] => {
    return resolveTargetBookIds(activePresetId, presets, books);
  }, [activePresetId, presets, books]);

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
  }, [books.length, activePresetId]);

  // 計算ロジックはQuestServiceに委譲
  const computed = useMemo(() => {
    return computeQuestData(dueCards, newCards, books);
  }, [dueCards, newCards, books]);

  const selectedBookIds = useMemo(() => resolveBookIds(), [resolveBookIds]);

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
