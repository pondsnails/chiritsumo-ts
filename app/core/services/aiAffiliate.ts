import * as SecureStore from 'expo-secure-store';
import type { Book } from '../types';

const GEMINI_API_KEY_STORAGE_KEY = 'user_gemini_api_key';

export interface BookRecommendation {
  title: string;
  author: string;
  description: string;
  reason: string;
  affiliateLink: string;
  asin?: string; // ASINコードを追加
}

export interface AffiliateContext {
  completedBooks: Book[];
  currentBooks: Book[];
  interests: string[];
}

/**
 * ユーザーのGemini APIキーを保存
 */
export async function saveUserGeminiApiKey(apiKey: string): Promise<void> {
  await SecureStore.setItemAsync(GEMINI_API_KEY_STORAGE_KEY, apiKey);
}

/**
 * ユーザーのGemini APIキーを取得
 */
export async function getUserGeminiApiKey(): Promise<string | null> {
  return await SecureStore.getItemAsync(GEMINI_API_KEY_STORAGE_KEY);
}

/**
 * ユーザーのGemini APIキーを削除
 */
export async function deleteUserGeminiApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(GEMINI_API_KEY_STORAGE_KEY);
}

export async function generateBookRecommendations(
  context: AffiliateContext
): Promise<BookRecommendation[]> {
  const geminiApiKey = await getUserGeminiApiKey();

  if (!geminiApiKey) {
    console.log('Gemini API key not configured, using fallback recommendations');
    return getFallbackRecommendations();
  }

  try {
    const prompt = buildPrompt(context);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;

    return parseRecommendations(text);
  } catch (error) {
    console.error('Failed to get AI recommendations:', error);
    return getFallbackRecommendations();
  }
}

function buildPrompt(context: AffiliateContext): string {
  const completedTitles = context.completedBooks
    .map((b) => b.title)
    .join(', ');
  const currentTitles = context.currentBooks.map((b) => b.title).join(', ');

  return `あなたは学習アドバイザーです。以下の情報に基づいて、次に読むべき本を3冊推薦してください。

完了した本: ${completedTitles || 'なし'}
現在進行中の本: ${currentTitles || 'なし'}

以下のJSON形式で3冊の本を推薦してください：
[
  {
    "title": "本のタイトル",
    "author": "著者名",
    "description": "本の簡単な説明（50文字以内）",
    "reason": "推薦理由（100文字以内）"
  }
]

JSONのみを返してください。その他の説明は不要です。`;
}

function parseRecommendations(text: string): BookRecommendation[] {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return parsed.map((item: any) => ({
      title: item.title || '',
      author: item.author || '',
      description: item.description || '',
      reason: item.reason || '',
      affiliateLink: generateAmazonAffiliateLink(item.title, item.asin),
    }));
  } catch (error) {
    console.error('Failed to parse recommendations:', error);
    return getFallbackRecommendations();
  }
}

function generateAmazonAffiliateLink(title: string, asin?: string): string {
  if (asin) {
    // ASIN直リンク（要アフィリエイトタグ設定）
    return `https://www.amazon.co.jp/dp/${asin}/?tag=your-affiliate-id`;
  }
  // フォールバック：検索リンク
  const encodedTitle = encodeURIComponent(title);
  return `https://www.amazon.co.jp/s?k=${encodedTitle}&tag=your-affiliate-id`;
}

/**
 * 高単価・高CV書籍の静的リスト
 * 学習カテゴリ別におすすめ書籍を返す
 */
function getFallbackRecommendations(): BookRecommendation[] {
  return [
    {
      title: '学びを結果に変えるアウトプット大全',
      author: '樺沢紫苑',
      description: '科学的に正しいアウトプットの方法を網羅した学習の必読書',
      reason: '効率的な学習サイクルを身につけたい方に最適',
      asin: 'B07GWSWQZX',
      affiliateLink: generateAmazonAffiliateLink('学びを結果に変えるアウトプット大全', 'B07GWSWQZX'),
    },
    {
      title: '独学大全',
      author: '読書猿',
      description: '独学のための技術と戦略を網羅的に紹介する大ボリューム本',
      reason: '自学自習の質を科学的に高めたい方におすすめ',
      asin: 'B08F5396NV',
      affiliateLink: generateAmazonAffiliateLink('独学大全', 'B08F5396NV'),
    },
    {
      title: '脳を鍛えるには運動しかない',
      author: 'ジョン・J・レイティ',
      description: '運動が学習能力・記憶力に与える科学的効果を解説',
      reason: '学習パフォーマンスを最大化したい方へ',
      asin: 'B00U59MYF4',
      affiliateLink: generateAmazonAffiliateLink('脳を鍛えるには運動しかない', 'B00U59MYF4'),
    },
    {
      title: 'STUDY HACKS!',
      author: '小林至道',
      description: '最新の認知科学に基づいた効率的な勉強法',
      reason: '科学的な学習法を実践したい方に',
      asin: 'B08JLM7QNT',
      affiliateLink: generateAmazonAffiliateLink('STUDY HACKS!', 'B08JLM7QNT'),
    },
    {
      title: '使える脳の鍛え方',
      author: 'ピーター・ブラウン',
      description: '科学的に実証された記憶定着のメカニズムを解説',
      reason: '効果的な復習方法を知りたい方におすすめ',
      asin: 'B07L845XPC',
      affiliateLink: generateAmazonAffiliateLink('使える脳の鍛え方', 'B07L845XPC'),
    },
  ];
}
