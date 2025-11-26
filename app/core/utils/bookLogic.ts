import { Book } from '../database/schema';

/**
 * 書籍のチャンク計算を行い、生成すべきカード枚数を返す
 * 例: Total 300, Chunk 10 => 30枚
 */
export const calculateCardCount = (totalUnit: number, chunkSize: number): number => {
  if (chunkSize <= 0) return totalUnit;
  return Math.ceil(totalUnit / chunkSize);
};

/**
 * カードIDを生成する
 * Format: {bookId}_{index}
 */
export const generateCardId = (bookId: string, index: number): string => {
  return `${bookId}_${index}`;
};

/**
 * 循環参照を防ぐため、親として選択可能なBookのリストを返す
 * ルール: 自分自身と、自分の子孫は親になれない
 */
export const getAvailableParents = (
  allBooks: Book[],
  currentBookId: string | null // 新規作成時はnull
): Book[] => {
  // 新規作成時は全ての既存本が親になれる
  if (!currentBookId) return allBooks;

  // 1. 自分自身を除外
  let available = allBooks.filter((b) => b.id !== currentBookId);

  // 2. 自分の子孫（Descendants）を再帰的に特定して除外
  const descendants = new Set<string>();
  
  const findDescendants = (parentId: string) => {
    const children = allBooks.filter(b => b.previous_book_id === parentId);
    for (const child of children) {
      if (!descendants.has(child.id)) {
        descendants.add(child.id);
        findDescendants(child.id); // 再帰探索
      }
    }
  };

  findDescendants(currentBookId);

  return available.filter(b => !descendants.has(b.id));
};

/**
 * チャンクサイズに基づくカードのラベル生成（UI表示用）
 * 例: "p.1-10", "No.11-20"
 */
export const getCardLabel = (index: number, chunkSize: number, mode: number): string => {
  const start = (index - 1) * chunkSize + 1;
  const end = start + chunkSize - 1;
  const prefix = mode === 1 ? 'Q.' : 'p.'; // Solve=Q, Read/Memo=p
  
  if (chunkSize === 1) return `${prefix}${start}`;
  return `${prefix}${start}-${end}`;
};