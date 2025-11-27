import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useQuestData } from '../../hooks/useQuestData';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Play, Settings } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';
import { useBookStore } from '@core/store/bookStore';
import { useCardStore } from '@core/store/cardStore';
import { calculateLexPerCard } from '@core/logic/lexCalculator';
import { createScheduler } from '@core/fsrs/scheduler';
import { inventoryPresetsDB, cardsDB } from '@core/database/db';
import { getDailyLexTarget } from '@core/services/lexSettingsService';
import { assignNewCardsToday, assignNewCardsByAllocation } from '@core/services/cardPlanService';
import { computeRecommendedNewAllocation } from '@core/services/recommendationService';
import { InventoryFilterChip } from '@core/components/InventoryFilterChip';
import ProgressBar from '@core/components/ProgressBar';
import { RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { InventoryFilterModal } from '@core/components/InventoryFilterModal';
import RegisterStudiedModal from '@core/components/RegisterStudiedModal';
import i18n from '@core/i18n';
import type { Card, InventoryPreset } from '@core/types';

export default function QuestScreen() {
  const router = useRouter();
  const { books, fetchBooks } = useBookStore();
  const { fetchDueCards } = useCardStore();
  const [isLoading, setIsLoading] = useState(true);
  const [dueCards, setDueCards] = useState<Card[]>([]);
  const [newCards, setNewCards] = useState<Card[]>([]);
  const [presets, setPresets] = useState<InventoryPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<number | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerDefaultBook, setRegisterDefaultBook] = useState<string | undefined>(undefined);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [dailyTargetLex, setDailyTargetLex] = useState<number>(600); // 設定画面の値
  const [initialDueCount, setInitialDueCount] = useState<number>(0);
  const [celebrate, setCelebrate] = useState(false);
  const [showCompletionToast, setShowCompletionToast] = useState(false);
  // 詳細表示トグル（初期は非表示で認知負荷を下げる）
  const [showAdvancedReview, setShowAdvancedReview] = useState(false);
  const [showAdvancedNew, setShowAdvancedNew] = useState(false);

  // 画面フォーカス時に自動更新
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    if (books.length > 0) {
      loadDueCards();
      loadNewCards();
    }
  }, [books, activePresetId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await fetchBooks();
      await loadPresets();
      await loadDailyTarget();
    } catch (error) {
      console.error('Failed to load quest data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPresets = async () => {
    try {
      const loadedPresets = await inventoryPresetsDB.getAll();
      setPresets(loadedPresets);
      const defaultPreset = loadedPresets.find(p => p.isDefault);
      if (defaultPreset) {
        setActivePresetId(defaultPreset.id);
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  const loadDueCards = async () => {
    try {
      let bookIdsToQuery: string[];

      if (activePresetId) {
        const activePreset = presets.find(p => p.id === activePresetId);
        bookIdsToQuery = activePreset?.bookIds || [];
      } else {
        bookIdsToQuery = books.filter(b => b.status === 0).map(b => b.id);
      }

      // プリセットが空配列の場合は全アクティブ書籍を対象にフォールバック
      if (bookIdsToQuery.length === 0 && books.length > 0) {
        bookIdsToQuery = books.filter(b => b.status === 0).map(b => b.id);
        if (bookIdsToQuery.length === 0) {
          // アクティブ書籍が無い場合は全書籍を対象（復元直後の互換性フォールバック）
          bookIdsToQuery = books.map(b => b.id);
        }
      }

      if (bookIdsToQuery.length > 0) {
        const cards = await fetchDueCards(bookIdsToQuery);
        setDueCards(cards);
        // 初期カウント未設定なら設定（開始時の総復習枚数）
        setInitialDueCount(prev => prev === 0 ? cards.length : prev);
      } else {
        setDueCards([]);
      }
    } catch (error) {
      console.error('Failed to load due cards:', error);
      setDueCards([]);
    }
  };

  const loadNewCards = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let bookIdsToQuery: string[];

      if (activePresetId) {
        const activePreset = presets.find(p => p.id === activePresetId);
        bookIdsToQuery = activePreset?.bookIds || [];
      } else {
        bookIdsToQuery = books.filter(b => b.status === 0).map(b => b.id);
      }

      // プリセットが空配列の場合は全アクティブ書籍を対象にフォールバック
      if (bookIdsToQuery.length === 0 && books.length > 0) {
        bookIdsToQuery = books.filter(b => b.status === 0).map(b => b.id);
        if (bookIdsToQuery.length === 0) {
          // アクティブ書籍が無い場合は全書籍を対象（復元直後の互換性フォールバック）
          bookIdsToQuery = books.map(b => b.id);
        }
      }

      if (bookIdsToQuery.length > 0) {
        // 今日割り当てられた新規カード（state=0, due=today）を取得
        const allNewCards = await cardsDB.getNewCards(1000);
        const todayNewCards = allNewCards.filter(card => {
          const cardDue = new Date(card.due);
          cardDue.setHours(0, 0, 0, 0);
          return cardDue.getTime() === today.getTime() && bookIdsToQuery.includes(card.bookId);
        });
        setNewCards(todayNewCards);
      } else {
        setNewCards([]);
      }
    } catch (error) {
      console.error('Failed to load new cards:', error);
      setNewCards([]);
    }
  };

  const loadDailyTarget = async () => {
    try {
      const target = await getDailyLexTarget();
      setDailyTargetLex(target);
    } catch (error) {
      // デフォルトは moderate 相当の600
      setDailyTargetLex(600);
    }
  };

  const calculateTotalLex = (cards: Card[]) => {
    const bookModeMap = new Map(books.map(b => [b.id, b.mode]));
    return cards.reduce((total, card) => {
      const mode = bookModeMap.get(card.bookId) || 0;
      return total + calculateLexPerCard(mode);
    }, 0);
  };

  const groupCardsByBook = (cards: Card[]) => {
    const bookMap = new Map(books.map(b => [b.id, b]));
    const grouped = new Map<string, { book: typeof books[0]; cards: Card[] }>();

    cards.forEach(card => {
      const book = bookMap.get(card.bookId);
      if (book) {
        if (!grouped.has(card.bookId)) {
          grouped.set(card.bookId, { book, cards: [] });
        }
        grouped.get(card.bookId)!.cards.push(card);
      }
    });

    return Array.from(grouped.values());
  };

  const getModeLabel = (mode: 0 | 1 | 2) => {
    switch (mode) {
      case 0: return i18n.t('common.modeRead');
      case 1: return i18n.t('common.modeSolve');
      case 2: return i18n.t('common.modeMemo');
    }
  };

  const getModeColor = (mode: 0 | 1 | 2) => {
    switch (mode) {
      case 0: return colors.read;
      case 1: return colors.solve;
      case 2: return colors.memo;
    }
  };

  const startStudy = (bookId: string) => {
    router.push(`/study?bookId=${bookId}`);
  };

  const handleFilterPress = (presetId: number) => {
    setActivePresetId(activePresetId === presetId ? null : presetId);
  };

  const handleFilterLongPress = () => {
    setShowFilterModal(true);
  };

  const handlePresetsChange = async () => {
    await loadPresets();
    await loadDueCards();
  };

  // 旧ロジック: レビュー/新規を別グループ化（書籍ごと1カード/カテゴリ）
  const groupedReviewCards = useMemo(() => groupCardsByBook(dueCards), [dueCards]);
  const groupedNewCards = useMemo(() => groupCardsByBook(newCards), [newCards]);

  // 目標と不足の計算
  const reviewLex = useMemo(() => calculateTotalLex(dueCards), [dueCards, books]);
  const newLexCurrent = useMemo(() => calculateTotalLex(newCards), [newCards, books]);
  const targetLex = dailyTargetLex;
  const combinedLex = reviewLex + newLexCurrent;

  const selectedBookIds = useMemo(() => {
    if (activePresetId) {
      const activePreset = presets.find(p => p.id === activePresetId);
      return activePreset?.bookIds || [];
    }
    return books.filter(b => b.status === 0).map(b => b.id);
  }, [activePresetId, presets, books]);

  const recommended = useMemo(() => {
    return computeRecommendedNewAllocation({
      books,
      selectedBookIds,
      reviewLex,
      newLexCurrent,
      targetLex,
    });
  }, [books, selectedBookIds, reviewLex, newLexCurrent, targetLex]);

  const newDeemphasized = combinedLex >= targetLex;
  const hasReviewPending = dueCards.length > 0;
  // 全 dueCards から最も早い due を取得（グローバル次カード）
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

  // 全復習完了検知（前フレーム >0 -> 現在 0）
  const prevDueCountRef = React.useRef<number>(0);
  useEffect(() => {
    const prev = prevDueCountRef.current;
    if (prev > 0 && dueCards.length === 0) {
      setCelebrate(true);
      setShowCompletionToast(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setCelebrate(false), 3500);
      setTimeout(() => setShowCompletionToast(false), 5000);
    }
    prevDueCountRef.current = dueCards.length;
  }, [dueCards.length]);

  if (isLoading) {
    return (
      <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>{i18n.t('quest.title')}</Text>
            <TouchableOpacity onPress={() => setShowActionsModal(true)} style={styles.settingsButton}>
              <Settings color={colors.textSecondary} size={24} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          {showCompletionToast && (
            <View style={styles.completionToast}>
              <Text style={styles.completionToastText}>復習お疲れさま！新規を進めましょう 🎉</Text>
            </View>
          )}

          {presets.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChips}
            >
              <TouchableOpacity
                style={[styles.allChip, !activePresetId && styles.allChipActive]}
                onPress={() => setActivePresetId(null)}
              >
                <Text style={[styles.allChipText, !activePresetId && styles.allChipTextActive]}>
                  {i18n.t('quest.filterAll')}
                </Text>
              </TouchableOpacity>
              {presets.map(preset => (
                <InventoryFilterChip
                  key={preset.id}
                  preset={preset}
                  isActive={activePresetId === preset.id}
                  onPress={() => handleFilterPress(preset.id)}
                  onLongPress={handleFilterLongPress}
                />
              ))}
            </ScrollView>
          )}

          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>今日の流れ</Text>
            <Text style={styles.bannerText}>1. 復習を全部終わらせる → 2. 不足Lex分を新規で補う → 3. 余裕があれば追加割り当て</Text>
          </View>
          <View style={styles.summaryContainer}>
            <View style={[glassEffect.card, styles.summaryCard]}>
              <Text style={styles.summaryLabel}>復習</Text>
              <Text style={styles.summaryValue}>{dueCards.length}</Text>
              <Text style={styles.summaryLex}>+{reviewLex} Lex</Text>
            </View>
            <View style={[glassEffect.card, styles.summaryCard]}>
              <Text style={styles.summaryLabel}>新規学習</Text>
              <Text style={styles.summaryValue}>{newCards.length}</Text>
              <Text style={styles.summaryLex}>+{newLexCurrent} Lex</Text>
            </View>
            <View style={[glassEffect.card, styles.summaryCard]}>
              <Text style={styles.summaryLabel}>目標</Text>
              <Text style={styles.summaryValue}>{targetLex}</Text>
              <Text style={[styles.summaryLex, { color: combinedLex >= targetLex ? colors.success : colors.error }]}>
                {combinedLex >= targetLex ? '達成済み' : `不足 ${targetLex - combinedLex} Lex`}
              </Text>
            </View>
          </View>

          {groupedReviewCards.length === 0 && groupedNewCards.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{i18n.t('quest.noDueCards')}</Text>
              <Text style={styles.emptySubtext}>
                {activePresetId
                  ? i18n.t('quest.noCardsInFilter')
                  : i18n.t('quest.addBooksPrompt')}
              </Text>
              <TouchableOpacity
                style={[styles.quickStartButton, { marginTop: 16 }]}
                onPress={async () => {
                  try {
                    // 現在のフィルタ（プリセット/アクティブ）に基づいて配布対象を決定
                    let bookIdsToQuery: string[];
                    if (activePresetId) {
                      const activePreset = presets.find(p => p.id === activePresetId);
                      bookIdsToQuery = activePreset?.bookIds || [];
                    } else {
                      bookIdsToQuery = books.filter(b => b.status === 0).map(b => b.id);
                    }
                    if (bookIdsToQuery.length === 0 && books.length > 0) {
                      bookIdsToQuery = books.filter(b => b.status === 0).map(b => b.id);
                      if (bookIdsToQuery.length === 0) {
                        bookIdsToQuery = books.map(b => b.id);
                      }
                    }

                    if (bookIdsToQuery.length === 0) return;

                    // デフォルトで合計10枚をラウンドロビン配布
                    const created = await assignNewCardsToday(books, bookIdsToQuery, 10);
                    if (created > 0) {
                      await loadDueCards();
                      await loadNewCards();
                    }
                  } catch (e) {
                    console.error('Quick start failed', e);
                  }
                }}
              >
                <Text style={styles.quickStartText}>今日の新規カードを10枚割り当てる</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickStartButton, { marginTop: 8, backgroundColor: colors.success }]}
                onPress={() => setShowRegisterModal(true)}
              >
                <Text style={styles.quickStartText}>既習範囲を復習として登録する</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {groupedReviewCards.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>🔄 復習（何も考えず評価するだけ）</Text>
                  <View style={styles.progressWrap}>
                    <ProgressBar value={initialDueCount === 0 ? 0 : (initialDueCount - dueCards.length) / Math.max(1, initialDueCount)} />
                    <Text style={styles.progressLabel}>残り {dueCards.length} / 初期 {initialDueCount}</Text>
                  </View>
                  {/* グローバル次カード */}
                  <View style={[glassEffect.card, styles.taskCard]}>    
                    {globalNext && globalNextBook ? (
                      <View style={styles.globalNextWrap}>
                        <Text style={styles.globalNextTitle}>{globalNextBook.title}</Text>
                        {(() => {
                          const chunkSize = globalNextBook.chunkSize && globalNextBook.chunkSize > 0 ? globalNextBook.chunkSize : 1;
                          const start = (globalNext.unitIndex - 1) * chunkSize + 1;
                          const end = Math.min(globalNext.unitIndex * chunkSize, globalNextBook.totalUnit);
                          return (
                            <Text style={styles.globalNextSub}>
                              学習単位 {globalNext.unitIndex}
                              {chunkSize > 1 ? ` (${start}–${end})` : ''}
                            </Text>
                          );
                        })()}
                        <Text style={styles.chunkHint}>学習単位＝書籍を chunkSize({globalNextBook.chunkSize || 1}) ごとに区切ったまとまり</Text>
                        <View style={styles.reviewButtons}>
                            <TouchableOpacity
                            style={[styles.ratingBtn, styles.ratingAgain]}
                            onPress={async () => {
                              try {
                                const scheduler = createScheduler(globalNextBook.mode);
                                const updated = scheduler.reviewAgain(globalNext);
                                await cardsDB.upsert(updated);
                                await loadDueCards();
                                  Haptics.selectionAsync();
                              } catch (e) { console.error('global review again failed', e); }
                            }}
                          >
                            <RotateCcw size={16} color={colors.text} />
                            <Text style={styles.ratingText}>もう一度</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.ratingBtn, styles.ratingHard]}
                            onPress={async () => {
                              try {
                                const scheduler = createScheduler(globalNextBook.mode);
                                const updated = scheduler.reviewHard(globalNext);
                                await cardsDB.upsert(updated);
                                await loadDueCards();
                                Haptics.selectionAsync();
                              } catch (e) { console.error('global review hard failed', e); }
                            }}
                          >
                            <AlertTriangle size={16} color={colors.text} />
                            <Text style={styles.ratingText}>難しい</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.ratingBtn, styles.ratingGood]}
                            onPress={async () => {
                              try {
                                const scheduler = createScheduler(globalNextBook.mode);
                                const updated = scheduler.reviewGood(globalNext);
                                await cardsDB.upsert(updated);
                                await loadDueCards();
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                if (dueCards.length - 1 <= 0) {
                                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                }
                              } catch (e) { console.error('global review good failed', e); }
                            }}
                          >
                            <CheckCircle size={16} color={colors.text} />
                            <Text style={styles.ratingText}>できた</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.reviewDone}>今日の復習は全て完了しました 🎉</Text>
                    )}
                    <TouchableOpacity
                      style={styles.advancedToggle}
                      onPress={() => setShowAdvancedReview(prev => !prev)}
                    >
                      <Text style={styles.advancedToggleText}>{showAdvancedReview ? '詳細を閉じる' : '書籍別の残りを見る'}</Text>
                    </TouchableOpacity>
                  </View>
                  {showAdvancedReview && (
                    <View style={styles.taskList}>
                      {groupedReviewCards.map(({ book, cards }) => {
                        const now = new Date();
                        const dueList = cards.filter(c => c.due <= now);
                        return (
                          <View key={book.id} style={[glassEffect.card, styles.simpleBookCard]}>
                            <Text style={styles.simpleBookTitle} numberOfLines={1}>{book.title}</Text>
                            <Text style={styles.simpleBookCount}>残り {dueList.length} 枚</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              <View style={[styles.section, (newDeemphasized || hasReviewPending) && styles.dimSection]}>
                <Text style={styles.sectionTitle}>🌱 新規{hasReviewPending ? '（復習完了後に推奨）' : ''}</Text>
                <View style={[glassEffect.card, styles.taskCard]}>
                  <Text style={styles.emptyText}>不足 {Math.max(0, targetLex - combinedLex)} Lex / 推奨 {recommended.total} 枚</Text>
                  <TouchableOpacity
                    style={[styles.startButton, (recommended.total === 0 || hasReviewPending) && { opacity: 0.5 }]}
                    disabled={recommended.total === 0 || hasReviewPending}
                    onPress={async () => {
                      try {
                        const created = await assignNewCardsByAllocation(books, recommended.perBook);
                        if (created > 0) {
                          await loadDueCards();
                          await loadNewCards();
                          await loadDailyTarget();
                        }
                      } catch (e) {
                        console.error('Assign recommended new failed', e);
                      }
                    }}
                  >
                    <Play color={colors.text} size={20} strokeWidth={2} fill={colors.text} />
                    <Text style={styles.startButtonText}>推奨を割り当てる</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.advancedToggle} onPress={() => setShowAdvancedNew(p => !p)}>
                    <Text style={styles.advancedToggleText}>{showAdvancedNew ? '詳細を閉じる' : '書籍別を見る'}</Text>
                  </TouchableOpacity>
                </View>
                {showAdvancedNew && groupedNewCards.length > 0 && (
                  <View style={styles.taskList}>
                    {groupedNewCards.map(({ book, cards }) => (
                      <View key={book.id} style={[glassEffect.card, styles.simpleBookCard]}>
                        <Text style={styles.simpleBookTitle} numberOfLines={1}>{book.title}</Text>
                        <Text style={styles.simpleBookCount}>割り当て済 {cards.length} 枚 / 推奨 {(recommended.perBook[book.id] || 0)} 枚</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <InventoryFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        books={books}
        presets={presets}
        onPresetsChange={handlePresetsChange}
      />
      {/* Actions modal */}
      <Modal visible={showActionsModal} transparent animationType="fade">
        <TouchableOpacity style={styles.actionsOverlay} activeOpacity={1} onPress={() => setShowActionsModal(false)}>
          <View style={styles.actionsCard}>
            <Text style={styles.actionsTitle}>クエスト操作</Text>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                setShowActionsModal(false);
                setShowFilterModal(true);
              }}
            >
              <Text style={styles.actionItemText}>フィルタを開く</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={async () => {
                setShowActionsModal(false);
                try {
                  let bookIdsToQuery: string[];
                  if (activePresetId) {
                    const activePreset = presets.find(p => p.id === activePresetId);
                    bookIdsToQuery = activePreset?.bookIds || [];
                  } else {
                    bookIdsToQuery = books.filter(b => b.status === 0).map(b => b.id);
                  }
                  if (bookIdsToQuery.length === 0 && books.length > 0) {
                    bookIdsToQuery = books.filter(b => b.status === 0).map(b => b.id);
                    if (bookIdsToQuery.length === 0) {
                      bookIdsToQuery = books.map(b => b.id);
                    }
                  }
                  if (bookIdsToQuery.length === 0) return;
                  const created = await assignNewCardsToday(books, bookIdsToQuery, 10);
                  if (created > 0) {
                    await loadDueCards();
                    await loadNewCards();
                  }
                } catch (e) {
                  console.error('Quick assign from actions menu failed', e);
                }
              }}
            >
              <Text style={styles.actionItemText}>今日の新規カードを10枚割り当てる</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                setShowActionsModal(false);
                setShowRegisterModal(true);
              }}
            >
              <Text style={styles.actionItemText}>既習範囲を復習として登録する</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <RegisterStudiedModal
        visible={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        books={books}
        defaultBookId={registerDefaultBook}
        onSubmit={async (book, s, e) => {
          try {
            const created = await (await import('@core/services/cardPlanService')).registerStudiedRange(book, s, e, true);
            if (created > 0) {
              await loadDueCards();
              await loadNewCards();
            }
          } catch (err) {
            console.error('failed to register studied range', err);
          }
          setRegisterDefaultBook(undefined);
        }}
      />
      {celebrate && (
        <ConfettiCannon count={120} origin={{ x: 40, y: 0 }} fadeOut fallSpeed={2500} explosionSpeed={600} />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  settingsButton: {
    padding: 8,
  },
  filterChips: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  allChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  allChipActive: {
    backgroundColor: `${colors.primary}20`,
    borderColor: colors.primary,
  },
  allChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  allChipTextActive: {
    color: colors.primary,
  },
  banner: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: 4,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  bannerText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  summaryLex: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  dimSection: {
    opacity: 0.6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  taskList: {
    gap: 12,
    marginHorizontal: 16,
  },
  taskCard: {
    padding: 16,
  },
  taskHeader: {
    marginBottom: 12,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modeBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  taskStats: {
    flexDirection: 'row',
    gap: 12,
  },
  taskCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  taskLex: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  smallBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  reviewInfo: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  reviewButtons: { flexDirection: 'row', gap: 6 },
  ratingBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingAgain: { backgroundColor: '#552222' },
  ratingHard: { backgroundColor: '#554d22' },
  ratingGood: { backgroundColor: '#225522' },
  ratingText: { fontSize: 13, fontWeight: '700', color: colors.text },
  reviewDone: { fontSize: 12, color: colors.success, marginBottom: 8, fontWeight: '600' },
  progressWrap: { marginHorizontal: 16, marginBottom: 8, gap: 4 },
  progressLabel: { fontSize: 11, color: colors.textSecondary, textAlign: 'right' },
  globalNextWrap: { gap: 8 },
  globalNextTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  globalNextSub: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  advancedToggle: { marginTop: 12, alignSelf: 'flex-end' },
  advancedToggleText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  simpleBookCard: { padding: 12, gap: 4 },
  simpleBookTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  simpleBookCount: { fontSize: 12, color: colors.textSecondary },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  quickStartButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  quickStartText: {
    color: colors.text,
    fontWeight: '700',
  },
  actionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  actionsCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: 8,
  },
  actionsTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  actionItem: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 12,
  },
  actionItemText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  completionToast: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.success,
  },
  completionToastText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  chunkHint: {
    fontSize: 10,
    color: colors.textSecondary,
  },
});
