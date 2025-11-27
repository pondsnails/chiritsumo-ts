import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Plus, BookOpen, Sparkles, Edit2, Trash2, Target } from 'lucide-react-native';
import { useBookStore } from '@core/store/bookStore';
import { colors } from '@core/theme/colors';
import { glassEffect } from '@core/theme/glassEffect';
import i18n from '@core/i18n';
import type { Book } from '@core/types';

export default function BooksScreen() {
  const router = useRouter();
  const { books, fetchBooks, deleteBook, isLoading } = useBookStore();

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteBook(id);
    } catch (error) {
      console.error('Failed to delete book:', error);
    }
  };

  const calculateDailyQuota = (book: Book): number | null => {
    if (!book.targetCompletionDate) return null;
    
    const remaining = book.totalUnit - (book.completedUnit || 0);
    if (remaining <= 0) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(book.targetCompletionDate);
    target.setHours(0, 0, 0, 0);
    
    const daysRemaining = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 0) return null;
    
    return Math.ceil(remaining / daysRemaining);
  };

  const getModeColor = (mode: number) => {
    if (mode === 0) return colors.read;
    if (mode === 1) return colors.solve;
    return colors.memo;
  };

  const getModeLabel = (mode: number) => {
    if (mode === 0) return i18n.t('common.modeRead');
    if (mode === 1) return i18n.t('common.modeSolve');
    return i18n.t('common.modeMemo');
  };

  const getStatusLabel = (status: number) => {
    if (status === 0) return i18n.t('books.statusInProgress');
    if (status === 1) return i18n.t('books.statusCompleted');
    return i18n.t('books.statusPaused');
  };

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{i18n.t('books.title')}</Text>
              <Text style={styles.subtitle}>{i18n.t('books.subtitle')}</Text>
            </View>
            <TouchableOpacity
              style={[glassEffect.card, styles.addButton]}
              onPress={() => router.push('/books/add')}
            >
              <Plus color={colors.primary} size={24} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* 厳選ルートマップへのリンク（検索ではなく提案） */}
          <TouchableOpacity
            style={[glassEffect.card, styles.searchCard]}
            onPress={() => router.push('/recommended-routes' as any)}
          >
            <Sparkles color={colors.primary} size={24} />
            <View style={styles.searchCardContent}>
              <Text style={styles.searchCardTitle}>厳選ルートマップ</Text>
              <Text style={styles.searchCardSubtitle}>
                目標達成への最短ルートを提案
              </Text>
            </View>
          </TouchableOpacity>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : books.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{i18n.t('books.noBooks')}</Text>
              <TouchableOpacity
                style={[glassEffect.card, styles.emptyButton]}
                onPress={() => router.push('/books/add')}
              >
                <Text style={styles.emptyButtonText}>{i18n.t('books.addFirstBook')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={books}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const dailyQuota = calculateDailyQuota(item);
                
                return (
                  <View style={[glassEffect.card, styles.bookCard]}>
                    <View style={styles.bookHeader}>
                      <View
                        style={[
                          styles.modeBadge,
                          { backgroundColor: getModeColor(item.mode) },
                        ]}
                      >
                        <Text style={styles.modeBadgeText}>{getModeLabel(item.mode)}</Text>
                      </View>
                      <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
                    </View>

                    <Text style={styles.bookTitle}>{item.title}</Text>

                    {/* Deadline Mode ノルマ表示 */}
                    {dailyQuota !== null && (
                      <View style={styles.deadlineQuota}>
                        <Target color={colors.warning} size={16} strokeWidth={2} />
                        <Text style={styles.deadlineQuotaText}>
                          今日のノルマ: <Text style={styles.deadlineQuotaValue}>{dailyQuota}ページ</Text>
                        </Text>
                      </View>
                    )}

                    <View style={styles.bookDetails}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>{i18n.t('books.totalUnits')}</Text>
                        <Text style={styles.detailValue}>{item.totalUnit}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>{i18n.t('books.completedUnits')}</Text>
                        <Text style={styles.detailValue}>{item.completedUnit}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>{i18n.t('books.progress')}</Text>
                        <Text style={styles.detailValue}>
                          {item.totalUnit > 0
                            ? Math.round(((item.completedUnit || 0) / item.totalUnit) * 100)
                            : 0}
                          %
                        </Text>
                      </View>
                    </View>

                    <View style={styles.bookActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push(`/books/edit?id=${item.id}`)}
                      >
                        <Edit2 color={colors.primary} size={18} strokeWidth={2} />
                        <Text style={styles.actionButtonText}>{i18n.t('common.edit')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDelete(item.id)}
                      >
                        <Trash2 color={colors.error} size={18} strokeWidth={2} />
                        <Text style={[styles.actionButtonText, { color: colors.error }]}>{i18n.t('common.delete')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}
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
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
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
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginBottom: 24,
    gap: 16,
  },
  searchCardContent: {
    flex: 1,
  },
  searchCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  searchCardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  bookCard: {
    marginBottom: 16,
    padding: 16,
  },
  bookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeBadgeText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  statusText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  bookTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  deadlineQuota: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.warning + '15',
    borderRadius: 8,
    marginBottom: 12,
  },
  deadlineQuotaText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  deadlineQuotaValue: {
    fontWeight: '700',
    color: colors.warning,
    fontSize: 14,
  },
  bookDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  bookActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
