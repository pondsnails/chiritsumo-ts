import { DrizzleCardRepository } from '../repository/CardRepository';
import type { Book, Card } from '../types';

const cardRepo = new DrizzleCardRepository();

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

      const existing = await cardRepo.findByBook(book.id);
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
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        due: dueToday,
        lastReview: null,
        photoPath: null,
      };

      created.push(card);
      createdCount++;
    }
    round++;
  }
  
  if (created.length > 0) {
    await cardRepo.bulkUpsert(created);
  }

  return created.length;
}

export async function assignNewCardsByAllocation(
  books: Book[],
  allocation: Record<string, number>
): Promise<number> {
  const dueToday = todayAtMidnight();
  const bookMap = new Map(books.map(b => [b.id, b]));
  let createdCount = 0;
  const allCreated: Card[] = [];

  for (const [bookId, count] of Object.entries(allocation)) {
    const book = bookMap.get(bookId);
    if (!book || count <= 0) continue;

    const existing = await cardRepo.findByBook(book.id);
    const existingUnits = new Set(existing.map(c => c.unitIndex));
    const chunkSize = book.chunkSize && book.chunkSize > 0 ? book.chunkSize : 1;
    const totalChunks = Math.ceil(book.totalUnit / chunkSize);

    let createdForBook = 0;
    let nextIdx = 1;
    while (createdForBook < count && nextIdx <= totalChunks) {
      while (existingUnits.has(nextIdx) && nextIdx <= totalChunks) nextIdx++;
      if (nextIdx > totalChunks) break;

      const card: Card = {
        id: makeCardId(book.id, nextIdx),
        bookId: book.id,
        unitIndex: nextIdx,
        state: 0,
        stability: 0,
        difficulty: DEFAULT_DIFFICULTY,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        due: dueToday,
        lastReview: null,
        photoPath: null,
      };
      allCreated.push(card);
      existingUnits.add(nextIdx);
      createdForBook++;
      createdCount++;
      nextIdx++;
    }
  }
  
  if (allCreated.length > 0) {
    await cardRepo.bulkUpsert(allCreated);
  }

  return createdCount;
}

export async function registerStudiedRange(
  book: Book,
  startUnitIndex: number,
  endUnitIndex: number,
  asDueToday: boolean = true
): Promise<number> {
  const chunkSize = book.chunkSize && book.chunkSize > 0 ? book.chunkSize : 1;
  const totalChunks = Math.ceil(book.totalUnit / chunkSize);
  const start = Math.max(1, Math.min(startUnitIndex, totalChunks));
  const end = Math.max(start, Math.min(endUnitIndex, totalChunks));

  const existing = await cardRepo.findByBook(book.id);
  const byUnit = new Map(existing.map(c => [c.unitIndex, c]));

  const when = new Date();
  if (asDueToday) when.setHours(0, 0, 0, 0);

  const upserts: Card[] = [];
  for (let idx = start; idx <= end; idx++) {
    const current = byUnit.get(idx);
    if (current) {
      upserts.push({
        ...current,
        state: 2, // review
        stability: Math.max(current.stability, 1),
        difficulty: current.difficulty || DEFAULT_DIFFICULTY,
        due: when,
      });
    } else {
      upserts.push({
        id: `${book.id}_${idx}`,
        bookId: book.id,
        unitIndex: idx,
        state: 2, // review
        stability: 1,
        difficulty: DEFAULT_DIFFICULTY,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        due: when,
        lastReview: null,
        photoPath: null,
      });
    }
  }

  if (upserts.length > 0) {
    await cardRepo.bulkUpsert(upserts);
  }

  return upserts.length;
}
