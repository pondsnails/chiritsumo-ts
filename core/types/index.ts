export type BookMode = 'read' | 'solve' | 'memo';
export type BookStatus = 'active' | 'locked' | 'graduated' | 'sleep';
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface Book {
  id: string;
  userId: string;
  subjectId?: number | null;
  title: string;
  isbn?: string | null;
  mode: 0 | 1 | 2;
  totalUnit: number;
  chunkSize?: number;
  completedUnit?: number;
  status: 0 | 1 | 2;
  previousBookId: string | null;
  priority?: 0 | 1;
  coverPath?: string | null;
  targetCompletionDate?: string | null; // Deadline Mode用
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
  due: Date;
  lastReview: Date | null;
  reps: number;
  photoPath: string | null;
}

export interface LedgerEntry {
  id: number;
  date: string;
  earnedLex: number;
  targetLex: number;
  balance: number;
}

export interface InventoryPreset {
  id: number;
  label: string;
  iconCode: number;
  bookIds: string[];
  isDefault: boolean;
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

// ルートプリセット関連の型定義
export interface RouteStep {
  order: number;
  label: string;
  searchQuery: string;
  description: string;
  requiredDays: number;
}

export interface PresetRoute {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMonths: number;
  targetScore: string;
  steps: RouteStep[];
}
