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

export default function QuestScreen() {
  console.log('[QuestScreen] Component rendering');
  const router = useRouter();
  const { useBookStore, learningSessionService } = useServices();
  const { books } = useBookStore();
  
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

  // 画面フォーカス時に自動更新
  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, [refreshAll])
  );

  const startStudy = (bookId: string) => {
    router.push(`/study?bookId=${bookId}`);
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

          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>📚 今日のクエスト</Text>
            <Text style={styles.bannerText}>復習を優先 → 目標Lexまで新規追加</Text>
          </View>

          <SummaryCards
            dueCount={dueCards.length}
            reviewLex={reviewLex}
            newCount={newCards.length}
            newLex={newLexCurrent}
            targetLex={targetLex}
            combinedLex={combinedLex}
          />

          {/* Global Next Action - 迷わせない単一アクション */}
          <View style={styles.emptyState}>
            {hasReviewPending ? (
              <>
                <Text style={styles.emptyIcon}>🔔</Text>
                <Text style={styles.emptyText}>まずは復習を片付けましょう</Text>
                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={() => {
                    if (globalNextBook?.id) {
                      router.push(`/study?bookId=${globalNextBook.id}` as any);
                    } else if (dueCards[0]?.bookId) {
                      router.push(`/study?bookId=${dueCards[0].bookId}` as any);
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
                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={async () => {
                    try {
                      const created = await learningSessionService.distributeNewCardsByAllocation(recommended.perBook);
                      if (created > 0) {
                        await refreshAll();
                        const firstBook = Object.keys(recommended.perBook)[0];
                        if (firstBook) router.push(`/study?bookId=${firstBook}` as any);
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
                  onReviewComplete={refreshDue}
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
});
