/**
 * Amazon URL自動インポートサービス（Pro版限定）
 * URLからメタデータを抽出して書籍情報を自動生成
 */

import { Book } from '../types';

/**
 * ユニークID生成
 */
const generateBookId = (): string => {
  return `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Amazon URLから書籍情報を抽出
 */
export const extractBookFromAmazonUrl = async (url: string): Promise<Partial<Book> | null> => {
  try {
    // URL検証
    if (!url.includes('amazon.co.jp') && !url.includes('amazon.com')) {
      throw new Error('Amazon URLを入力してください');
    }

    // WebViewまたはフェッチでページ内容を取得
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error('ページの取得に失敗しました');
    }

    const html = await response.text();

    // タイトル抽出（複数パターン対応）
    let title = '';
    const titlePatterns = [
      /<span id="productTitle"[^>]*>([^<]+)<\/span>/i,
      /<h1[^>]*class="[^"]*product[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i,
      /<meta property="og:title" content="([^"]+)"/i,
    ];
    
    for (const pattern of titlePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        title = match[1].trim();
        // Amazon特有の " - Amazon.co.jp" などの接尾辞を削除
        title = title.replace(/\s*[-–—]\s*(Amazon|Kindle).*$/i, '').trim();
        break;
      }
    }

    // 画像URL抽出
    let imageUrl = '';
    const imagePatterns = [
      /"largeImage":"([^"]+)"/,
      /<img[^>]+id="landingImage"[^>]+src="([^"]+)"/,
      /<meta property="og:image" content="([^"]+)"/,
    ];
    
    for (const pattern of imagePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        imageUrl = match[1];
        // JSONエスケープ解除
        imageUrl = imageUrl.replace(/\\u002F/g, '/');
        break;
      }
    }

    // ページ数抽出（あれば）
    let pages: number | undefined;
    const pagesPatterns = [
      /(\d+)\s*ページ/,
      /(\d+)\s*pages/i,
      /"numberOfPages":(\d+)/,
    ];
    
    for (const pattern of pagesPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        pages = parseInt(match[1], 10);
        break;
      }
    }

    if (!title) {
      throw new Error('書籍情報の抽出に失敗しました');
    }

    // Book型に変換（必須フィールドは後で設定）
    const bookData: Partial<Book> = {
      title,
      coverPath: imageUrl || null,
      totalUnit: pages || 300,
      completedUnit: 0,
      chunkSize: pages ? Math.ceil(pages / 10) : 30, // デフォルトは10分割
    };

    return bookData;
  } catch (error) {
    console.error('Failed to extract book from Amazon URL:', error);
    throw error;
  }
};

/**
 * 抽出データから完全なBook型オブジェクトを生成
 */
export const createBookFromExtractedData = (
  extractedData: Partial<Book>,
  additionalData?: Partial<Book>
): Book => {
  const now = new Date().toISOString();
  
  return {
    id: generateBookId(),
    userId: '', // 後で設定
    title: extractedData.title || '無題の本',
    coverPath: extractedData.coverPath || null,
    totalUnit: extractedData.totalUnit || 300,
    completedUnit: extractedData.completedUnit || 0,
    chunkSize: extractedData.chunkSize || 30,
    mode: 0, // デフォルト: 読む
    status: 0, // デフォルト: active
    previousBookId: null,
    createdAt: now,
    updatedAt: now,
    ...additionalData,
  };
};
