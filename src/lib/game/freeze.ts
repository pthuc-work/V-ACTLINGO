// ==============================================================================
// V-ACT HUB: Game Logic - Streak Freeze Pass System
// Rules:
// - Weekly freeze: max 3/week, resets to 3 every Monday Vietnam time, non-cumulative.
// - Reserve freeze: permanent reserve passes earned by completing topics or claiming chests.
// - Consumption priority: weekly freeze first, then reserve freeze if weekly exhausted.
// - Topic completion grants +1 reserve freeze once per topic (reserve_granted flag/tracking).
// ==============================================================================

export const MAX_WEEKLY_FREEZES = 3;

export interface FreezeConsumptionResult {
  success: boolean;
  weeklyRemaining: number;
  reserveRemaining: number;
  usedType: 'weekly' | 'reserve' | null;
}

/**
 * Attempts to consume one freeze pass.
 * Priority: consumes 1 weekly freeze if available;
 * if weekly is 0, consumes 1 reserve freeze if available.
 * If neither is available, fails and returns success = false.
 */
export function consumeFreezePass(
  weeklyFreezes: number,
  reserveFreezes: number
): FreezeConsumptionResult {
  const currentWeekly = Math.max(0, weeklyFreezes);
  const currentReserve = Math.max(0, reserveFreezes);

  if (currentWeekly > 0) {
    return {
      success: true,
      weeklyRemaining: currentWeekly - 1,
      reserveRemaining: currentReserve,
      usedType: 'weekly',
    };
  }

  if (currentReserve > 0) {
    return {
      success: true,
      weeklyRemaining: 0,
      reserveRemaining: currentReserve - 1,
      usedType: 'reserve',
    };
  }

  return {
    success: false,
    weeklyRemaining: 0,
    reserveRemaining: 0,
    usedType: null,
  };
}

/**
 * Resets weekly freeze passes back to 3 (non-cumulative).
 */
export function resetWeeklyFreezes(): number {
  return MAX_WEEKLY_FREEZES;
}

export interface SetWithStars {
  id: string;
  stars?: number;
}

/**
 * Checks if a topic is completed (all sets have at least 1 star).
 * A topic with no sets is not considered completed.
 */
export function isTopicCompleted(sets: SetWithStars[]): boolean {
  if (!sets || sets.length === 0) {
    return false;
  }
  return sets.every((set) => (set.stars ?? 0) >= 1);
}

/**
 * Evaluates whether completing a topic grants +1 reserve freeze.
 * Granted only once per topic (`reserve_granted` flag tracked by topicId list/set).
 */
export function evaluateTopicReserveFreeze(params: {
  topicId: string;
  sets: SetWithStars[];
  currentReserve: number;
  grantedTopicIds: string[] | Set<string>;
}): {
  granted: boolean;
  newReserve: number;
  updatedGrantedTopicIds: string[];
} {
  const grantedSet = params.grantedTopicIds instanceof Set
    ? new Set(params.grantedTopicIds)
    : new Set(params.grantedTopicIds || []);

  const currentReserve = Math.max(0, params.currentReserve || 0);

  // If already granted for this topic, do not grant again
  if (grantedSet.has(params.topicId)) {
    return {
      granted: false,
      newReserve: currentReserve,
      updatedGrantedTopicIds: Array.from(grantedSet),
    };
  }

  // Check if topic is completed (all sets >= 1 star)
  if (!isTopicCompleted(params.sets)) {
    return {
      granted: false,
      newReserve: currentReserve,
      updatedGrantedTopicIds: Array.from(grantedSet),
    };
  }

  // Grant +1 reserve freeze
  grantedSet.add(params.topicId);
  return {
    granted: true,
    newReserve: currentReserve + 1,
    updatedGrantedTopicIds: Array.from(grantedSet),
  };
}
