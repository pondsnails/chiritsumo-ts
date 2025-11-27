import * as Crypto from 'expo-crypto';
import { getDrizzleDb } from '../database/drizzleClient';
import { books, cards, NewBook } from '../database/schema';
import { calculateCardCount, generateCardId } from '../utils/bookLogic';
import { eq } from 'drizzle-orm';

const db = getDrizzleDb();

/**
 * 本を新規登録し、チャンク設定に基づいてカードを一括生成する
 */
export const registerBook = async (
  title: string,
  mode: number,
  totalUnit: number,
  chunkSize: number,
  previousBookId: string | null
) => {
  const newBookId = Crypto.randomUUID();
  const cardCount = calculateCardCount(totalUnit, chunkSize);

  try {
    await db.transaction(async (tx) => {
      // 1. Bookの挿入
      const newBook: NewBook = {
        id: newBookId,
        title,
        mode,
        total_unit: totalUnit,
        chunk_size: chunkSize,
        previous_book_id: previousBookId,
        status: 0, // Active
        priority: 1,
      };
      
      await tx.insert(books).values(newBook);

      // 2. Cardsの生成と一括挿入
      const newCards = [];
      for (let i = 1; i <= cardCount; i++) {
        newCards.push({
          id: generateCardId(newBookId, i),
          book_id: newBookId,
          unit_index: i,
          state: 0, // New
          stability: 0,
          difficulty: 0,
          elapsed_days: 0,
          scheduled_days: 0,
          reps: 0,
          lapses: 0,
        });
      }

      if (newCards.length > 0) {
        await tx.insert(cards).values(newCards);
      }
    });

    console.log(`Book created: ${title} with ${cardCount} cards.`);
    return newBookId;

  } catch (error) {
    console.error("Failed to register book:", error);
    throw error;
  }
};

/**
 * 本を削除する
 */
export const deleteBook = async (bookId: string) => {
  try {
    await db.transaction(async (tx) => {
      // Cascade設定によりCardsも消えるはずだが、Drizzleの外部キー制約設定によっては
      // 明示的に消す方が安全な場合もある。ここではシンプルにBook削除を実行。
      await tx.delete(books).where(eq(books.id, bookId));
    });
  } catch (error) {
    console.error("Failed to delete book:", error);
    throw error;
  }
};