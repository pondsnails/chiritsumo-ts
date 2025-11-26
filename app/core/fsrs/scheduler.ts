import type { FSRSParams, FSRSResult } from '../types';

export function calculateNextInterval(params: FSRSParams): FSRSResult {
  const { rating, daysElapsed } = params;

  const interval = rating === 1 ? 1 : Math.max(7, daysElapsed * 2);
  const now = new Date();
  const nextDue = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  return {
    nextDue: nextDue.toISOString(),
    nextStability: params.currentStability * 1.5,
    nextDifficulty: params.currentDifficulty,
    nextState: rating === 1 ? 3 : 2,
    interval,
  };
}

export function initNewCard(): { stability: number; difficulty: number } {
  return {
    stability: 0.3,
    difficulty: 5.83,
  };
}
