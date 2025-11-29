import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  FlatList,
  InteractionManager,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BookOpen, X, ExternalLink, Trophy } from 'lucide-react-native';
import { useServices } from '@core/di/ServicesProvider';
import { calculateRouteProgress } from '@core/utils/bookSorting';
import { getCachedSortedBooks } from '@core/utils/routeCache';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';
import { MetroLayoutEngine } from '@core/layout/metroLayout';
import { computeLayoutAsync } from '@core/layout/metroLayoutCache';
import { MetroLine } from '@core/components/MetroLine';
import { BookNode } from '@core/components/BookNode';
import { BookMode } from '@core/constants/enums';
import i18n from '@core/i18n';
import { getVelocityData } from '@core/services/velocityService';
import { getLexConfig, getConfigNumber, ConfigKeys } from '@core/services/configService';
import type { Book, RouteStep, PresetRoute } from '@core/types';
import type { NodePosition } from '@core/layout/metroLayout';
import recommendedRoutesData from '@core/data/recommendedRoutes.json';

type TabType = 'myRoute' | 'presetRoute';

export default function RouteScreen() {
  const router = useRouter();
  const { useBookStore } = useServices();
  const { updateBook } = useBookStore();
  const { bookRepo } = useServices();
  
  const [activeTab, setActiveTab] = useState<TabType>('myRoute');
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [hubModalVisible, setHubModalVisible] = useState(false);
  const [hubChildren, setHubChildren] = useState<Book[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<PresetRoute | null>(null);
  const [nodes, setNodes] = useState<NodePosition[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [circularRefs, setCircularRefs] = useState<string[]>([]); // 循環参照の警告メッセージ
  const [bookRoutes, setBookRoutes] = useState<Book[][]>([]);
  const [examGPS, setExamGPS] = useState<{
    targetDate: number | null;
    predictedDate: number | null;
    daysAhead: number;
    velocityAdvice: string | null;
  } | null>(null);

  const routeProgress = useMemo(() => {
    return bookRoutes.map(r => calculateRouteProgress(r));
  }, [bookRoutes]);
  // フォーカスモード: 現在進行中（status===0/1）を強調し、それ以外を減光
  const isActiveBook = useCallback((book: Book) => book.status !== 2, []);
  const activeAnchorIndex = useMemo(() => {
    // 最初に見つかった進行中の書籍のインデックスを返す（なければ0）
    for (let r = 0; r < bookRoutes.length; r++) {
      const route = bookRoutes[r];
      const idx = route.findIndex(b => isActiveBook(b));
      if (idx >= 0) return { r, idx };
    }
    return { r: 0, idx: 0 };
  }, [bookRoutes, isActiveBook]);

  // 重い依存関係ソートは描画後に遅延実行
  useEffect(() => {
    if (books.length === 0) {
      setBookRoutes([]);
      setCircularRefs([]);
      return;
    }
    setIsCalculating(true);
    const task = InteractionManager.runAfterInteractions(() => {
      try {
        const { routes, circularRefs } = getCachedSortedBooks(books);
        setBookRoutes(routes);
        setCircularRefs(circularRefs);
      } catch (e) {
        console.error('[RouteScreen] dependency sort failed', e);
        setBookRoutes([]);
        setCircularRefs([]);
      } finally {
        setIsCalculating(false);
      }
    });
    return () => task.cancel();
  }, [books]);

  const fetchAllBooks = async () => {
    try {
      setIsLoading(true);
      const allBooks = await bookRepo.findAll();
      setBooks(allBooks);
    } catch (error) {
      console.error('Failed to fetch books:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 画面フォーカス毎に最新Booksを取得（編集・追加反映）
  useFocusEffect(
    useCallback(() => {
      fetchAllBooks();
      // Exam GPS計算
      (async () => {
        try {
          const vd = await getVelocityData();
          const lexCfg = await getLexConfig();
          const dailyTarget = await getConfigNumber(ConfigKeys.DAILY_LEX_TARGET_DEFAULT);
          
          // 全書籍の目標完了日の最大値を取得
          const targetDates = books.filter(b => b.targetCompletionDate).map(b => b.targetCompletionDate!);
          if (targetDates.length === 0) {
            setExamGPS(null);
            return;
          }
          const maxTargetDate = Math.max(...targetDates);
          
          // 全未完了ユニットの合計Lexを計算
          let totalLexRemaining = 0;
          for (const book of books) {
            if (book.status === 2) continue; // 完了済みはスキップ
            const baseLex = book.mode === 1 ? lexCfg.solve : (book.mode === 2 ? lexCfg.memo : lexCfg.read);
            const completed = book.completedUnit ?? 0;
            const remaining = Math.max(0, book.totalUnit - completed);
            const chunk = book.chunkSize ?? 1;
            const cards = Math.ceil(remaining / chunk);
            totalLexRemaining += cards * baseLex;
          }
          
          // 予想完了日の計算
          const nowEpoch = Math.floor(Date.now() / 1000);
          const daysNeeded = dailyTarget > 0 ? Math.ceil(totalLexRemaining / dailyTarget) : 999;
          const predictedEpoch = nowEpoch + (daysNeeded * 24 * 60 * 60);
          const daysAhead = Math.floor((maxTargetDate - predictedEpoch) / (24 * 60 * 60));
          
          // 遅れている場合のアドバイス計算
          let velocityAdvice: string | null = null;
          if (daysAhead < 0) {
            const daysShort = Math.abs(daysAhead);
            const totalDaysAvailable = Math.floor((maxTargetDate - nowEpoch) / (24 * 60 * 60));
            if (totalDaysAvailable > 0) {
              const requiredDailyLex = Math.ceil(totalLexRemaining / totalDaysAvailable);
              const lexIncrease = requiredDailyLex - dailyTarget;
              const minutesIncrease = vd.averageVelocity ? Math.ceil(lexIncrease / vd.averageVelocity) : Math.ceil(lexIncrease / 10);
              velocityAdvice = `1日あたり ${lexIncrease} XP（約${minutesIncrease}分）増やせば間に合います`;
            }
          }
          
          setExamGPS({
            targetDate: maxTargetDate,
            predictedDate: predictedEpoch,
            daysAhead,
            velocityAdvice,
          });
        } catch (e) {
          console.warn('Exam GPS calculation failed', e);
          setExamGPS(null);
        }
      })();
    }, [])
  );

  // パフォーマンス最適化: 非同期キャッシュでレイアウト計算
  useEffect(() => {
    if (books.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // 計算開始を通知
    setIsCalculating(true);

    // 非同期でレイアウトを計算（キャッシュヒット時は即座に返る）
    computeLayoutAsync(books)
      .then((layout) => {
        setNodes(layout.nodes);
        setEdges(layout.edges);
      })
      .catch((error) => {
        console.error('[RouteScreen] Layout computation error:', error);
        setNodes([]);
        setEdges([]);
      })
      .finally(() => {
        setIsCalculating(false);
      });
  }, [books]);

  const handleNodePress = (node: NodePosition) => {
    if (node.isHub) {
      setHubChildren(node.children);
      setHubModalVisible(true);
      return;
    }

    if (!node.book || node.book.status === 2) {
      return;
    }

    router.push(`/books/edit?id=${node.book.id}`);
  };

  const handleHubItemPress = (book: Book) => {
    setHubModalVisible(false);
    router.push(`/books/edit?id=${book.id}`);
  };

  const contentHeight = Math.max(
    nodes.reduce((max, node) => Math.max(max, node.y + 140), 600),
    600
  );

  const presetRoutes = useMemo(() => recommendedRoutesData as PresetRoute[], []);
  const AFFILIATE_TAG = useMemo(() => 'chiritsumo-22', []);

  const handleSearchPress = useCallback((searchQuery: string) => {
    const url = `https://www.amazon.co.jp/s?k=${encodeURIComponent(searchQuery)}&tag=${AFFILIATE_TAG}`;
    Linking.openURL(url);
  }, [AFFILIATE_TAG]);

  const getDifficultyColor = useCallback((difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return colors.success;
      case 'intermediate':
        return colors.warning;
      case 'advanced':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  }, []);

  const getDifficultyLabel = useCallback((difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return '入門';
      case 'intermediate':
        return '中級';
      case 'advanced':
        return '上級';
      default:
        return '';
    }
  }, []);

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.title}>{i18n.t('route.title')}</Text>
          <Text style={styles.subtitle}>{i18n.t('route.subtitle')}</Text>
          
          {/* Exam GPS表示 */}
          {examGPS && examGPS.targetDate && (
            <View style={[glassEffect.card, styles.examGPSCard, examGPS.daysAhead < 0 && styles.examGPSWarning]}>
              <View style={styles.examGPSRow}>
                <Text style={styles.examGPSLabel}>目標日:</Text>
                <Text style={styles.examGPSValue}>{new Date(examGPS.targetDate * 1000).toLocaleDateString()}</Text>
              </View>
              <View style={styles.examGPSRow}>
                <Text style={styles.examGPSLabel}>予想到着:</Text>
                <Text style={[styles.examGPSValue, examGPS.daysAhead < 0 && styles.examGPSValueWarning]}>
                  {new Date(examGPS.predictedDate! * 1000).toLocaleDateString()}
                  {examGPS.daysAhead >= 0 ? ` (${examGPS.daysAhead}日余裕)` : ` (${Math.abs(examGPS.daysAhead)}日遅れ)`}
                </Text>
              </View>
              {examGPS.velocityAdvice && (
                <Text style={styles.examGPSAdvice}>💡 {examGPS.velocityAdvice}</Text>
              )}
            </View>
          )}
          
          {/* Tab Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'myRoute' && styles.tabActive]}
              onPress={() => setActiveTab('myRoute')}
            >
              <Text style={[styles.tabText, activeTab === 'myRoute' && styles.tabTextActive]}>
                マイルート
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'presetRoute' && styles.tabActive]}
              onPress={() => setActiveTab('presetRoute')}
            >
              <Text style={[styles.tabText, activeTab === 'presetRoute' && styles.tabTextActive]}>
                厳選ルート
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'myRoute' ? (
          isLoading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.loadingText}>{i18n.t('route.loading')}</Text>
            </View>
          ) : books.length === 0 ? (
            <View style={styles.centerContent}>
              <Text style={styles.emptyText}>{i18n.t('route.noBooks')}</Text>
              <TouchableOpacity
                style={[glassEffect.card, styles.emptyButton]}
                onPress={() => router.push('/(tabs)/books')}
              >
                <Text style={styles.emptyButtonText}>{i18n.t('route.addBooks')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
            >
              {/* 循環参照警告 */}
              {circularRefs.length > 0 && (
                <View style={[glassEffect.card, styles.warningCard]}>
                  <View style={styles.warningHeader}>
                    <Text style={styles.warningIcon}>⚠️</Text>
                    <Text style={styles.warningTitle}>循環参照が検出されました</Text>
                  </View>
                  <Text style={styles.warningDescription}>
                    以下の書籍で循環依存が発生しています。依存関係を見直してください。
                  </Text>
                  {circularRefs.map((ref, idx) => (
                    <Text key={idx} style={styles.warningItem}>• {ref}</Text>
                  ))}
                </View>
              )}
              
              {/* パフォーマンス警告 */}
              {bookRoutes.length > 50 && (
                <View style={[glassEffect.card, styles.infoCard]}>
                  <Text style={styles.infoText}>
                    📊 {bookRoutes.length}個のルートが表示されています。パフォーマンス向上のため、依存関係を整理することをお勧めします。
                  </Text>
                </View>
              )}
              
              <View style={styles.booksTimeline}>
                {bookRoutes.map((route, routeIndex) => (
                  <View key={`route-${routeIndex}`} style={styles.routeGroup}>
                    {routeIndex > 0 && (
                      <View style={styles.routeSeparator} />
                    )}
                    
                    <View style={styles.routeGroupHeader}>
                      <Text style={styles.routeGroupTitle}>ルート {routeIndex + 1}</Text>
                      <Text style={styles.routeGroupSubtitle}>{route.length}冊 • 進捗 {routeProgress[routeIndex]?.percentage ?? 0}% ({routeProgress[routeIndex]?.completedUnits ?? 0}/{routeProgress[routeIndex]?.totalUnits ?? 0})</Text>
                    </View>
                    
                    {route.map((book, bookIndex) => (
                      <View key={book.id} style={styles.timelineItem}>
                        {bookIndex > 0 && (
                          <View style={styles.timelineConnector} />
                        )}
                        
                        <TouchableOpacity
                          style={[
                            glassEffect.card,
                            styles.presetBookCard,
                            !isActiveBook(book) && { opacity: 0.35 }
                          ]}
                          onPress={() => router.push(`/books/edit?id=${book.id}`)}
                        >
                          <View style={styles.bookOrder}>
                            <Text style={styles.bookOrderText}>{bookIndex + 1}</Text>
                          </View>
                          
                          <View style={styles.presetBookInfo}>
                            <Text style={styles.presetBookTitle}>{book.title}</Text>
                            <Text style={styles.presetBookDescription}>
                              {book.mode === 0 ? '読む' : book.mode === 1 ? '解く' : '暗記'}
                            </Text>
                            
                            <View style={styles.presetBookMeta}>
                              <Text style={styles.presetBookMetaText}>
                                📖 {book.completedUnit || 0}/{book.totalUnit} {book.mode === 0 ? 'ページ' : '問'}
                              </Text>
                              <Text style={styles.presetBookMetaText}>
                                📊 進捗: {Math.round(((book.completedUnit || 0) / book.totalUnit) * 100)}%
                              </Text>
                            </View>

                            {book.status === 1 && (
                              <View style={[styles.difficultyBadge, { backgroundColor: colors.success + '20', marginTop: 8 }]}>
                                <Text style={[styles.difficultyText, { color: colors.success }]}>完了</Text>
                              </View>
                            )}
                            {book.status === 2 && (
                              <View style={[styles.difficultyBadge, { backgroundColor: colors.textTertiary + '20', marginTop: 8 }]}>
                                <Text style={[styles.difficultyText, { color: colors.textTertiary }]}>中断</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          )
        ) : selectedRoute ? (
          <View style={{ flex: 1 }}>
            <View style={styles.routeHeader}>
              <TouchableOpacity onPress={() => setSelectedRoute(null)} style={styles.backButton}>
                <Text style={styles.backButtonText}>← 戻る</Text>
              </TouchableOpacity>
              <View style={styles.routeHeaderInfo}>
                <Text style={styles.routeTitle}>{selectedRoute.title}</Text>
                <View style={styles.routeMeta}>
                  <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(selectedRoute.difficulty) + '20' }]}>
                    <Text style={[styles.difficultyText, { color: getDifficultyColor(selectedRoute.difficulty) }]}>
                      {getDifficultyLabel(selectedRoute.difficulty)}
                    </Text>
                  </View>
                  <Text style={styles.routeMetaText}>目標: {selectedRoute.targetScore}</Text>
                  <Text style={styles.routeMetaText}>期間: {selectedRoute.estimatedMonths}ヶ月</Text>
                </View>
                <Text style={styles.routeDescription}>{selectedRoute.description}</Text>
              </View>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.booksTimeline}>
                {selectedRoute.steps.map((step, index) => (
                  <View key={index} style={styles.timelineItem}>
                    {index > 0 && (
                      <View style={styles.timelineConnector} />
                    )}
                    
                    <TouchableOpacity
                      style={[glassEffect.card, styles.presetBookCard]}
                      onPress={() => handleSearchPress(step.searchQuery)}
                    >
                      <View style={styles.bookOrder}>
                        <Text style={styles.bookOrderText}>{step.order}</Text>
                      </View>
                      
                      <View style={styles.presetBookInfo}>
                        <Text style={styles.presetBookTitle}>{step.label}</Text>
                        <Text style={styles.presetBookDescription}>{step.description}</Text>
                        
                        <View style={styles.presetBookMeta}>
                          <Text style={styles.presetBookMetaText}>⏱️ 目安: {step.requiredDays}日</Text>
                        </View>

                        <View style={styles.externalLinkBadge}>
                          <ExternalLink color={colors.primary} size={14} strokeWidth={2} />
                          <Text style={styles.externalLinkText}>Amazonで最新版を探す</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.presetRoutesContainer}>
              {presetRoutes.map((route) => (
                <TouchableOpacity
                  key={route.id}
                  style={[glassEffect.card, styles.routeCard]}
                  onPress={() => setSelectedRoute(route)}
                >
                  <View style={styles.routeCardHeader}>
                    <Text style={styles.routeCardTitle}>{route.title}</Text>
                    <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(route.difficulty) + '20' }]}>
                      <Text style={[styles.difficultyText, { color: getDifficultyColor(route.difficulty) }]}>
                        {getDifficultyLabel(route.difficulty)}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.routeCardDescription}>{route.description}</Text>
                  
                  <View style={styles.routeCardMeta}>
                    <View style={styles.routeCardMetaItem}>
                      <Trophy color={colors.warning} size={16} strokeWidth={2} />
                      <Text style={styles.routeCardMetaText}>{route.targetScore}</Text>
                    </View>
                    <View style={styles.routeCardMetaItem}>
                      <Text style={styles.routeCardMetaText}>📚 {route.steps.length}冊</Text>
                    </View>
                    <View style={styles.routeCardMetaItem}>
                      <Text style={styles.routeCardMetaText}>⏱️ {route.estimatedMonths}ヶ月</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => router.push('/(tabs)/books')}
        >
          <BookOpen color={colors.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>

        <Modal
          visible={hubModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setHubModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[glassEffect.containerLarge, styles.modalContent]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{i18n.t('route.bookList')}</Text>
                <TouchableOpacity onPress={() => setHubModalVisible(false)}>
                  <X color={colors.text} size={24} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={hubChildren}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[glassEffect.card, styles.hubItem]}
                    onPress={() => handleHubItemPress(item)}
                  >
                    <Text style={styles.hubItemTitle}>{item.title}</Text>
                    <Text style={styles.hubItemSubtitle}>
                      {item.completedUnit} / {item.totalUnit}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
    activateButton: {
      marginTop: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      backgroundColor: colors.surface,
      alignSelf: 'flex-start',
    },
    activateText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
    },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  examGPSCard: {
    padding: 12,
    marginBottom: 12,
    backgroundColor: colors.surface + '40',
  },
  examGPSWarning: {
    backgroundColor: colors.error + '10',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  examGPSRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  examGPSLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginRight: 8,
    width: 70,
  },
  examGPSValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  examGPSValueWarning: {
    color: colors.error,
    fontWeight: '700',
  },
  examGPSAdvice: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 8,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.background,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textTertiary,
    marginBottom: 16,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  nodeWrapper: {
    position: 'absolute',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '70%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  hubItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  hubItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  hubItemSubtitle: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  presetRoutesContainer: {
    padding: 16,
  },
  routeCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 16,
  },
  routeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  routeCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 12,
  },
  routeCardDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  routeCardMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  routeCardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeCardMetaText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  routeHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  routeHeaderInfo: {
    marginBottom: 8,
  },
  routeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  routeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  routeMetaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  routeDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  booksTimeline: {
    padding: 16,
  },
  timelineItem: {
    position: 'relative',
    marginBottom: 16,
  },
  timelineConnector: {
    position: 'absolute',
    top: -16,
    left: 28,
    width: 3,
    height: 16,
    backgroundColor: colors.primary,
    opacity: 0.3,
  },
  presetBookCard: {
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bookOrder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  bookOrderText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  presetBookInfo: {
    flex: 1,
  },
  presetBookTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    lineHeight: 18,
  },
  presetBookDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  presetBookMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  presetBookMetaText: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  externalLinkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  externalLinkText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  routeGroup: {
    marginBottom: 24,
  },
  routeSeparator: {
    height: 2,
    backgroundColor: colors.surfaceBorder,
    marginVertical: 16,
    marginHorizontal: 16,
  },
  routeGroupHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  routeGroupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  routeGroupSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // 警告カード
  warningCard: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: colors.error + '10',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  warningIcon: {
    fontSize: 20,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.error,
  },
  warningDescription: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 12,
    lineHeight: 18,
  },
  warningItem: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
    marginBottom: 4,
    lineHeight: 16,
  },
  // 情報カード
  infoCard: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: colors.primary + '10',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
});
