/**
 * MetroLayoutCache
 * レイアウト計算結果をキャッシュして、不要な再計算を防ぐ
 */

import type { Book } from '../types';
import type { NodePosition, Edge } from './metroLayout';
import { MetroLayoutEngine } from './metroLayout';
import { logError, ErrorCategory } from '../utils/errorHandler';

interface CachedLayout {
  nodes: NodePosition[];
  edges: Edge[];
  hash: string;
  timestamp: number;
}

/**
 * 書籍配列からハッシュ値を生成
 * （依存関係の変更を検知するため）
 */
function generateBooksHash(books: Book[]): string {
  const sorted = [...books].sort((a, b) => a.id.localeCompare(b.id));
  const key = sorted
    .map(b => `${b.id}:${b.previousBookId}:${b.status}`)
    .join('|');
  return key;
}

class LayoutCacheManager {
  private cache: CachedLayout | null = null;
  private readonly CACHE_TTL = 1000 * 60 * 5; // 5分

  /**
   * キャッシュからレイアウトを取得
   * 依存関係が変更されていない場合のみ返す
   */
  get(books: Book[]): { nodes: NodePosition[]; edges: Edge[] } | null {
    if (!this.cache) return null;

    const currentHash = generateBooksHash(books);
    const isExpired = Date.now() - this.cache.timestamp > this.CACHE_TTL;

    if (this.cache.hash !== currentHash || isExpired) {
      console.log('[LayoutCache] Cache miss or expired');
      this.cache = null;
      return null;
    }

    console.log('[LayoutCache] Cache hit');
    return {
      nodes: this.cache.nodes,
      edges: this.cache.edges,
    };
  }

  /**
   * レイアウト結果をキャッシュに保存
   */
  set(books: Book[], nodes: NodePosition[], edges: Edge[]): void {
    const hash = generateBooksHash(books);
    this.cache = {
      nodes,
      edges,
      hash,
      timestamp: Date.now(),
    };
    console.log('[LayoutCache] Cached layout for', books.length, 'books');
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache = null;
  }
}

export const layoutCache = new LayoutCacheManager();

/**
 * 非同期でレイアウトを計算
 * （Web Workerの代替として、setImmediateを使用）
 */
export async function computeLayoutAsync(
  books: Book[]
): Promise<{ nodes: NodePosition[]; edges: Edge[] }> {
  // キャッシュチェック
  const cached = layoutCache.get(books);
  if (cached) {
    return cached;
  }

  // 計算を次のイベントループに遅延
  return new Promise((resolve) => {
    // setImmediate（React NativeではqueueMicrotaskを使用）
    queueMicrotask(() => {
      try {
        const engine = new MetroLayoutEngine(books);
        const nodes = engine.getNodePositions();
        const edges = engine.getEdges(nodes);

        // キャッシュに保存
        layoutCache.set(books, nodes, edges);

        resolve({ nodes, edges });
      } catch (error) {
        logError(error, {
          category: ErrorCategory.LAYOUT,
          operation: 'computeLayoutAsync',
          metadata: { bookCount: books.length },
        });
        // エラー時は空の結果を返す
        resolve({ nodes: [], edges: [] });
      }
    });
  });
}
