import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { getDrizzleDb } from '../database/drizzleClient';
import { books, cards, ledger, systemSettings, presetBooks } from '../database/schema';

export const IOS_LAST_BACKUP_AT_KEY = 'ios_last_auto_backup_at';

/** iOS自動バックアップ: ドキュメントディレクトリに生成し共有ダイアログ表示 */
export async function autoIosBackup(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const db = await getDrizzleDb();
    const booksData = await db.select().from(books);
    const cardsData = await db.select().from(cards);
    const ledgerData = await db.select().from(ledger);
    const settingsData = await db.select().from(systemSettings);
    const presetLinks = await db.select().from(presetBooks);

    const backupJson = JSON.stringify({
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      books: booksData,
      cards: cardsData,
      ledger: ledgerData,
      systemSettings: settingsData,
      presetBooks: presetLinks,
    }, null, 2);

    const fileUri = `${FileSystem.documentDirectory}chiritsumo_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await FileSystem.writeAsStringAsync(fileUri, backupJson, { encoding: 'utf8' });

    // 最終バックアップ時刻記録
    await db.insert(systemSettings)
      .values({ key: IOS_LAST_BACKUP_AT_KEY, value: new Date().toISOString(), updated_at: new Date().toISOString() })
      .onConflictDoUpdate({ target: systemSettings.key, set: { value: new Date().toISOString(), updated_at: new Date().toISOString() } })
      .run();

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'バックアップを保存/共有' });
    }
    return true;
  } catch (e) {
    console.warn('iOS自動バックアップ失敗', e);
    return false;
  }
}
