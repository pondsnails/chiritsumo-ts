/**
 * UI Helper utilities
 * DRY原則：UI層で共通のロジックを集約
 */

import { colors } from '../theme/colors';
import { BookMode, BookModeLabel, BookStatus, BookStatusLabel } from '../constants/enums';
import i18n from '../i18n';

/**
 * モードに応じた色を取得
 */
export function getModeColor(mode: 0 | 1 | 2): string {
  switch (mode) {
    case BookMode.READ:
      return colors.read;
    case BookMode.SOLVE:
      return colors.solve;
    case BookMode.MEMO:
      return colors.memo;
    default:
      return colors.primary;
  }
}

/**
 * モードに応じたラベルを取得
 */
export function getModeLabel(mode: 0 | 1 | 2): string {
  switch (mode) {
    case BookMode.READ:
      return i18n.t('common.modeRead');
    case BookMode.SOLVE:
      return i18n.t('common.modeSolve');
    case BookMode.MEMO:
      return i18n.t('common.modeMemo');
    default:
      return '';
  }
}

/**
 * モードに応じた短縮ラベルを取得
 */
export function getModeShortLabel(mode: 0 | 1 | 2): string {
  switch (mode) {
    case BookMode.READ:
      return '読む';
    case BookMode.SOLVE:
      return '解く';
    case BookMode.MEMO:
      return '暗記';
    default:
      return '';
  }
}

/**
 * モードに応じたアイコン文字を取得
 */
export function getModeIcon(mode: 0 | 1 | 2): string {
  switch (mode) {
    case BookMode.READ:
      return '読';
    case BookMode.SOLVE:
      return '解';
    case BookMode.MEMO:
      return '暗';
    default:
      return '?';
  }
}

/**
 * ステータスに応じたラベルを取得
 */
export function getStatusLabel(status: 0 | 1 | 2): string {
  switch (status) {
    case BookStatus.ACTIVE:
      return i18n.t('books.statusInProgress');
    case BookStatus.COMPLETED:
      return i18n.t('books.statusCompleted');
    case BookStatus.FROZEN:
      return i18n.t('books.statusPaused');
    default:
      return '';
  }
}

/**
 * Unix秒を日付文字列（YYYY-MM-DD）に変換
 */
export function formatUnixToDate(unixSeconds: number | null | undefined): string | null {
  if (!unixSeconds) return null;
  const date = new Date(unixSeconds * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Unix秒を相対時間（○日前、など）に変換
 */
export function formatUnixToRelative(unixSeconds: number | null | undefined): string {
  if (!unixSeconds) return '';
  
  const now = Math.floor(Date.now() / 1000);
  const diffSeconds = now - unixSeconds;
  const diffDays = Math.floor(diffSeconds / (60 * 60 * 24));
  
  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '昨日';
  if (diffDays < 7) return `${diffDays}日前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}ヶ月前`;
  return `${Math.floor(diffDays / 365)}年前`;
}
