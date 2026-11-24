// ==============================================================================
// V-ACT HUB: Game Logic - XP System & Daily Goals
// Rules:
// - 10 XP per correct question on first attempt in the session.
// - +20 XP on completing a set.
// - +10 XP for each newly earned star.
// - Daily goal options: 20, 50, 100 XP (default 50).
// ==============================================================================

import { calculateNewStarsEarned } from './stars';

export const XP_PER_CORRECT_FIRST_TRY = 10;
export const XP_SET_COMPLETION = 20;
export const XP_PER_NEW_STAR = 10;

export const DAILY_GOAL_OPTIONS = [20, 50, 100] as const;
export type DailyGoalOption = (typeof DAILY_GOAL_OPTIONS)[number];
export const DEFAULT_DAILY_GOAL: DailyGoalOption = 50;

export interface XPBreakdown {
  correctAnswersXP: number;
  setCompletionXP: number;
  newStarsXP: number;
  totalXP: number;
  newStarsEarned: number;
}

export interface SessionXPParams {
  correctFirstAttemptsCount: number;
  isSetCompleted: boolean;
  previousStars?: number;
  currentStars?: number;
}

/**
 * Calculates XP earned for a session according to game rules:
 * - 10 XP per correct answer on first attempt
 * - +20 XP if the set was completed
 * - +10 XP per newly earned star (compared to previous record)
 */
export function calculateSessionXP(params: SessionXPParams): XPBreakdown {
  const correctCount = Math.max(0, params.correctFirstAttemptsCount || 0);
  const correctAnswersXP = correctCount * XP_PER_CORRECT_FIRST_TRY;
  const setCompletionXP = params.isSetCompleted ? XP_SET_COMPLETION : 0;

  const prevStars = params.previousStars ?? 0;
  const currStars = params.currentStars ?? 0;
  const newStarsEarned = calculateNewStarsEarned(prevStars, currStars);
  const newStarsXP = newStarsEarned * XP_PER_NEW_STAR;

  const totalXP = correctAnswersXP + setCompletionXP + newStarsXP;

  return {
    correctAnswersXP,
    setCompletionXP,
    newStarsXP,
    totalXP,
    newStarsEarned,
  };
}

export interface DailyGoalProgress {
  goal: number;
  current: number;
  percentage: number;
  isAchieved: boolean;
  remainingXP: number;
}

/**
 * Computes user's progress towards their daily XP goal.
 */
export function calculateDailyGoalProgress(
  currentDailyXP: number,
  goalXP: number = DEFAULT_DAILY_GOAL
): DailyGoalProgress {
  const goal = Math.max(1, goalXP);
  const current = Math.max(0, currentDailyXP || 0);
  const percentage = Math.min(100, Math.round((current / goal) * 100));
  const isAchieved = current >= goal;
  const remainingXP = Math.max(0, goal - current);

  return {
    goal,
    current,
    percentage,
    isAchieved,
    remainingXP,
  };
}

/**
 * Validates if the selected goal is one of the supported preset values.
 */
export function isValidDailyGoal(goal: number): goal is DailyGoalOption {
  return (DAILY_GOAL_OPTIONS as readonly number[]).includes(goal);
}
