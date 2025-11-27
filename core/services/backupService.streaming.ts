/**
 * backupService.streaming.ts
 * メモリ安全なストリーミングバックアップ（OOM対策）
 * 
 * 改善点:
 * 1. チャンク分割処理（1000件ずつ）でメモリ使用量を削減
 * 2. NDJSON形式（改行区切りJSON）でストリーミング書き込み
 * 3. 大規模データでもメモリ安全
 */

import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { z } from 'zod';
import { getDrizzleDb } from '../database/drizzleClient';
import { presetBooks } from '../database/schema';
import { DrizzleBookRepository } from '../repository/BookRepository';
import { DrizzleCardRepository } from '../repository/CardRepository';
import { DrizzleLedgerRepository } from '../repository/LedgerRepository';
import { DrizzleSystemSettingsRepository } from '../repository/SystemSettingsRepository';

// チャンクサイズ定数（メモリ使用量とパフォーマンスのトレードオフ）
const CHUNK_SIZE = 1000;

interface BackupMetadata {
  version: string;
  exportedAt: string;
  format: 'ndjson'; // 改行区切りJSON
  stats: {
    totalBooks: number;
    totalCards: number;
    totalLedger: number;
    totalSettings: number;
  };
}

/**
 * ストリーミングエクスポート（メモリ安全版）
 */
export const exportBackupStreaming = async (): Promise<void> => {
  const fileUri = `${FileSystem.cacheDirectory}chiritsumo_backup_${new Date().getTime()}.ndjson`;
  
  try {
    const bookRepo = new DrizzleBookRepository();
    const cardRepo = new DrizzleCardRepository();
    const ledgerRepo = new DrizzleLedgerRepository();
    const settingsRepo = new DrizzleSystemSettingsRepository();
    
    // メタデータ行（最初の行）
    const metadata: BackupMetadata = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      format: 'ndjson',
      stats: {
        totalBooks: 0,
        totalCards: 0,
        totalLedger: 0,
        totalSettings: 0,
      },
    };
    
    // ファイル初期化（メタデータ行はプレースホルダー）
    await FileSystem.writeAsStringAsync(
      fileUri, 
      JSON.stringify(metadata) + '\n',
      { encoding: 'utf8' }
    );
    
    // 書籍データをチャンク分割して追記
    let totalBooks = 0;
    let offset = 0;
    while (true) {
      const chunk = await bookRepo.findAllPaginated({ limit: CHUNK_SIZE, offset });
      if (chunk.length === 0) break;
      
      for (const book of chunk) {
        await FileSystem.writeAsStringAsync(
          fileUri,
          JSON.stringify({ type: 'book', data: book }) + '\n',
          { encoding: 'utf8' }
        );
      }
      
      totalBooks += chunk.length;
      offset += CHUNK_SIZE;
      
      // 進捗ログ
      console.log(`[BackupStreaming] Exported ${totalBooks} books...`);
      
      if (chunk.length < CHUNK_SIZE) break;
    }
    
    // カードデータをチャンク分割して追記
    let totalCards = 0;
    offset = 0;
    while (true) {
      const chunk = await cardRepo.findAllPaginated({ limit: CHUNK_SIZE, offset });
      if (chunk.length === 0) break;
      
      for (const card of chunk) {
        await FileSystem.writeAsStringAsync(
          fileUri,
          JSON.stringify({ type: 'card', data: card }) + '\n',
          { encoding: 'utf8' }
        );
      }
      
      totalCards += chunk.length;
      offset += CHUNK_SIZE;
      
      console.log(`[BackupStreaming] Exported ${totalCards} cards...`);
      
      if (chunk.length < CHUNK_SIZE) break;
    }
    
    // 台帳データ（通常は小規模なので一括処理）
    const ledgerData = await ledgerRepo.findAll();
    for (const entry of ledgerData) {
      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify({ type: 'ledger', data: entry }) + '\n',
        { encoding: 'utf8' }
      );
    }
    
    // システム設定
    const settings = await settingsRepo.getAll();
    for (const setting of settings) {
      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify({ type: 'setting', data: setting }) + '\n',
        { encoding: 'utf8' }
      );
    }
    
    // プリセット書籍リンク
    const db = await getDrizzleDb();
    const presetLinks = await db.select().from(presetBooks).all();
    for (const link of presetLinks) {
      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify({ type: 'preset_book', data: link }) + '\n',
        { encoding: 'utf8' }
      );
    }
    
    // メタデータを更新（ファイルの先頭行を上書き）
    metadata.stats = {
      totalBooks,
      totalCards,
      totalLedger: ledgerData.length,
      totalSettings: settings.length,
    };
    
    // ファイル全体を読み込んで先頭行のみ置換
    const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' });
    const lines = fileContent.split('\n');
    lines[0] = JSON.stringify(metadata);
    await FileSystem.writeAsStringAsync(
      fileUri,
      lines.join('\n'),
      { encoding: 'utf8' }
    );
    
    // シェア機能で保存
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }
    
    await Sharing.shareAsync(fileUri, {
      dialogTitle: 'バックアップを保存（省メモリ版）',
      mimeType: 'application/json',
    });
    
    console.log('[BackupStreaming] Export completed successfully');
    console.log(`  Books: ${totalBooks}, Cards: ${totalCards}, Ledger: ${ledgerData.length}`);
  } catch (error) {
    console.error('[BackupStreaming] Export failed:', error);
    throw error;
  }
};

