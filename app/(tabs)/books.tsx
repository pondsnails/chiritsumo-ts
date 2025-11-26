import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Plus, Edit2, Trash2 } from 'lucide-react-native';
import { useBookStore } from '@/app/core/store/bookStore';
import { BookRecommendations } from '@/app/core/components/BookRecommendations';
import { colors } from '@/app/core/theme/colors';
import { glassEffect } from '@/app/core/theme/glassEffect';
import type { Book } from '@/app/core/types';

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

  const getModeColor = (mode: number) => {
    if (mode === 0) return colors.read;
    if (mode === 1) return colors.solve;
    return colors.memo;
  };

  const getModeLabel = (mode: number) => {
    if (mode === 0) return '読';
    if (mode === 1) return '解';
    return '暗';
  };

  const getStatusLabel = (status: number) => {
    if (status === 0) return '進行中';
    if (status === 1) return '完了';
    return '中断';
  };

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Books</Text>
              <Text style={styles.subtitle}>参考書管理</Text>
            </View>
            <TouchableOpacity
              style={[glassEffect.card, styles.addButton]}
              onPress={() => router.push('/books/add')}
            >
              <Plus color={colors.primary} size={24} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <BookRecommendations
            context={{
              completedBooks: books.filter(b => b.status === 1),
              currentBooks: books.filter(b => b.status === 0),
              interests: [],
            }}
          />

          {isLoading ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : books.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>参考書が登録されていません</Text>
              <TouchableOpacity
                style={[glassEffect.card, styles.emptyButton]}
                onPress={() => router.push('/books/add')}
              >
                <Text style={styles.emptyButtonText}>最初の参考書を追加</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={books}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
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

                  <View style={styles.bookDetails}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>総単位</Text>
                      <Text style={styles.detailValue}>{item.totalUnit}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>完了単位</Text>
                      <Text style={styles.detailValue}>{item.completedUnit}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>進捗</Text>
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
                      <Text style={styles.actionButtonText}>編集</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(item.id)}
                    >
                      <Trash2 color={colors.error} size={18} strokeWidth={2} />
                      <Text style={[styles.actionButtonText, { color: colors.error }]}>削除</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
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
    marginBottom: 16,
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
