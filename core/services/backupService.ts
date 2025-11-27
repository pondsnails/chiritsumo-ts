import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
// Expo SDK 54: 新API移行まではレガシー互換APIを使用
import * as FileSystem from 'expo-file-system/legacy';
import { z } from 'zod';
import { getDrizzleDb } from '../database/drizzleClient';
import { presetBooks, books, cards, ledger } from '../database/schema';
import { DrizzleBookRepository } from '../repository/BookRepository';
import { DrizzleCardRepository } from '../repository/CardRepository';
import { DrizzleLedgerRepository } from '../repository/LedgerRepository';
import { DrizzleSystemSettingsRepository } from '../repository/SystemSettingsRepository';

// BackupData type definition moved to after Zod schema definition

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
  version: z.string().optional(),
  exportedAt: z.string().optional(),
  books: z.array(BookBackupSchema),
  cards: z.array(CardBackupSchema),
  ledger: z.array(LedgerBackupSchema),
  systemSettings: z.array(SystemSettingBackupSchema).optional(),
  presetBooks: z.array(PresetBookLinkSchema).optional(),
}).transform(data => {
  const toUnixNullable = (v: any): number | null => {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return v;
    const d = new Date(v);
    return Math.floor(d.getTime()/1000);
  };
  const toUnix = (v: any): number => {
    const r = toUnixNullable(v);
    return r ?? Math.floor(Date.now()/1000);
  };
  return {
    version: data.version ?? '1.0.0',
    exportedAt: data.exportedAt ?? new Date().toISOString(),
    books: data.books.map(b => ({
      id: b.id,
      userId: (b as any).userId ?? (b as any).user_id ?? 'local-user',
      subjectId: (b as any).subjectId ?? (b as any).subject_id ?? null,
      title: b.title,
      isbn: (b as any).isbn ?? null,
      mode: (b as any).mode ?? 1,
      totalUnit: (b as any).totalUnit ?? (b as any).total_unit ?? 0,
      chunkSize: (b as any).chunkSize ?? (b as any).chunk_size ?? 1,
      completedUnit: (b as any).completedUnit ?? (b as any).completed_unit ?? 0,
      status: (b as any).status ?? 0,
      previousBookId: (b as any).previousBookId ?? (b as any).previous_book_id ?? null,
      priority: (b as any).priority ?? 1,
      coverPath: (b as any).coverPath ?? (b as any).cover_path ?? null,
      targetCompletionDate: toUnixNullable((b as any).targetCompletionDate ?? (b as any).target_completion_date),
      createdAt: toUnix((b as any).createdAt ?? (b as any).created_at),
      updatedAt: toUnix((b as any).updatedAt ?? (b as any).updated_at ?? (b as any).createdAt ?? (b as any).created_at),
    })),
    cards: data.cards.map(c => ({
      id: c.id,
      bookId: (c as any).bookId ?? (c as any).book_id ?? '',
      unitIndex: (c as any).unitIndex ?? (c as any).unit_index ?? 0,
      state: (c as any).state ?? 0,
      stability: (c as any).stability ?? 0,
      difficulty: (c as any).difficulty ?? 0,
      elapsed_days: (c as any).elapsed_days ?? (c as any).elapsedDays ?? 0,
      scheduled_days: (c as any).scheduled_days ?? (c as any).scheduledDays ?? 0,
      reps: (c as any).reps ?? 0,
      lapses: (c as any).lapses ?? 0,
      due: toUnix((c as any).due),
      lastReview: toUnixNullable((c as any).lastReview ?? (c as any).last_review),
      photoPath: (c as any).photoPath ?? (c as any).photo_path ?? null,
    })),
    ledger: data.ledger.map(l => ({
      date: toUnix((l as any).date),
      earnedLex: (l as any).earnedLex ?? (l as any).earned_lex ?? 0,
      targetLex: (l as any).targetLex ?? (l as any).target_lex ?? 0,
      balance: (l as any).balance ?? 0,
    })),
    systemSettings: data.systemSettings ?? [],
    presetBooks: data.presetBooks ?? [],
  };
});

