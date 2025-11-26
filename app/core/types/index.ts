export type BookMode = 'read' | 'solve' | 'memo';
export type BookStatus = 'active' | 'locked' | 'graduated' | 'sleep';
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface Book {
  id: string;
  userId: string;
  subjectId?: number;
  title: string;
  isbn?: string;
  mode: 0 | 1 | 2;
  totalUnit: number;
  status: 0 | 1 | 2 | 3;
  previousBookId?: string;
  priority: 0 | 1;
  coverPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  bookId: string;
  unitIndex: number;
  state: 0 | 1 | 2 | 3;
  stability: number;
  difficulty: number;
  due: string;
  lastReview?: string;
  reps: number;
  photoPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  id: number;
  userId: string;
  date: string;
  earnedLex: number;
  targetLex: number;
  balance: number;
  createdAt: string;
}

export interface InventoryPreset {
  id: number;
  userId: string;
  label: string;
  iconCode: number;
  bookIds: string[];
  isDefault: boolean;
  createdAt: string;
}

export interface FSRSParams {
  currentStability: number;
  currentDifficulty: number;
  currentState: 0 | 1 | 2 | 3;
  rating: 1 | 3;
  daysElapsed: number;
  requestRetention: number;
}

export interface FSRSResult {
  nextDue: string;
  nextStability: number;
  nextDifficulty: number;
  nextState: 0 | 1 | 2 | 3;
  interval: number;
}
