/**
 * 書籍完了予測サービス（Pro版限定）
 * 現在のVelocity（学習速度）から完了日を予測
 */

import { Book } from '../types';
import { getVelocityData } from './velocityService';

/**
 * 書籍の完了予測日を計算
 */
export const predictCompletionDate = async (book: Book): Promise<Date | null> => {
  try {
    // Velocityデータ取得
    const velocityData = await getVelocityData();
    
    if (!velocityData.measurementCompleted || velocityData.averageVelocity === 0) {
      // 計測未完了または学習実績なしの場合はnull
      return null;
    }

    // 残りページ数を計算
    const remainingPages = book.totalUnit - (book.completedUnit || 0);
    if (remainingPages <= 0) {
      // 既に完了している場合は今日
      return new Date();
    }

    // チャンクサイズう1チャンクあたりのLexを計算（仮定: 1ページ = 1 Lex）
    const lexPerChunk = book.chunkSize || 30;
    
    // 残りチャンク数
    const remainingChunks = Math.ceil(remainingPages / lexPerChunk);
    
    // 必要な総Lex
    const totalLexNeeded = remainingChunks * lexPerChunk;
    
    // 1日あたりの平均Lex獲得量を取得（過去3日間の平均）
    const measurements = velocityData.measurements || [];
    if (measurements.length === 0) {
      return null;
    }
    
    const averageDailyLex = measurements.reduce((sum, m) => sum + m.totalLexEarned, 0) / measurements.length;
    
    if (averageDailyLex === 0) {
      return null;
    }
    
    // 完了までの日数を計算
    const daysUntilCompletion = Math.ceil(totalLexNeeded / averageDailyLex);
    
    // 今日の日付から計算
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + daysUntilCompletion);
    
    return completionDate;
  } catch (error) {
    console.error('Failed to predict completion date:', error);
    return null;
  }
};

/**
 * 完了予測日を人間に読みやすい文字列に変換
 */
export const formatCompletionPrediction = (date: Date | null): string => {
  if (!date) {
    return '予測不可（学習データ不足）';
  }
  
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) {
    return '完了済み！';
  } else if (diffDays === 1) {
    return '明日完了予定';
  } else if (diffDays <= 7) {
    return `${diffDays}日後に完了予定`;
  } else if (diffDays <= 30) {
    const weeks = Math.ceil(diffDays / 7);
    return `約${weeks}週間後に完了予定`;
  } else if (diffDays <= 365) {
    const months = Math.ceil(diffDays / 30);
    return `約${months}ヶ月後に完了予定`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `約${years}年後に完了予定`;
  }
};

/**
 * 完了予測日の詳細情報を取得
 */
export interface CompletionPrediction {
  date: Date | null;
  formattedString: string;
  daysRemaining: number | null;
  remainingPages: number;
  dailyPaceNeeded: number | null; // 現在のペースを維持する場合の1日あたりのページ数
}

export const getCompletionPrediction = async (book: Book): Promise<CompletionPrediction> => {
  const date = await predictCompletionDate(book);
  const formattedString = formatCompletionPrediction(date);
  
  const remainingPages = book.totalUnit - (book.completedUnit || 0);
  
  let daysRemaining: number | null = null;
  let dailyPaceNeeded: number | null = null;
  
  if (date) {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (daysRemaining > 0) {
      dailyPaceNeeded = Math.ceil(remainingPages / daysRemaining);
    }
  }
  
  return {
    date,
    formattedString,
    daysRemaining,
    remainingPages,
    dailyPaceNeeded,
  };
};
