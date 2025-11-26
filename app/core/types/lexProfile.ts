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
    name: '隙間時間（15分）',
    description: '通勤・通学の合間に。最低限の習慣維持。',
    dailyLexTarget: 150, // 15分 × 10 Lex/min
    isPro: false,
  },
  {
    id: 'moderate',
    name: '基礎固め（1時間）',
    description: '平日夜の標準セット。着実な進歩を。',
    dailyLexTarget: 600, // 60分 × 10 Lex/min
    isPro: false,
  },
  {
    id: 'hard',
    name: '受験生・標準（3時間）',
    description: '学校・仕事終わりの集中学習。合格への最低ライン。',
    dailyLexTarget: 1800, // 180分 × 10 Lex/min
    isPro: false,
  },
  {
    id: 'intensive',
    name: '追い込み（5時間）',
    description: '休日や直前期向け。半日を学習に捧げる覚悟。',
    dailyLexTarget: 3000, // 300分 × 10 Lex/min
    isPro: true,
  },
  {
    id: 'extreme',
    name: 'フルコミット（8時間）',
    description: '浪人生・専業受験生モード。起きている時間は全て勉強。',
    dailyLexTarget: 4800, // 480分 × 10 Lex/min
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
