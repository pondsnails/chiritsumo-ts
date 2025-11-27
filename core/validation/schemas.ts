/**
 * Validation Schemas using Zod
 * Service/Repository層の入力データを厳密に検証
 */
import { z } from 'zod';

// Book Validation
export const BookSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().default('local-user'),
  subjectId: z.number().int().nullable().optional(),
  title: z.string().min(1, 'タイトルは必須です').max(500, 'タイトルが長すぎます'),
  isbn: z.string().regex(/^\d{10}(\d{3})?$/, '無効なISBN形式です').nullable().optional(),
  mode: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  totalUnit: z.number().int().min(1, '総ユニット数は1以上である必要があります').max(100000, '総ユニット数が大きすぎます'),
  chunkSize: z.number().int().min(1, 'チャンクサイズは1以上である必要があります').max(1000, 'チャンクサイズが大きすぎます'),
  completedUnit: z.number().int().min(0).max(100000),
  status: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  previousBookId: z.string().uuid().nullable().optional(),
  priority: z.union([z.literal(0), z.literal(1)]),
  coverPath: z.string().nullable().optional(),
  targetCompletionDate: z.number().int().positive().nullable().optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const CreateBookSchema = BookSchema.omit({ createdAt: true, updatedAt: true });
export const UpdateBookSchema = BookSchema.partial().required({ id: true });

// Card Validation
export const CardSchema = z.object({
  id: z.string().regex(/^[a-f0-9-]+_\d+$/, '無効なカードID形式です'),
  bookId: z.string().uuid(),
  unitIndex: z.number().int().min(1, 'ユニット番号は1以上である必要があります'),
  state: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  stability: z.number().min(0),
  difficulty: z.number().min(0).max(10),
  elapsedDays: z.number().int().min(0),
  scheduledDays: z.number().int().min(0),
  reps: z.number().int().min(0),
  lapses: z.number().int().min(0),
  due: z.number().int().positive(),
  lastReview: z.number().int().positive().nullable(),
  photoPath: z.string().nullable().optional(),
});

export const CreateCardSchema = CardSchema.omit({ });
export const UpdateCardSchema = CardSchema.partial().required({ id: true });

// Ledger Validation
export const LedgerSchema = z.object({
  id: z.number().int().positive().optional(),
  date: z.number().int().positive(),
  earnedLex: z.number().int().min(0, 'Lexは0以上である必要があります').max(100000, 'Lex値が異常です'),
  targetLex: z.number().int().min(0).max(100000),
  balance: z.number().int().min(-1000000, 'バランス値が異常です').max(1000000),
  transactionType: z.string().default('daily'),
  note: z.string().nullable().optional(),
});

export const CreateLedgerEntrySchema = LedgerSchema.omit({ id: true });

// System Settings Validation
export const SystemSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  updatedAt: z.string().datetime().optional(),
});

// Inventory Preset Validation
export const InventoryPresetSchema = z.object({
  id: z.number().int().positive().optional(),
  label: z.string().min(1, 'ラベルは必須です').max(100, 'ラベルが長すぎます'),
  iconCode: z.number().int().min(0).max(1000),
  isDefault: z.union([z.literal(0), z.literal(1)]),
});

// Chunk Size Validation (単体で使用)
export const ChunkSizeSchema = z.number()
  .int('チャンクサイズは整数である必要があります')
  .min(1, 'チャンクサイズは1以上である必要があります')
  .max(1000, 'チャンクサイズは1000以下である必要があります');

// Target Lex Validation
export const DailyLexTargetSchema = z.number()
  .int('目標Lexは整数である必要があります')
  .min(1, '目標Lexは1以上である必要があります')
  .max(10000, '目標Lexは10000以下である必要があります');

// Export types
export type ValidatedBook = z.infer<typeof BookSchema>;
export type ValidatedCard = z.infer<typeof CardSchema>;
export type ValidatedLedger = z.infer<typeof LedgerSchema>;
export type ValidatedSystemSetting = z.infer<typeof SystemSettingSchema>;
export type ValidatedInventoryPreset = z.infer<typeof InventoryPresetSchema>;
