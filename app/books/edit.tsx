import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Save, Calendar, Target, TrendingUp } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useBookStore } from '@core/store/bookStore';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';
import i18n from '@core/i18n';

export default function EditBookScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { books, updateBook } = useBookStore();
  const [title, setTitle] = useState('');
  const [totalUnit, setTotalUnit] = useState('');
  const [completedUnit, setCompletedUnit] = useState('');
  const [mode, setMode] = useState<0 | 1 | 2>(0);
  const [status, setStatus] = useState<0 | 1 | 2>(0);
  const [targetCompletionDate, setTargetCompletionDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const book = books.find((b) => b.id === id);
    if (book) {
      setTitle(book.title);
      setTotalUnit(book.totalUnit.toString());
      setCompletedUnit((book.completedUnit || 0).toString());
      setMode(book.mode);
      setStatus(book.status);
      if (book.targetCompletionDate) {
        setTargetCompletionDate(new Date(book.targetCompletionDate));
      }
    }
  }, [id, books]);

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
        mode,
        status,
        targetCompletionDate: targetCompletionDate?.toISOString() || null,
      });
      router.back();
    } catch (error) {
      console.error('Failed to update book:', error);
    } finally {
      setIsSaving(false);
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
