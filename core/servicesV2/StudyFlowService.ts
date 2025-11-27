import type { Card, Book } from '../types';
import { calculateLexPerCard } from '../logic/lexCalculator';

export interface StudySummary {
  reviewLex: number;
  newLex: number;
  combinedLex: number;
}

export interface IStudyFlowService {
  computeLexForSets(review: Card[], newlyAssigned: Card[], books: Book[]): StudySummary;
  recommendNewAllocation(books: Book[], deficitLex: number): Record<string, number>; // bookId -> count
}

export class StudyFlowService implements IStudyFlowService {
  computeLexForSets(review: Card[], newlyAssigned: Card[], books: Book[]): StudySummary {
    const lexFor = (cards: Card[]) => cards.reduce((sum, c) => {
      const b = books.find(bk => bk.id === c.bookId);
      if (!b) return sum;
      return sum + calculateLexPerCard(b.mode);
    }, 0);
    const reviewLex = lexFor(review);
    const newLex = lexFor(newlyAssigned);
    return { reviewLex, newLex, combinedLex: reviewLex + newLex };
  }
  recommendNewAllocation(books: Book[], deficitLex: number): Record<string, number> {
    // TODO: move existing recommendation logic from quest screen
    const result: Record<string, number> = {};
    if (deficitLex <= 0) return result;
    // Placeholder naive allocation: 1 card per high priority until deficit covered
    let remaining = deficitLex;
    const sorted = books.slice().sort((a,b)=> (b.priority||0)-(a.priority||0));
    for (const book of sorted) {
      if (remaining <= 0) break;
      const lexPerCard = calculateLexPerCard(book.mode);
      const count = Math.max(1, Math.floor(remaining / lexPerCard));
      result[book.id] = count;
      remaining -= count * lexPerCard;
    }
    return result;
  }
}
