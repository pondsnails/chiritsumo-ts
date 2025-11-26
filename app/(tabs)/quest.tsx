import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Play } from 'lucide-react-native';
import { useBookStore } from '@/app/core/store/bookStore';
import { useCardStore } from '@/app/core/store/cardStore';
import { SolvencyCapsule } from '@/app/core/components/SolvencyCapsule';
import { TaskCard } from '@/app/core/components/TaskCard';
import { colors } from '@/app/core/theme/colors';
import { glassEffect } from '@/app/core/theme/glassEffect';
import { localDB } from '@/app/core/database/localStorage';
import { calculateLex } from '@/app/core/logic/lexCalculator';
import type { Book, Card } from '@/app/core/types';

interface TaskItem {
  book: Book;
  dueCards: number;
  estimatedLex: number;
}

export default function QuestScreen() {
  const router = useRouter();
  const { books, fetchBooks, isLoading: booksLoading } = useBookStore();
  const { fetchDueCards } = useCardStore();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [todayTarget, setTodayTarget] = useState(0);
  const [todayEarned, setTodayEarned] = useState(0);

  useEffect(() => {
    fetchBooks();
    loadLedgerData();
  }, []);

  const loadLedgerData = async () => {
    try {
      const entries = await localDB.ledger.getRecent(1);
      if (entries.length > 0) {
        const today = entries[0];
        setBalance(today.balance);
        setTodayTarget(today.targetLex);
        setTodayEarned(today.earnedLex);
      }
    } catch (error) {
      console.error('Failed to load ledger:', error);
    }
  };

  useEffect(() => {
    const loadTasks = async () => {
      if (!books.length) {
        setTasks([]);
        setIsLoading(false);
        return;
      }

      try {
        const activeBooks = books
          .filter((b) => b.status === 0)
          .sort((a, b) => b.priority - a.priority);

        const bookIds = activeBooks.map((b) => b.id);
        const dueCards = await fetchDueCards(bookIds);

        const cardsByBook = new Map<string, Card[]>();
        dueCards.forEach((card) => {
          if (!cardsByBook.has(card.bookId)) {
            cardsByBook.set(card.bookId, []);
          }
          cardsByBook.get(card.bookId)!.push(card);
        });

        const newTasks: TaskItem[] = activeBooks
          .map((book) => {
            const cards = cardsByBook.get(book.id) || [];
            const estimatedLex = calculateLex(book, cards.length);
            return {
              book,
              dueCards: cards.length,
              estimatedLex,
            };
          })
          .filter((task) => task.dueCards > 0);

        setTasks(newTasks);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();
  }, [books]);

  const handleStartBook = useCallback(
    (bookId: string) => {
      const task = tasks.find((t) => t.book.id === bookId);
      if (!task) return;

      router.push({
        pathname: '/study',
        params: {
          bookId,
          totalCards: task.dueCards.toString(),
        },
      });
    },
    [tasks, router]
  );

  const handleStartAll = useCallback(() => {
    if (tasks.length === 0) return;

    const firstBook = tasks[0];
    router.push({
      pathname: '/study',
      params: {
        bookId: firstBook.book.id,
        totalCards: firstBook.dueCards.toString(),
      },
    });
  }, [tasks, router]);

  const totalDueCards = tasks.reduce((sum, task) => sum + task.dueCards, 0);
  const totalEstimatedLex = tasks.reduce((sum, task) => sum + task.estimatedLex, 0);

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Quest</Text>

          <SolvencyCapsule balance={balance} todayTarget={todayTarget} todayEarned={todayEarned} />

          <View style={styles.summaryContainer}>
            <View style={[glassEffect.card, styles.summaryCard]}>
              <Text style={styles.summaryLabel}>待機中のカード</Text>
              <Text style={styles.summaryValue}>{totalDueCards}</Text>
            </View>
            <View style={[glassEffect.card, styles.summaryCard]}>
              <Text style={styles.summaryLabel}>獲得予定 Lex</Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>+{totalEstimatedLex}</Text>
            </View>
          </View>

          {isLoading || booksLoading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>学習待機中のカードはありません</Text>
              <Text style={styles.emptySubtext}>すべてのタスクが完了しています</Text>
            </View>
          ) : (
            <View style={styles.taskSection}>
              <Text style={styles.sectionTitle}>今日のクエスト</Text>
              <FlatList
                data={tasks}
                scrollEnabled={false}
                keyExtractor={(item) => item.book.id}
                renderItem={({ item, index }) => (
                  <TaskCard
                    book={item.book}
                    cardsDue={item.dueCards}
                    estimatedLex={item.estimatedLex}
                    index={index}
                    onPress={() => handleStartBook(item.book.id)}
                  />
                )}
              />
            </View>
          )}
        </ScrollView>

        {tasks.length > 0 && (
          <TouchableOpacity style={styles.startOrb} onPress={handleStartAll}>
            <LinearGradient
              colors={[colors.primary, colors.success]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.orbGradient}
            >
              <Play color={colors.text} size={28} strokeWidth={2.5} fill={colors.text} />
              <Text style={styles.orbText}>START ALL</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  centerContent: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  taskSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  startOrb: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  orbGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 32,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  orbText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
});
