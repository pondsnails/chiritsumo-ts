import { useEffect, useState, useCallback, useMemo } from 'react';
import { useBookStore } from '@core/store/bookStore';
import { useCardStore } from '@core/store/cardStore';
import { inventoryPresetsDB, cardsDB } from '@core/database/db';
import { calculateLexPerCard } from '@core/logic/lexCalculator';
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
  const { fetchDueCards } = useCardStore();
  const [isLoading, setIsLoading] = useState(true);
  const [dueCards, setDueCards] = useState<Card[]>([]);
  const [newCards, setNewCards] = useState<Card[]>([]);
  const [presets, setPresets] = useState<InventoryPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<number | null>(null);
  const [dailyTargetLex, setDailyTargetLex] = useState<number>(600);
  const [initialDueCount, setInitialDueCount] = useState<number>(0);

  const loadPresets = useCallback(async () => {
    const loaded = await inventoryPresetsDB.getAll();
    setPresets(loaded);
    const def = loaded.find(p => p.isDefault);
    if (def) setActivePresetId(def.id);
  }, []);

  const loadDailyTarget = useCallback(async () => {
    try {
      const val = await getDailyLexTarget();
      setDailyTargetLex(val);
    } catch {
      setDailyTargetLex(600);
    }
  }, []);

  const resolveBookIds = useCallback((): string[] => {
    let ids: string[];
    if (activePresetId) {
      const preset = presets.find(p => p.id === activePresetId);
      ids = preset?.bookIds || [];
    } else {
      ids = books.filter(b => b.status === 0).map(b => b.id);
    }
    if (ids.length === 0 && books.length > 0) {
      ids = books.filter(b => b.status === 0).map(b => b.id);
      if (ids.length === 0) ids = books.map(b => b.id); // fallback after restore
    }
    return ids;
  }, [activePresetId, presets, books]);

  const refreshDue = useCallback(async () => {
    const ids = resolveBookIds();
    if (ids.length === 0) { setDueCards([]); return; }
    const cards = await fetchDueCards(ids);
    setDueCards(cards);
    setInitialDueCount(prev => prev === 0 ? cards.length : prev);
  }, [fetchDueCards, resolveBookIds]);

  const refreshNew = useCallback(async () => {
    const today = new Date(); today.setHours(0,0,0,0);
    const ids = resolveBookIds();
    if (ids.length === 0) { setNewCards([]); return; }
    const allNew = await cardsDB.getNewCards(1000);
    const todayNew = allNew.filter(card => {
      const d = new Date(card.due); d.setHours(0,0,0,0);
      return d.getTime() === today.getTime() && ids.includes(card.bookId);
    });
    setNewCards(todayNew);
  }, [resolveBookIds]);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await fetchBooks();
    await loadPresets();
    await loadDailyTarget();
    await refreshDue();
    await refreshNew();
    setIsLoading(false);
  }, [fetchBooks, loadPresets, loadDailyTarget, refreshDue, refreshNew]);

  useEffect(() => { refreshAll(); }, []);
  useEffect(() => { if (books.length) { refreshDue(); refreshNew(); } }, [books, activePresetId]);

  const calculateTotalLex = useCallback((cards: Card[]) => {
    const modeMap = new Map(books.map(b => [b.id, b.mode]));
    return cards.reduce((sum, c) => sum + calculateLexPerCard(modeMap.get(c.bookId) || 0), 0);
  }, [books]);

  const groupCardsByBook = useCallback((cards: Card[]) => {
    const bookMap = new Map(books.map(b => [b.id, b]));
    const grouped = new Map<string, { book: typeof books[0]; cards: Card[] }>();
    cards.forEach(card => {
      const book = bookMap.get(card.bookId);
      if (!book) return;
      if (!grouped.has(card.bookId)) grouped.set(card.bookId, { book, cards: [] });
      grouped.get(card.bookId)!.cards.push(card);
    });
    return Array.from(grouped.values());
  }, [books]);

  const groupedReviewCards = useMemo(() => groupCardsByBook(dueCards), [dueCards, groupCardsByBook]);
  const groupedNewCards = useMemo(() => groupCardsByBook(newCards), [newCards, groupCardsByBook]);
  const reviewLex = useMemo(() => calculateTotalLex(dueCards), [dueCards, calculateTotalLex]);
  const newLexCurrent = useMemo(() => calculateTotalLex(newCards), [newCards, calculateTotalLex]);
  const targetLex = dailyTargetLex;
  const combinedLex = reviewLex + newLexCurrent;

  const selectedBookIds = useMemo(() => resolveBookIds(), [resolveBookIds]);

  const recommended = useMemo(() => computeRecommendedNewAllocation({
    books, selectedBookIds, reviewLex, newLexCurrent, targetLex,
  }), [books, selectedBookIds, reviewLex, newLexCurrent, targetLex]);

  const globalNext = useMemo(() => {
    if (dueCards.length === 0) return null;
    const now = new Date();
    const filtered = dueCards.filter(c => c.due <= now);
    if (filtered.length === 0) return null;
    return filtered.sort((a, b) => a.due.getTime() - b.due.getTime())[0];
  }, [dueCards]);
  const globalNextBook = useMemo(() => {
    if (!globalNext) return null;
    return books.find(b => b.id === globalNext.bookId) || null;
  }, [globalNext, books]);

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
    reviewLex,
    newLexCurrent,
    targetLex,
    combinedLex,
    recommended,
    groupedReviewCards,
    groupedNewCards,
    selectedBookIds,
    globalNext,
    globalNextBook,
  };
}
