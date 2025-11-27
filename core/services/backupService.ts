import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
// Expo SDK 54: 新API移行まではレガシー互換APIを使用
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { booksDB, cardsDB, ledgerDB } from '../database/db';

export interface BackupData {
  version: string;
  exportedAt: string;
  books: any[];
  cards: any[];
  ledger: any[];
}

/**
 * 全データをJSONとしてエクスポートし、シェア機能で保存
 */
export const exportBackup = async (): Promise<void> => {
  try {
    // 全テーブルからデータを取得
    const booksData = await booksDB.getAll();
    const cardsData = await cardsDB.getAll();
    const ledgerData = await ledgerDB.getAll();

    const backup: BackupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      books: booksData,
      cards: cardsData,
      ledger: ledgerData,
    };

    const jsonString = JSON.stringify(backup, null, 2);
    
    // Webの場合はダウンロード
    if (Platform.OS === 'web') {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chiritsumo_backup_${new Date().getTime()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // ネイティブの場合はファイルシステムに保存してシェア
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    const fileUri = `${FileSystem.cacheDirectory}chiritsumo_backup_${new Date().getTime()}.json`;
    // ファイルに書き込み（文字列を直接書き込み）
    await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: 'utf8' as const });

    // シェア機能で保存
    await Sharing.shareAsync(fileUri, {
      dialogTitle: 'バックアップを保存',
      mimeType: 'application/json',
    });

    console.log('Backup exported successfully');
  } catch (error) {
    console.error('Failed to export backup:', error);
    throw error;
  }
};

/**
 * JSONファイルを読み込み、データベースを復元
 */
export interface ImportResult {
  booksAdded: number;
  booksUpdated: number;
  cardsUpserted: number;
  ledgerAdded: number;
}

export const importBackup = async (
  options?: { mode?: 'merge' | 'replace' }
): Promise<ImportResult> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return { booksAdded: 0, booksUpdated: 0, cardsUpserted: 0, ledgerAdded: 0 };
    }

    let jsonString: string;
    // Web環境の場合
    if (Platform.OS === 'web' && result.assets[0].file) {
      const file = result.assets[0].file as File;
      jsonString = await file.text();
    } else {
      // ネイティブ環境ではURIから読み込み
      const fileUri = result.assets[0].uri;
      jsonString = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' as const });
    }

    const backup: BackupData = JSON.parse(jsonString);

    if (!backup.version || !backup.books || !backup.cards || !backup.ledger) {
      throw new Error('Invalid backup file format');
    }

    // Web専用のIndexedDBマージは廃止（Nativeのみ想定）

    // ネイティブ: データベースにマージ（Upsertロジック）
    const existingBooks = await booksDB.getAll();
    const existingBooksMap = new Map(existingBooks.map(b => [b.id, b]));

    try {
      let booksAdded = 0;
      let booksUpdated = 0;
      let cardsUpserted = 0;
      let ledgerAdded = 0;
      // 型正規化: Card の日付文字列を Date に変換
      const normalizedCards = backup.cards.map((c: any) => ({
        ...c,
        due: typeof c.due === 'string' ? new Date(c.due) : c.due,
        lastReview: c.lastReview ? new Date(c.lastReview) : null,
      }));

      // 型正規化: Book（旧フォーマットも受け入れ）
      const normalizedBooks = backup.books.map((b: any) => {
        // snake_caseフォールバック対応
        const createdAt = b.createdAt || b.created_at || new Date().toISOString();
        const updatedAt = b.updatedAt || b.updated_at || createdAt;
        return {
          id: b.id,
          userId: b.userId || b.user_id || 'local-user',
          subjectId: b.subjectId ?? b.subject_id ?? null,
          title: b.title,
          isbn: b.isbn ?? null,
          mode: b.mode,
          totalUnit: b.totalUnit ?? b.total_unit,
          chunkSize: (b.chunkSize ?? b.chunk_size) ?? 1,
          completedUnit: (b.completedUnit ?? b.completed_unit) ?? 0,
          status: b.status,
          previousBookId: b.previousBookId ?? b.previous_book_id ?? null,
          priority: b.priority ?? 0,
          coverPath: b.coverPath ?? b.cover_path ?? null,
          targetCompletionDate: b.targetCompletionDate ?? b.target_completion_date ?? null,
          createdAt,
          updatedAt,
        } as any;
      });

      const mode = options?.mode ?? 'merge';

      if (mode === 'replace') {
        // 依存関係を考慮し、cards -> books -> ledger の順に全削除
        await cardsDB.deleteAll();
        await booksDB.deleteAll();
        await ledgerDB.deleteAll();
      }

      // 書籍データをマージ（replace時は全追加、merge時は比較）
      for (const book of normalizedBooks) {
        if (mode === 'replace') {
          await booksDB.add(book);
          booksAdded += 1;
          continue;
        }
        const existing = existingBooksMap.get(book.id);
        if (!existing) {
          await booksDB.add(book);
          booksAdded += 1;
        } else {
          const existingTime = new Date(existing.updatedAt || existing.createdAt).getTime();
          const importTime = new Date(book.updatedAt || book.createdAt).getTime();
          if (importTime > existingTime) {
            await booksDB.update(book.id, book);
            booksUpdated += 1;
          }
        }
      }

      // カードはupsert（既にマージ対応）
      for (const card of normalizedCards) {
        await cardsDB.upsert(card);
        cardsUpserted += 1;
      }

      // 台帳は日付単位でユニーク
      const existingLedger = await ledgerDB.getAll();
      const existingDates = new Set(existingLedger.map(e => e.date));
      for (const entryRaw of backup.ledger) {
        const entry = {
          date: entryRaw.date,
          earnedLex: Number(entryRaw.earnedLex ?? entryRaw.earned_lex ?? 0),
          targetLex: Number(entryRaw.targetLex ?? entryRaw.target_lex ?? 0),
          balance: Number(entryRaw.balance ?? 0),
        };
        if (mode === 'replace' || !existingDates.has(entry.date)) {
          await ledgerDB.add(entry);
          ledgerAdded += 1;
        }
      }

      console.log('Backup merged successfully (Native)');
      return { booksAdded, booksUpdated, cardsUpserted, ledgerAdded };
    } catch (error) {
      console.error('Failed to merge backup:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to import backup:', error);
    throw error;
  }
};

/**
 * Hook形式でエクスポート（Web版ではSQLiteContextは不要）
 */
export const useBackupService = () => {
  return {
    exportBackup,
    importBackup,
  };
};
