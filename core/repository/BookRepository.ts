import { books } from '../database/schema';
import type { Book as RawBook } from '../database/schema';
import { eq } from 'drizzle-orm';
import { drizzleDb } from '../database/drizzleClient';
import type { Book } from '../types';
// Drizzle client placeholder (to be implemented)
// TODO(Drizzle-Migration): Provide unified drizzle client (native/web) via factory.

export interface IBookRepository {
  findAll(): Promise<Book[]>;
  findById(id: string): Promise<Book | null>;
  create(book: Book): Promise<void>; // Domain object persisted
  update(id: string, updates: Partial<Book>): Promise<void>;
  delete(id: string): Promise<void>;
}

// Mapper: DB row -> Domain
function mapRow(row: RawBook): Book {
  return {
    id: row.id,
    userId: 'local-user', // TODO: add userId column in schema for multi-user
    subjectId: null,
    title: row.title,
    isbn: null,
    mode: row.mode as 0 | 1 | 2,
    totalUnit: row.total_unit,
    chunkSize: row.chunk_size,
    completedUnit: 0, // TODO(Drizzle-Migration): add completed_unit column to schema
    status: row.status as 0 | 1 | 2,
    previousBookId: row.previous_book_id ?? null,
    priority: (row.priority ?? 1) as 0 | 1,
    coverPath: null,
    targetCompletionDate: null,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.created_at ?? new Date().toISOString(),
  };
}

export class DrizzleBookRepository implements IBookRepository {
  private db = drizzleDb;
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
      title: book.title,
      mode: book.mode,
      total_unit: book.totalUnit,
      chunk_size: book.chunkSize ?? 1,
      status: book.status,
      previous_book_id: book.previousBookId ?? null,
      priority: book.priority ?? 1,
      // created_at: book.createdAt, // Let default CURRENT_TIMESTAMP apply
    }).run();
  }
  async update(id: string, updates: Partial<Book>): Promise<void> {
    const patch: Partial<RawBook> = {};
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.mode !== undefined) patch.mode = updates.mode;
    if (updates.totalUnit !== undefined) patch.total_unit = updates.totalUnit;
    if (updates.chunkSize !== undefined) patch.chunk_size = updates.chunkSize;
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.previousBookId !== undefined) patch.previous_book_id = updates.previousBookId ?? null;
    if (updates.priority !== undefined) patch.priority = updates.priority;

    if (Object.keys(patch).length === 0) return; // nothing to update
    await this.db.update(books).set(patch).where(eq(books.id, id)).run();
  }
  async delete(id: string): Promise<void> {
    await this.db.delete(books).where(eq(books.id, id)).run();
  }
}
