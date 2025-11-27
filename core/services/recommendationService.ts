import type { Book, Card } from '../types';
import { calculateLexPerCard } from '../logic/lexCalculator';

export interface RecommendationInput {
  books: Book[];
  selectedBookIds: string[];
  reviewLex: number;
  newLexCurrent: number;
  targetLex: number;
}

export interface RecommendationResult {
  perBook: Record<string, number>;
  total: number;
}

/**
 * 推奨配分を計算（ソフトキャップ + 重み付けのシンプル版）
 * - 重み: 優先度(+30%) × モードのLex/枚（高Lex優先）
 * - 目標までの不足Lexを各書籍へ按分し、枚数に変換
 * - 小数は四捨五入、合計ズレは貪欲に調整
 */
export function computeRecommendedNewAllocation(input: RecommendationInput): RecommendationResult {
  const { books, selectedBookIds, reviewLex, newLexCurrent, targetLex } = input;
  const deficitLex = Math.max(0, targetLex - (reviewLex + newLexCurrent));
  
  console.log('[RecommendationService] Input:', {
    booksCount: books.length,
    selectedBookIds,
    reviewLex,
    newLexCurrent,
    targetLex,
    deficitLex,
  });

  const selected = books.filter(b => selectedBookIds.includes(b.id));
  console.log('[RecommendationService] Selected books:', selected.length);
  
  if (selected.length === 0) {
    console.log('[RecommendationService] No selected books, returning empty');
    return { perBook: {}, total: 0 };
  }

  // 目標達成後も最低10枚は割り当てる（無限に追加可能）
  const effectiveDeficit = Math.max(deficitLex, 100); // 最低100 Lex分（約10枚）

  // 重み: priority(1.3 or 1.0) × lexPerCard（高Lexほど割当が進む）
  const shares = selected.map(b => {
    const priorityWeight = b.priority === 1 ? 1.3 : 1.0;
    const lexPer = calculateLexPerCard(b.mode);
    const share = priorityWeight * Math.max(1, lexPer);
    return { book: b, share, lexPer };
  });

  const totalShare = shares.reduce((s, x) => s + x.share, 0);
  if (totalShare <= 0) return { perBook: {}, total: 0 };

  // まずは各書籍に割り当てるLexを決め、枚数に落とし込む
  const initial = shares.map(x => {
    const lexForBook = (effectiveDeficit * x.share) / totalShare;
    const cards = Math.round(lexForBook / x.lexPer);
    return { id: x.book.id, cards: Math.max(0, cards) };
  });

  // 0枚しか出ない場合の最低保証（対象が1冊のみor極端に小さいとき）
  const sumInit = initial.reduce((s, x) => s + x.cards, 0);
  if (sumInit === 0) {
    // 最もlexPerの大きい本に1枚
    const maxLexBook = shares.reduce((max, curr) => (curr.lexPer > max.lexPer ? curr : max), shares[0]);
    return { perBook: { [maxLexBook.book.id]: 1 }, total: 1 };
  }

  // 合計Lexに近づくよう微調整（丸め誤差）
  const result: Record<string, number> = {};
  initial.forEach(x => { if (x.cards > 0) result[x.id] = x.cards; });
  let totalCards = Object.values(result).reduce((s, n) => s + n, 0);

  // 目標Lexに対する見込みLex
  const estimatedLex = shares.reduce((s, x) => s + (result[x.book.id] || 0) * x.lexPer, 0);
  let lexGap = effectiveDeficit - estimatedLex;

  // ギャップが大きければ、高lexPerから順に1枚ずつ足す（最大+selected.length枚）
  if (lexGap > 0) {
    const byLexDesc = [...shares].sort((a, b) => b.lexPer - a.lexPer);
    for (const x of byLexDesc) {
      if (lexGap <= 0) break;
      result[x.book.id] = (result[x.book.id] || 0) + 1;
      totalCards += 1;
      lexGap -= x.lexPer;
    }
  }

  console.log('[RecommendationService] Final result:', { perBook: result, total: totalCards });

  return { perBook: result, total: totalCards };
}
