/**
 * Book Dependency Sorting Utilities
 * 
 * Heavy computation logic extracted from UI layer to:
 * 1. Enable unit testing
 * 2. Avoid blocking main thread during render
 * 3. Allow caching/memoization at service layer
 */

import type { Book } from '../types';

export interface SortedBooksResult {
  routes: Book[][];
  circularRefs: string[];
}

/**
 * Sort books by dependency (topological sort with cycle detection)
 * 
 * This is a HEAVY operation (recursive DFS) that should NOT run on UI thread.
 * Use with InteractionManager.runAfterInteractions() or in a service layer.
 * 
 * @param books - All books to sort
 * @returns Routes (sorted chains) and detected circular references
 */
export function sortBooksByDependency(books: Book[]): SortedBooksResult {
  const bookMap = new Map(books.map(b => [b.id, b]));
  const routes: Book[][] = [];
  const globalVisited = new Set<string>();
  const detectedCircularRefs: string[] = [];
  
  // Find root nodes (books with no previousBookId or non-existent parent)
  const getRootBooks = () => {
    return books.filter(b => 
      !b.previousBookId || !bookMap.has(b.previousBookId)
    );
  };
  
  // Cycle detection and depth-first search
  const buildChainsFromBook = (
    startBook: Book,
    currentPath: Set<string> = new Set()
  ): Book[][] => {
    // Cycle detection: already in current path
    if (currentPath.has(startBook.id)) {
      const pathArray = Array.from(currentPath);
      const cycleStart = pathArray.indexOf(startBook.id);
      const cycle = [...pathArray.slice(cycleStart), startBook.id]
        .map(id => bookMap.get(id)?.title || id)
        .join(' → ');
      detectedCircularRefs.push(cycle);
      console.warn(`Circular reference detected: ${cycle}`);
      return [];
    }
    
    // Add to current path
    const newPath = new Set(currentPath);
    newPath.add(startBook.id);
    
    // Find all books that depend on this book
    const children = books.filter(b => b.previousBookId === startBook.id);
    
    if (children.length === 0) {
      // Leaf node: end of chain
      return [[startBook]];
    }
    
    // Recursively build chains from children
    const allChains: Book[][] = [];
    children.forEach(child => {
      const childChains = buildChainsFromBook(child, newPath);
      childChains.forEach(childChain => {
        allChains.push([startBook, ...childChain]);
      });
    });
    
    return allChains;
  };
  
  // Build chains from each root
  const rootBooks = getRootBooks();
  rootBooks.forEach(root => {
    if (globalVisited.has(root.id)) return;
    
    const chains = buildChainsFromBook(root);
    chains.forEach(chain => {
      chain.forEach(book => globalVisited.add(book.id));
      routes.push(chain);
    });
  });
  
  // Handle orphaned books (no root, but not visited)
  const orphans = books.filter(b => !globalVisited.has(b.id));
  orphans.forEach(orphan => {
    if (globalVisited.has(orphan.id)) return;
    const orphanChains = buildChainsFromBook(orphan);
    orphanChains.forEach(chain => {
      chain.forEach(book => globalVisited.add(book.id));
      routes.push(chain);
    });
  });
  
  return { routes, circularRefs: detectedCircularRefs };
}

/**
 * Calculate total progress for a route (chain of books)
 */
export function calculateRouteProgress(route: Book[]): {
  totalUnits: number;
  completedUnits: number;
  percentage: number;
} {
  const totalUnits = route.reduce((sum, b) => sum + b.totalUnit, 0);
  const completedUnits = route.reduce((sum, b) => sum + (b.completedUnit || 0), 0);
  const percentage = totalUnits > 0 ? Math.floor((completedUnits / totalUnits) * 100) : 0;
  
  return { totalUnits, completedUnits, percentage };
}
