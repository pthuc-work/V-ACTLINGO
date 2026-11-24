// ==============================================================================
// V-ACT HUB: Game Logic - Star Rating System
// Thresholds: >=90% -> 3 stars, >=70% -> 2 stars, >=50% -> 1 star, <50% -> 0 stars.
// Questions with correctIndex === null are excluded from totalScoredQuestions.
// Redoing a set preserves the highest stars achieved.
// ==============================================================================

export interface StarCalculationResult {
  correctCount: number;
  totalScoredQuestions: number;
  percentage: number;
  stars: number;
}

export interface QuestionWithAnswer {
  id?: string;
  correctIndex: number | null;
}

/**
 * Calculates star rating (0 to 3) based on correct answers out of scored questions.
 * Handles division by zero safely (returns 0 if totalScoredQuestions <= 0).
 */
export function calculateStars(correctCount: number, totalScoredQuestions: number): number {
  if (totalScoredQuestions <= 0 || correctCount <= 0) {
    return 0;
  }

  const percent = (correctCount / totalScoredQuestions) * 100;

  if (percent >= 90) return 3;
  if (percent >= 70) return 2;
  if (percent >= 50) return 1;
  return 0;
}

/**
 * Counts only questions that are eligible for scoring (correctIndex !== null).
 * Excludes informational, survey, or unverified questions where correctIndex is null.
 */
export function countScoredQuestions(questions: QuestionWithAnswer[]): number {
  return questions.filter((q) => q.correctIndex !== null && q.correctIndex !== undefined).length;
}

/**
 * Resolves the final stars for a set when redoing it, preserving the highest stars.
 */
export function resolveSetStars(existingStars: number, newStars: number): number {
  return Math.max(existingStars || 0, newStars || 0);
}

/**
 * Computes the number of newly earned stars (e.g. going from 1 star to 3 stars = +2 stars).
 * Re-attempting and scoring fewer or equal stars yields 0 newly earned stars.
 */
export function calculateNewStarsEarned(existingStars: number, newStars: number): number {
  const current = existingStars || 0;
  const updated = newStars || 0;
  return Math.max(0, updated - current);
}

/**
 * Comprehensive evaluator for a completed set session.
 */
export function evaluateSetStars(params: {
  questions: QuestionWithAnswer[];
  correctCount: number;
  existingStars?: number;
}): StarCalculationResult & { resolvedStars: number; newStarsEarned: number } {
  const totalScoredQuestions = countScoredQuestions(params.questions);
  const correct = Math.min(Math.max(0, params.correctCount), totalScoredQuestions);
  const percentage = totalScoredQuestions > 0 ? (correct / totalScoredQuestions) * 100 : 0;
  const stars = calculateStars(correct, totalScoredQuestions);
  const existingStars = params.existingStars ?? 0;
  const resolvedStars = resolveSetStars(existingStars, stars);
  const newStarsEarned = calculateNewStarsEarned(existingStars, stars);

  return {
    correctCount: correct,
    totalScoredQuestions,
    percentage,
    stars,
    resolvedStars,
    newStarsEarned,
  };
}
