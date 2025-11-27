import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Paths, File } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useCardStore } from '@core/store/cardStore';
import { useBookStore } from '@core/store/bookStore';
import { colors } from '@core/theme/colors';
import { DrizzleCardRepository } from '@core/repository/CardRepository';
import i18n from '@core/i18n';
import type { Card, Book } from '@core/types';

const { width, height } = Dimensions.get('window');

export default function StudyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { fetchDueCards, updateCardReview } = useCardStore();
  const { books } = useBookStore();
  
  const cardRepo = new DrizzleCardRepository();
  
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraRef, setCameraRef] = useState<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    loadCards();
  }, []);

  useEffect(() => {
    if (cards.length > 0 && currentIndex < cards.length) {
      const card = cards[currentIndex];
      const book = books.find((b) => b.id === card.bookId);
      setCurrentBook(book || null);
    }
  }, [currentIndex, cards, books]);

  const loadCards = async () => {
    try {
      setIsLoading(true);
      const bookIds = params.bookIds
        ? (params.bookIds as string).split(',')
        : params.bookId
          ? [params.bookId as string]
          : [];

      if (bookIds.length === 0) {
        router.back();
        return;
      }

      const dueCards = await fetchDueCards(bookIds);
      setCards(dueCards);
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (rating: 1 | 2 | 3 | 4) => {
    if (!currentBook || currentIndex >= cards.length) return;

    try {
      if (rating === 3 || rating === 4) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        if (confettiRef.current) {
          confettiRef.current.start();
        }
      }

      const card = cards[currentIndex];
      await updateCardReview(card.id, card.bookId, rating, currentBook.mode);

      setTimeout(() => {
        if (currentIndex < cards.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          router.back();
        }
      }, rating === 3 || rating === 4 ? 1000 : 0);
    } catch (error) {
      console.error('Failed to update card:', error);
    }
  };

  const handleFailPressIn = () => {
    const timer = setTimeout(() => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      openCamera();
    }, 800) as unknown as number;
    setLongPressTimer(timer);
  };

  const handleFailPressOut = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const openCamera = async () => {
    if (!permission) {
      const { status } = await requestPermission();
      if (status !== 'granted') {
        Alert.alert(i18n.t('common.error'), i18n.t('study.cameraPermissionError'));
        return;
      }
    }
    setShowCamera(true);
  };

  const takePicture = async () => {
    if (cameraRef) {
      try {
        const photo = await cameraRef.takePictureAsync();
        const card = cards[currentIndex];
        
        // Web版の場合はそのまま保存
        if (Platform.OS === 'web') {
          await cardRepo.update(card.id, { photoPath: photo.uri });
          setShowCamera(false);
          Alert.alert('保存完了', '写真メモを保存しました');
          return;
        }

        // ネイティブ版: 永続ディレクトリにコピー
        const timestamp = Date.now();
        const fileName = `memo_${card.id}_${timestamp}.jpg`;
        const permanentFile = new File(Paths.document, 'photos', fileName);
        
        // 元の写真を読み込んで永続ディレクトリに書き込み
        const sourceFile = new File(photo.uri);
        const buffer = await sourceFile.arrayBuffer();
        await permanentFile.write(new Uint8Array(buffer));
        
        // 永続パスを保存
        await cardRepo.update(card.id, { photoPath: permanentFile.uri });
        setShowCamera(false);
        Alert.alert(i18n.t('study.saveCompleted'), i18n.t('study.photoSaved'));
      } catch (error) {
        console.error('Failed to take picture:', error);
        Alert.alert(i18n.t('common.error'), i18n.t('study.photoSaveFailed'));
      }
    }
  };

  if (isLoading) {
    return (
      <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
        <SafeAreaView style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (cards.length === 0) {
    return (
      <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
        <SafeAreaView style={styles.center}>
          <Text style={styles.emptyText}>{i18n.t('study.noCards')}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>{i18n.t('study.back')}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {cards.length}
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.cardContainer}>
            <Text style={styles.bookTitle}>{currentBook?.title}</Text>
            <Text style={styles.unitText}>問題 {currentCard.unitIndex}</Text>

            <View style={styles.cardInfo}>
              <Text style={styles.infoLabel}>復習回数</Text>
              <Text style={styles.infoValue}>{currentCard.reps}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.failButton]}
            onPress={() => handleReview(1)}
            onPressIn={handleFailPressIn}
            onPressOut={handleFailPressOut}
          >
            <Text style={styles.actionButtonText}>もう一度</Text>
            <Text style={styles.actionHint}>長押しで写真メモ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.hardButton]}
            onPress={() => handleReview(2)}
          >
            <Text style={styles.actionButtonText}>難しい</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.passButton]}
            onPress={() => handleReview(3)}
          >
            <Text style={styles.actionButtonText}>できた</Text>
          </TouchableOpacity>
        </View>

        {currentCard.photoPath && (
          <View style={styles.photoMemo}>
            <Image source={{ uri: currentCard.photoPath }} style={styles.photoImage} />
          </View>
        )}

        <ConfettiCannon
          ref={confettiRef}
          count={100}
          origin={{ x: width / 2, y: height / 2 }}
          autoStart={false}
          fadeOut={true}
          fallSpeed={3000}
          colors={['#00F260', '#0575E6', '#FF416C', '#FF4B2B', '#FFD700']}
        />
      </SafeAreaView>

      <Modal visible={showCamera} animationType="slide">
        <CameraView style={styles.camera} facing="back" ref={setCameraRef}>
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.cameraButton} onPress={() => setShowCamera(false)}>
              <Text style={styles.cameraButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cameraCaptureButton} onPress={takePicture}>
              <View style={styles.cameraCaptureInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  cardContainer: {
    width: '100%',
    backgroundColor: colors.surface,
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  unitText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginVertical: 24,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  failButton: {
    backgroundColor: colors.error,
  },
  hardButton: {
    backgroundColor: '#FF9500',
  },
  passButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  actionHint: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
  },
  photoMemo: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 40,
  },
  cameraButton: {
    padding: 16,
  },
  cameraButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  cameraCaptureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraCaptureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.text,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
});
