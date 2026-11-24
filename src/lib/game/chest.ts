// ==============================================================================
// V-ACT HUB: Game Logic - Topic Chest Reward System
// Rules:
// - Topic chest unlocks when all sets in topic reach >=1 star.
// - Claim reward once: +1 reserve freeze and +50 XP.
// - Marked with flag/tracking to prevent duplicate claims.
// ==============================================================================

import { isTopicCompleted, SetWithStars } from './freeze';

export const CHEST_REWARD_XP = 50;
export const CHEST_REWARD_RESERVE_FREEZE = 1;

export interface TopicChestReward {
  xp: number;
  reserveFreeze: number;
}

export type ChestClaimErrorCode = 'ALREADY_CLAIMED' | 'TOPIC_NOT_COMPLETED' | 'NO_SETS';

export interface ChestClaimResult {
  success: boolean;
  reward?: TopicChestReward;
  error?: ChestClaimErrorCode;
  updatedClaimedTopicIds: string[];
  newXP?: number;
  newReserveFreezes?: number;
}

export interface ClaimTopicChestParams {
  topicId: string;
  sets: SetWithStars[];
  claimedTopicIds: string[] | Set<string>;
  currentXP?: number;
  currentReserveFreezes?: number;
}

/**
 * Checks whether the topic chest is unlocked.
 * A topic chest unlocks when all sets in the topic have >= 1 star.
 */
export function canUnlockTopicChest(sets: SetWithStars[]): boolean {
  return isTopicCompleted(sets);
}

/**
 * Checks if a topic chest has already been claimed.
 */
export function isTopicChestClaimed(
  topicId: string,
  claimedTopicIds: string[] | Set<string>
): boolean {
  if (claimedTopicIds instanceof Set) {
    return claimedTopicIds.has(topicId);
  }
  return (claimedTopicIds || []).includes(topicId);
}

/**
 * Attempts to claim the topic chest reward.
 * Returns +50 XP and +1 reserve freeze on first successful claim.
 * Prevents duplicate claims if already claimed.
 */
export function claimTopicChest(params: {
  topicId: string;
  sets: SetWithStars[];
  claimedTopicIds: string[] | Set<string>;
  currentXP?: number;
  currentReserveFreezes?: number;
}): ChestClaimResult {
  const claimedSet = params.claimedTopicIds instanceof Set
    ? new Set(params.claimedTopicIds)
    : new Set(params.claimedTopicIds || []);

  const currentXP = Math.max(0, params.currentXP || 0);
  const currentReserve = Math.max(0, params.currentReserveFreezes || 0);

  if (claimedSet.has(params.topicId)) {
    return {
      success: false,
      error: 'ALREADY_CLAIMED',
      updatedClaimedTopicIds: Array.from(claimedSet),
    };
  }

  if (!params.sets || params.sets.length === 0) {
    return {
      success: false,
      error: 'NO_SETS',
      updatedClaimedTopicIds: Array.from(claimedSet),
    };
  }

  if (!canUnlockTopicChest(params.sets)) {
    return {
      success: false,
      error: 'TOPIC_NOT_COMPLETED',
      updatedClaimedTopicIds: Array.from(claimedSet),
    };
  }

  // Claim reward
  claimedSet.add(params.topicId);

  return {
    success: true,
    reward: {
      xp: CHEST_REWARD_XP,
      reserveFreeze: CHEST_REWARD_RESERVE_FREEZE,
    },
    updatedClaimedTopicIds: Array.from(claimedSet),
    newXP: currentXP + CHEST_REWARD_XP,
    newReserveFreezes: currentReserve + CHEST_REWARD_RESERVE_FREEZE,
  };
}
