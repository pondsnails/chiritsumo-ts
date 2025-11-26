/**
 * Lex目標プリセットとユーザープロファイル
 */

export interface LexProfile {
  id: string;
  name: string;
  description: string;
  dailyLexTarget: number;
  isPro: boolean; // Pro版専用プロファイルかどうか
}

/**
 * Lex目標プリセット
 * Free版: 最初の3つのみ選択可能
 * Pro版: 全プリセット + カスタム設定可能
 */
export const LEX_PROFILES: LexProfile[] = [
  {
    id: 'light',
    name: '軽め（社会人向け）',
    description: '仕事との両立を重視。無理なく続けられるペース',
    dailyLexTarget: 100,
    isPro: false,
  },
  {
    id: 'moderate',
    name: '標準（大学生向け）',
    description: 'バランスの取れた学習量。着実に成長',
    dailyLexTarget: 200,
    isPro: false,
  },
  {
    id: 'intensive',
    name: '本気（受験生向け）',
    description: '高い目標を掲げて集中学習',
    dailyLexTarget: 400,
    isPro: false,
  },
  {
    id: 'extreme',
    name: '極限（浪人生向け）',
    description: '1日の大半を学習に捧げる覚悟',
    dailyLexTarget: 600,
    isPro: true,
  },
  {
    id: 'beast',
    name: '人外（ガチ勢専用）',
    description: '限界突破。睡眠時間も削る勢い',
    dailyLexTarget: 800,
    isPro: true,
  },
];

/**
 * カスタムプロファイル（Pro版専用）
 */
export interface CustomLexProfile {
  dailyLexTarget: number; // 50〜1000の範囲で自由設定
}

/**
 * ユーザー設定
 */
export interface UserLexSettings {
  profileId: string; // プリセットID or 'custom'
  customTarget?: number; // カスタム設定値（Pro版のみ）
}
