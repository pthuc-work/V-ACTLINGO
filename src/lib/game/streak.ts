// ==============================================================================
// V-ACT HUB: Game Logic - Streak System
// Rules:
// - Date strictly in Vietnam timezone (Asia/Ho_Chi_Minh, UTC+7).
// - Daily streak achieved when completing >= 1 set/day.
// - First set in day increases streak by 1.
// - When app opens or set completes, if consecutive missed days exist:
//   * Auto-consume freeze passes (weekly freeze first, reset to 3 every Monday
//     Vietnam time, non-cumulative; then reserve freeze if weekly exhausted).
//   * If not enough freezes, streak resets to 0.
// ==============================================================================

import {
  formatVietnamDate,
  getMissedDates,
  isVietnamMonday,
  getMondayOfWeek,
  getDaysDifference,
} from './dateUtils';
import { consumeFreezePass, MAX_WEEKLY_FREEZES } from './freeze';

export interface StreakState {
  streak: number;
  maxStreak: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  streakFreezesWeekly: number; // 0..3
  streakFreezesReserve: number; // >= 0
}

export interface FreezeUsage {
  date: string;
  type: 'weekly' | 'reserve';
}

export interface StreakEvaluationResult {
  state: StreakState;
  missedDays: string[];
  freezesUsed: FreezeUsage[];
  streakBroken: boolean;
  streakIncreased?: boolean;
}

/**
 * Evaluates streak status when the user opens the application.
 * Automatically consumes freeze passes for any missed days strictly between
 * lastActiveDate and currentDate.
 * Resets weekly freezes to 3 on Mondays (non-cumulative).
 */
export function evaluateStreakOnAppOpen(
  currentState: StreakState,
  currentDateOrTimestamp?: Date | number | string
): StreakEvaluationResult {
  const currDateStr = formatVietnamDate(currentDateOrTimestamp);

  let weekly = Math.max(0, currentState.streakFreezesWeekly ?? MAX_WEEKLY_FREEZES);
  let reserve = Math.max(0, currentState.streakFreezesReserve ?? 0);
  let streak = Math.max(0, currentState.streak ?? 0);
  const maxStreak = Math.max(streak, currentState.maxStreak ?? 0);
  const lastActive = currentState.lastActiveDate;

  // If user has never been active, initialize and return
  if (!lastActive) {
    return {
      state: {
        streak: 0,
        maxStreak: 0,
        lastActiveDate: null,
        streakFreezesWeekly: weekly,
        streakFreezesReserve: reserve,
      },
      missedDays: [],
      freezesUsed: [],
      streakBroken: false,
      streakIncreased: false,
    };
  }

  const missedDays = getMissedDates(lastActive, currDateStr);
  const freezesUsed: FreezeUsage[] = [];
  let streakBroken = false;
  let lastCoveredDate = lastActive;

  // Process missed days in chronological order
  for (const missedDay of missedDays) {
    // Every Monday Vietnam time, weekly freeze passes reset to 3 (non-cumulative)
    if (isVietnamMonday(missedDay)) {
      weekly = MAX_WEEKLY_FREEZES;
    }

    if (streak > 0) {
      const consumption = consumeFreezePass(weekly, reserve);
      if (consumption.success) {
        weekly = consumption.weeklyRemaining;
        reserve = consumption.reserveRemaining;
        freezesUsed.push({ date: missedDay, type: consumption.usedType! });
        lastCoveredDate = missedDay;
      } else {
        // Not enough freezes available to save streak
        streak = 0;
        streakBroken = true;
        lastCoveredDate = missedDay;
      }
    } else {
      lastCoveredDate = missedDay;
    }
  }

  // If current day has reached a new week compared to the last covered date,
  // reset weekly freeze passes to 3
  if (getMondayOfWeek(currDateStr) > getMondayOfWeek(lastCoveredDate)) {
    weekly = MAX_WEEKLY_FREEZES;
  }

  return {
    state: {
      streak,
      maxStreak,
      lastActiveDate: lastCoveredDate,
      streakFreezesWeekly: weekly,
      streakFreezesReserve: reserve,
    },
    missedDays,
    freezesUsed,
    streakBroken,
    streakIncreased: false,
  };
}

/**
 * Processes streak update when a user completes a set.
 * First evaluates any missed days and freeze deductions up to today.
 * Then if this is the first set completed today, increments streak by 1.
 */
export function completeSetStreak(
  currentState: StreakState,
  currentDateOrTimestamp?: Date | number | string
): StreakEvaluationResult {
  const currDateStr = formatVietnamDate(currentDateOrTimestamp);

  // 1. First run evaluation for any missed days prior to today
  const evalResult = evaluateStreakOnAppOpen(currentState, currentDateOrTimestamp);
  const nextState = { ...evalResult.state };

  let streakIncreased = false;

  // Check if user already completed a set today
  const wasAlreadyActiveToday = currentState.lastActiveDate === currDateStr;

  if (!wasAlreadyActiveToday) {
    // First set completed today
    if (nextState.streak === 0) {
      // Starting fresh or after a streak reset
      nextState.streak = 1;
    } else {
      nextState.streak += 1;
    }
    streakIncreased = true;
  }

  nextState.lastActiveDate = currDateStr;
  nextState.maxStreak = Math.max(nextState.maxStreak, nextState.streak);

  return {
    state: nextState,
    missedDays: evalResult.missedDays,
    freezesUsed: evalResult.freezesUsed,
    streakBroken: evalResult.streakBroken,
    streakIncreased,
  };
}

/**
 * Returns helper status about current streak activity today.
 */
export function getStreakStatus(
  state: StreakState,
  currentDateOrTimestamp?: Date | number | string
): {
  isActiveToday: boolean;
  streak: number;
  daysSinceActive: number;
} {
  const currDateStr = formatVietnamDate(currentDateOrTimestamp);
  if (!state.lastActiveDate) {
    return {
      isActiveToday: false,
      streak: 0,
      daysSinceActive: Infinity,
    };
  }

  const daysSince = getDaysDifference(state.lastActiveDate, currDateStr);
  return {
    isActiveToday: state.lastActiveDate === currDateStr,
    streak: state.streak,
    daysSinceActive: Math.max(0, daysSince),
  };
}
