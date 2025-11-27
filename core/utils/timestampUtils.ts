/**
 * timestampUtils.ts
 * タイムゾーン安全な日付管理（YYYY-MM-DD文字列主キーからの脱却）
 * 
 * 設計方針:
 * - すべてUTC Unix Timestampで保存
 * - 表示時にローカルタイムに変換
 * - "今日"の定義はユーザーのローカルタイムゾーンに従う
 * - タイムゾーン跨ぎ移動でも主キー重複を防ぐ
 */

/**
 * 現在のUTC Unix Timestamp（秒）を取得
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * 現在のUTC Unix Timestamp（ミリ秒）を取得
 */
export function getCurrentTimestampMs(): number {
  return Date.now();
}

/**
 * 日付オブジェクトをUTC Unix Timestamp（秒）に変換
 */
export function dateToTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * UTC Unix Timestamp（秒）を日付オブジェクトに変換
 */
export function timestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * ローカルタイムゾーンでの"今日"の開始時刻（UTC Timestamp）を取得
 * 例: JST 2025-11-27 00:00:00 → UTC Timestamp
 */
export function getLocalDayStartTimestamp(date: Date = new Date()): number {
  const localDate = new Date(date);
  localDate.setHours(0, 0, 0, 0);
  return dateToTimestamp(localDate);
}

/**
 * ローカルタイムゾーンでの"今日"の終了時刻（UTC Timestamp）を取得
 * 例: JST 2025-11-27 23:59:59 → UTC Timestamp
 */
export function getLocalDayEndTimestamp(date: Date = new Date()): number {
  const localDate = new Date(date);
  localDate.setHours(23, 59, 59, 999);
  return dateToTimestamp(localDate);
}

/**
 * UTC TimestampをローカルタイムゾーンのYYYY-MM-DD文字列に変換
 * （表示用のみ。DBには保存しない）
 */
export function timestampToLocalDateString(timestamp: number): string {
  const date = timestampToDate(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * ローカルタイムゾーンのYYYY-MM-DD文字列をUTC Timestamp（その日の開始時刻）に変換
 */
export function localDateStringToTimestamp(dateString: string): number {
  const date = new Date(dateString + 'T00:00:00'); // ローカルタイムゾーンで解釈
  return dateToTimestamp(date);
}

/**
 * 2つのタイムスタンプが同じローカル日付かどうかを判定
 */
export function isSameLocalDay(timestamp1: number, timestamp2: number): boolean {
  const date1 = timestampToLocalDateString(timestamp1);
  const date2 = timestampToLocalDateString(timestamp2);
  return date1 === date2;
}

/**
 * 指定日数後のタイムスタンプを取得
 */
export function addDays(timestamp: number, days: number): number {
  const date = timestampToDate(timestamp);
  date.setDate(date.getDate() + days);
  return dateToTimestamp(date);
}

/**
 * 指定時間後のタイムスタンプを取得
 */
export function addHours(timestamp: number, hours: number): number {
  return timestamp + (hours * 3600);
}

/**
 * 指定分後のタイムスタンプを取得
 */
export function addMinutes(timestamp: number, minutes: number): number {
  return timestamp + (minutes * 60);
}

/**
 * タイムスタンプ間の日数差を計算
 */
export function getDaysDifference(timestamp1: number, timestamp2: number): number {
  const diffSeconds = Math.abs(timestamp2 - timestamp1);
  return Math.floor(diffSeconds / 86400); // 86400秒 = 1日
}

/**
 * 人間が読める形式にフォーマット（ローカルタイム）
 * 例: "2025-11-27 14:30:00"
 */
export function formatTimestamp(timestamp: number): string {
  const date = timestampToDate(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Unix TimestampをYYYY-MM-DD形式に変換（ローカルタイムゾーン）
 * BrainAnalyticsDashboard等で使用
 */
export function formatTimestampToDate(timestamp: number): string {
  const date = timestampToDate(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 相対時間表示（"3分前"、"2日前"など）
 */
export function getRelativeTime(timestamp: number): string {
  const now = getCurrentTimestamp();
  const diff = now - timestamp;
  
  if (diff < 0) {
    return '未来';
  }
  
  if (diff < 60) {
    return `${diff}秒前`;
  }
  
  if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes}分前`;
  }
  
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours}時間前`;
  }
  
  const days = Math.floor(diff / 86400);
  return `${days}日前`;
}

/**
 * Legacy互換：YYYY-MM-DD文字列から変換（既存データ移行用）
 * ⚠️ 新規コードでは使用しない
 */
export function legacyDateStringToTimestamp(dateString: string): number {
  console.warn('[DEPRECATED] legacyDateStringToTimestamp is for migration only');
  return localDateStringToTimestamp(dateString);
}

/**
 * マイグレーション用：現在のDBの日付文字列を一括変換
 * スキーマ変更時に使用
 */
export interface DateMigrationEntry {
  oldDate: string; // "YYYY-MM-DD"
  newTimestamp: number; // Unix Timestamp
}

export function createMigrationMap(dateStrings: string[]): DateMigrationEntry[] {
  return dateStrings.map(dateString => ({
    oldDate: dateString,
    newTimestamp: localDateStringToTimestamp(dateString),
  }));
}
