import { books, cards } from '../database/schema';
import type { Book as RawBook } from '../database/schema';
import { eq } from 'drizzle-orm';
import { getDrizzleDb } from '../database/drizzleClient';
import type { Book } from '../types';
import { calculateCardCount } from '../utils/bookLogic';
// Drizzle client placeholder (to be implemented)
// TODO(Drizzle-Migration): Provide unified drizzle client (native/web) via factory.

export interface IBookRepository {
  findAll(): Promise<Book[]>;
  findById(id: string): Promise<Book | null>;
  create(book: Book): Promise<void>; // Domain object persisted
  createWithCards(book: Book): Promise<void>; // Book作成と同時にCard生成（トランザクション）
  update(id: string, updates: Partial<Book>): Promise<void>;
  delete(id: string): Promise<void>;
  bulkUpsert(books: Book[]): Promise<void>; // Upsert multiple books
  deleteAll(): Promise<void>; // Delete all books
}

// Mapper: DB row -> Domain
function mapRow(row: RawBook): Book {
  return {
    id: row.id,
    userId: row.user_id ?? 'local-user',
    subjectId: row.subject_id ?? null,
    title: row.title,
    isbn: row.isbn ?? null,
    mode: row.mode as 0 | 1 | 2,
    totalUnit: row.total_unit,
    chunkSize: row.chunk_size,
    completedUnit: row.completed_unit ?? 0,
    status: row.status as 0 | 1 | 2,
    previousBookId: row.previous_book_id ?? null,
    priority: (row.priority ?? 1) as 0 | 1,
    coverPath: row.cover_path ?? null,
    targetCompletionDate: row.target_completion_date ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  };
}

export class DrizzleBookRepository implements IBookRepository {
  private get db() {
    return getDrizzleDb();
  }
  async findAll(): Promise<Book[]> {
    const rows = await this.db.select().from(books).all();
    return rows.map(mapRow);
  }
  async findById(id: string): Promise<Book | null> {
    const rows = await this.db.select().from(books).where(eq(books.id, id)).all();
    const row = rows[0];
    return row ? mapRow(row as RawBook) : null;
  }
  async create(book: Book): Promise<void> {
    await this.db.insert(books).values({
      id: book.id,
      user_id: book.userId ?? 'local-user',
      subject_id: book.subjectId ?? null,
      title: book.title,
      isbn: book.isbn ?? null,
      mode: book.mode,
      total_unit: book.totalUnit,
      chunk_size: book.chunkSize ?? 1,
      completed_unit: book.completedUnit ?? 0,
      status: book.status,
      previous_book_id: book.previousBookId ?? null,
      priority: book.priority ?? 1,
      cover_path: book.coverPath ?? null,
      target_completion_date: book.targetCompletionDate ?? null,
      created_at: book.createdAt ?? new Date().toISOString(),
      updated_at: book.updatedAt ?? new Date().toISOString(),
    }).run();
  }

  async createWithCards(book: Book): Promise<void> {
    // トランザクションでBook作成とCard生成を一括実行（BookService.registerBookと同等）
    await this.db.transaction(async (tx) => {
      // 1. Book挿入
      await tx.insert(books).values({
        id: book.id,
        user_id: book.userId ?? 'local-user',
        subject_id: book.subjectId ?? null,
        title: book.title,
        isbn: book.isbn ?? null,
        mode: book.mode,
        total_unit: book.totalUnit,
        chunk_size: book.chunkSize ?? 1,
        completed_unit: book.completedUnit ?? 0,
        status: book.status,
        previous_book_id: book.previousBookId ?? null,
        priority: book.priority ?? 1,
        cover_path: book.coverPath ?? null,
        target_completion_date: book.targetCompletionDate ?? null,
        created_at: book.createdAt ?? new Date().toISOString(),
        updated_at: book.updatedAt ?? new Date().toISOString(),
      }).run();

      // 2. Card生成（chunkSizeに基づいて分割）
      const chunkSize = book.chunkSize && book.chunkSize > 0 ? book.chunkSize : 1;
      const cardCount = calculateCardCount(book.totalUnit, chunkSize);
      
      if (cardCount > 0) {
        const newCards = [];
        for (let i = 1; i <= cardCount; i++) {
          newCards.push({
            id: `${book.id}_${i}`,
            book_id: book.id,
            unit_index: i,
            state: 0, // New
            stability: 0,
            difficulty: 0,
            elapsed_days: 0,
            scheduled_days: 0,
            reps: 0,
            lapses: 0,
            due: new Date().toISOString(),
            last_review: null,
            photo_path: null,
          });
        }
        await tx.insert(cards).values(newCards).run();
      }
    });
  }

