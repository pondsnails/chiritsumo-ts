/**
 * Centralized error reporting & future observability hook.
 * Currently logs to console; ready for Sentry or other integrations.
 */
interface ReportOptions {
  context?: string;
  severity?: 'info' | 'warn' | 'error';
  extra?: Record<string, any>;
  silent?: boolean; // if true, suppress user notification
}

type ErrorLike = Error | string | unknown;

export function reportError(err: ErrorLike, options: ReportOptions = {}) {
  const { context, severity = 'error', extra } = options;
  const normalized = normalizeError(err);
  const prefix = context ? `[${context}]` : '[Error]';
  // Console logging (can swap with Sentry.captureException later)
  if (severity === 'error') {
    console.error(prefix, normalized.message, normalized.stack, extra || {});
  } else if (severity === 'warn') {
    console.warn(prefix, normalized.message, extra || {});
  } else {
    console.log(prefix, normalized.message, extra || {});
  }
}

export function normalizeError(err: ErrorLike): { message: string; stack?: string } {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack };
  }
  if (typeof err === 'string') {
    return { message: err };
  }
  try {
    return { message: JSON.stringify(err) };
  } catch {
    return { message: 'Unknown error object' };
  }
}

/**
 * Optional user-facing notification shim.
 * Replace with a Toast system (e.g., react-native-toast or custom in-app banner).
 */
export function notifyUserError(message: string) {
  // TODO: Implement UI toast / banner. For now, no-op to avoid intrusive alerts.
  console.log('[UserNotify]', message);
}
