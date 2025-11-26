/**
 * Google Books API Service
 * ISBNから書籍情報を取得する（無料・APIキー不要）
 */

export interface GoogleBookInfo {
  title: string;
  authors?: string[];
  pageCount?: number;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  thumbnail?: string;
}

const GOOGLE_BOOKS_API_BASE = 'https://www.googleapis.com/books/v1/volumes';

/**
 * ISBNから書籍情報を取得
 * @param isbn ISBN-10またはISBN-13
 * @returns 書籍情報（見つからない場合はnull）
 */
export async function fetchBookByISBN(isbn: string): Promise<GoogleBookInfo | null> {
  try {
    // ISBNをクリーンアップ（ハイフン除去）
    const cleanISBN = isbn.replace(/-/g, '');
    
    const response = await fetch(
      `${GOOGLE_BOOKS_API_BASE}?q=isbn:${cleanISBN}&maxResults=1`
    );

    if (!response.ok) {
      console.error('Google Books API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    const book = data.items[0].volumeInfo;

    return {
      title: book.title || '',
      authors: book.authors || [],
      pageCount: book.pageCount,
      publisher: book.publisher,
      publishedDate: book.publishedDate,
      description: book.description,
      thumbnail: book.imageLinks?.thumbnail,
    };
  } catch (error) {
    console.error('Failed to fetch book info:', error);
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
