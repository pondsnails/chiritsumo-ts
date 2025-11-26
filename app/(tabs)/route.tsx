import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BookOpen, X } from 'lucide-react-native';
import { booksDB } from '@/app/core/database/db';
import { colors } from '@/app/core/theme/colors';
import { glassEffect } from '@/app/core/theme/glassEffect';
import { MetroLayoutEngine } from '@/app/core/layout/metroLayout';
import { MetroLine } from '@/app/core/components/MetroLine';
import { BookNode } from '@/app/core/components/BookNode';
import type { Book } from '@/app/core/types';
import type { NodePosition } from '@/app/core/layout/metroLayout';

export default function RouteScreen() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nodes, setNodes] = useState<NodePosition[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [hubModalVisible, setHubModalVisible] = useState(false);
  const [hubChildren, setHubChildren] = useState<Book[]>([]);

  const fetchAllBooks = async () => {
    try {
      setIsLoading(true);
      const allBooks = await booksDB.getAll();
      setBooks(allBooks);
    } catch (error) {
      console.error('Failed to fetch books:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllBooks();
  }, []);

  useEffect(() => {
    if (books.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const engine = new MetroLayoutEngine(books);
    const positions = engine.getNodePositions();
    const connections = engine.getEdges(positions);

    setNodes(positions);
    setEdges(connections);
  }, [books]);

  const handleNodePress = (node: NodePosition) => {
    if (node.isHub) {
      setHubChildren(node.children);
      setHubModalVisible(true);
      return;
    }

    if (node.book.status === 2) {
      return;
    }

    router.push(`/books/edit?id=${node.book.id}`);
  };

  const handleHubItemPress = (book: Book) => {
    setHubModalVisible(false);
    router.push(`/books/edit?id=${book.id}`);
  };

  const contentHeight = Math.max(
    nodes.reduce((max, node) => Math.max(max, node.y + 140), 600),
    600
  );

  return (
    <LinearGradient colors={[colors.background, colors.backgroundDark]} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Route</Text>
          <Text style={styles.subtitle}>学習路線図</Text>
        </View>

        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : books.length === 0 ? (
          <View style={styles.centerContent}>
            <Text style={styles.emptyText}>参考書が登録されていません</Text>
            <TouchableOpacity
              style={[glassEffect.card, styles.emptyButton]}
              onPress={() => router.push('/(tabs)/books')}
            >
              <Text style={styles.emptyButtonText}>参考書を追加</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={{ height: contentHeight }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ height: contentHeight, width: '100%' }}>
              <MetroLine edges={edges} width={360} height={contentHeight} />

              {nodes.map((node) => (
                <View
                  key={node.id}
                  style={[
                    styles.nodeWrapper,
                    {
                      left: node.x - 70,
                      top: node.y,
                    },
                  ]}
                >
                  <BookNode
                    book={node.book}
                    isHub={node.isHub}
                    hubCount={node.children.length}
                    onPress={() => handleNodePress(node)}
                    onLongPress={() => router.push(`/books/edit?id=${node.book.id}`)}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => router.push('/(tabs)/books')}
        >
          <BookOpen color={colors.text} size={24} strokeWidth={2.5} />
        </TouchableOpacity>

        <Modal
          visible={hubModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setHubModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[glassEffect.containerLarge, styles.modalContent]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>参考書一覧</Text>
                <TouchableOpacity onPress={() => setHubModalVisible(false)}>
                  <X color={colors.text} size={24} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={hubChildren}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[glassEffect.card, styles.hubItem]}
                    onPress={() => handleHubItemPress(item)}
                  >
                    <Text style={styles.hubItemTitle}>{item.title}</Text>
                    <Text style={styles.hubItemSubtitle}>
                      {item.completedUnit} / {item.totalUnit}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  scrollView: {
    flex: 1,
  },
  nodeWrapper: {
    position: 'absolute',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '70%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  hubItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  hubItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  hubItemSubtitle: {
    fontSize: 12,
    color: colors.textTertiary,
  },
});
