/**
 * Lex目標設定の管理
 * 
 * データ永続化:
 * - SQLite (system_settings テーブル) に保存
 * - AsyncStorage依存を排除
 */

import { DrizzleSystemSettingsRepository } from '../repository/SystemSettingsRepository';
import { LEX_PROFILES, type UserLexSettings } from '../types/lexProfile';

const LEX_SETTINGS_KEY = 'user_lex_settings';
const DEFAULT_PROFILE_ID = 'moderate'; // デフォルトは「標準」

const settingsRepo = new DrizzleSystemSettingsRepository();

/**
 * ユーザーのLex設定を取得
 */
export async function getUserLexSettings(): Promise<UserLexSettings> {
  try {
    const json = await settingsRepo.get(LEX_SETTINGS_KEY);
    if (json) {
      return JSON.parse(json);
    }
  } catch (error) {
    console.error('Failed to load lex settings:', error);
  }
  
  // デフォルト設定を返す
  return { profileId: DEFAULT_PROFILE_ID };
}

/**
 * ユーザーのLex設定を保存
 */
export async function saveUserLexSettings(settings: UserLexSettings): Promise<void> {
  try {
    await settingsRepo.set(LEX_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save lex settings:', error);
    throw error;
  }
}

/**
 * 現在の日次Lex目標値を取得
 */
export async function getDailyLexTarget(): Promise<number> {
  const settings = await getUserLexSettings();
  
  // カスタム設定の場合
  if (settings.profileId === 'custom' && settings.customTarget) {
    return settings.customTarget;
  }
  
  // プリセット設定の場合
  const profile = LEX_PROFILES.find(p => p.id === settings.profileId);
  return profile?.dailyLexTarget || 200; // デフォルト200
}

/**
 * Free版で利用可能なプロファイルのみ取得
 */
export function getAvailableProfilesForFree() {
  return LEX_PROFILES.filter(p => !p.isPro);
}

/**
 * 全プロファイルを取得（Pro版）
 */
export function getAllProfiles() {
  return LEX_PROFILES;
}
