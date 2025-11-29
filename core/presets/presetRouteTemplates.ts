/**
 * presetRouteTemplates.ts
 * 
 * 人気資格試験・学習ルートのテンプレート集
 * 初回起動時にワンタップで丸ごと展開可能
 * 
 * 改善案実装：「導入の簡略化」対応
 */

export interface PresetBook {
  title: string;
  isbn?: string;
  mode: 0 | 1 | 2; // 0=Read, 1=Solve, 2=Memo
  totalUnit: number;
  chunkSize: number;
  previousBookId?: string; // 依存関係（親書籍のID）
  priority: 0 | 1; // 0=Branch, 1=MainLine
  amazonAffiliateLink?: string;
}

export interface PresetRoute {
  id: string;
  name: string;
  description: string;
  category: 'exam' | 'programming' | 'language' | 'business';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDays: number;
  books: PresetBook[];
}

export const PRESET_ROUTES: PresetRoute[] = [
  {
    id: 'toeic-800',
    name: 'TOEIC 800点突破ルート',
    description: '初心者から800点到達まで。文法→単語→実践の最適順序',
    category: 'language',
    difficulty: 'intermediate',
    estimatedDays: 120,
    books: [
      {
        title: '【基礎】中学英文法をひとつひとつわかりやすく。',
        isbn: '9784053041234',
        mode: 1, // Solve
        totalUnit: 140,
        chunkSize: 2,
        priority: 1,
        amazonAffiliateLink: 'https://amzn.to/...',
      },
      {
        title: '【文法】TOEIC L&Rテスト 文法問題 でる1000問',
        isbn: '9784757430341',
        mode: 1,
        totalUnit: 1000,
        chunkSize: 10,
        previousBookId: 'preset_toeic-800_0', // 前の本に依存
        priority: 1,
        amazonAffiliateLink: 'https://amzn.to/...',
      },
      {
        title: '【単語】金のフレーズ（TOEIC L&R TEST 出る単特急）',
        isbn: '9784023315686',
        mode: 2, // Memo
        totalUnit: 1000,
        chunkSize: 50,
        previousBookId: 'preset_toeic-800_1',
        priority: 1,
        amazonAffiliateLink: 'https://amzn.to/...',
      },
      {
        title: '【実践】公式問題集10',
        isbn: '9784906033645',
        mode: 1,
        totalUnit: 400,
        chunkSize: 20,
        previousBookId: 'preset_toeic-800_2',
        priority: 1,
        amazonAffiliateLink: 'https://amzn.to/...',
      },
    ],
  },
  {
    id: 'boki3',
    name: '簿記3級 最短合格ルート',
    description: '初学者向け。テキスト→問題集→過去問の王道3冊',
    category: 'business',
    difficulty: 'beginner',
    estimatedDays: 60,
    books: [
      {
        title: '【テキスト】スッキリわかる 日商簿記3級',
        isbn: '9784813292791',
        mode: 0, // Read
        totalUnit: 250,
        chunkSize: 10,
        priority: 1,
        amazonAffiliateLink: 'https://amzn.to/...',
      },
      {
        title: '【問題集】スッキリとける 日商簿記3級 過去+予想問題集',
        isbn: '9784813292807',
        mode: 1,
        totalUnit: 300,
        chunkSize: 15,
        previousBookId: 'preset_boki3_0',
        priority: 1,
        amazonAffiliateLink: 'https://amzn.to/...',
      },
      {
        title: '【仕上げ】合格するための本試験問題集 日商簿記3級',
        isbn: '9784813294405',
        mode: 1,
        totalUnit: 360,
        chunkSize: 12,
        previousBookId: 'preset_boki3_1',
        priority: 1,
        amazonAffiliateLink: 'https://amzn.to/...',
      },
    ],
  },
  {
    id: 'fe-exam',
    name: '基本情報技術者試験 合格ルート',
    description: 'IT初心者から合格まで。午前・午後対策を網羅',
    category: 'exam',
    difficulty: 'intermediate',
    estimatedDays: 90,
    books: [
      {
        title: '【全体像】キタミ式イラストIT塾 基本情報技術者',
        isbn: '9784297124410',
        mode: 0,
        totalUnit: 600,
        chunkSize: 20,
        priority: 1,
        amazonAffiliateLink: 'https://amzn.to/...',
      },
      {
        title: '【午前】かんたん合格 基本情報技術者過去問題集',
        isbn: '9784295015505',
        mode: 1,
        totalUnit: 840,
        chunkSize: 28,
        previousBookId: 'preset_fe-exam_0',
        priority: 1,
        amazonAffiliateLink: 'https://amzn.to/...',
      },
      {
        title: '【午後】うかる! 基本情報技術者 午後・アルゴリズム編',
        isbn: '9784296070244',
        mode: 1,
        totalUnit: 200,
        chunkSize: 10,
        previousBookId: 'preset_fe-exam_1',
        priority: 1,
        amazonAffiliateLink: 'https://amzn.to/...',
      },
    ],
  },
  {
    id: 'react-beginner',
    name: 'React入門 完全ロードマップ',
    description: 'JavaScript基礎→React→TypeScript→Next.jsまで段階的学習',
    category: 'programming',
    difficulty: 'beginner',
    estimatedDays: 150,
    books: [
      {
        title: '【基礎】改訂3版JavaScript本格入門',
        isbn: '9784297130558',
        mode: 0,
        totalUnit: 500,
        chunkSize: 15,
        priority: 1,
        amazonAffiliateLink: 'https://amzn.to/...',
      },
      {
        title: '【React】モダンJavaScriptの基本から始める React実践の教科書',
        isbn: '9784815606183',
        mode: 0,
        totalUnit: 320,
        chunkSize: 10,
        previousBookId: 'preset_react-beginner_0',
        priority: 1,
        amazonAffiliateLink: 'https://amzn.to/...',
      },
      {
        title: '【TS】プロを目指す人のためのTypeScript入門',
        isbn: '9784297127473',
        mode: 0,
        totalUnit: 400,
        chunkSize: 12,
        previousBookId: 'preset_react-beginner_1',
        priority: 1,
        amazonAffiliateLink: 'https://amzn.to/...',
      },
      {
        title: '【Next.js】作りながら学ぶ Next.js/React Webサイト構築',
        isbn: '9784815613181',
        mode: 1,
        totalUnit: 280,
        chunkSize: 14,
        previousBookId: 'preset_react-beginner_2',
        priority: 1,
        amazonAffiliateLink: 'https://amzn.to/...',
      },
    ],
  },
];

