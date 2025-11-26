import type { Book } from '../types';
import recommendedBooksData from '../data/recommendedBooks.json';

export interface BookRecommendation {
  title: string;
  author: string;
  description: string;
  reason: string;
  affiliateLink: string;
  asin?: string;
  tags?: string[];
  price?: number;
  category?: string;
}

export interface AffiliateContext {
  completedBooks: Book[];
  currentBooks: Book[];
  interests: string[];
}

/**
 * ユーザーの学習履歴に基づいて静的カタログから推薦書籍を取得
 */
export async function generateBookRecommendations(
  context: AffiliateContext
): Promise<BookRecommendation[]> {
  return getStaticRecommendations(context);
}

/**
 * 静的カタログからユーザーに合った書籍を推薦
 */
function getStaticRecommendations(context: AffiliateContext): BookRecommendation[] {
  const allBooks = recommendedBooksData.books as BookRecommendation[];
  const categoryMapping = recommendedBooksData.categoryMapping;

  // ユーザーの登録書籍からキーワードを抽出
  const userKeywords = new Set<string>();
  [...context.completedBooks, ...context.currentBooks].forEach(book => {
    const titleWords = book.title.toLowerCase().split(/\s+/);
    titleWords.forEach(word => userKeywords.add(word));
  });

  // カテゴリマッチングスコアを計算
  const scoredBooks = allBooks.map(book => {
    let score = 0;
    const bookTags = book.tags || [];

    // タグマッチング
    bookTags.forEach(tag => {
      if (userKeywords.has(tag.toLowerCase())) {
        score += 10;
      }
    });

    // カテゴリマッチング
    if (book.category) {
      const categoryKeywords = categoryMapping[book.category as keyof typeof categoryMapping] || [];
      categoryKeywords.forEach(keyword => {
        if (userKeywords.has(keyword.toLowerCase())) {
          score += 5;
        }
      });
    }

    // タイトルマッチング
    userKeywords.forEach(keyword => {
      if (book.title.toLowerCase().includes(keyword)) {
        score += 3;
      }
    });

    return { book, score };
  });

  // スコア順にソートして上位5件を返す
  scoredBooks.sort((a, b) => b.score - a.score);
  
  const topScored = scoredBooks.slice(0, 5);
  const hasMatches = topScored.some(item => item.score > 0);

  // マッチしない場合は人気書籍（グッズ以外）を返す
  if (!hasMatches) {
    return allBooks
      .filter(book => book.category !== 'goods')
      .slice(0, 5);
  }

  return topScored.map(item => item.book);
}
