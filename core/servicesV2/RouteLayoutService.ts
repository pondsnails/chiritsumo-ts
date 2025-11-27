import type { Book } from '../types';

export interface RouteLayoutResult {
  nodes: Array<{ id: string; x: number; y: number }>;
  edges: Array<{ from: string; to: string }>;
}

export interface IRouteLayoutService {
  buildLayout(books: Book[]): RouteLayoutResult;
}

export class RouteLayoutService implements IRouteLayoutService {
  buildLayout(books: Book[]): RouteLayoutResult {
    // TODO: migrate MetroLayoutEngine heavy calculation here and add caching by hash of books
    return { nodes: [], edges: [] };
  }
}