export type RawBackupData = z.input<typeof BackupSchema>;
export type NormalizedBackupData = z.infer<typeof BackupSchema>;

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
    const db = await getDrizzleDb();
    const presetLinks = await db.select().from(presetBooks);

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
 * JSONまたはNDJSONファイルを読み込み、データベースを復元
 * - 通常のJSON形式（exportBackup）とNDJSON形式（exportBackupStreaming）の両方に対応
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
      type: ['application/json', 'application/x-ndjson'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return { booksAdded: 0, booksUpdated: 0, cardsUpserted: 0, ledgerAdded: 0 };
    }

    // URIから読み込み
    const fileUri = result.assets[0].uri;
    const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' as const });

    let backupRaw: RawBackupData;
    try {
      // NDJSON形式の検出（拡張子またはメタデータで判定）
      const isNDJSON = fileUri.endsWith('.ndjson') || fileContent.startsWith('{"type":"metadata"');
      
      if (isNDJSON) {
        // NDJSON形式の復元
        const lines = fileContent.split('\n').filter(line => line.trim());
        const books: any[] = [];
        const cards: any[] = [];
        const ledger: any[] = [];
        const systemSettings: any[] = [];
        const presetBooks: any[] = [];
        
        for (const line of lines) {
          const obj = JSON.parse(line);
          if (obj.type === 'metadata') continue;
          if (obj.type === 'book') books.push(obj.data);
          if (obj.type === 'card') cards.push(obj.data);
          if (obj.type === 'ledger') ledger.push(obj.data);
          if (obj.type === 'systemSetting') systemSettings.push(obj.data);
          if (obj.type === 'presetBook') presetBooks.push(obj.data);
        }
        
        backupRaw = { books, cards, ledger, systemSettings, presetBooks } as any;
      } else {
        // 通常のJSON形式
        backupRaw = JSON.parse(fileContent);
      }
      
      // Zodスキーマでバリデーション
      const backup = BackupSchema.parse(backupRaw);
      // 正規化後のデータを以降で使用
      const normalizedBooks = backup.books;
      const normalizedCards = backup.cards;
      const normalizedLedger = backup.ledger;
      const systemSettingsNormalized = backup.systemSettings;
      const presetBooksNormalized = backup.presetBooks;
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
      const mode = options?.mode ?? 'merge';

      if (mode === 'replace') {
        // 【重要】全削除→挿入を単一トランザクションで実行してデータ消失を防ぐ
        const db = await getDrizzleDb();
        
        await db.transaction(async (tx) => {
          // 依存関係を考慮し、cards -> books -> ledger の順に全削除
          await tx.delete(cards);
          await tx.delete(books);
          await tx.delete(ledger);
          
          // 一括挿入で高速化
          if (normalizedBooks.length > 0) {
            await tx.insert(books).values(normalizedBooks.map(b => ({
              id: b.id,
              user_id: b.userId,
              subject_id: b.subjectId,
              title: b.title,
              isbn: b.isbn,
              mode: b.mode,
              total_unit: b.totalUnit,
              chunk_size: b.chunkSize,
              completed_unit: b.completedUnit,
              status: b.status,
              previous_book_id: b.previousBookId,
              priority: b.priority,
              cover_path: b.coverPath,
              target_completion_date: b.targetCompletionDate,
              created_at: b.createdAt,
              updated_at: b.updatedAt,
            })));
            booksAdded = normalizedBooks.length;
          }
          
          if (normalizedCards.length > 0) {
            await tx.insert(cards).values(normalizedCards.map((c: any) => ({
              id: c.id,
              book_id: c.bookId,
              unit_index: c.unitIndex,
              state: c.state,
              stability: c.stability,
              difficulty: c.difficulty,
              elapsed_days: c.elapsed_days,
              scheduled_days: c.scheduled_days,
              reps: c.reps,
              lapses: c.lapses,
              due: c.due,
              last_review: c.lastReview,
              photo_path: c.photoPath,
            })));
            cardsUpserted = normalizedCards.length;
          }
          
          const normalizedLedgerInsert = normalizedLedger.map((l: any) => ({
            date: l.date,
            earned_lex: Number(l.earnedLex),
            target_lex: Number(l.targetLex),
            balance: Number(l.balance),
            transaction_type: 'daily' as const,
            note: null,
          }));
          
          if (normalizedLedgerInsert.length > 0) {
            await tx.insert(ledger).values(normalizedLedgerInsert);
            ledgerAdded = normalizedLedgerInsert.length;
          }
          
          // preset_books の復元（存在する場合のみ、プリセット自体は保持されている前提）
          if (presetBooksNormalized && presetBooksNormalized.length > 0) {
            await tx.delete(presetBooks);
            await tx.insert(presetBooks).values(presetBooksNormalized);
          }
        });
        
        // systemSettings復元（あれば）トランザクション外でOK（独立したKVストア）
        let systemSettingsRestored = 0;
        if (systemSettingsNormalized && systemSettingsNormalized.length > 0) {
          for (const setting of systemSettingsNormalized) {
            await settingsRepo.set(setting.key, setting.value);
            systemSettingsRestored++;
          }
        }

        console.log('Backup replaced successfully (Native, transactional)');
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
          const existingTime = (existing.updatedAt || existing.createdAt) * 1000;
          const importTime = (book.updatedAt || book.createdAt) * 1000;
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
      const ledgerToAdd = normalizedLedger.filter((e: any) => !existingDates.has(e.date));
      if (ledgerToAdd.length > 0) {
        await ledgerRepo.bulkAdd(ledgerToAdd);
        ledgerAdded = ledgerToAdd.length;
      }
      
      // preset_books マージ（重複考慮せず挿入のみ）
      if (presetBooksNormalized && presetBooksNormalized.length > 0) {
        const db = await getDrizzleDb();
        await db.insert(presetBooks).values(presetBooksNormalized);
      }

      // systemSettings復元（あれば上書き）
      let systemSettingsRestored = 0;
      if (systemSettingsNormalized && systemSettingsNormalized.length > 0) {
        for (const setting of systemSettingsNormalized) {
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
 * Hook形式でエクスポート
 */
export const useBackupService = () => {
  return {
    exportBackup,
    importBackup,
    exportBackupStreaming, // メモリ安全版
    importBackupStreaming,
  };
};

// =====================
// ストリーミングバックアップ（メモリ安全）
// =====================

const CHUNK_SIZE = 1000;

/**
 * ストリーミングエクスポート（NDJSON形式、メモリ安全）
 * 大量データでもOOMを回避
 */
export const exportBackupStreaming = async (): Promise<void> => {
  const fileUri = `${FileSystem.cacheDirectory}chiritsumo_backup_${new Date().getTime()}.ndjson`;
  
  try {
    const bookRepo = new DrizzleBookRepository();
    const cardRepo = new DrizzleCardRepository();
    const ledgerRepo = new DrizzleLedgerRepository();
    const settingsRepo = new DrizzleSystemSettingsRepository();
    
    // メタデータ行（最初の行）
    const metadata = {
      type: 'metadata',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      format: 'ndjson',
    };
    
    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(metadata) + '\n',
      { encoding: 'utf8' }
    );
    
    // 書籍データをチャンク分割して追記
    const allBooks = await bookRepo.findAll();
    for (const book of allBooks) {
      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify({ type: 'book', data: book }) + '\n',
        { encoding: 'utf8' }
      );
    }
    
    // カードデータをチャンク分割して追記
    const allCards = await cardRepo.findAll();
    for (let i = 0; i < allCards.length; i += CHUNK_SIZE) {
      const chunk = allCards.slice(i, i + CHUNK_SIZE);
      for (const card of chunk) {
        await FileSystem.writeAsStringAsync(
          fileUri,
      }).transform((b) => {
        const toUnix = (v: any): number | null => {
          if (v === null || v === undefined || v === '') return null;
          if (typeof v === 'number') return v;
          const d = new Date(v);
          return Math.floor(d.getTime() / 1000);
        };
        return {
          id: b.id,
          userId: b.userId ?? b.user_id ?? 'local-user',
          subjectId: b.subjectId ?? b.subject_id ?? null,
          title: b.title,
          isbn: b.isbn ?? null,
          mode: (b.mode ?? 1) as 0 | 1 | 2,
          totalUnit: (b.totalUnit ?? b.total_unit ?? 0) as number,
          chunkSize: (b.chunkSize ?? b.chunk_size ?? 1) as number,
          completedUnit: (b.completedUnit ?? b.completed_unit ?? 0) as number,
          status: (b.status ?? 0) as 0 | 1 | 2,
          previousBookId: b.previousBookId ?? b.previous_book_id ?? null,
          priority: (b.priority ?? 1) as 0 | 1,
          coverPath: b.coverPath ?? b.cover_path ?? null,
          targetCompletionDate: toUnix(b.targetCompletionDate ?? b.target_completion_date),
          createdAt: toUnix(b.createdAt ?? b.created_at) ?? Math.floor(Date.now()/1000),
          updatedAt: toUnix(b.updatedAt ?? b.updated_at) ?? toUnix(b.createdAt ?? b.created_at) ?? Math.floor(Date.now()/1000),
        };
      }).passthrough();
          { encoding: 'utf8' }
        );
      }
      console.log(`[StreamingBackup] Exported ${Math.min(i + CHUNK_SIZE, allCards.length)} / ${allCards.length} cards`);
    }
    
    // 台帳データ
    const allLedger = await ledgerRepo.findAll();
    for (const entry of allLedger) {
      await FileSystem.writeAsStringAsync(
      }).transform((c) => {
        const toUnixNullable = (v: any): number | null => {
          if (v === null || v === undefined || v === '') return null;
          if (typeof v === 'number') return v;
          const d = new Date(v);
          return Math.floor(d.getTime() / 1000);
        };
        const toUnix = (v: any): number => {
          const r = toUnixNullable(v);
          return r ?? Math.floor(Date.now()/1000);
        };
        return {
          id: c.id,
          bookId: c.bookId ?? c.book_id ?? '',
          unitIndex: (c.unitIndex ?? c.unit_index ?? 0) as number,
          due: toUnix(c.due),
          lastReview: toUnixNullable(c.lastReview ?? c.last_review),
        };
      }).passthrough();
        JSON.stringify({ type: 'ledger', data: entry }) + '\n',
        { encoding: 'utf8' }
      );
    }
    
    console.log('[StreamingBackup] Export completed');
    
    // 共有ダイアログ
      }).transform((l) => {
        const toUnix = (v: any): number => {
          if (typeof v === 'number') return v;
          return Math.floor(new Date(v).getTime()/1000);
        };
        return {
          date: toUnix(l.date),
          earnedLex: l.earnedLex ?? l.earned_lex ?? 0,
          targetLex: l.targetLex ?? l.target_lex ?? 0,
          balance: l.balance ?? 0,
        };
      }).passthrough();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }
    
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/x-ndjson',
      dialogTitle: 'ちりつもバックアップを保存（ストリーミング版）',
    });
    
  } catch (error) {
    console.error('[StreamingBackup] Export failed:', error);
    throw error;
  }
};

