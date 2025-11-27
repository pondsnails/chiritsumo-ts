/**
 * validation.ts
 * フォーム入力検証ヘルパー
 */

/**
 * 検証結果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * 必須フィールド検証
 */
export function validateRequired(value: string | null | undefined, fieldName: string = 'この項目'): ValidationResult {
  const isValid = value !== null && value !== undefined && value.trim().length > 0;
  return {
    isValid,
    errors: isValid ? [] : [`${fieldName}は必須です`],
  };
}

/**
 * 最小長検証
 */
export function validateMinLength(value: string, minLength: number, fieldName: string = 'この項目'): ValidationResult {
  const isValid = value.length >= minLength;
  return {
    isValid,
    errors: isValid ? [] : [`${fieldName}は${minLength}文字以上で入力してください`],
  };
}

/**
 * 最大長検証
 */
export function validateMaxLength(value: string, maxLength: number, fieldName: string = 'この項目'): ValidationResult {
  const isValid = value.length <= maxLength;
  return {
    isValid,
    errors: isValid ? [] : [`${fieldName}は${maxLength}文字以内で入力してください`],
  };
}

/**
 * 数値範囲検証
 */
export function validateRange(value: number, min: number, max: number, fieldName: string = '数値'): ValidationResult {
  const isValid = value >= min && value <= max;
  return {
    isValid,
    errors: isValid ? [] : [`${fieldName}は${min}〜${max}の範囲で入力してください`],
  };
}

/**
 * 正の数検証
 */
export function validatePositive(value: number, fieldName: string = '数値'): ValidationResult {
  const isValid = value > 0;
  return {
    isValid,
    errors: isValid ? [] : [`${fieldName}は正の数である必要があります`],
  };
}

/**
 * 整数検証
 */
export function validateInteger(value: number, fieldName: string = '数値'): ValidationResult {
  const isValid = Number.isInteger(value);
  return {
    isValid,
    errors: isValid ? [] : [`${fieldName}は整数である必要があります`],
  };
}

/**
 * メールアドレス検証
 */
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  return {
    isValid,
    errors: isValid ? [] : ['有効なメールアドレスを入力してください'],
  };
}

/**
 * URL検証
 */
export function validateUrl(url: string): ValidationResult {
  try {
    new URL(url);
    return { isValid: true, errors: [] };
  } catch {
    return { isValid: false, errors: ['有効なURLを入力してください'] };
  }
}

/**
 * 日付検証（ISO 8601形式）
 */
export function validateDate(dateString: string): ValidationResult {
  const date = new Date(dateString);
  const isValid = !isNaN(date.getTime());
  return {
    isValid,
    errors: isValid ? [] : ['有効な日付を入力してください'],
  };
}

/**
 * 複数の検証を組み合わせる
 */
export function combineValidations(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap(r => r.errors);
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}

/**
 * カスタム検証関数
 */
export type ValidatorFunction = (value: any) => ValidationResult;

/**
 * 書籍タイトル検証
 */
export function validateBookTitle(title: string): ValidationResult {
  return combineValidations(
    validateRequired(title, '書籍タイトル'),
    validateMinLength(title, 1, '書籍タイトル'),
    validateMaxLength(title, 200, '書籍タイトル')
  );
}

/**
 * Chunk Size検証
 */
export function validateChunkSize(chunkSize: number, totalUnit: number): ValidationResult {
  const results = [
    validateRequired(String(chunkSize), 'チャンクサイズ'),
    validatePositive(chunkSize, 'チャンクサイズ'),
    validateInteger(chunkSize, 'チャンクサイズ'),
  ];

  // 総ユニット数より大きい場合は警告
  if (chunkSize > totalUnit) {
    results.push({
      isValid: false,
      errors: [`チャンクサイズは総ユニット数（${totalUnit}）以下である必要があります`],
    });
  }

  return combineValidations(...results);
}

/**
 * Total Unit検証
 */
export function validateTotalUnit(totalUnit: number): ValidationResult {
  return combineValidations(
    validateRequired(String(totalUnit), '総ユニット数'),
    validatePositive(totalUnit, '総ユニット数'),
    validateInteger(totalUnit, '総ユニット数'),
    validateRange(totalUnit, 1, 10000, '総ユニット数')
  );
}

/**
 * Lex目標値検証
 */
export function validateLexTarget(target: number): ValidationResult {
  return combineValidations(
    validateRequired(String(target), 'Lex目標値'),
    validatePositive(target, 'Lex目標値'),
    validateInteger(target, 'Lex目標値'),
    validateRange(target, 1, 100000, 'Lex目標値')
  );
}

/**
 * フォーム全体の検証
 */
export interface FormValidationResult {
  isValid: boolean;
  fieldErrors: Record<string, string[]>;
}

export function validateForm(
  validators: Record<string, ValidationResult>
): FormValidationResult {
  const fieldErrors: Record<string, string[]> = {};
  let isValid = true;

  for (const [field, result] of Object.entries(validators)) {
    if (!result.isValid) {
      fieldErrors[field] = result.errors;
      isValid = false;
    }
  }

  return { isValid, fieldErrors };
}

/**
 * フィールドエラーの取得
 */
export function getFieldError(
  fieldErrors: Record<string, string[]>,
  fieldName: string
): string | null {
  const errors = fieldErrors[fieldName];
  return errors && errors.length > 0 ? errors[0] : null;
}

/**
 * サニタイズ（XSS対策）
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * トリム（前後の空白削除）
 */
export function trimInput(input: string): string {
  return input.trim();
}

/**
 * 正規化（全角→半角）
 */
export function normalizeInput(input: string): string {
  return input
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[Ａ-Ｚａ-ｚ]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
}
