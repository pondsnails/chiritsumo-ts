import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Save } from 'lucide-react-native';
import { DrizzleCardRepository } from '@core/repository/CardRepository';
import { useCardStore } from '@core/store/cardStore';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';
import type { Card } from '@core/types';

export default function CardEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { fetchCards } = useCardStore();
  const cardRepo = new DrizzleCardRepository();

  const [card, setCard] = useState<Card | null>(null);
  const [unitIndex, setUnitIndex] = useState('');
  const [state, setState] = useState<0 | 1 | 2 | 3>(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCard();
  }, []);

  const loadCard = async () => {
    try {
      const cardId = params.cardId as string;
      const bookId = params.bookId as string;
      const cards = await cardRepo.findByBook(bookId);
      const foundCard = cards.find(c => c.id === cardId);
      
      if (foundCard) {
        setCard(foundCard);
        setUnitIndex(foundCard.unitIndex.toString());
        setState(foundCard.state);
      }
    } catch (error) {
      console.error('Failed to load card:', error);
      Alert.alert('エラー', 'カードの読み込みに失敗しました');
      router.back();
    }
  };

  const handleSave = async () => {
    if (!card) return;

    const newUnitIndex = parseInt(unitIndex, 10);
    if (isNaN(newUnitIndex) || newUnitIndex < 1) {
      Alert.alert('エラー', 'ページ番号は1以上の数値で入力してください');
      return;
    }

    try {
      setIsSaving(true);
      await cardRepo.update(card.id, {
        unitIndex: newUnitIndex,
        state: state,
      });
      await fetchCards();
      Alert.alert('保存完了', 'カードを更新しました', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Failed to save card:', error);
      Alert.alert('エラー', 'カードの保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'カード削除',
      'このカードを削除しますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!card) return;
              await cardRepo.update(card.id, { state: 0 }); // 削除の代わりにNewに戻す
              await fetchCards();
              Alert.alert('完了', 'カードをリセットしました', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('Failed to delete card:', error);
              Alert.alert('エラー', 'カードの削除に失敗しました');
            }
          }
        }
      ]
    );
  };

  if (!card) {
    return (
      <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>読み込み中...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft color={colors.text} size={24} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.title}>カード編集</Text>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Save color={colors.primary} size={24} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={[glassEffect.container, styles.section]}>
            <Text style={styles.sectionTitle}>基本情報</Text>
            
            <View style={styles.field}>
              <Text style={styles.label}>カードID</Text>
              <Text style={styles.readOnlyText}>{card.id}</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>ページ番号</Text>
              <TextInput
                style={styles.input}
                value={unitIndex}
                onChangeText={setUnitIndex}
                keyboardType="number-pad"
                placeholder="例: 42"
                placeholderTextColor={colors.textTertiary}
              />
              <Text style={styles.hint}>
                ページ番号を変更できます（並び順に影響します）
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>学習状態</Text>
              <View style={styles.stateButtons}>
                <TouchableOpacity
                  style={[styles.stateButton, state === 0 && styles.stateButtonActive]}
                  onPress={() => setState(0)}
                >
                  <Text style={[styles.stateButtonText, state === 0 && styles.stateButtonTextActive]}>
                    New
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.stateButton, state === 1 && styles.stateButtonActive]}
                  onPress={() => setState(1)}
                >
                  <Text style={[styles.stateButtonText, state === 1 && styles.stateButtonTextActive]}>
                    Learning
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.stateButton, state === 2 && styles.stateButtonActive]}
                  onPress={() => setState(2)}
                >
                  <Text style={[styles.stateButtonText, state === 2 && styles.stateButtonTextActive]}>
                    Review
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.stateButton, state === 3 && styles.stateButtonActive]}
                  onPress={() => setState(3)}
                >
                  <Text style={[styles.stateButtonText, state === 3 && styles.stateButtonTextActive]}>
                    Relearning
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={[glassEffect.container, styles.section]}>
            <Text style={styles.sectionTitle}>FSRS データ（読み取り専用）</Text>
            
            <View style={styles.dataGrid}>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>安定性 (S)</Text>
                <Text style={styles.dataValue}>{card.stability.toFixed(2)}</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>難易度 (D)</Text>
                <Text style={styles.dataValue}>{card.difficulty.toFixed(2)}</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>経過日数</Text>
                <Text style={styles.dataValue}>{card.elapsedDays}日</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>予定間隔</Text>
                <Text style={styles.dataValue}>{card.scheduledDays}日</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>復習回数</Text>
                <Text style={styles.dataValue}>{card.reps}回</Text>
              </View>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>失敗回数</Text>
                <Text style={styles.dataValue}>{card.lapses}回</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <Text style={styles.deleteButtonText}>
              カードを新規状態にリセット
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  saveButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  section: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  readOnlyText: {
    fontSize: 14,
    color: colors.textTertiary,
    fontFamily: 'monospace',
  },
  hint: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 4,
  },
  stateButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  stateButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  stateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stateButtonTextActive: {
    color: colors.primary,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dataItem: {
    width: '48%',
    backgroundColor: colors.surface + '80',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 8,
    padding: 12,
  },
  dataLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  dataValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  deleteButton: {
    backgroundColor: colors.error + '20',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
});