/**
 * ストリーミングインポート（NDJSON専用）: 大量データでも一括配列保持せず段階的Upsert
 */
export const importBackupStreaming = async (options?: { mode?: 'merge' | 'replace' }) => {
  try {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/x-ndjson'], copyToCacheDirectory: true });
    if (result.canceled) return { booksAdded: 0, booksUpdated: 0, cardsUpserted: 0, ledgerAdded: 0 };
    const fileUri = result.assets[0].uri;
    const content = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' as const });
    const lines = content.split('\n').filter(l => l.trim());
    const mode = options?.mode ?? 'merge';

    const toUnixNullable = (v: any): number | null => {
      if (v === null || v === undefined || v === '') return null;
      if (typeof v === 'number') return v;
      const d = new Date(v); return Math.floor(d.getTime()/1000);
    };
    const toUnix = (v: any): number => (toUnixNullable(v) ?? Math.floor(Date.now()/1000));

    let booksAdded = 0, booksUpdated = 0, cardsUpserted = 0, ledgerAdded = 0, systemSettingsRestored = 0;
    const db = await getDrizzleDb();

    // Atomic strategy: create staging tables then swap
    await db.transaction(async tx => {
      if (mode === 'replace') {
        // Create staging tables
        tx.run(sql`CREATE TABLE IF NOT EXISTS books_staging AS SELECT * FROM books WHERE 0`);
        tx.run(sql`CREATE TABLE IF NOT EXISTS cards_staging AS SELECT * FROM cards WHERE 0`);
        tx.run(sql`CREATE TABLE IF NOT EXISTS ledger_staging AS SELECT * FROM ledger WHERE 0`);
        tx.run(sql`CREATE TABLE IF NOT EXISTS preset_books_staging AS SELECT * FROM preset_books WHERE 0`);
      }

      // Load existing books (for merge diff)
      const existingBooks = mode === 'merge' ? await tx.select().from(books).all() : [];
      const existingBooksMap = new Map(existingBooks.map((b: any) => [b.id, b]));

      for (const line of lines) {
        let obj: any; try { obj = JSON.parse(line); } catch { continue; }
        if (obj.type === 'metadata') continue;
        if (obj.type === 'book') {
          const b = obj.data;
          const normalized = {
            id: b.id,
            user_id: b.userId ?? b.user_id ?? 'local-user',
            subject_id: b.subjectId ?? b.subject_id ?? null,
            title: b.title,
            isbn: b.isbn ?? null,
            mode: b.mode ?? 1,
            total_unit: b.totalUnit ?? b.total_unit ?? 0,
            chunk_size: b.chunkSize ?? b.chunk_size ?? 1,
            completed_unit: b.completedUnit ?? b.completed_unit ?? 0,
            status: b.status ?? 0,
            previous_book_id: b.previousBookId ?? b.previous_book_id ?? null,
            priority: b.priority ?? 1,
            cover_path: b.coverPath ?? b.cover_path ?? null,
            target_completion_date: toUnixNullable(b.targetCompletionDate ?? b.target_completion_date),
            created_at: toUnix(b.createdAt ?? b.created_at),
            updated_at: toUnix(b.updatedAt ?? b.updated_at ?? b.createdAt ?? b.created_at),
          };
          if (mode === 'replace') {
            await tx.insert(sql`books_staging`).values(normalized as any).run();
            booksAdded++;
          } else {
            const existing = existingBooksMap.get(normalized.id);
            if (!existing) { await tx.insert(books).values(normalized).run(); booksAdded++; existingBooksMap.set(normalized.id, normalized); }
            else {
              const existingTime = (existing.updated_at || existing.created_at) * 1000;
              const importTime = (normalized.updated_at || normalized.created_at) * 1000;
              if (importTime > existingTime) { await tx.update(books).set(normalized).where(eq(books.id, normalized.id)).run(); booksUpdated++; existingBooksMap.set(normalized.id, normalized); }
            }
          }
        }
        else if (obj.type === 'card') {
          const c = obj.data;
          const normalized = {
            id: c.id,
            book_id: c.bookId ?? c.book_id ?? '',
            unit_index: c.unitIndex ?? c.unit_index ?? 0,
            state: c.state ?? 0,
            stability: c.stability ?? 0,
            difficulty: c.difficulty ?? 0,
            elapsed_days: c.elapsed_days ?? c.elapsedDays ?? 0,
            scheduled_days: c.scheduled_days ?? c.scheduledDays ?? 0,
            reps: c.reps ?? 0,
            lapses: c.lapses ?? 0,
            due: toUnix(c.due),
            last_review: toUnixNullable(c.lastReview ?? c.last_review),
            photo_path: c.photoPath ?? c.photo_path ?? null,
          };
          if (mode === 'replace') {
            await tx.insert(sql`cards_staging`).values(normalized as any).run();
          } else {
            await tx.insert(cards).values(normalized).run();
          }
          cardsUpserted++;
        }
        else if (obj.type === 'ledger') {
          const l = obj.data;
            const normalized = {
              date: toUnix(l.date),
              earned_lex: l.earnedLex ?? l.earned_lex ?? 0,
              target_lex: l.targetLex ?? l.target_lex ?? 0,
              balance: l.balance ?? 0,
              transaction_type: 'daily',
              note: null,
            };
            if (mode === 'replace') {
              await tx.insert(sql`ledger_staging`).values(normalized as any).run();
            } else {
              await tx.insert(ledger).values(normalized).run();
            }
            ledgerAdded++;
        }
        else if (obj.type === 'systemSetting') {
          const s = obj.data;
          // System settings independent; update directly
          await tx.insert(systemSettings).values({ key: s.key, value: s.value, updated_at: new Date().toISOString() }).onConflictDoUpdate({ target: systemSettings.key, set: { value: s.value, updated_at: new Date().toISOString() } }).run();
          systemSettingsRestored++;
        }
      }

      if (mode === 'replace') {
        // Drop originals and rename staging atomically
        tx.run(sql`DROP TABLE cards`);
        tx.run(sql`DROP TABLE books`);
        tx.run(sql`DROP TABLE ledger`);
        tx.run(sql`DROP TABLE preset_books`);
        tx.run(sql`ALTER TABLE books_staging RENAME TO books`);
        tx.run(sql`ALTER TABLE cards_staging RENAME TO cards`);
        tx.run(sql`ALTER TABLE ledger_staging RENAME TO ledger`);
        tx.run(sql`ALTER TABLE preset_books_staging RENAME TO preset_books`);
      }
    });

    return { booksAdded, booksUpdated, cardsUpserted, ledgerAdded, systemSettingsRestored };
  } catch (e) {
    console.error('[StreamingImport] Failed', e);
    throw e;
  }
};
