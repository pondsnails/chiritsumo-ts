/**
 * Study Transaction Service
 * 
 * 問題点:
 * - cardStore.ts で Card更新とLedger更新が別々に実行され、整合性が保証されていない
 * - Card更新成功後にアプリクラッシュすると「復習完了したのにLexが貰えない」状態になる
 * 
 * 解決策:
 * - db.transaction() でCard更新とLedger更新をアトミックに実行
 * - どちらかが失敗した場合は両方ロールバック
 */

import { getDrizzleDb } from '../database/drizzleClient';
import { cards, ledger } from '../database/schema';
import { eq, sql } from 'drizzle-orm';
import { createScheduler } from '../fsrs/scheduler';
import { calculateLexForCard } from '../logic/lexCalculator';
import type { Card } from '../types';
import { getTodayDateString } from '../utils/dateUtils';

/**
 * 単一カードの復習をトランザクション内で処理
 * Card更新とLedger更新をアトミックに実行
 */
export async function processCardReview(
  card: Card,
  rating: 1 | 2 | 3 | 4,
  mode: 0 | 1 | 2
): Promise<Card> {
  const db = await getDrizzleDb();
  return await db.transaction(async (tx) => {
    // 1. FSRSスケジューラでカードを更新
    const scheduler = createScheduler(mode);
    const updatedCard = scheduler.review(card, rating);

    // 2. カードをDBに保存
    await tx
      .update(cards)
      .set({
        state: updatedCard.state,
        stability: updatedCard.stability,
        difficulty: updatedCard.difficulty,
        elapsed_days: updatedCard.elapsedDays,
        scheduled_days: updatedCard.scheduledDays,
        reps: updatedCard.reps,
        lapses: updatedCard.lapses,
        due: updatedCard.due.toISOString(),
        last_review: updatedCard.lastReview?.toISOString() || null,
      })
      .where(eq(cards.id, card.id))
      .run();

    // 3. 成功(rating 3 or 4)の場合のみLedger更新
    if (rating === 3 || rating === 4) {
      const lexEarned = calculateLexForCard(mode, updatedCard);
      const today = getTodayDateString();

      // 今日の台帳レコードを取得または作成
      const existingLedger = await tx
        .select()
        .from(ledger)
        .where(eq(ledger.date, today))
        .limit(1);

      if (existingLedger.length > 0) {
        // 既存レコードを更新
        const current = existingLedger[0];
        await tx
          .update(ledger)
          .set({
            earned_lex: current.earned_lex + lexEarned,
            balance: current.balance + lexEarned,
          })
          .where(eq(ledger.date, today))
          .run();
      } else {
        // 新規レコードを作成
        await tx
          .insert(ledger)
          .values({
            date: today,
            earned_lex: lexEarned,
            target_lex: 600, // デフォルト目標(別途取得可能だが、トランザクション内で軽量化)
            balance: lexEarned,
          })
          .run();
      }
    }

    return updatedCard;
  });
}

/**
 * 複数カードの復習をトランザクション内で処理
 * 全カードの更新と合算Lex加算をアトミックに実行
 */
export async function processBulkCardReviews(
  cardsToReview: Card[],
  ratings: (1 | 2 | 3 | 4)[],
  mode: 0 | 1 | 2
): Promise<Card[]> {
  if (cardsToReview.length !== ratings.length) {
    throw new Error('Cards and ratings length mismatch');
  }

  const db = await getDrizzleDb();
  return await db.transaction(async (tx) => {
    const scheduler = createScheduler(mode);
    const updatedCards: Card[] = [];
    let totalLexEarned = 0;

    // 1. 全カードを更新
    for (let i = 0; i < cardsToReview.length; i++) {
      const card = cardsToReview[i];
      const rating = ratings[i];
      const updated = scheduler.review(card, rating);

      await tx
        .update(cards)
        .set({
          state: updated.state,
          stability: updated.stability,
          difficulty: updated.difficulty,
          elapsed_days: updated.elapsedDays,
          scheduled_days: updated.scheduledDays,
          reps: updated.reps,
          lapses: updated.lapses,
          due: updated.due.toISOString(),
          last_review: updated.lastReview?.toISOString() || null,
        })
        .where(eq(cards.id, card.id))
        .run();

      updatedCards.push(updated);

      // 成功カードのLexを合算
      if (rating === 3 || rating === 4) {
        totalLexEarned += calculateLexForCard(mode, updated);
      }
    }

    // 2. 合算Lexを台帳に追加
    if (totalLexEarned > 0) {
      const today = getTodayDateString();

      const existingLedger = await tx
        .select()
        .from(ledger)
        .where(eq(ledger.date, today))
        .limit(1);

      if (existingLedger.length > 0) {
        const current = existingLedger[0];
        await tx
          .update(ledger)
          .set({
            earned_lex: current.earned_lex + totalLexEarned,
            balance: current.balance + totalLexEarned,
          })
          .where(eq(ledger.date, today))
          .run();
      } else {
        await tx
          .insert(ledger)
          .values({
            date: today,
            earned_lex: totalLexEarned,
            target_lex: 600,
            balance: totalLexEarned,
          })
          .run();
      }
    }

    return updatedCards;
  });
}
