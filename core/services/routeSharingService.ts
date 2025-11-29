/**
 * routeSharingService.ts
 * サーバーレスでルート（学習計画）を共有するためのサービス
 * 
 * 【設計思想】
 * - 個人の進捗データは含まず、Book依存関係のメタデータのみをエクスポート
 * - JSON形式で軽量に保存/共有（QRコード、クリップボード、SNS経由）
 * - インポート時、未所持の本はグレーアウト表示 + Amazon affiliate link
 * - ゼロサーバーコストで「東大生が作ったルート」を拡散→バイラル成長
 */

import { getDrizzleDb } from '../database/drizzleClient';
import { books } from '../database/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { Clipboard } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { reportError } from './errorReporter';

// ---------------------------------------------------------
// 型定義
// ---------------------------------------------------------

/** 共有用のBook最小メタデータ（個人情報なし） */
export interface SharedBookNode {
  title: string;
  isbn?: string | null;
  mode: number; // 0=Read, 1=Solve, 2=Memo
  totalUnit: number;
  chunkSize: number;
  previousBookId: string | null; // 依存関係を保持
  priority: number; // 0=Branch, 1=MainLine
}

/** 共有ルート全体 */
export interface SharedRoute {
  version: string; // フォーマットバージョン（将来の互換性）
  name: string; // ルート名（例: "東大理系合格ルート"）
  description?: string; // 説明文
  createdAt: number; // Unix秒
  books: SharedBookNode[];
}

/** インポート時のBook拡張情報 */
export interface ImportedBookNode extends SharedBookNode {
  isOwned: boolean; // 既にDBに存在するか
  existingBookId?: string; // 既存Book IDがあればマージ用
  affiliateUrl?: string; // Amazon affiliate URL（未所持の場合）
}

// ---------------------------------------------------------
// エクスポート機能
// ---------------------------------------------------------

/**
 * 現在のルート（全書籍）をJSON形式でエクスポート
 * @param routeName ルート名（例: "東大理系合格ルート"）
 * @param description 説明文（任意）
 * @returns SharedRoute JSON文字列
 */
export const exportRouteAsJson = async (
  routeName: string,
  description?: string
): Promise<string> => {
  try {
    const db = await getDrizzleDb();
    
    // 全書籍を取得（Frozen除外）
    const allBooks = await db
      .select()
      .from(books)
      .where(and(
        eq(books.status, 0), // Active
        eq(books.user_id, 'local-user')
      ));

    // メタデータのみ抽出
    const sharedBooks: SharedBookNode[] = allBooks.map((book) => ({
      title: book.title,
      isbn: book.isbn,
      mode: book.mode,
      totalUnit: book.total_unit,
      chunkSize: book.chunk_size || 1,
      previousBookId: book.previous_book_id,
      priority: book.priority || 1,
    }));

    const sharedRoute: SharedRoute = {
      version: '1.0.0',
      name: routeName,
      description,
      createdAt: Math.floor(Date.now() / 1000),
      books: sharedBooks,
    };

    return JSON.stringify(sharedRoute, null, 2);
  } catch (error) {
    reportError(error, { context: 'routeSharingService:exportRouteAsJson' });
    throw error;
  }
};

/**
 * ルートJSONをクリップボードにコピー
 */
export const copyRouteToClipboard = async (routeName: string, description?: string) => {
  try {
    const jsonString = await exportRouteAsJson(routeName, description);
    Clipboard.setString(jsonString);
    return true;
  } catch (error) {
    reportError(error, { context: 'routeSharingService:copyRouteToClipboard' });
    throw error;
  }
};

/**
 * ルートJSONをファイルとして共有（OS標準シェア機能）
 */
