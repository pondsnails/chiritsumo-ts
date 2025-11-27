import { books } from '../database/schema';
import type { Book as RawBook } from '../database/schema';
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
  // private db = drizzleClient; // TODO inject
  async findAll(): Promise<Book[]> {
    // TODO(Drizzle-Migration): replace with drizzle select
    // const rows = await this.db.select().from(books).all();
    return []; // placeholder
  }
  async findById(id: string): Promise<Book | null> {
    return null; // placeholder
  }
  async create(book: Book): Promise<void> {
    // TODO(Drizzle-Migration): insert via drizzle
  }
  async update(id: string, updates: Partial<Book>): Promise<void> {
    // TODO(Drizzle-Migration): update via drizzle
  }
  async delete(id: string): Promise<void> {
    // TODO(Drizzle-Migration): delete via drizzle
  }
}
