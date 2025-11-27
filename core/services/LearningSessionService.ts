/**
 * LearningSessionService
 * 学習セッション全体を統括するサービス
 * 
 * 責務:
 * - カード配布ロジックの一元管理
 * - 復習処理の統合
 * - UI層からのビジネスロジック分離
 */

import type { Book, Card } from '../types';
import type { ICardRepository } from '../repository/CardRepository';
import type { IBookRepository } from '../repository/BookRepository';
import { CardPlanService } from './cardPlanService';

export class LearningSessionService {
  private cardPlanService: CardPlanService;
  
  constructor(
    private cardRepo: ICardRepository,
    private bookRepo: IBookRepository
  ) {
    this.cardPlanService = new CardPlanService(cardRepo);
  }

  /**
   * 指定されたプリセット（または全アクティブ書籍）に対して新規カードを配布
   * UI層は配布ロジックを知らなくて良い
   * 
   * パフォーマンス最適化: findActive()でアクティブ書籍のみSQL WHERE句で取得
   */
  async distributeNewCards(
    presetId: number | null,
    presets: { id: number; bookIds: string[] }[],
    totalCount: number
  ): Promise<number> {
    // SQL WHERE status = 0 でフィルタ（JSフィルタ削除）
    const activeBooks = await this.bookRepo.findActive();
    
    let targetBookIds: string[];
    
    if (presetId) {
      const activePreset = presets.find(p => p.id === presetId);
      targetBookIds = activePreset?.bookIds || [];
    } else {
      // プリセット未指定ならアクティブな書籍全て
      targetBookIds = activeBooks.map(b => b.id);
    }
    
    // フォールバック: すべてのアクティブ書籍
    if (targetBookIds.length === 0 && activeBooks.length > 0) {
      targetBookIds = activeBooks.map(b => b.id);
    }
    
    if (targetBookIds.length === 0) return 0;
    
    return await this.cardPlanService.assignNewCardsToday(activeBooks, targetBookIds, totalCount);
  }

  /**
   * 書籍ごとの個別配分で新規カードを配布
   * 
   * パフォーマンス最適化: findActive()でアクティブ書籍のみSQL WHERE句で取得
   */
  async distributeNewCardsByAllocation(
    allocation: Record<string, number>
  ): Promise<number> {
    // SQL WHERE status = 0 でフィルタ
    const activeBooks = await this.bookRepo.findActive();
    return await this.cardPlanService.assignNewCardsByAllocation(activeBooks, allocation);
  }

  /**
   * 対象書籍IDの解決（プリセット or アクティブ）
   */
  resolveTargetBookIds(
    books: Book[],
    presetId: number | null,
    presets: { id: number; bookIds: string[] }[]
  ): string[] {
    if (presetId) {
      const preset = presets.find(p => p.id === presetId);
      const bookIds = preset?.bookIds || [];
      return bookIds.length > 0 ? bookIds : books.filter(b => b.status === 0).map(b => b.id);
    }
    return books.filter(b => b.status === 0).map(b => b.id);
  }
}

// デフォルトインスタンス生成用のファクトリー（DIパターン準拠）
import { DrizzleCardRepository } from '../repository/CardRepository';
import { DrizzleBookRepository } from '../repository/BookRepository';

// Deprecated factory: rely on DI ServicesProvider for instantiation
export function createLearningSessionServiceDeprecated(): LearningSessionService {
  return new LearningSessionService(
    new DrizzleCardRepository(),
    new DrizzleBookRepository()
  );
}
