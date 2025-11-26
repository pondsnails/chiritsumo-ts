import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, Save } from 'lucide-react-native';
import { useBookStore } from '@/app/core/store/bookStore';
import { useSubscriptionStore, canAddBook } from '@/app/core/store/subscriptionStore';
import { validateBookAddition } from '@/app/core/utils/circularReferenceDetector';
import { colors } from '@/app/core/theme/colors';
import { glassEffect } from '@/app/core/theme/glassEffect';
import type { Book } from '@/app/core/types';

export default function AddBookScreen() {
  const router = useRouter();
  const { addBook, books, fetchBooks } = useBookStore();
  const { isProUser } = useSubscriptionStore();
  const [title, setTitle] = useState('');
  const [totalUnit, setTotalUnit] = useState('');
  const [chunkSize, setChunkSize] = useState('1');
  const [mode, setMode] = useState<0 | 1 | 2>(0);
  const [previousBookId, setPreviousBookId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleSave = async () => {
    if (!title.trim() || !totalUnit.trim()) {
      Alert.alert('入力エラー', 'タイトルとUnit数を入力してください');
      return;
    }

    // Free Planの制限チェック
    if (!canAddBook(books.length, isProUser)) {
      Alert.alert(
        '登録制限',
        'Free Planでは参考書を3冊まで登録できます。\nPro Planにアップグレードすると無制限に登録できます。',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'Pro Planを見る',
            onPress: () => router.push('/paywall'),
          },
        ]
      );
      return;
    }

    // 循環参照のバリデーション
    const newBookData = {
      id: Date.now().toString(),
      title: title.trim(),
      previousBookId,
    };

    const validationError = validateBookAddition(newBookData, books);
    if (validationError) {
      Alert.alert('エラー', validationError);
      return;
    }

    try {
      setIsSaving(true);
      const newBook: Book = {
        ...newBookData,
        userId: 'local',
        totalUnit: parseInt(totalUnit),
        chunkSize: parseInt(chunkSize) || 1,
        completedUnit: 0,
        mode,
        status: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addBook(newBook);
      router.back();
    } catch (error) {
      console.error('Failed to add book:', error);
      Alert.alert('エラー', '参考書の追加に失敗しました');
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
            <Text style={styles.title}>参考書を追加</Text>
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
              <Text style={styles.label}>単位のまとめ数（1カードあたり）</Text>
              <TextInput
                style={styles.input}
                value={chunkSize}
                onChangeText={setChunkSize}
                placeholder="例: 10"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
              <Text style={styles.helpText}>
                {totalUnit && chunkSize
                  ? `生成されるカード数: ${Math.ceil(parseInt(totalUnit) / (parseInt(chunkSize) || 1))}枚`
                  : '※ 1を設定すると1単位につき1カードが作成されます'}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>前提となる教材（任意）</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowPicker(!showPicker)}
              >
                <Text style={[styles.pickerText, !previousBookId && styles.placeholderText]}>
                  {previousBookId
                    ? books.find(b => b.id === previousBookId)?.title || 'なし'
                    : 'なし（始発駅）'}
                </Text>
              </TouchableOpacity>
              {showPicker && (
                <View style={styles.pickerList}>
                  <TouchableOpacity
                    style={styles.pickerItem}
                    onPress={() => {
                      setPreviousBookId(null);
                      setShowPicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>なし（始発駅）</Text>
                  </TouchableOpacity>
                  {books.map(book => (
                    <TouchableOpacity
                      key={book.id}
                      style={styles.pickerItem}
                      onPress={() => {
                        setPreviousBookId(book.id);
                        setShowPicker(false);
                      }}
                    >
                      <Text style={styles.pickerItemText}>{book.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
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
          </View>

          <TouchableOpacity
            style={[
              glassEffect.card,
              styles.saveButton,
              (!title.trim() || !totalUnit.trim() || isSaving) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!title.trim() || !totalUnit.trim() || isSaving}
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
  pickerButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerText: {
    fontSize: 16,
    color: colors.text,
  },
  placeholderText: {
    color: colors.textTertiary,
  },
  pickerList: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pickerItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  pickerItemText: {
    fontSize: 16,
    color: colors.text,
  },
  helpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
