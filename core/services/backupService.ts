import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
// Expo SDK 54: 新API移行まではレガシー互換APIを使用
import * as FileSystem from 'expo-file-system/legacy';
import { z } from 'zod';
import { drizzleDb } from '../database/drizzleClient';
import { presetBooks } from '../database/schema';
import { DrizzleBookRepository } from '../repository/BookRepository';
import { DrizzleCardRepository } from '../repository/CardRepository';
import { DrizzleLedgerRepository } from '../repository/LedgerRepository';
import { DrizzleSystemSettingsRepository } from '../repository/SystemSettingsRepository';

export interface BackupData {
  version: string;
  exportedAt: string;
  books: any[];
  cards: any[];
  ledger: any[];
  systemSettings?: any[]; // オプショナル（既存バックアップとの互換性）
  presetBooks?: { preset_id: number; book_id: string }[]; // 正規化後のリンクテーブル
}

// =====================
// Zod Schemas
// =====================
const BookBackupSchema = z.object({
  id: z.string(),
  title: z.string(),
  mode: z.number().int().min(0).max(2).optional(),
  totalUnit: z.number().int().nonnegative().optional(),
  total_unit: z.number().int().nonnegative().optional(),
  chunkSize: z.number().int().positive().optional(),
  chunk_size: z.number().int().positive().optional(),
  completedUnit: z.number().int().min(0).optional(),
  completed_unit: z.number().int().min(0).optional(),
  updatedAt: z.string().optional(),
  updated_at: z.string().optional(),
  createdAt: z.string().optional(),
  created_at: z.string().optional(),
}).passthrough();

const CardBackupSchema = z.object({
  id: z.string(),
  bookId: z.string().optional(),
  book_id: z.string().optional(),
  unitIndex: z.number().int().min(0).optional(),
  unit_index: z.number().int().min(0).optional(),
  due: z.union([z.string(), z.date()]),
  lastReview: z.union([z.string(), z.date()]).nullish(),
  last_review: z.union([z.string(), z.date()]).nullish().optional(),
}).passthrough();

const LedgerBackupSchema = z.object({
  date: z.string(),
  earnedLex: z.number().optional(),
  earned_lex: z.number().optional(),
  targetLex: z.number().optional(),
  target_lex: z.number().optional(),
  balance: z.number().optional(),
}).passthrough();

const SystemSettingBackupSchema = z.object({
  key: z.string(),
  value: z.string(),
}).passthrough();

const PresetBookLinkSchema = z.object({
  preset_id: z.number().int(),
  book_id: z.string(),
});

const BackupSchema = z.object({
  version: z.string(),
  exportedAt: z.string(),
  books: z.array(BookBackupSchema),
  cards: z.array(CardBackupSchema),
  ledger: z.array(LedgerBackupSchema),
  systemSettings: z.array(SystemSettingBackupSchema).optional(),
  presetBooks: z.array(PresetBookLinkSchema).optional(),
});

/**
 * 全データをJSONとしてエクスポートし、シェア機能で保存
 */
export const exportBackup = async (): Promise<void> => {
  try {
    const bookRepo = new DrizzleBookRepository();
    const cardRepo = new DrizzleCardRepository();
    const ledgerRepo = new DrizzleLedgerRepository();
    const settingsRepo = new DrizzleSystemSettingsRepository();
    
    // 全テーブルからデータを取得
    const booksData = await bookRepo.findAll();
    const cardsData = await cardRepo.findAll();
    const ledgerData = await ledgerRepo.findAll();
    const systemSettingsData = await settingsRepo.getAll();
    // 正規化されたプリセット関連（リンクテーブル）
    const presetLinks = await (drizzleDb.select().from(presetBooks)).all();

    const backup: BackupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      books: booksData,
      cards: cardsData,
      ledger: ledgerData,
      systemSettings: systemSettingsData,
      presetBooks: presetLinks,
    };

    const jsonString = JSON.stringify(backup, null, 2);
    
    // ファイルシステムに保存してシェア
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
  systemSettingsRestored?: number; // オプショナル（旧バックアップ互換性）
}

