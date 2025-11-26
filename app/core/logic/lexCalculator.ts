import type { Book } from '../types';

const LEX_PRICE = {
  read: 10,
  solve: 50,
  memo: 1,
} as const;

export function calculateLexPerCard(mode: 0 | 1 | 2): number {
  if (mode === 0) return LEX_PRICE.read;
  if (mode === 1) return LEX_PRICE.solve;
  return LEX_PRICE.memo;
}

export function calculateLex(book: Book, cardCount: number): number {
  const lexPerCard = calculateLexPerCard(book.mode);
  return lexPerCard * cardCount;
}
