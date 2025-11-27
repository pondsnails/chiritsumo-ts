import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, Save, Barcode } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useBookStore } from '@core/store/bookStore';
import { useSubscriptionStore, canAddBook } from '@core/store/subscriptionStore';
import { validateBookAddition } from '@core/utils/circularReferenceDetector';
import { getBookTitleFromBarcode } from '@core/services/bookDataService';
import { colors } from '@core/theme/colors';
import ChunkSizeSelector from '@core/components/ChunkSizeSelector';
import { calculateLexPerCard } from '@core/logic/lexCalculator';
import { glassEffect } from '@core/theme/glassEffect';
import i18n from '@core/i18n';
import type { Book } from '@core/types';

export default function AddBookScreen() {
  const router = useRouter();
  const { addBook, books, fetchBooks } = useBookStore();
  const { isProUser } = useSubscriptionStore();
  const [title, setTitle] = useState('');
  const [totalUnit, setTotalUnit] = useState('');
  const [chunkSize, setChunkSize] = useState<number>(1);
  const [mode, setMode] = useState<0 | 1 | 2>(0);
  const [previousBookId, setPreviousBookId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // バーコードスキャナー関連
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoadingBookInfo, setIsLoadingBookInfo] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleBarcodeScan = async () => {
    // カメラ権限チェック
    if (!permission) {
      return;
    }

    if (!permission.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('カメラ権限が必要です', 'バーコードスキャンにはカメラ権限が必要です。');
        return;
      }
    }

    setShowScanner(true);
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    setShowScanner(false);
    setIsLoadingBookInfo(true);

    try {
      const bookTitle = await getBookTitleFromBarcode(data);
      
      if (bookTitle) {
        setTitle(bookTitle);
        Alert.alert('書籍情報を取得しました', `タイトル: ${bookTitle}`);
      } else {
        Alert.alert(
          '書籍が見つかりませんでした',
          `ISBN: ${data}\n手動で入力してください。`
        );
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      Alert.alert('エラー', '書籍情報の取得に失敗しました');
    } finally {
      setIsLoadingBookInfo(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !totalUnit.trim()) {
      Alert.alert(i18n.t('books.inputError'), i18n.t('books.inputErrorMessage'));
      return;
    }

    // Free Planの制限チェック
    if (!canAddBook(books.length, isProUser)) {
      Alert.alert(
        '📚 参考書登録制限（Free版）',
        `Free版では最大3冊まで参考書を登録できます。\n現在：${books.length}/3冊\n\nPro版にアップグレードすると：\n✓ 参考書を無制限に登録可能\n✓ 目標の自動調整機能\n✓ 学習分析ダッシュボード\n✓ ストリーク保護機能`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'Pro版を見る（¥3,600）',
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
      Alert.alert(i18n.t('common.error'), validationError);
      return;
    }

    try {
      setIsSaving(true);
      const newBook: Book = {
        ...newBookData,
        userId: 'local-user',
        totalUnit: parseInt(totalUnit),
        chunkSize: chunkSize || 1,
        completedUnit: 0,
        mode,
        status: 0,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      };

      await addBook(newBook);
      router.back();
    } catch (error) {
      console.error('Failed to add book:', error);
      Alert.alert(i18n.t('common.error'), i18n.t('books.addError'));
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
            <Text style={styles.title}>{i18n.t('books.addBook')}</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={[glassEffect.container, styles.formContainer]}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{i18n.t('books.titleLabel')}</Text>
              <View style={styles.titleInputRow}>
                <TextInput
                  style={[styles.input, styles.titleInput]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={i18n.t('books.titlePlaceholder')}
                  placeholderTextColor={colors.textTertiary}
                />
                <TouchableOpacity
                  style={styles.barcodeButton}
                  onPress={handleBarcodeScan}
                  disabled={isLoadingBookInfo}
                >
                  {isLoadingBookInfo ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                  ) : (
                    <Barcode color={colors.primary} size={24} strokeWidth={2} />
                  )}
                </TouchableOpacity>
              </View>
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
              <ChunkSizeSelector
                value={chunkSize}
                onChange={setChunkSize}
                totalUnit={parseInt(totalUnit || '0') || undefined}
                modeAverageLex={calculateLexPerCard(mode)}
                onRequestPro={() => router.push('/paywall')}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{i18n.t('books.previousBookLabel')}</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowPicker(!showPicker)}
              >
                <Text style={[styles.pickerText, !previousBookId && styles.placeholderText]}>
                  {previousBookId
                    ? books.find(b => b.id === previousBookId)?.title || i18n.t('books.previousBookNone')
                    : i18n.t('books.previousBookNone')}
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
                    <Text style={styles.pickerItemText}>{i18n.t('books.previousBookNone')}</Text>
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

        {/* バーコードスキャナーモーダル */}
        <Modal
          visible={showScanner}
          animationType="slide"
          onRequestClose={() => setShowScanner(false)}
        >
          <View style={styles.scannerContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8'],
              }}
              onBarcodeScanned={handleBarcodeScanned}
            >
              <View style={styles.scannerOverlay}>
                <View style={styles.scannerHeader}>
                  <Text style={styles.scannerTitle}>ISBNバーコードをスキャン</Text>
                  <TouchableOpacity
                    style={styles.scannerCloseButton}
                    onPress={() => setShowScanner(false)}
                  >
                    <Text style={styles.scannerCloseText}>閉じる</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.scannerFrame} />
                <Text style={styles.scannerHint}>
                  書籍の裏表紙のバーコードを枠内に合わせてください
                </Text>
              </View>
            </CameraView>
          </View>
        </Modal>
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
  titleInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  titleInput: {
    flex: 1,
  },
  barcodeButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  scannerCloseButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scannerCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  scannerFrame: {
    alignSelf: 'center',
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scannerHint: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
});