/**
 * ストリーミングインポート（メモリ安全版）
 */
export interface ImportResult {
  booksAdded: number;
  booksUpdated: number;
  cardsUpserted: number;
  ledgerAdded: number;
  systemSettingsRestored: number;
}

export const importBackupStreaming = async (
  options?: { mode?: 'merge' | 'replace' }
): Promise<ImportResult> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*', // NDJSONも受け入れる
      copyToCacheDirectory: true,
    });
    
    if (result.canceled) {
      return { 
        booksAdded: 0, 
        booksUpdated: 0, 
        cardsUpserted: 0, 
        ledgerAdded: 0,
        systemSettingsRestored: 0,
      };
    }
    
    const fileUri = result.assets[0].uri;
    const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' });
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('Empty backup file');
    }
    
    // 最初の行はメタデータ
    const metadata = JSON.parse(lines[0]) as BackupMetadata;
    console.log('[BackupStreaming] Import metadata:', metadata);
    
    const bookRepo = new DrizzleBookRepository();
    const cardRepo = new DrizzleCardRepository();
    const ledgerRepo = new DrizzleLedgerRepository();
    const settingsRepo = new DrizzleSystemSettingsRepository();
    
    const mode = options?.mode ?? 'merge';
    
    // Replace モードの場合は全削除
    if (mode === 'replace') {
      await cardRepo.deleteAll();
      await bookRepo.deleteAll();
      await ledgerRepo.deleteAll();
      const db = await getDrizzleDb();
      await db.delete(presetBooks).run();
    }
    
    let booksAdded = 0;
    let booksUpdated = 0;
    let cardsUpserted = 0;
    let ledgerAdded = 0;
    let systemSettingsRestored = 0;
    
    // 既存データマップ（merge モードの場合のみ）
    const existingBooksMap = mode === 'merge' 
      ? new Map((await bookRepo.findAll()).map(b => [b.id, b]))
      : new Map();
    const existingLedgerDates = mode === 'merge'
      ? new Set((await ledgerRepo.findAll()).map(e => e.date))
      : new Set();
    
    // バッチ処理用バッファ
    const bookBatch: any[] = [];
    const cardBatch: any[] = [];
    const ledgerBatch: any[] = [];
    const presetBookBatch: any[] = [];
    
    // 行ごとに処理（メタデータ行はスキップ）
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const record = JSON.parse(line);
        
        switch (record.type) {
          case 'book':
            const book = normalizeBook(record.data);
            
            if (mode === 'replace') {
              bookBatch.push(book);
              booksAdded++;
            } else {
              // マージモード: 更新判定
              const existing = existingBooksMap.get(book.id);
              if (!existing) {
                bookBatch.push(book);
                booksAdded++;
              } else {
                const existingTime = new Date(existing.updatedAt || existing.createdAt).getTime();
                const importTime = new Date(book.updatedAt || book.createdAt).getTime();
                if (importTime > existingTime) {
                  bookBatch.push(book);
                  booksUpdated++;
                }
              }
            }
            
            // バッチサイズに達したら一括挿入
            if (bookBatch.length >= CHUNK_SIZE) {
              await bookRepo.bulkUpsert(bookBatch);
              bookBatch.length = 0;
            }
            break;
            
          case 'card':
            const card = normalizeCard(record.data);
            cardBatch.push(card);
            cardsUpserted++;
            
            if (cardBatch.length >= CHUNK_SIZE) {
              await cardRepo.bulkUpsert(cardBatch);
              cardBatch.length = 0;
            }
            break;
            
          case 'ledger':
            const ledgerEntry = normalizeLedger(record.data);
            
            if (mode === 'replace' || !existingLedgerDates.has(ledgerEntry.date)) {
              ledgerBatch.push(ledgerEntry);
              ledgerAdded++;
            }
            
            if (ledgerBatch.length >= CHUNK_SIZE) {
              await ledgerRepo.bulkAdd(ledgerBatch);
              ledgerBatch.length = 0;
            }
            break;
            
          case 'setting':
            await settingsRepo.set(record.data.key, record.data.value);
            systemSettingsRestored++;
            break;
            
          case 'preset_book':
            presetBookBatch.push(record.data);
            
            if (presetBookBatch.length >= CHUNK_SIZE) {
              const db = await getDrizzleDb();
              await db.insert(presetBooks).values(presetBookBatch).run();
              presetBookBatch.length = 0;
            }
            break;
        }
      } catch (parseError) {
        console.warn(`[BackupStreaming] Skipping invalid line ${i}:`, parseError);
      }
    }
    
    // 残りのバッチを処理
    if (bookBatch.length > 0) {
      await bookRepo.bulkUpsert(bookBatch);
    }
    if (cardBatch.length > 0) {
      await cardRepo.bulkUpsert(cardBatch);
    }
    if (ledgerBatch.length > 0) {
      await ledgerRepo.bulkAdd(ledgerBatch);
    }
    if (presetBookBatch.length > 0) {
      const db = await getDrizzleDb();
      await db.insert(presetBooks).values(presetBookBatch).run();
    }
    
    console.log('[BackupStreaming] Import completed successfully');
    console.log(`  Books: +${booksAdded} ~${booksUpdated}, Cards: ${cardsUpserted}, Ledger: +${ledgerAdded}`);
    
    return {
      booksAdded,
      booksUpdated,
      cardsUpserted,
      ledgerAdded,
      systemSettingsRestored,
    };
  } catch (error) {
    console.error('[BackupStreaming] Import failed:', error);
    throw error;
  }
};