/**
 * プリセットルートをDBに展開する関数
 * Onboarding完了時またはSettings画面から呼び出し
 */
export function generateBooksFromPreset(preset: PresetRoute): Array<{
  id: string;
  title: string;
  isbn: string | null;
  mode: number;
  totalUnit: number;
  chunkSize: number;
  previousBookId: string | null;
  priority: number;
  userId: string;
  subjectId: number | null;
  completedUnit: number;
  status: number;
  coverPath: string | null;
  targetCompletionDate: number | null;
  createdAt: number;
  updatedAt: number;
}> {
  const now = Math.floor(Date.now() / 1000);
  return preset.books.map((book, index) => {
    const bookId = `preset_${preset.id}_${index}`;
    const previousBookId = book.previousBookId
      ? book.previousBookId
      : index > 0
      ? `preset_${preset.id}_${index - 1}`
      : null;

    return {
      id: bookId,
      title: book.title,
      isbn: book.isbn ?? null,
      mode: book.mode,
      totalUnit: book.totalUnit,
      chunkSize: book.chunkSize,
      previousBookId,
      priority: book.priority,
      userId: 'local-user',
      subjectId: null,
      completedUnit: 0,
      status: 0,
      coverPath: null,
      targetCompletionDate: null,
      createdAt: now,
      updatedAt: now,
    };
  });
}
