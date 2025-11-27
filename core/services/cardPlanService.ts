import { cardsDB } from '../database/db';
import type { Book, Card } from '../types';

const DEFAULT_DIFFICULTY = 5;

function todayAtMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function makeCardId(bookId: string, unitIndex: number): string {
  return `${bookId}_${unitIndex}`;
}

export async function assignNewCardsToday(
  books: Book[],
  bookIds: string[],
  totalNew: number
): Promise<number> {
  if (totalNew <= 0) return 0;
  const targetBooks = books.filter(b => bookIds.includes(b.id));
  if (targetBooks.length === 0) return 0;

  const created: Card[] = [];
  const dueToday = todayAtMidnight();

  // ラウンドロビンで各書籍にカードを配る
  let createdCount = 0;
  let round = 0;
  while (createdCount < totalNew && targetBooks.length > 0 && round < totalNew * 2) {
    for (const book of targetBooks) {
      if (createdCount >= totalNew) break;

      const existing = await cardsDB.getByBookId(book.id);
      const existingUnits = new Set(existing.map(c => c.unitIndex));

      const chunkSize = book.chunkSize && book.chunkSize > 0 ? book.chunkSize : 1;
      const totalChunks = Math.ceil(book.totalUnit / chunkSize);

      // 次に作るべき最小のunitIndexを探す
      let nextIdx = 1;
      while (existingUnits.has(nextIdx) && nextIdx <= totalChunks) {
        nextIdx++;
      }
      if (nextIdx > totalChunks) {
        continue; // この書籍は作り切り
      }

      const card: Card = {
        id: makeCardId(book.id, nextIdx),
        bookId: book.id,
        unitIndex: nextIdx,
        state: 0, // new
        stability: 0,
        difficulty: DEFAULT_DIFFICULTY,
        due: dueToday,
        lastReview: null,
        reps: 0,
        photoPath: null,
      };

      await cardsDB.upsert(card);
      created.push(card);
      createdCount++;
    }
    round++;
  }

  return created.length;
}
