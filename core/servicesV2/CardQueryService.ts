import type { Card, Book } from '../types';
// TODO(Drizzle-Migration): Inject repositories instead of legacy DB.

export interface ICardQueryService {
  getDueCards(bookIds: string[], now: Date): Promise<Card[]>;
  getNewCards(limit: number): Promise<Card[]>;
  groupByBook(cards: Card[], books: Book[]): Record<string, Card[]>;
}

export class CardQueryService implements ICardQueryService {
  // constructor(private cardsRepo: ICardRepository) {}
  async getDueCards(bookIds: string[], now: Date): Promise<Card[]> {
    // TODO: delegate to repository (optimized SQL)
    return [];
  }
  async getNewCards(limit: number): Promise<Card[]> { return []; }
  groupByBook(cards: Card[], books: Book[]): Record<string, Card[]> {
    const map: Record<string, Card[]> = {};
    for (const c of cards) {
      if (!map[c.bookId]) map[c.bookId] = [];
      map[c.bookId].push(c);
    }
    return map;
  }
}
