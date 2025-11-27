import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Save, Calendar, Target, TrendingUp, Share2 } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useBookStore } from '@core/store/bookStore';
import { DrizzleCardRepository } from '@core/repository/CardRepository';
import { colors } from '@core/theme/colors';
import ChunkSizeSelector from '@core/components/ChunkSizeSelector';
import { calculateLexPerCard } from '@core/logic/lexCalculator';
import { glassEffect } from '@core/theme/glassEffect';
import i18n from '@core/i18n';
import { 
  calculateRouteDeadlines, 
  findRouteFinalBooks,
  RETENTION_PRESETS,
  RECOMMENDED_RETENTION,
  type RetentionTarget,
} from '@core/services/routeDeadlineService';

export default function EditBookScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { books, updateBook } = useBookStore();
  const cardRepo = new DrizzleCardRepository();
  const [cards, setCards] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [totalUnit, setTotalUnit] = useState('');
  const [completedUnit, setCompletedUnit] = useState('');
  const [chunkSize, setChunkSize] = useState<number>(1);
  const [mode, setMode] = useState<0 | 1 | 2>(0);
  const [status, setStatus] = useState<0 | 1 | 2>(0);
  const [targetCompletionDate, setTargetCompletionDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRouteEndpoint, setIsRouteEndpoint] = useState(false);
  const [retentionTarget, setRetentionTarget] = useState<RetentionTarget>('recommended');

  useEffect(() => {
    const loadData = async () => {
      const book = books.find((b) => b.id === id);
      if (book) {
        setTitle(book.title);
        setTotalUnit(book.totalUnit.toString());
        setCompletedUnit((book.completedUnit || 0).toString());
        setChunkSize(book.chunkSize || 1);
        setMode(book.mode);
        setStatus(book.status);
        if (book.targetCompletionDate) {
          setTargetCompletionDate(new Date(book.targetCompletionDate));
        }
        
        // この書籍がルートの終点かチェック
        const finalBooks = findRouteFinalBooks(books);
        setIsRouteEndpoint(finalBooks.some(b => b.id === id));
        
        // カードデータを読み込み
        const bookCards = await cardRepo.findByBook(id);
        setCards(bookCards);
      }
    };
    loadData();
  }, [id, books]);

  // 既存カード数を算出（生成済みがあればサイズ変更は新規カードのみ影響）
  const existingCardsCount = cards.filter(c => c.bookId === id).length;
  const hasExistingCards = existingCardsCount > 0;
  // 単純平均Lex（単一モードなのでそのモードの固定値）
  const modeAverageLex = calculateLexPerCard(mode);

  const calculateDailyQuota = (): number | null => {
    if (!targetCompletionDate) return null;
    
    const remaining = parseInt(totalUnit) - parseInt(completedUnit || '0');
    if (remaining <= 0) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetCompletionDate);
    target.setHours(0, 0, 0, 0);
    
    const daysRemaining = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 0) return null;
    
    return Math.ceil(remaining / daysRemaining);
  };

  const handleSave = async () => {
    if (!title.trim() || !totalUnit.trim() || !completedUnit.trim()) {
      return;
    }

    try {
      setIsSaving(true);
      await updateBook(id, {
        title: title.trim(),
        totalUnit: parseInt(totalUnit),
        completedUnit: parseInt(completedUnit),
        chunkSize: chunkSize || 1,
        mode,
        status,
        targetCompletionDate: targetCompletionDate ? Math.floor(targetCompletionDate.getTime() / 1000) : null,
      });
      router.back();
    } catch (error) {
      console.error('Failed to update book:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetRouteDeadline = () => {
    if (!targetCompletionDate) {
      Alert.alert('エラー', 'まず目標完了日を設定してください');
      return;
    }

    try {
      const result = calculateRouteDeadlines(
        { 
          finalBookId: id, 
          targetDate: targetCompletionDate,
          retentionConfig: { target: retentionTarget },
        },
        books,
        cards
      );

      const routeLength = result.routeChain.length;
      const retentionLabel = retentionTarget === 'recommended' ? '推奨(85%)' :
                             retentionTarget === 'relaxed' ? 'ゆるめ(75%)' :
                             retentionTarget === 'strict' ? '厳しめ(95%)' : 'カスタム';
      const bookTitles = result.routeChain
        .map(bookId => books.find(b => b.id === bookId)?.title)
        .filter(Boolean)
        .join('\n  • ');

      Alert.alert(
        'ルート全体の完了日を設定',
        `このルート（${routeLength}冊）の各書籍に完了日を自動配分します。\n\n記憶定着率: ${retentionLabel}\n\n対象書籍:\n  • ${bookTitles}\n\nよろしいですか？`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '設定する',
            onPress: async () => {
              try {
                // 各書籍の完了日を一括更新
                for (const [bookId, deadline] of result.bookDeadlines) {
                  await updateBook(bookId, {
                    targetCompletionDate: Math.floor(deadline.getTime() / 1000),
                  });
                }
                Alert.alert('完了', `${routeLength}冊の完了日を設定しました`);
                router.back();
              } catch (error) {
                console.error('Route deadline update failed:', error);
                Alert.alert('エラー', '完了日の設定に失敗しました');
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('エラー', error instanceof Error ? error.message : '計算に失敗しました');
    }
  };

  const dailyQuota = calculateDailyQuota();

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color={colors.text} size={24} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.title}>{i18n.t('books.editBook')}</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={[glassEffect.container, styles.formContainer]}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{i18n.t('books.titleLabel')}</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={i18n.t('books.titlePlaceholder')}
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{i18n.t('books.totalUnitsLabel')}</Text>
              <TextInput
                style={styles.input}
                value={totalUnit}
                onChangeText={setTotalUnit}
                placeholder={i18n.t('books.totalUnitsPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{i18n.t('books.completedUnitsLabel')}</Text>
              <TextInput
                style={styles.input}
                value={completedUnit}
                onChangeText={setCompletedUnit}
                placeholder={i18n.t('books.completedUnitsPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <ChunkSizeSelector
                value={chunkSize}
                onChange={setChunkSize}
                totalUnit={parseInt(totalUnit || '0') || undefined}
                disabled={hasExistingCards}
                modeAverageLex={modeAverageLex}
                onRequestPro={() => router.push('/paywall')}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{i18n.t('books.modeLabel')}</Text>
              <View style={styles.modeContainer}>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    mode === 0 && { backgroundColor: colors.read },
                  ]}
                  onPress={() => setMode(0)}
                >
                  <Text style={[styles.modeButtonText, mode === 0 && styles.modeButtonTextActive]}>
                    {i18n.t('common.modeRead')}
                  </Text>
                  <Text style={[styles.modeLabel, mode === 0 && styles.modeLabelActive]}>
                    {i18n.t('books.modeRead')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    mode === 1 && { backgroundColor: colors.solve },
                  ]}
                  onPress={() => setMode(1)}
                >
                  <Text style={[styles.modeButtonText, mode === 1 && styles.modeButtonTextActive]}>
                    {i18n.t('common.modeSolve')}
                  </Text>
                  <Text style={[styles.modeLabel, mode === 1 && styles.modeLabelActive]}>
                    {i18n.t('books.modeSolve')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    mode === 2 && { backgroundColor: colors.memo },
                  ]}
                  onPress={() => setMode(2)}
                >
                  <Text style={[styles.modeButtonText, mode === 2 && styles.modeButtonTextActive]}>
                    {i18n.t('common.modeMemo')}
                  </Text>
                  <Text style={[styles.modeLabel, mode === 2 && styles.modeLabelActive]}>
                    {i18n.t('books.modeMemo')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{i18n.t('books.statusLabel')}</Text>
              <View style={styles.statusContainer}>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    status === 0 && styles.statusButtonActive,
                  ]}
                  onPress={() => setStatus(0)}
                >
                  <Text style={[styles.statusButtonText, status === 0 && styles.statusButtonTextActive]}>
                    {i18n.t('books.statusInProgress')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    status === 1 && styles.statusButtonActive,
                  ]}
                  onPress={() => setStatus(1)}
                >
                  <Text style={[styles.statusButtonText, status === 1 && styles.statusButtonTextActive]}>
                    {i18n.t('books.statusCompleted')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    status === 2 && styles.statusButtonActive,
                  ]}
                  onPress={() => setStatus(2)}
                >
                  <Text style={[styles.statusButtonText, status === 2 && styles.statusButtonTextActive]}>
                    {i18n.t('books.statusPaused')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Deadline Mode */}
            <View style={styles.formGroup}>
              <View style={styles.deadlineHeader}>
                <Target color={colors.warning} size={20} strokeWidth={2} />
                <Text style={styles.label}>目標完了日（Deadline Mode）</Text>
              </View>
              <Text style={styles.deadlineDescription}>
                試験日や締切を設定すると、毎日のノルマを自動計算します
              </Text>

              {/* 記憶定着率設定 */}
              {isRouteEndpoint && (
                <View style={styles.retentionSection}>
                  <Text style={styles.retentionLabel}>記憶定着率の目標</Text>
                  <View style={styles.retentionButtons}>
                    <TouchableOpacity
                      style={[
                        styles.retentionButton,
                        retentionTarget === 'recommended' && styles.retentionButtonActive,
                      ]}
                      onPress={() => setRetentionTarget('recommended')}
                    >
                      <Text style={[
                        styles.retentionButtonText,
                        retentionTarget === 'recommended' && styles.retentionButtonTextActive,
                      ]}>
                        推奨(85%)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.retentionButton,
                        retentionTarget === 'relaxed' && styles.retentionButtonActive,
                      ]}
                      onPress={() => setRetentionTarget('relaxed')}
                    >
                      <Text style={[
                        styles.retentionButtonText,
                        retentionTarget === 'relaxed' && styles.retentionButtonTextActive,
                      ]}>
                        ゆるめ(75%)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.retentionButton,
                        retentionTarget === 'strict' && styles.retentionButtonActive,
                      ]}
                      onPress={() => setRetentionTarget('strict')}
                    >
                      <Text style={[
                        styles.retentionButtonText,
                        retentionTarget === 'strict' && styles.retentionButtonTextActive,
                      ]}>
                        厳しめ(95%)
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.retentionHint}>
                    ※ ルート全体のすべての書籍が、この定着率以上になる日を目標とします
                  </Text>
                </View>
              )}
              
              <TouchableOpacity
                style={[styles.datePickerButton, targetCompletionDate && styles.datePickerButtonActive]}
                onPress={() => setShowDatePicker(true)}
              >
                <Calendar color={targetCompletionDate ? colors.warning : colors.textTertiary} size={20} strokeWidth={2} />
                <Text style={[styles.datePickerText, targetCompletionDate && styles.datePickerTextActive]}>
                  {targetCompletionDate
                    ? `${targetCompletionDate.getFullYear()}年${targetCompletionDate.getMonth() + 1}月${targetCompletionDate.getDate()}日`
                    : '日付を選択'
                  }
                </Text>
              </TouchableOpacity>

              {targetCompletionDate && (
                <TouchableOpacity
                  style={styles.clearDateButton}
                  onPress={() => setTargetCompletionDate(null)}
                >
                  <Text style={styles.clearDateText}>クリア</Text>
                </TouchableOpacity>
              )}

              {isRouteEndpoint && targetCompletionDate && (
                <TouchableOpacity
                  style={styles.routeDeadlineButton}
                  onPress={handleSetRouteDeadline}
                >
                  <Share2 color={colors.primary} size={20} strokeWidth={2} />
                  <Text style={styles.routeDeadlineText}>ルート全体に適用</Text>
                </TouchableOpacity>
              )}

              {showDatePicker && (
                <DateTimePicker
                  value={targetCompletionDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setTargetCompletionDate(selectedDate);
                    }
                  }}
                  minimumDate={new Date()}
                />
              )}

              {dailyQuota !== null && (
                <View style={styles.quotaCard}>
                  <TrendingUp color={colors.success} size={24} strokeWidth={2} />
                  <View style={styles.quotaInfo}>
                    <Text style={styles.quotaLabel}>今日のノルマ</Text>
                    <Text style={styles.quotaValue}>{dailyQuota} ページ/日</Text>
                    <Text style={styles.quotaHint}>
                      残り{parseInt(totalUnit) - parseInt(completedUnit || '0')}ページを
                      {Math.ceil((targetCompletionDate!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}日で完了
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[
              glassEffect.card,
              styles.saveButton,
              (!title.trim() || !totalUnit.trim() || !completedUnit.trim() || isSaving) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!title.trim() || !totalUnit.trim() || !completedUnit.trim() || isSaving}
          >
            <Save color={colors.text} size={20} strokeWidth={2} />
            <Text style={styles.saveButtonText}>
              {isSaving ? '保存中...' : '保存'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  formContainer: {
    padding: 20,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  modeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  modeButtonTextActive: {
    color: colors.text,
  },
  modeLabel: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  modeLabelActive: {
    color: colors.text,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statusButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusButtonTextActive: {
    color: colors.text,
  },
  saveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  deadlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  deadlineDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  datePickerButtonActive: {
    borderColor: colors.warning,
    backgroundColor: colors.warning + '10',
  },
  datePickerText: {
    fontSize: 15,
    color: colors.textTertiary,
  },
  datePickerTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  clearDateButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  clearDateText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
  },
  routeDeadlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary + '10',
    borderWidth: 1.5,
    borderColor: colors.primary + '40',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  routeDeadlineText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  retentionSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  retentionLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 10,
    fontWeight: '600',
  },
  retentionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  retentionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    borderRadius: 8,
    alignItems: 'center',
  },
  retentionButtonActive: {
    backgroundColor: colors.warning + '15',
    borderColor: colors.warning,
  },
  retentionButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  retentionButtonTextActive: {
    color: colors.warning,
  },
  retentionHint: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 8,
    lineHeight: 16,
  },
  quotaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.success + '10',
    borderWidth: 2,
    borderColor: colors.success + '40',
    borderRadius: 12,
  },
  quotaInfo: {
    flex: 1,
  },
  quotaLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  quotaValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.success,
    marginBottom: 4,
  },
  quotaHint: {
    fontSize: 11,
    color: colors.textTertiary,
    lineHeight: 14,
  },
});
