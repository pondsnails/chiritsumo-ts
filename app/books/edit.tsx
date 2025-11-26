import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Save } from 'lucide-react-native';
import { useBookStore } from '@/app/core/store/bookStore';
import { colors } from '@/app/core/theme/colors';
import { glassEffect } from '@/app/core/theme/glassEffect';

export default function EditBookScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { books, updateBook } = useBookStore();
  const [title, setTitle] = useState('');
  const [totalUnit, setTotalUnit] = useState('');
  const [completedUnit, setCompletedUnit] = useState('');
  const [mode, setMode] = useState<0 | 1 | 2>(0);
  const [status, setStatus] = useState<0 | 1 | 2>(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const book = books.find((b) => b.id === id);
    if (book) {
      setTitle(book.title);
      setTotalUnit(book.totalUnit.toString());
      setCompletedUnit(book.completedUnit.toString());
      setMode(book.mode);
      setStatus(book.status);
    }
  }, [id, books]);

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
      });
      router.back();
    } catch (error) {
      console.error('Failed to update book:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft color={colors.text} size={24} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.title}>参考書を編集</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={[glassEffect.container, styles.formContainer]}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>タイトル</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="例: 基本情報技術者試験"
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>総単位数</Text>
              <TextInput
                style={styles.input}
                value={totalUnit}
                onChangeText={setTotalUnit}
                placeholder="例: 100"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>完了単位数</Text>
              <TextInput
                style={styles.input}
                value={completedUnit}
                onChangeText={setCompletedUnit}
                placeholder="例: 50"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>モード</Text>
              <View style={styles.modeContainer}>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    mode === 0 && { backgroundColor: colors.read },
                  ]}
                  onPress={() => setMode(0)}
                >
                  <Text style={[styles.modeButtonText, mode === 0 && styles.modeButtonTextActive]}>
                    読
                  </Text>
                  <Text style={[styles.modeLabel, mode === 0 && styles.modeLabelActive]}>
                    読む
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
                    解
                  </Text>
                  <Text style={[styles.modeLabel, mode === 1 && styles.modeLabelActive]}>
                    解く
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
                    暗
                  </Text>
                  <Text style={[styles.modeLabel, mode === 2 && styles.modeLabelActive]}>
                    暗記
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>ステータス</Text>
              <View style={styles.statusContainer}>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    status === 0 && styles.statusButtonActive,
                  ]}
                  onPress={() => setStatus(0)}
                >
                  <Text style={[styles.statusButtonText, status === 0 && styles.statusButtonTextActive]}>
                    進行中
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
                    完了
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
                    中断
                  </Text>
                </TouchableOpacity>
              </View>
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
});
