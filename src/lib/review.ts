// ==============================================================================
// V-ACT HUB: Mistake Pool & Spaced Repetition Review Logic
// ==============================================================================

import { Question, QuestionAttempt, SetEntity, SetProgress } from '../data/types';

export interface QuestionMistakeStatus {
  questionId: string;
  hasMistakeHistory: boolean;
  consecutiveCorrect: number; // 0, 1, or >=2
  isInMistakePool: boolean;
  lastAttemptAt: string | null;
  totalAttempts: number;
  totalIncorrect: number;
}

/**
 * Calculates the mistake status for a single question based on all its attempts.
 * Rule:
 * - A question enters the mistake pool if it has ever been answered incorrectly.
 * - It is removed from the mistake pool ONLY when answered correctly twice in a row (consecutiveCorrect >= 2).
 */
export function calculateQuestionMistakeStatus(
  questionId: string,
  attempts: QuestionAttempt[]
): QuestionMistakeStatus {
  // Filter attempts for this question and sort chronologically (oldest to newest)
  const questionAttempts = attempts
    .filter((a) => a.questionId === questionId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (questionAttempts.length === 0) {
    return {
      questionId,
      hasMistakeHistory: false,
      consecutiveCorrect: 0,
      isInMistakePool: false,
      lastAttemptAt: null,
      totalAttempts: 0,
      totalIncorrect: 0,
    };
  }

  let hasMistakeHistory = false;
  let totalIncorrect = 0;
  let consecutiveCorrect = 0;

  for (const attempt of questionAttempts) {
    if (!attempt.isCorrect) {
      hasMistakeHistory = true;
      totalIncorrect++;
      consecutiveCorrect = 0; // reset streak on error
    } else {
      consecutiveCorrect++;
    }
  }

  const lastAttemptAt = questionAttempts[questionAttempts.length - 1].createdAt;
  // A question is in the mistake pool if it has a mistake history AND consecutive correct answers < 2
  const isInMistakePool = hasMistakeHistory && consecutiveCorrect < 2;

  return {
    questionId,
    hasMistakeHistory,
    consecutiveCorrect,
    isInMistakePool,
    lastAttemptAt,
    totalAttempts: questionAttempts.length,
    totalIncorrect,
  };
}

/**
 * Evaluates the full pool of mistakes across all questions and attempts.
 */
export function getMistakePool(
  questions: Question[],
  attempts: QuestionAttempt[]
): {
  activeMistakeQuestions: Array<{ question: Question; status: QuestionMistakeStatus }>;
  clearedQuestions: Array<{ question: Question; status: QuestionMistakeStatus }>;
  totalInPool: number;
  totalCleared: number;
} {
  const activeMistakeQuestions: Array<{ question: Question; status: QuestionMistakeStatus }> = [];
  const clearedQuestions: Array<{ question: Question; status: QuestionMistakeStatus }> = [];

  const questionMap = new Map(questions.map((q) => [q.id, q]));

  // Find all distinct questionIds in attempts
  const questionIdsWithAttempts = new Set(attempts.map((a) => a.questionId));

  for (const qId of questionIdsWithAttempts) {
    const question = questionMap.get(qId);
    if (!question) continue;

    const status = calculateQuestionMistakeStatus(qId, attempts);
    if (status.isInMistakePool) {
      activeMistakeQuestions.push({ question, status });
    } else if (status.hasMistakeHistory && status.consecutiveCorrect >= 2) {
      clearedQuestions.push({ question, status });
    }
  }

  return {
    activeMistakeQuestions,
    clearedQuestions,
    totalInPool: activeMistakeQuestions.length,
    totalCleared: clearedQuestions.length,
  };
}

// ==============================================================================
// Spaced Repetition Schedule (1, 3, 7, 14 days intervals)
// ==============================================================================

export interface SpacedRepetitionItem {
  set: SetEntity;
  progress: SetProgress | null;
  daysSinceLastAttempt: number;
  intervalTier: 1 | 3 | 7 | 14 | 0;
  remainingMistakesCount: number;
  reason: string;
  isDue: boolean;
}

/**
 * Calculates spaced repetition review items for sets.
 * Triggered for sets with < 3 stars or remaining mistakes, at intervals of 1, 3, 7, 14 days.
 */
export function calculateSpacedRepetition(
  sets: SetEntity[],
  progressList: SetProgress[],
  questions: Question[],
  attempts: QuestionAttempt[],
  referenceDate: Date = new Date()
): SpacedRepetitionItem[] {
  const progressMap = new Map(progressList.map((p) => [p.setId, p]));
  const mistakePool = getMistakePool(questions, attempts);
  const activeMistakeQuestionIds = new Set(mistakePool.activeMistakeQuestions.map((m) => m.question.id));

  // Count active mistakes per set
  const setMistakeCountMap = new Map<string, number>();
  for (const m of mistakePool.activeMistakeQuestions) {
    const qSetId = m.question.setId;
    setMistakeCountMap.set(qSetId, (setMistakeCountMap.get(qSetId) || 0) + 1);
  }

  const items: SpacedRepetitionItem[] = [];

  for (const set of sets) {
    const progress = progressMap.get(set.id) || null;
    const remainingMistakesCount = setMistakeCountMap.get(set.id) || 0;

    // Check if set has ever been attempted
    if (!progress || !progress.lastAttemptedAt) {
      continue;
    }

    const lastAttemptDate = new Date(progress.lastAttemptedAt);
    const diffMs = referenceDate.getTime() - lastAttemptDate.getTime();
    const daysSince = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    const stars = progress.stars ?? 0;
    const isUnderThreeStars = stars < 3;
    const hasMistakes = remainingMistakesCount > 0;

    // If set is 3 stars and 0 mistakes, user has mastered it
    if (!isUnderThreeStars && !hasMistakes) {
      continue;
    }

    // Determine interval tier (1, 3, 7, 14)
    let intervalTier: 1 | 3 | 7 | 14 | 0 = 0;
    if (daysSince >= 14) {
      intervalTier = 14;
    } else if (daysSince >= 7) {
      intervalTier = 7;
    } else if (daysSince >= 3) {
      intervalTier = 3;
    } else if (daysSince >= 1) {
      intervalTier = 1;
    }

    // Item is due if >= 1 day has passed, or if there are active mistakes needing review
    const isDue = daysSince >= 1 || hasMistakes;

    let reason = '';
    if (hasMistakes && isUnderThreeStars) {
      reason = `Còn ${remainingMistakesCount} câu sai và chưa đạt 3 sao (${stars}/3★)`;
    } else if (hasMistakes) {
      reason = `Còn ${remainingMistakesCount} câu sai cần khắc phục 2 lần liên tiếp`;
    } else if (isUnderThreeStars) {
      reason = `Chưa đạt 3 sao (${stars}/3★) - Ôn lại để tối đa điểm số`;
    }

    items.push({
      set,
      progress,
      daysSinceLastAttempt: daysSince,
      intervalTier,
      remainingMistakesCount,
      reason,
      isDue,
    });
  }

  // Sort by priority: highest remaining mistakes and longest days since last attempt
  return items.sort((a, b) => {
    if (b.remainingMistakesCount !== a.remainingMistakesCount) {
      return b.remainingMistakesCount - a.remainingMistakesCount;
    }
    return b.daysSinceLastAttempt - a.daysSinceLastAttempt;
  });
}
