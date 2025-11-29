import React, { useEffect, useState, useCallback } from 'react';
import { useQuestData } from '../../hooks/useQuestData';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Settings } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';
import { useServices } from '@core/di/ServicesProvider';
import { InventoryFilterChip } from '@core/components/InventoryFilterChip';
import { InventoryFilterModal } from '@core/components/InventoryFilterModal';
import RegisterStudiedModal from '@core/components/RegisterStudiedModal';
import { SummaryCards, ReviewSection, NewSection } from '@core/components/quest';
import { SkeletonQuestHeader } from '@core/components/Skeleton';
import i18n from '@core/i18n';
import { getModeLabel, getModeColor } from '@core/utils/uiHelpers';
import type { InventoryPreset } from '@core/types';
import { getVelocityData } from '@core/services/velocityService';
import { getLexConfig } from '@core/services/configService';
import { DrizzleSystemSettingsRepository } from '@core/repository/SystemSettingsRepository';

export default function QuestScreen() {
  console.log('[QuestScreen] Component rendering');
  const router = useRouter();
  const { useBookStore, learningSessionService } = useServices();
  const { books } = useBookStore();
  const settingsRepo = new DrizzleSystemSettingsRepository();
  
  console.log('[QuestScreen] Calling useQuestData...');
  // useQuestDataフックからすべてのデータとロジックを取得
  const questData = useQuestData();
  console.log('[QuestScreen] useQuestData returned, isLoading:', questData.isLoading);
  
  const {
    isLoading,
    dueCards,
    newCards,
    presets,
    activePresetId,
    setActivePresetId,
    refreshAll,
    refreshDue,
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
  } = questData;
  
  // UI状態のみ管理
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerDefaultBook, setRegisterDefaultBook] = useState<string | undefined>(undefined);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [showCompletionToast, setShowCompletionToast] = useState(false);
  const [avgVelocityLexPerMin, setAvgVelocityLexPerMin] = useState<number | null>(null);
  const [minutesPerDayEstimate, setMinutesPerDayEstimate] = useState<number | null>(null);
  const [completionDaysEstimate, setCompletionDaysEstimate] = useState<number | null>(null);
  const [lastStudiedBookId, setLastStudiedBookId] = useState<string | null>(null);
  const [showGacha, setShowGacha] = useState(false);
  const [gachaLex, setGachaLex] = useState<number | null>(null);
  const [gachaBook, setGachaBook] = useState<string | null>(null);

  // 画面フォーカス時に自動更新
  useFocusEffect(
    useCallback(() => {
      refreshAll();
      // 最後に学習した書籍IDを取得
      (async () => {
        try {
          const lastBookId = await settingsRepo.get('last_studied_book_id');
          setLastStudiedBookId(lastBookId);
        } catch (e) {
          console.warn('Failed to load last studied book', e);
        }
      })();
      // 速度情報の取得
      (async () => {
        try {
          const vd = await getVelocityData();
          setAvgVelocityLexPerMin(vd.averageVelocity);
          // 書籍完了予測（日数）
          if (globalNextBook) {
            const lexCfg = await getLexConfig();
            const baseLex = globalNextBook.mode === 1 ? lexCfg.solve : (globalNextBook.mode === 2 ? lexCfg.memo : lexCfg.read);
            const total = globalNextBook.totalUnit;
            const completed = globalNextBook.completedUnit ?? 0;
            const chunk = globalNextBook.chunkSize ?? 1;
            const remainingUnits = Math.max(0, total - completed);
            const cardsLeft = Math.ceil(remainingUnits / chunk);
            const totalLexLeft = cardsLeft * baseLex;
            if (dailyTargetLex && dailyTargetLex > 0) {
              setCompletionDaysEstimate(Math.max(1, Math.ceil(totalLexLeft / dailyTargetLex)));
            } else {
              setCompletionDaysEstimate(null);
            }
          } else {
            setCompletionDaysEstimate(null);
          }
        } catch (e) {
          console.warn('Failed to load velocity data', e);
        }
      })();
    }, [refreshAll])
  );

  const startStudy = async (bookId: string) => {
    const book = books.find(b => b.id === bookId);
    // 最後に学習した書籍IDを保存
    try {
      await settingsRepo.set('last_studied_book_id', bookId);
      setLastStudiedBookId(bookId);
    } catch (e) {
      console.warn('Failed to save last studied book', e);
    }
    // Read/Memoモードは一括検品画面へ、Solveは従来通り
    if (book && (book.mode === 0 || book.mode === 2)) {
      router.push(`/study-memo?bookId=${bookId}` as any);
    } else {
      router.push(`/study?bookId=${bookId}` as any);
    }
  };

  const handleFilterPress = (presetId: number) => {
    setActivePresetId(activePresetId === presetId ? null : presetId);
  };

  const handleFilterLongPress = () => {
    setShowFilterModal(true);
  };

  const newDeemphasized = combinedLex >= targetLex;
  const hasReviewPending = dueCards.length > 0;
  const [showDetails, setShowDetails] = useState(false);

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

  // 目標Lexを分換算（Lex/分の速度が取得できる場合）
  useEffect(() => {
    if (dailyTargetLex && avgVelocityLexPerMin && avgVelocityLexPerMin > 0) {
      setMinutesPerDayEstimate(Math.round(dailyTargetLex / avgVelocityLexPerMin));
    } else if (dailyTargetLex) {
      // 速度計測未完了時の暫定換算: 10 Lex ≈ 1分
      setMinutesPerDayEstimate(Math.round(dailyTargetLex / 10));
    } else {
      setMinutesPerDayEstimate(null);
    }
  }, [dailyTargetLex, avgVelocityLexPerMin]);

  // ガチャ演出を表示する関数
  const triggerGacha = (lex: number, bookTitle: string) => {
    setGachaLex(lex);
    setGachaBook(bookTitle);
    setShowGacha(true);
    setTimeout(() => setShowGacha(false), 3500);
  };

  if (isLoading) {
    return (
      <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.title}>{i18n.t('quest.title')}</Text>
            </View>
            <SkeletonQuestHeader />
          </ScrollView>
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
          </View>
          {showCompletionToast && (
            <View style={styles.completionToast}>
              <Text style={styles.completionToastText}>復習お疲れさま！新規を進めましょう 🎉</Text>
            </View>
          )}

          {/* 前回の続きから開始ボタン（最上位優先） */}
          {lastStudiedBookId && books.find(b => b.id === lastStudiedBookId && b.status !== 2) && (
            <View style={styles.resumeSection}>
              <Text style={styles.resumeLabel}>前回の続きから</Text>
              <TouchableOpacity
                style={styles.resumeButton}
                onPress={() => startStudy(lastStudiedBookId)}
              >
                <View style={styles.resumeContent}>
                  <Text style={styles.resumeEmoji}>▶️</Text>
                  <View style={styles.resumeTextContainer}>
                    <Text style={styles.resumeTitle}>
                      {books.find(b => b.id === lastStudiedBookId)?.title}
                    </Text>
                    <Text style={styles.resumeSubtitle}>タップで即再開</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Hero Section - 巨大な単一アクションボタン */}
          <View style={styles.heroSection}>
            {hasReviewPending ? (
              <>
                <Text style={styles.emptyIcon}>🔔</Text>
                <Text style={styles.emptyText}>まずは復習を片付けましょう</Text>
                {globalNextBook && (
                  <Text style={styles.emptySubtext}>対象書籍：{globalNextBook.title}（ルート最上位の進行中）</Text>
                )}
                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={() => {
                    if (globalNextBook?.id) {
                      startStudy(globalNextBook.id);
                    } else if (dueCards[0]?.bookId) {
                      startStudy(dueCards[0].bookId);
                    }
                  }}
                >
                  <Text style={styles.primaryActionText}>復習を開始</Text>
                </TouchableOpacity>
              </>
            ) : combinedLex < targetLex ? (
              <>
                <Text style={styles.emptyIcon}>🎯</Text>
                <Text style={styles.emptyText}>目標に向けて新規を追加しましょう</Text>
                {globalNextBook && (
                  <Text style={styles.emptySubtext}>対象書籍：{globalNextBook.title}（ルート最上位の進行中）</Text>
                )}
                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={async () => {
                    try {
                      const created = await learningSessionService.distributeNewCardsByAllocation(recommended.perBook);
                      if (created > 0) {
                        await refreshAll();
                        const firstBook = Object.keys(recommended.perBook)[0];
                        if (firstBook) startStudy(firstBook);
                      }
                    } catch (e) {
                      console.error('Global next (new) failed', e);
                    }
                  }}
                >
                  <Text style={styles.primaryActionText}>新規学習を開始</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.emptyIcon}>🌿</Text>
                <Text style={styles.emptyText}>今日の目標は達成済みです</Text>
                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={() => router.push('/study' as any)}
                >
                  <Text style={styles.primaryActionText}>自由学習へ</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={() => setShowDetails(s => !s)} style={[styles.quickStartButton, { marginTop: 16 }]}> 
              <Text style={styles.quickStartText}>{showDetails ? '詳細を隠す' : '詳細を見る'}</Text>
            </TouchableOpacity>
          </View>

          {showDetails ? (
            <>
              {groupedReviewCards.length > 0 && (
                <ReviewSection
                  dueCards={dueCards}
                  initialDueCount={initialDueCount}
                  groupedReviewCards={groupedReviewCards}
                  globalNext={globalNext}
                  globalNextBook={globalNextBook}
                  onReviewComplete={async () => {
                    await refreshDue();
                    // 学習完了時にガチャ演出をトリガー
                    if (dueCards.length === 1 && globalNextBook) {
                      // 仮: 1回分のLexを表示
                      const lexCfg = await getLexConfig();
                      const baseLex = globalNextBook.mode === 1 ? lexCfg.solve : (globalNextBook.mode === 2 ? lexCfg.memo : lexCfg.read);
                      triggerGacha(baseLex, globalNextBook.title);
                    }
                  }}
                />
              )}

              <NewSection
                newDeemphasized={newDeemphasized}
                hasReviewPending={hasReviewPending}
                targetLex={targetLex}
                combinedLex={combinedLex}
                recommendedTotal={recommended.total}
                recommendedPerBook={recommended.perBook}
                groupedNewCards={groupedNewCards}
                onAssignRecommended={async () => {
                  try {
                    const created = await learningSessionService.distributeNewCardsByAllocation(recommended.perBook);
                    if (created > 0) {
                      await refreshAll();
                    }
                  } catch (e) {
                    console.error('Assign recommended new failed', e);
                  }
                }}
              />
            </>
          ) : groupedReviewCards.length === 0 && groupedNewCards.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyText}>{i18n.t('quest.noDueCards')}</Text>
              <Text style={styles.emptySubtext}>
                {activePresetId
                  ? i18n.t('quest.noCardsInFilter')
                  : i18n.t('quest.addBooksPrompt')}
              </Text>
              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={async () => {
                  try {
                    const created = await learningSessionService.distributeNewCards(
                      activePresetId,
                      presets,
                      10
                    );
                    
                    if (created > 0) {
                      await refreshAll();
                    }
                  } catch (e) {
                    console.error('Quick start failed', e);
                  }
                }}
              >
                <Text style={styles.primaryActionText}>学習を開始</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ height: 8 }} />
          )}
        </ScrollView>
      </SafeAreaView>

      <InventoryFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        books={books}
        presets={presets}
        onPresetsChange={refreshAll}
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
                  
                  // LearningSessionService経由で新規カードを割り当て（アーキテクチャ統一）
                  const created = await learningSessionService.distributeNewCards(
                    activePresetId,
                    presets,
                    10
                  );
                  
                  if (created > 0) {
                    await refreshAll();
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
              await refreshAll();
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
      {showGacha && (
        <View style={styles.gachaOverlay}>
          <ConfettiCannon count={80} origin={{x: -10, y: 0}} fadeOut={true} explosionSpeed={350} fallSpeed={2500} />
          <View style={styles.gachaCard}>
            <Text style={styles.gachaEmoji}>{gachaLex && gachaLex >= 500 ? '🌟' : gachaLex && gachaLex >= 100 ? '✨' : '🎉'}</Text>
            <Text style={styles.gachaTitle}>Lex獲得！</Text>
            <Text style={styles.gachaLex}>{gachaLex ?? 0} Lex</Text>
            <Text style={styles.gachaBook}>{gachaBook ?? ''}</Text>
          </View>
        </View>
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
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
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
  resumeSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  resumeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  resumeButton: {
    ...glassEffect.card,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary + '40',
    backgroundColor: colors.primary + '10',
  },
  resumeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  resumeEmoji: {
    fontSize: 32,
  },
  resumeTextContainer: {
    flex: 1,
  },
  resumeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  resumeSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  taskList: {
    gap: 12,
    marginHorizontal: 16,
  },
  taskCard: {
    padding: 16,
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
  primaryActionButton: {
    marginTop: 32,
    backgroundColor: colors.primary,
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryActionText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 18,
  },
  gachaOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  gachaCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  gachaEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  gachaTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  gachaLex: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.success,
    marginBottom: 8,
  },
  gachaBook: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
});
