import type { Book } from '../types';

export interface NodePosition {
  id: string;
  book: Book;
  x: number;
  y: number;
  depth: number;
  isHub: boolean;
  children: Book[];
}

export interface Edge {
  from: { x: number; y: number };
  to: { x: number; y: number };
  isPrimary: boolean;
}

const CENTER_X = 180;
const BRANCH_OFFSET = 120;
const VERTICAL_SPACING = 140;
const MAX_CHILDREN_BEFORE_HUB = 3;

export class MetroLayoutEngine {
  private bookMap: Map<string, Book> = new Map();
  private childrenMap: Map<string | null, Book[]> = new Map();
  private depthMap: Map<string, number> = new Map();

  constructor(books: Book[]) {
    books.forEach((book) => {
      this.bookMap.set(book.id, book);
      const parentId = book.previousBookId;
      if (!this.childrenMap.has(parentId)) {
        this.childrenMap.set(parentId, []);
      }
      this.childrenMap.get(parentId)!.push(book);
    });

    this.calculateDepths();
  }

  private calculateDepths() {
    const visited = new Set<string>();
    const calculateDepth = (bookId: string | null, depth: number = 0) => {
      const children = this.childrenMap.get(bookId) || [];
      children.forEach((child) => {
        if (!visited.has(child.id)) {
          visited.add(child.id);
          this.depthMap.set(child.id, depth);
          calculateDepth(child.id, depth + 1);
        }
      });
    };

    calculateDepth(null, 0);
  }

  getNodePositions(): NodePosition[] {
    const positions: NodePosition[] = [];
    const processed = new Set<string>();

    const processNode = (parentId: string | null, parentX: number = CENTER_X) => {
      const children = this.childrenMap.get(parentId) || [];

      if (children.length === 0) return;

      if (children.length > MAX_CHILDREN_BEFORE_HUB) {
        const hubBook = children[0];
        const depth = this.depthMap.get(hubBook.id) || 0;
        positions.push({
          id: `hub-${parentId}`,
          book: hubBook,
          x: CENTER_X,
          y: depth * VERTICAL_SPACING + 80,
          depth,
          isHub: true,
          children: children.slice(1),
        });
        processed.add(hubBook.id);
        return;
      }

      const primaryChildren = children.filter((c) => c.priority === 1);
      const branchChildren = children.filter((c) => c.priority === 0);

      primaryChildren.forEach((book) => {
        if (processed.has(book.id)) return;
        const depth = this.depthMap.get(book.id) || 0;
        positions.push({
          id: book.id,
          book,
          x: CENTER_X,
          y: depth * VERTICAL_SPACING + 80,
          depth,
          isHub: false,
          children: [],
        });
        processed.add(book.id);
        processNode(book.id, CENTER_X);
      });

      branchChildren.forEach((book, index) => {
        if (processed.has(book.id)) return;
        const depth = this.depthMap.get(book.id) || 0;
        const offset = (index % 2 === 0 ? 1 : -1) * BRANCH_OFFSET;
        positions.push({
          id: book.id,
          book,
          x: CENTER_X + offset,
          y: depth * VERTICAL_SPACING + 80,
          depth,
          isHub: false,
          children: [],
        });
        processed.add(book.id);
        processNode(book.id, CENTER_X + offset);
      });
    };

    processNode(null);
    return positions.sort((a, b) => a.depth - b.depth);
  }

  getEdges(positions: NodePosition[]): Edge[] {
    const edges: Edge[] = [];
    const positionMap = new Map(positions.map((p) => [p.id, p]));

    positions.forEach((node) => {
      if (node.book.previousBookId) {
        const parent = positionMap.get(node.book.previousBookId);
        if (parent) {
          edges.push({
            from: { x: parent.x, y: parent.y + 40 },
            to: { x: node.x, y: node.y - 20 },
            isPrimary: node.book.priority === 1,
          });
        }
      }
    });

    return edges;
  }
}
