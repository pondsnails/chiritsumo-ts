/**
 * performance.ts
 * パフォーマンス計測とモニタリング
 */

import { logError, ErrorCategory } from './errorHandler';

/**
 * パフォーマンスマーク（計測ポイント）
 */
const performanceMarks = new Map<string, number>();

/**
 * パフォーマンス計測開始
 */
export function startMeasure(name: string): void {
  performanceMarks.set(name, Date.now());
}

/**
 * パフォーマンス計測終了（ログ出力）
 */
export function endMeasure(
  name: string,
  threshold?: number,
  metadata?: Record<string, unknown>
): number {
  const startTime = performanceMarks.get(name);
  if (!startTime) {
    console.warn(`[Performance] No start mark found for: ${name}`);
    return 0;
  }

  const duration = Date.now() - startTime;
  performanceMarks.delete(name);

  // 閾値を超えた場合は警告
  if (threshold && duration > threshold) {
    console.warn(
      `[Performance] Slow operation: ${name} took ${duration}ms (threshold: ${threshold}ms)`
    );
    
    if (metadata) {
      console.warn('[Performance] Metadata:', metadata);
    }
  } else if (__DEV__) {
    console.log(`[Performance] ${name}: ${duration}ms`);
  }

  return duration;
}

/**
 * 非同期関数の計測ラッパー
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  threshold?: number
): Promise<T> {
  startMeasure(name);
  try {
    const result = await fn();
    endMeasure(name, threshold);
    return result;
  } catch (error) {
    endMeasure(name);
    throw error;
  }
}

/**
 * 同期関数の計測ラッパー
 */
export function measureSync<T>(
  name: string,
  fn: () => T,
  threshold?: number
): T {
  startMeasure(name);
  try {
    const result = fn();
    endMeasure(name, threshold);
    return result;
  } catch (error) {
    endMeasure(name);
    throw error;
  }
}

/**
 * FPS（Frames Per Second）計測
 */
class FPSMonitor {
  private frameCount = 0;
  private lastTime = Date.now();
  private fps = 60;
  private rafId: number | null = null;

  start(): void {
    this.rafId = requestAnimationFrame(this.measureFrame.bind(this));
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private measureFrame(): void {
    this.frameCount++;
    const currentTime = Date.now();
    const elapsed = currentTime - this.lastTime;

    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastTime = currentTime;

      if (this.fps < 30 && __DEV__) {
        console.warn(`[Performance] Low FPS detected: ${this.fps}`);
      }
    }

    this.rafId = requestAnimationFrame(this.measureFrame.bind(this));
  }

  getFPS(): number {
    return this.fps;
  }
}

export const fpsMonitor = new FPSMonitor();

/**
 * メモリ使用量の取得（Web版のみ）
 */
export function getMemoryUsage(): number | null {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const memory = (performance as any).memory;
    return Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB単位
  }
  return null;
}

/**
 * メモリ警告（使用量が高い場合）
 */
export function checkMemoryUsage(thresholdMB: number = 100): void {
  const usage = getMemoryUsage();
  if (usage && usage > thresholdMB) {
    console.warn(`[Performance] High memory usage: ${usage}MB (threshold: ${thresholdMB}MB)`);
  }
}

/**
 * レンダリング回数のカウント（React Hook用）
 */
export function useRenderCount(componentName: string): void {
  if (!__DEV__) return;

  const renderCount = React.useRef(0);
  renderCount.current++;

  React.useEffect(() => {
    console.log(`[Performance] ${componentName} rendered ${renderCount.current} times`);
  });
}

/**
 * パフォーマンスレポート生成
 */
interface PerformanceReport {
  measurements: Array<{
    name: string;
    duration: number;
    timestamp: number;
  }>;
  fps: number;
  memoryUsageMB: number | null;
}

const measurements: PerformanceReport['measurements'] = [];

export function recordMeasurement(name: string, duration: number): void {
  measurements.push({
    name,
    duration,
    timestamp: Date.now(),
  });

  // 古い計測結果を削除（最新100件のみ保持）
  if (measurements.length > 100) {
    measurements.shift();
  }
}

export function getPerformanceReport(): PerformanceReport {
  return {
    measurements: [...measurements],
    fps: fpsMonitor.getFPS(),
    memoryUsageMB: getMemoryUsage(),
  };
}

/**
 * 遅延ロード監視（チャンク読み込み）
 */
export function measureChunkLoad(chunkName: string): () => void {
  const startTime = Date.now();
  
  // 動的インポート完了時に計測
  return () => {
    const duration = Date.now() - startTime;
    if (__DEV__) {
      console.log(`[Performance] Chunk loaded: ${chunkName} (${duration}ms)`);
    }
    recordMeasurement(`chunk:${chunkName}`, duration);
  };
}

/**
 * デバウンス（パフォーマンス最適化）
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * スロットル（パフォーマンス最適化）
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * React import（型定義のみ）
 */
declare const React: any;