export const importBackup = async (
  options?: { mode?: 'merge' | 'replace' }
): Promise<ImportResult> => {
  try {
    const bookRepo = new DrizzleBookRepository();
    const cardRepo = new DrizzleCardRepository();
    const ledgerRepo = new DrizzleLedgerRepository();
    const settingsRepo = new DrizzleSystemSettingsRepository();
    
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return { booksAdded: 0, booksUpdated: 0, cardsUpserted: 0, ledgerAdded: 0 };
    }

    // URIから読み込み
    const fileUri = result.assets[0].uri;
    const jsonString = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' as const });

    let backup: BackupData;
    try {
      backup = BackupSchema.parse(JSON.parse(jsonString));
    } catch (e: any) {
      const message = e?.issues ? JSON.stringify(e.issues) : (e?.message ?? 'Unknown parse error');
      throw new Error(`Invalid backup file format: ${message}`);
    }

    // Web専用のIndexedDBマージは廃止（Nativeのみ想定）

    // ネイティブ: データベースにマージ（Upsertロジック）
    const existingBooks = await bookRepo.findAll();
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
        await cardRepo.deleteAll();
        await bookRepo.deleteAll();
        await ledgerRepo.deleteAll();

        // 一括挿入で高速化
        await bookRepo.bulkUpsert(normalizedBooks);
        booksAdded = normalizedBooks.length;
        await cardRepo.bulkUpsert(normalizedCards);
        cardsUpserted = normalizedCards.length;
        const normalizedLedger = backup.ledger.map((entryRaw: any) => ({
          date: entryRaw.date,
          earnedLex: Number(entryRaw.earnedLex ?? entryRaw.earned_lex ?? 0),
          targetLex: Number(entryRaw.targetLex ?? entryRaw.target_lex ?? 0),
          balance: Number(entryRaw.balance ?? 0),
        }));
        await ledgerRepo.bulkAdd(normalizedLedger);
        ledgerAdded = normalizedLedger.length;
        // preset_books の復元（存在する場合のみ、プリセット自体は保持されている前提）
        if (backup.presetBooks && backup.presetBooks.length > 0) {
          await drizzleDb.delete(presetBooks).run();
          await drizzleDb.insert(presetBooks).values(backup.presetBooks).run();
        }
        
        // systemSettings復元（あれば）
        let systemSettingsRestored = 0;
        if (backup.systemSettings && backup.systemSettings.length > 0) {
          for (const setting of backup.systemSettings) {
            await settingsRepo.set(setting.key, setting.value);
            systemSettingsRestored++;
          }
        }

        console.log('Backup replaced successfully (Native)');
        return { booksAdded, booksUpdated, cardsUpserted, ledgerAdded, systemSettingsRestored };
      }

      // 書籍データをマージ（比較）: 追加・更新を事前に振り分け、一括実行
      const booksToAdd: any[] = [];
      const booksToUpdate: any[] = [];
      for (const book of normalizedBooks) {
        const existing = existingBooksMap.get(book.id);
        if (!existing) {
          booksToAdd.push(book);
        } else {
          const existingTime = new Date(existing.updatedAt || existing.createdAt).getTime();
          const importTime = new Date(book.updatedAt || book.createdAt).getTime();
          if (importTime > existingTime) {
            booksToUpdate.push(book);
          }
        }
      }
      if (booksToAdd.length > 0) {
        await bookRepo.bulkUpsert(booksToAdd);
        booksAdded += booksToAdd.length;
      }
      if (booksToUpdate.length > 0) {
        await bookRepo.bulkUpsert(booksToUpdate);
        booksUpdated += booksToUpdate.length;
      }

      // カードは一括upsert
      if (normalizedCards.length > 0) {
        await cardRepo.bulkUpsert(normalizedCards);
        cardsUpserted = normalizedCards.length;
      }

      // 台帳は日付単位でユニーク → 追加対象のみ抽出して一括追加
      const existingLedger = await ledgerRepo.findAll();
      const existingDates = new Set(existingLedger.map(e => e.date));
      const ledgerToAdd = backup.ledger.map((entryRaw: any) => ({
        date: entryRaw.date,
        earnedLex: Number(entryRaw.earnedLex ?? entryRaw.earned_lex ?? 0),
        targetLex: Number(entryRaw.targetLex ?? entryRaw.target_lex ?? 0),
        balance: Number(entryRaw.balance ?? 0),
      })).filter((e: any) => !existingDates.has(e.date));
      if (ledgerToAdd.length > 0) {
        await ledgerRepo.bulkAdd(ledgerToAdd);
        ledgerAdded = ledgerToAdd.length;
      }
      
      // preset_books マージ（重複考慮せず挿入のみ）
      if (backup.presetBooks && backup.presetBooks.length > 0) {
        // すでに存在するリンクの重複挿入を避けるには unique 制約が必要だが、
        // 現行スキーマに無いので一旦ベタ挿入のみ（後続で改善可）
        await drizzleDb.insert(presetBooks).values(backup.presetBooks).run();
      }

      // systemSettings復元（あれば上書き）
      let systemSettingsRestored = 0;
      if (backup.systemSettings && backup.systemSettings.length > 0) {
        for (const setting of backup.systemSettings) {
          await settingsRepo.set(setting.key, setting.value);
          systemSettingsRestored++;
        }
      }

      console.log('Backup merged successfully (Native)');
      return { booksAdded, booksUpdated, cardsUpserted, ledgerAdded, systemSettingsRestored };
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