  async update(id: string, updates: Partial<Book>): Promise<void> {
    const patch: Partial<RawBook> = {};
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.userId !== undefined) patch.user_id = updates.userId;
    if (updates.subjectId !== undefined) patch.subject_id = updates.subjectId ?? null;
    if (updates.isbn !== undefined) patch.isbn = updates.isbn ?? null;
    if (updates.mode !== undefined) patch.mode = updates.mode;
    if (updates.totalUnit !== undefined) patch.total_unit = updates.totalUnit;
    if (updates.chunkSize !== undefined) patch.chunk_size = updates.chunkSize;
    if (updates.completedUnit !== undefined) patch.completed_unit = updates.completedUnit ?? 0;
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.previousBookId !== undefined) patch.previous_book_id = updates.previousBookId ?? null;
    if (updates.priority !== undefined) patch.priority = updates.priority;
    if (updates.coverPath !== undefined) patch.cover_path = updates.coverPath ?? null;
    if (updates.targetCompletionDate !== undefined) patch.target_completion_date = updates.targetCompletionDate ?? null;
    patch.updated_at = new Date().toISOString();

    if (Object.keys(patch).length === 0) return; // nothing to update
    await this.db.update(books).set(patch).where(eq(books.id, id)).run();
  }
  async delete(id: string): Promise<void> {
    await this.db.delete(books).where(eq(books.id, id)).run();
  }
  
  async bulkUpsert(bookList: Book[]): Promise<void> {
    if (bookList.length === 0) return;
    
    // トランザクションでラップして真のBulk処理を実現
    await this.db.transaction(async (tx) => {
      for (const book of bookList) {
        await tx.insert(books).values({
          id: book.id,
          user_id: book.userId ?? 'local-user',
          subject_id: book.subjectId ?? null,
          title: book.title,
          isbn: book.isbn ?? null,
          mode: book.mode,
          total_unit: book.totalUnit,
          chunk_size: book.chunkSize ?? 1,
          completed_unit: book.completedUnit ?? 0,
          status: book.status,
          previous_book_id: book.previousBookId ?? null,
          priority: book.priority ?? 1,
          cover_path: book.coverPath ?? null,
          target_completion_date: book.targetCompletionDate ?? null,
          created_at: book.createdAt ?? new Date().toISOString(),
          updated_at: book.updatedAt ?? new Date().toISOString(),
        }).onConflictDoUpdate({
          target: books.id,
          set: {
            user_id: book.userId ?? 'local-user',
            subject_id: book.subjectId ?? null,
            title: book.title,
            isbn: book.isbn ?? null,
            mode: book.mode,
            total_unit: book.totalUnit,
            chunk_size: book.chunkSize ?? 1,
            completed_unit: book.completedUnit ?? 0,
            status: book.status,
            previous_book_id: book.previousBookId ?? null,
            priority: book.priority ?? 1,
            cover_path: book.coverPath ?? null,
            target_completion_date: book.targetCompletionDate ?? null,
            updated_at: new Date().toISOString(),
          }
        }).run();
      }
    });
  }
  
  async deleteAll(): Promise<void> {
    await this.db.delete(books).run();
  }
}