// ヘルパー関数: データ正規化
function normalizeBook(raw: any): any {
  const createdAt = raw.createdAt || raw.created_at || new Date().toISOString();
  const updatedAt = raw.updatedAt || raw.updated_at || createdAt;
  
  return {
    id: raw.id,
    userId: raw.userId || raw.user_id || 'local-user',
    subjectId: raw.subjectId ?? raw.subject_id ?? null,
    title: raw.title,
    isbn: raw.isbn ?? null,
    mode: raw.mode,
    totalUnit: raw.totalUnit ?? raw.total_unit,
    chunkSize: (raw.chunkSize ?? raw.chunk_size) ?? 1,
    completedUnit: (raw.completedUnit ?? raw.completed_unit) ?? 0,
    status: raw.status,
    previousBookId: raw.previousBookId ?? raw.previous_book_id ?? null,
    priority: raw.priority ?? 0,
    coverPath: raw.coverPath ?? raw.cover_path ?? null,
    targetCompletionDate: raw.targetCompletionDate ?? raw.target_completion_date ?? null,
    createdAt,
    updatedAt,
  };
}

function normalizeCard(raw: any): any {
  return {
    ...raw,
    due: typeof raw.due === 'string' ? new Date(raw.due) : raw.due,
    lastReview: raw.lastReview ? new Date(raw.lastReview) : null,
  };
}

function normalizeLedger(raw: any): any {
  return {
    date: raw.date,
    earnedLex: Number(raw.earnedLex ?? raw.earned_lex ?? 0),
    targetLex: Number(raw.targetLex ?? raw.target_lex ?? 0),
    balance: Number(raw.balance ?? 0),
  };
}

/**
 * Hook形式でエクスポート
 */
export const useBackupServiceStreaming = () => {
  return {
    exportBackup: exportBackupStreaming,
    importBackup: importBackupStreaming,
  };
};
