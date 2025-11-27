/**
 * errorHandler.ts
 * 統一されたエラーハンドリング機構
 * 
 * 機能:
 * 1. エラーログの一元管理
 * 2. ユーザーフレンドリーなエラーメッセージ生成
 * 3. 将来的なSentry連携の準備
 * 4. 開発環境ではスタックトレース表示
 */

/**
 * エラーカテゴリ（ログフィルタリング用）
 */
export enum ErrorCategory {
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  BACKUP = 'BACKUP',
  SUBSCRIPTION = 'SUBSCRIPTION',
  LAYOUT = 'LAYOUT',
  UNKNOWN = 'UNKNOWN'
}

/**
 * アプリケーションエラー（カスタムエラークラス）
 */
export class AppError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory,
    public originalError?: unknown,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * エラーをログに記録（将来的にSentryなどに送信）
 */
export function logError(
  error: unknown,
  context?: {
    category?: ErrorCategory;
    operation?: string;
    metadata?: Record<string, unknown>;
  }
): void {
  const category = context?.category || ErrorCategory.UNKNOWN;
  const operation = context?.operation || 'unknown operation';
  
  // 開発環境ではスタックトレースを表示
  if (__DEV__) {
    console.error(`[${category}] ${operation}:`, error);
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    if (context?.metadata) {
      console.error('Metadata:', context.metadata);
    }
  } else {
    // 本番環境では最小限のログ
    console.error(`[${category}] ${operation}:`, getErrorMessage(error));
  }
  
  // TODO: Sentry連携（本番環境のみ）
  // if (!__DEV__) {
  //   Sentry.captureException(error, {
  //     tags: { category },
  //     contexts: { operation: { name: operation, ...context?.metadata } },
  //   });
  // }
}

/**
 * エラーオブジェクトから安全にメッセージを抽出
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Unknown error occurred';
}

/**
 * ユーザー向けエラーメッセージを生成
 * （技術的詳細を隠蔽し、アクション可能な情報を提供）
 */
export function getUserFriendlyMessage(
  error: unknown,
  fallbackMessage: string = '予期しないエラーが発生しました'
): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  const message = getErrorMessage(error);
  
  // 既知のエラーパターン
  if (message.includes('UNIQUE constraint failed')) {
    return 'このデータは既に登録されています';
  }
  if (message.includes('FOREIGN KEY constraint failed')) {
    return '関連するデータが見つかりません';
  }
  if (message.includes('Network')) {
    return 'ネットワーク接続を確認してください';
  }
  if (message.includes('Permission denied')) {
    return 'アクセス権限がありません';
  }
  if (message.includes('Sharing is not available')) {
    return 'この機能はお使いのデバイスでは利用できません';
  }
  
  return fallbackMessage;
}

/**
 * 安全なエラーハンドリングラッパー
 * （非同期関数を安全に実行し、エラーをログに記録）
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  context: {
    category: ErrorCategory;
    operationName: string;
    fallbackValue: T;
    metadata?: Record<string, unknown>;
  }
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logError(error, {
      category: context.category,
      operation: context.operationName,
      metadata: context.metadata,
    });
    return context.fallbackValue;
  }
}

/**
 * 同期版の安全実行ラッパー
 */
export function safeExecuteSync<T>(
  operation: () => T,
  context: {
    category: ErrorCategory;
    operationName: string;
    fallbackValue: T;
    metadata?: Record<string, unknown>;
  }
): T {
  try {
    return operation();
  } catch (error) {
    logError(error, {
      category: context.category,
      operation: context.operationName,
      metadata: context.metadata,
    });
    return context.fallbackValue;
  }
}

/**
 * エラーバウンダリー用のエラー情報抽出
 */
export function getErrorInfo(error: unknown): {
  message: string;
  category: ErrorCategory;
  stack?: string;
} {
  if (error instanceof AppError) {
    return {
      message: error.message,
      category: error.category,
      stack: error.stack,
    };
  }
  
  if (error instanceof Error) {
    return {
      message: error.message,
      category: ErrorCategory.UNKNOWN,
      stack: error.stack,
    };
  }
  
  return {
    message: getErrorMessage(error),
    category: ErrorCategory.UNKNOWN,
  };
}