export const shareRouteAsFile = async (routeName: string, description?: string) => {
  try {
    const jsonString = await exportRouteAsJson(routeName, description);
    
    // 一時ファイルに書き込み
    const fileName = `route_${routeName.replace(/\s+/g, '_')}_${Date.now()}.json`;
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: 'utf8' as const });

    // OS標準シェア
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      throw new Error('Sharing is not available on this device');
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: `${routeName}を共有`,
      UTI: 'public.json',
    });

    // 共有後、一時ファイル削除
    try {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    } catch (e) {
      // ファイル削除失敗は無視
    }
    
    return true;
  } catch (error) {
    reportError(error, { context: 'routeSharingService:shareRouteAsFile' });
    throw error;
  }
};

// ---------------------------------------------------------
// インポート機能
// ---------------------------------------------------------

/**
 * ルートJSONをパースし、所有状態を判定
 * @param jsonString 共有ルートJSON文字列
 * @returns インポート用のBook配列（所有状態付き）
 */
export const parseSharedRoute = async (
  jsonString: string
): Promise<{ route: SharedRoute; importedBooks: ImportedBookNode[] }> => {
  try {
    const sharedRoute: SharedRoute = JSON.parse(jsonString);

    // バージョンチェック（将来的な互換性対応）
    if (!sharedRoute.version || !sharedRoute.books) {
      throw new Error('Invalid route format');
    }

    const db = await getDrizzleDb();
    
    // 全既存書籍をISBNでマッピング
    const allBooks = await db
      .select()
      .from(books)
      .where(eq(books.user_id, 'local-user'));

    const isbnMap = new Map<string, string>(); // ISBN -> bookId
    const titleMap = new Map<string, string>(); // title -> bookId
    
    allBooks.forEach((book) => {
      if (book.isbn) isbnMap.set(book.isbn, book.id);
      titleMap.set(book.title.toLowerCase(), book.id);
    });

    // 各BookNodeの所有判定
    const importedBooks: ImportedBookNode[] = sharedRoute.books.map((bookNode) => {
      let isOwned = false;
      let existingBookId: string | undefined;

      // ISBN優先マッチング
      if (bookNode.isbn && isbnMap.has(bookNode.isbn)) {
        isOwned = true;
        existingBookId = isbnMap.get(bookNode.isbn);
      }
      // タイトル部分一致（ISBN未登録の場合）
      else if (titleMap.has(bookNode.title.toLowerCase())) {
        isOwned = true;
        existingBookId = titleMap.get(bookNode.title.toLowerCase());
      }

      // 未所持の場合、Amazon affiliate URL生成
      const affiliateUrl = !isOwned && bookNode.isbn
        ? generateAmazonAffiliateUrl(bookNode.isbn)
        : undefined;

      return {
        ...bookNode,
        isOwned,
        existingBookId,
        affiliateUrl,
      };
    });

    return { route: sharedRoute, importedBooks };
  } catch (error) {
    reportError(error, { context: 'routeSharingService:parseSharedRoute' });
    throw error;
  }
};

/**
 * クリップボードからルートJSONをインポート
 */
export const importRouteFromClipboard = async () => {
  try {
    const clipboardText = await Clipboard.getString();
    if (!clipboardText) {
      throw new Error('Clipboard is empty');
    }

    return await parseSharedRoute(clipboardText);
  } catch (error) {
    reportError(error, { context: 'routeSharingService:importRouteFromClipboard' });
    throw error;
  }
};

// ---------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------

/**
 * Amazon affiliate URL生成
 * （実際のアフィリエイトIDは環境変数から取得することを推奨）
 */
const generateAmazonAffiliateUrl = (isbn: string): string => {
  const affiliateId = 'chiritsumo-22'; // ※本番環境では環境変数化
  return `https://www.amazon.co.jp/dp/${isbn}?tag=${affiliateId}`;
};

/**
 * QRコード生成用テキスト（将来実装）
 * expo-qrcode などを使用してQR画像を生成
 */
export const generateQRCodeData = async (routeName: string, description?: string): Promise<string> => {
  // JSONをBase64エンコードしてQR用URLに埋め込む
  const jsonString = await exportRouteAsJson(routeName, description);
  const base64 = Buffer.from(jsonString).toString('base64');
  
  // カスタムURLスキーム（ディープリンク対応想定）
  return `chiritsumo://import-route?data=${base64}`;
};
