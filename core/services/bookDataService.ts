/**
 * Book Data Service (Multi-Source Hybrid)
 * ISBNから書籍情報を取得する（運営コストゼロ・高可用性）
 * 
 * 優先順位:
 * 1. OpenBD (国内書籍・無料・制限なし)
 * 2. Google Books API (洋書・古書・APIキー不要)
 * 3. null返却 (手動入力を促す)
 */

export interface BookInfo {
  title: string;
  authors: string[];
  pageCount?: number;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  thumbnail?: string;
}

const OPENBD_API_BASE = 'https://api.openbd.jp/v1/get';
const GOOGLE_BOOKS_API_BASE = 'https://www.googleapis.com/books/v1/volumes';

/**
 * ISBNから書籍情報を取得（マルチソース・フォールバック戦略）
 * @param isbn ISBN-10またはISBN-13
 * @returns 書籍情報（見つからない場合はnull）
 */
export async function fetchBookByISBN(isbn: string): Promise<BookInfo | null> {
  // ISBN正規化（ハイフン除去）
  const cleanISBN = isbn.replace(/-/g, '');

  // 1. Primary: OpenBD
  const openBDResult = await fetchFromOpenBD(cleanISBN);
  if (openBDResult) {
    return openBDResult;
  }

  // 2. Secondary: Google Books API (No Key)
  const googleResult = await fetchFromGoogleBooks(cleanISBN);
  if (googleResult) {
    return googleResult;
  }

  // 3. Fallback: null（手動入力を促す）
  return null;
}

/**
 * OpenBDから書籍情報を取得
 * @param isbn クリーン済みISBN
 * @returns 書籍情報（取得失敗時はnull）
 */
async function fetchFromOpenBD(isbn: string): Promise<BookInfo | null> {
  try {
    const response = await fetch(`${OPENBD_API_BASE}?isbn=${isbn}`);

    if (!response.ok) {
      console.warn('OpenBD API error:', response.status);
      return null;
    }

    const data = await response.json();

    // 配列[0]がnullの場合は該当なし
    if (!data || !data[0] || !data[0].summary) {
      return null;
    }

    const book = data[0];
    const summary = book.summary;
    const onix = book.onix;

    // ページ数取得ロジック（OpenBD特有）
    let pageCount: number | undefined;
    if (onix?.DescriptiveDetail?.Extent) {
      const extents = Array.isArray(onix.DescriptiveDetail.Extent)
        ? onix.DescriptiveDetail.Extent
        : [onix.DescriptiveDetail.Extent];

      for (const extent of extents) {
        // ExtentType: 05=Main content, 11=Total pages
        if (extent.ExtentType === '05' || extent.ExtentType === '11') {
          pageCount = parseInt(extent.ExtentValue, 10);
          break;
        }
      }
    }

    // 著者を配列化（スペース区切り文字列の場合）
    let authors: string[] = [];
    if (summary.author) {
      authors = summary.author.split(/[\s　]+/).filter((a: string) => a.length > 0);
    }

    return {
      title: summary.title || '',
      authors,
      pageCount,
      publisher: summary.publisher,
      publishedDate: summary.pubdate,
      description: onix?.CollateralDetail?.TextContent?.find(
        (t: any) => t.TextType === '03' // Description
      )?.Text,
      thumbnail: summary.cover, // OpenBDは直接URLが入っている
    };
  } catch (error) {
    console.warn('OpenBD fetch failed:', error);
    return null;
  }
}

/**
 * Google Books APIから書籍情報を取得（APIキーなし）
 * @param isbn クリーン済みISBN
 * @returns 書籍情報（取得失敗時はnull）
 */
async function fetchFromGoogleBooks(isbn: string): Promise<BookInfo | null> {
  try {
    // APIキーは設定しない（Client-side IPベースのRate Limitを利用）
    const response = await fetch(
      `${GOOGLE_BOOKS_API_BASE}?q=isbn:${isbn}&maxResults=1`
    );

    // 429 (Too Many Requests) などのエラーも握りつぶす
    if (!response.ok) {
      console.warn('Google Books API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const book = data.items[0].volumeInfo;

    // 書影URLをHTTPSに修正
    let thumbnail = book.imageLinks?.thumbnail;
    if (thumbnail && thumbnail.startsWith('http:')) {
      thumbnail = thumbnail.replace('http:', 'https:');
    }

    return {
      title: book.title || '',
      authors: book.authors || [],
      pageCount: book.pageCount,
      publisher: book.publisher,
      publishedDate: book.publishedDate,
      description: book.description,
      thumbnail,
    };
  } catch (error) {
    // エラーを握りつぶしてnullを返す（アプリをクラッシュさせない）
    console.warn('Google Books fetch failed:', error);
    return null;
  }
}

/**
 * バーコードから書籍タイトルを取得（簡易版）
 * @param barcode スキャンしたバーコード文字列
 * @returns 書籍タイトル（見つからない場合は空文字列）
 */
export async function getBookTitleFromBarcode(barcode: string): Promise<string> {
  const bookInfo = await fetchBookByISBN(barcode);

  if (!bookInfo) {
    return '';
  }

  // タイトルと著者を組み合わせて返す
  if (bookInfo.authors && bookInfo.authors.length > 0) {
    return `${bookInfo.title} (${bookInfo.authors[0]})`;
  }

  return bookInfo.title;
}
