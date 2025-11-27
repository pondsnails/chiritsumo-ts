import type { Book } from '../types';

/**
 * 循環参照検出ユーティリティ
 * 参考書の親子関係（previousBookId）でグラフを構築し、
 * DAG（非巡回有向グラフ）であることを検証する
 */

export interface CircularReferenceError {
  bookId: string;
  bookTitle: string;
  cycle: string[];
}

/**
 * 循環参照を検出する（DFS + 訪問済み追跡）
 * @returns 循環が見つかった場合はエラー配列、問題なければ空配列
 */
export function detectCircularReferences(books: Book[]): CircularReferenceError[] {
  const errors: CircularReferenceError[] = [];
  const bookMap = new Map(books.map(b => [b.id, b]));
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(bookId: string, path: string[]): boolean {
    if (recursionStack.has(bookId)) {
      // 循環検出
      const cycleStartIndex = path.indexOf(bookId);
      const cycle = path.slice(cycleStartIndex);
      const book = bookMap.get(bookId);
      
      errors.push({
        bookId,
        bookTitle: book?.title || 'Unknown',
        cycle: cycle.map(id => bookMap.get(id)?.title || id),
      });
      return true;
    }

    if (visited.has(bookId)) {
      return false; // すでに訪問済み（問題なし）
    }

    visited.add(bookId);
    recursionStack.add(bookId);
    path.push(bookId);

    const book = bookMap.get(bookId);
    if (book?.previousBookId) {
      dfs(book.previousBookId, path);
    }

    path.pop();
    recursionStack.delete(bookId);
    return false;
  }

  // すべての本をスタート地点として検査
  for (const book of books) {
    if (!visited.has(book.id)) {
      dfs(book.id, []);
    }
  }

  return errors;
}

/**
 * 参考書追加時のバリデーション
 * @param newBook 追加しようとしている本
 * @param existingBooks 既存の本のリスト
 * @returns エラーメッセージ（問題なければnull）
 */
export function validateBookAddition(
  newBook: { id: string; title: string; previousBookId: string | null },
  existingBooks: Book[]
): string | null {
  if (!newBook.previousBookId) {
    return null; // 親なし（ルートノード）はOK
  }

  // 親が存在するか確認
  const parent = existingBooks.find(b => b.id === newBook.previousBookId);
  if (!parent) {
    return '指定された前提参考書が見つかりません';
  }

  // 仮想的に追加して循環チェック
  const testBooks = [
    ...existingBooks,
    {
      ...newBook,
      userId: 'test',
      subjectId: null,
      isbn: null,
      mode: 0,
      totalUnit: 1,
      chunkSize: 1,
      completedUnit: 0,
      status: 0,
      priority: 0,
      coverPath: null,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
    } as Book,
  ];

  const errors = detectCircularReferences(testBooks);
  if (errors.length > 0) {
    const error = errors[0];
    return `循環参照が検出されました: ${error.cycle.join(' → ')}`;
  }

  return null;
}

/**
 * 参考書更新時のバリデーション
 */
export function validateBookUpdate(
  bookId: string,
  newPreviousBookId: string | null,
  existingBooks: Book[]
): string | null {
  if (!newPreviousBookId) {
    return null;
  }

  // 自分自身を親に設定しようとしていないか
  if (bookId === newPreviousBookId) {
    return '自分自身を前提参考書に設定することはできません';
  }

  // 親が存在するか
  const parent = existingBooks.find(b => b.id === newPreviousBookId);
  if (!parent) {
    return '指定された前提参考書が見つかりません';
  }

  // 仮想的に更新して循環チェック
  const testBooks = existingBooks.map(b =>
    b.id === bookId ? { ...b, previousBookId: newPreviousBookId } : b
  );

  const errors = detectCircularReferences(testBooks);
  if (errors.length > 0) {
    const error = errors[0];
    return `循環参照が検出されました: ${error.cycle.join(' → ')}`;
  }

  return null;
}

/**
 * 既存データの整合性チェック（起動時に実行）
 */
export function checkDataIntegrity(books: Book[]): {
  isValid: boolean;
  errors: CircularReferenceError[];
  warnings: string[];
} {
  const errors = detectCircularReferences(books);
  const warnings: string[] = [];

  // 孤立した親参照のチェック
  const bookIds = new Set(books.map(b => b.id));
  for (const book of books) {
    if (book.previousBookId && !bookIds.has(book.previousBookId)) {
      warnings.push(`"${book.title}" の前提参考書（ID: ${book.previousBookId}）が見つかりません`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
