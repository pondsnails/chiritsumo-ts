export type BookMode = 'read' | 'solve' | 'memo';
export type BookStatus = 'active' | 'locked' | 'graduated' | 'sleep';
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

import { BookMode, BookStatus, BookPriority, CardState } from '@core/constants/enums';
export interface Book {
  id: string;
  userId: string;
  subjectId?: number | null;
  title: string;
  isbn?: string | null;
  mode: BookMode;
  totalUnit: number;
  chunkSize?: number;
  completedUnit?: number;
  status: BookStatus;
  previousBookId: string | null;
  priority?: BookPriority;
  coverPath?: string | null;
  targetCompletionDate?: number | null; // Unix秒
  createdAt: number; // Unix秒
  updatedAt: number; // Unix秒
}

export interface Card {
  id: string;
  bookId: string;
  unitIndex: number;
  state: CardState;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  due: number; // Unix秒
  lastReview: number | null; // Unix秒
  createdAt: number; // Unix秒
  photoPath: string | null;
}

export interface LedgerEntry {
  id: number;
  date: number; // Unix秒（その日を代表する時刻）
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
