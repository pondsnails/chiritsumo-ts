import type { Book } from '../types';

export interface BookRecommendation {
  title: string;
  author: string;
  description: string;
  reason: string;
  affiliateLink: string;
}

export interface AffiliateContext {
  completedBooks: Book[];
  currentBooks: Book[];
  interests: string[];
}

export async function generateBookRecommendations(
  context: AffiliateContext,
  geminiApiKey?: string
): Promise<BookRecommendation[]> {
  if (!geminiApiKey) {
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
      throw new Error('Failed to fetch recommendations from Gemini');
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
      affiliateLink: generateAmazonAffiliateLink(item.title),
    }));
  } catch (error) {
    console.error('Failed to parse recommendations:', error);
    return getFallbackRecommendations();
  }
}

function generateAmazonAffiliateLink(title: string): string {
  const encodedTitle = encodeURIComponent(title);
  return `https://www.amazon.co.jp/s?k=${encodedTitle}&tag=your-affiliate-id`;
}

function getFallbackRecommendations(): BookRecommendation[] {
  return [
    {
      title: '学びを結果に変えるアウトプット大全',
      author: '樺沢紫苑',
      description: '効率的な学習とアウトプットの方法を解説',
      reason: '学習効率を高めたい方におすすめです',
      affiliateLink: 'https://www.amazon.co.jp/s?k=%E3%82%A2%E3%82%A6%E3%83%88%E3%83%97%E3%83%83%E3%83%88%E5%A4%A7%E5%85%A8',
    },
    {
      title: '独学大全',
      author: '読書猿',
      description: '独学のための技術と戦略を網羅的に紹介',
      reason: '自学自習の質を高めたい方に最適です',
      affiliateLink: 'https://www.amazon.co.jp/s?k=%E7%8B%AC%E5%AD%A6%E5%A4%A7%E5%85%A8',
    },
    {
      title: '脳を鍛えるには運動しかない',
      author: 'ジョン・J・レイティ',
      description: '運動が学習能力に与える科学的効果を解説',
      reason: '学習パフォーマンスを最大化したい方へ',
      affiliateLink: 'https://www.amazon.co.jp/s?k=%E8%84%B3%E3%82%92%E9%8D%9B%E3%81%88%E3%82%8B%E3%81%AB%E3%81%AF%E9%81%8B%E5%8B%95%E3%81%97%E3%81%8B%E3%81%AA%E3%81%84',
    },
  ];
}
