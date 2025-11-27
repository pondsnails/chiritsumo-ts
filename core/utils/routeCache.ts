import type { Book } from '@core/types';
import { sortBooksByDependency, SortedBooksResult } from '@core/utils/bookSorting';

interface CacheEntry {
  key: string;
  result: SortedBooksResult;
}

let cache: CacheEntry | null = null;

function computeKey(books: Book[]): string {
  // Key based on id + updatedAt (or completedUnit as fallback)
  return books
    .map(b => `${b.id}:${b.updatedAt ?? b.completedUnit ?? 0}`)
    .sort()
    .join('|');
}

export function getCachedSortedBooks(books: Book[]): SortedBooksResult {
  const key = computeKey(books);
  if (cache && cache.key === key) {
    return cache.result;
  }
  const result = sortBooksByDependency(books);
  cache = { key, result };
  return result;
}

export function invalidateRouteCache() {
  cache = null;
}
