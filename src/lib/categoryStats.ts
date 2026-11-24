// ==============================================================================
// V-ACT HUB: Category Statistics & Mastery Logic
// ==============================================================================

import { Question, QuestionAttempt } from '../data/types';

export interface CategoryStat {
  category: string;
  totalQuestions: number;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number; // 0 to 100%
  isStrength: boolean; // >= 80% (min 1 attempt)
  isWeakness: boolean; // < 60% with min 5 attempts
  status: 'strength' | 'weakness' | 'developing' | 'unattempted';
  sampleQuestionIds: string[];
}

export interface CategoryStatsSummary {
  categories: CategoryStat[];
  strengths: CategoryStat[];
  weaknesses: CategoryStat[];
  developing: CategoryStat[];
  unattempted: CategoryStat[];
  overallAccuracy: number;
  totalAttemptsCount: number;
  totalCorrectCount: number;
}

/**
 * Computes accuracy and classifies strengths (>= 80%) vs weaknesses (< 60%, min 5 attempts).
 */
export function calculateCategoryStats(
  questions: Question[],
  attempts: QuestionAttempt[]
): CategoryStatsSummary {
  const categoryMap = new Map<
    string,
    {
      category: string;
      questionIds: Set<string>;
      totalAttempts: number;
      correctAttempts: number;
    }
  >();

  // Initialize with all categories found in questions
  for (const q of questions) {
    const cat = q.category?.trim() || 'Chung';
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, {
        category: cat,
        questionIds: new Set<string>(),
        totalAttempts: 0,
        correctAttempts: 0,
      });
    }
    categoryMap.get(cat)!.questionIds.add(q.id);
  }

  // Map questionId -> category
  const questionCategoryMap = new Map<string, string>();
  for (const q of questions) {
    questionCategoryMap.set(q.id, q.category?.trim() || 'Chung');
  }

  // Tally attempts
  let totalAttemptsCount = 0;
  let totalCorrectCount = 0;

  for (const attempt of attempts) {
    totalAttemptsCount++;
    if (attempt.isCorrect) {
      totalCorrectCount++;
    }

    const cat = questionCategoryMap.get(attempt.questionId) || 'Chung';
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, {
        category: cat,
        questionIds: new Set<string>([attempt.questionId]),
        totalAttempts: 0,
        correctAttempts: 0,
      });
    }

    const entry = categoryMap.get(cat)!;
    entry.totalAttempts++;
    if (attempt.isCorrect) {
      entry.correctAttempts++;
    }
  }

  const categoryList: CategoryStat[] = [];
  const strengths: CategoryStat[] = [];
  const weaknesses: CategoryStat[] = [];
  const developing: CategoryStat[] = [];
  const unattempted: CategoryStat[] = [];

  for (const entry of categoryMap.values()) {
    const { category, questionIds, totalAttempts, correctAttempts } = entry;
    const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

    let status: 'strength' | 'weakness' | 'developing' | 'unattempted' = 'unattempted';
    let isStrength = false;
    let isWeakness = false;

    if (totalAttempts === 0) {
      status = 'unattempted';
    } else if (accuracy >= 80) {
      isStrength = true;
      status = 'strength';
    } else if (accuracy < 60 && totalAttempts >= 5) {
      isWeakness = true;
      status = 'weakness';
    } else {
      status = 'developing';
    }

    const stat: CategoryStat = {
      category,
      totalQuestions: questionIds.size,
      totalAttempts,
      correctAttempts,
      accuracy,
      isStrength,
      isWeakness,
      status,
      sampleQuestionIds: Array.from(questionIds),
    };

    categoryList.push(stat);

    if (status === 'strength') strengths.push(stat);
    else if (status === 'weakness') weaknesses.push(stat);
    else if (status === 'developing') developing.push(stat);
    else unattempted.push(stat);
  }

  // Sort list: weaknesses first, then developing, then strengths, then unattempted
  categoryList.sort((a, b) => {
    if (a.isWeakness && !b.isWeakness) return -1;
    if (!a.isWeakness && b.isWeakness) return 1;
    if (a.totalAttempts > 0 && b.totalAttempts === 0) return -1;
    if (a.totalAttempts === 0 && b.totalAttempts > 0) return 1;
    return a.accuracy - b.accuracy;
  });

  const overallAccuracy =
    totalAttemptsCount > 0 ? Math.round((totalCorrectCount / totalAttemptsCount) * 100) : 0;

  return {
    categories: categoryList,
    strengths,
    weaknesses,
    developing,
    unattempted,
    overallAccuracy,
    totalAttemptsCount,
    totalCorrectCount,
  };
}
