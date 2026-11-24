import { describe, it, expect } from 'vitest';
import {
  // Stars
  calculateStars,
  countScoredQuestions,
  resolveSetStars,
  calculateNewStarsEarned,
  evaluateSetStars,

  // XP
  calculateSessionXP,
  calculateDailyGoalProgress,
  isValidDailyGoal,
  DEFAULT_DAILY_GOAL,
  XP_PER_CORRECT_FIRST_TRY,
  XP_SET_COMPLETION,
  XP_PER_NEW_STAR,

  // Date utils
  toVietnamDate,
  formatVietnamDate,
  getVietnamDayOfWeek,
  isVietnamMonday,
  addDays,
  getDaysDifference,
  getMondayOfWeek,
  getMissedDates,

  // Freeze
  consumeFreezePass,
  resetWeeklyFreezes,
  isTopicCompleted,
  evaluateTopicReserveFreeze,
  MAX_WEEKLY_FREEZES,

  // Chest
  canUnlockTopicChest,
  isTopicChestClaimed,
  claimTopicChest,
  CHEST_REWARD_XP,
  CHEST_REWARD_RESERVE_FREEZE,

  // Streak
  evaluateStreakOnAppOpen,
  completeSetStreak,
  getStreakStatus,
} from './index';

describe('Game Logic: Star Rating System (stars.ts)', () => {
  it('calculates 3 stars for >= 90% score', () => {
    expect(calculateStars(9, 10)).toBe(3); // 90%
    expect(calculateStars(10, 10)).toBe(3); // 100%
    expect(calculateStars(95, 100)).toBe(3); // 95%
  });

  it('calculates 2 stars for >= 70% and < 90% score', () => {
    expect(calculateStars(7, 10)).toBe(2); // 70%
    expect(calculateStars(8, 10)).toBe(2); // 80%
    expect(calculateStars(89, 100)).toBe(2); // 89%
  });

  it('calculates 1 star for >= 50% and < 70% score', () => {
    expect(calculateStars(5, 10)).toBe(1); // 50%
    expect(calculateStars(6, 10)).toBe(1); // 60%
    expect(calculateStars(69, 100)).toBe(1); // 69%
  });

  it('calculates 0 stars for < 50% score', () => {
    expect(calculateStars(4, 10)).toBe(0); // 40%
    expect(calculateStars(0, 10)).toBe(0); // 0%
    expect(calculateStars(49, 100)).toBe(0); // 49%
  });

  it('safely handles edge cases like 0 scored questions or negative counts', () => {
    expect(calculateStars(0, 0)).toBe(0);
    expect(calculateStars(5, 0)).toBe(0);
    expect(calculateStars(-1, 10)).toBe(0);
  });

  it('excludes questions with correctIndex === null from totalScoredQuestions', () => {
    const questions = [
      { id: '1', correctIndex: 0 },
      { id: '2', correctIndex: null }, // excluded
      { id: '3', correctIndex: 2 },
      { id: '4', correctIndex: undefined as any }, // excluded
      { id: '5', correctIndex: 3 },
    ];
    expect(countScoredQuestions(questions)).toBe(3);
  });

  it('preserves the highest stars when redoing a set', () => {
    expect(resolveSetStars(2, 1)).toBe(2); // lower score does not reduce stars
    expect(resolveSetStars(1, 3)).toBe(3); // higher score upgrades stars
    expect(resolveSetStars(2, 2)).toBe(2); // same score remains unchanged
    expect(resolveSetStars(0, 2)).toBe(2); // first stars earned
  });

  it('accurately computes newly earned stars', () => {
    expect(calculateNewStarsEarned(1, 3)).toBe(2); // +2 new stars
    expect(calculateNewStarsEarned(0, 3)).toBe(3); // +3 new stars
    expect(calculateNewStarsEarned(2, 2)).toBe(0); // no change
    expect(calculateNewStarsEarned(3, 1)).toBe(0); // lower score gives 0 new stars
  });

  it('evaluates complete set session and ignores null questions for star calculation', () => {
    const questions = [
      { id: 'q1', correctIndex: 1 },
      { id: 'q2', correctIndex: null }, // informational
      { id: 'q3', correctIndex: 0 },
    ];
    // Total scored questions = 2
    // Correct count = 2 -> 100% -> 3 stars
    const res = evaluateSetStars({
      questions,
      correctCount: 2,
      existingStars: 1,
    });

    expect(res.totalScoredQuestions).toBe(2);
    expect(res.correctCount).toBe(2);
    expect(res.percentage).toBe(100);
    expect(res.stars).toBe(3);
    expect(res.resolvedStars).toBe(3);
    expect(res.newStarsEarned).toBe(2); // from 1 to 3
  });
});

describe('Game Logic: XP System & Daily Goals (xp.ts)', () => {
  it('calculates XP for session: 10 XP/correct question, +20 XP set completion, +10 XP/new star', () => {
    // 5 correct first attempts = 50 XP
    // set completed = 20 XP
    // 2 new stars (from 1 to 3) = 20 XP
    // Total = 90 XP
    const res = calculateSessionXP({
      correctFirstAttemptsCount: 5,
      isSetCompleted: true,
      previousStars: 1,
      currentStars: 3,
    });

    expect(res.correctAnswersXP).toBe(50);
    expect(res.setCompletionXP).toBe(20);
    expect(res.newStarsEarned).toBe(2);
    expect(res.newStarsXP).toBe(20);
    expect(res.totalXP).toBe(90);
  });

  it('calculates session XP when redoing set with no new stars earned', () => {
    // 3 correct first attempts = 30 XP
    // set completed = 20 XP
    // previousStars 3, currentStars 2 -> 0 new stars = 0 XP
    const res = calculateSessionXP({
      correctFirstAttemptsCount: 3,
      isSetCompleted: true,
      previousStars: 3,
      currentStars: 2,
    });

    expect(res.correctAnswersXP).toBe(30);
    expect(res.setCompletionXP).toBe(20);
    expect(res.newStarsEarned).toBe(0);
    expect(res.newStarsXP).toBe(0);
    expect(res.totalXP).toBe(50);
  });

  it('calculates session XP for incomplete set', () => {
    const res = calculateSessionXP({
      correctFirstAttemptsCount: 2,
      isSetCompleted: false,
    });

    expect(res.correctAnswersXP).toBe(20);
    expect(res.setCompletionXP).toBe(0);
    expect(res.newStarsXP).toBe(0);
    expect(res.totalXP).toBe(20);
  });

  it('tracks daily goal progress with 20/50/100 presets', () => {
    expect(DEFAULT_DAILY_GOAL).toBe(50);
    expect(isValidDailyGoal(20)).toBe(true);
    expect(isValidDailyGoal(50)).toBe(true);
    expect(isValidDailyGoal(100)).toBe(true);
    expect(isValidDailyGoal(75 as any)).toBe(false);

    // Goal = 50 XP, Current = 30 XP
    const progress1 = calculateDailyGoalProgress(30, 50);
    expect(progress1.goal).toBe(50);
    expect(progress1.current).toBe(30);
    expect(progress1.percentage).toBe(60);
    expect(progress1.isAchieved).toBe(false);
    expect(progress1.remainingXP).toBe(20);

    // Goal = 50 XP, Current = 60 XP (achieved)
    const progress2 = calculateDailyGoalProgress(60, 50);
    expect(progress2.percentage).toBe(100);
    expect(progress2.isAchieved).toBe(true);
    expect(progress2.remainingXP).toBe(0);
  });
});

describe('Game Logic: Vietnam Timezone & Simulated Timestamps (dateUtils.ts)', () => {
  it('correctly simulates 23:59 -> 00:01 across midnight in Asia/Ho_Chi_Minh (UTC+7)', () => {
    // 2026-11-23 23:59:00 VN corresponds to 2026-11-23T16:59:00.000Z
    const tBeforeMidnight = '2026-11-23T16:59:00.000Z';
    // 2026-11-24 00:01:00 VN corresponds to 2026-11-23T17:01:00.000Z
    const tAfterMidnight = '2026-11-23T17:01:00.000Z';

    const vnBefore = toVietnamDate(tBeforeMidnight);
    const vnAfter = toVietnamDate(tAfterMidnight);

    expect(formatVietnamDate(tBeforeMidnight)).toBe('2026-11-23');
    expect(vnBefore.getUTCHours()).toBe(23);
    expect(vnBefore.getUTCMinutes()).toBe(59);

    expect(formatVietnamDate(tAfterMidnight)).toBe('2026-11-24');
    expect(vnAfter.getUTCHours()).toBe(0);
    expect(vnAfter.getUTCMinutes()).toBe(1);

    // Difference between dates is 1 calendar day
    expect(getDaysDifference(formatVietnamDate(tBeforeMidnight), formatVietnamDate(tAfterMidnight))).toBe(1);
  });

  it('correctly identifies week transitions to Monday in Asia/Ho_Chi_Minh', () => {
    // 2026-11-22 is Sunday
    // 2026-11-22 23:59 VN = 2026-11-22T16:59:00.000Z
    const sundayNight = '2026-11-22T16:59:00.000Z';
    expect(formatVietnamDate(sundayNight)).toBe('2026-11-22');
    expect(getVietnamDayOfWeek(sundayNight)).toBe(0); // Sunday
    expect(isVietnamMonday(sundayNight)).toBe(false);

    // 2026-11-23 00:01 VN = 2026-11-22T17:01:00.000Z (Monday)
    const mondayMorning = '2026-11-22T17:01:00.000Z';
    expect(formatVietnamDate(mondayMorning)).toBe('2026-11-23');
    expect(getVietnamDayOfWeek(mondayMorning)).toBe(1); // Monday
    expect(isVietnamMonday(mondayMorning)).toBe(true);

    expect(getMondayOfWeek('2026-11-22')).toBe('2026-11-16');
    expect(getMondayOfWeek('2026-11-23')).toBe('2026-11-23');
  });

  it('computes missed dates list accurately', () => {
    // Gap of 1 day -> 0 missed days
    expect(getMissedDates('2026-11-20', '2026-11-21')).toEqual([]);

    // Gap of 2 days -> 1 missed day
    expect(getMissedDates('2026-11-20', '2026-11-22')).toEqual(['2026-11-21']);

    // Gap of 4 days -> 3 missed days
    expect(getMissedDates('2026-11-20', '2026-11-24')).toEqual([
      '2026-11-21',
      '2026-11-22',
      '2026-11-23',
    ]);
  });
});

describe('Game Logic: Freeze System & Priority Rules (freeze.ts)', () => {
  it('consumes weekly freeze first when available', () => {
    const res = consumeFreezePass(3, 2);
    expect(res.success).toBe(true);
    expect(res.usedType).toBe('weekly');
    expect(res.weeklyRemaining).toBe(2);
    expect(res.reserveRemaining).toBe(2);
  });

  it('consumes reserve freeze when weekly freeze is exhausted (0)', () => {
    const res = consumeFreezePass(0, 2);
    expect(res.success).toBe(true);
    expect(res.usedType).toBe('reserve');
    expect(res.weeklyRemaining).toBe(0);
    expect(res.reserveRemaining).toBe(1);
  });

  it('fails to consume freeze when both weekly and reserve are 0', () => {
    const res = consumeFreezePass(0, 0);
    expect(res.success).toBe(false);
    expect(res.usedType).toBe(null);
    expect(res.weeklyRemaining).toBe(0);
    expect(res.reserveRemaining).toBe(0);
  });

  it('resets weekly freeze to 3 (non-cumulative)', () => {
    expect(resetWeeklyFreezes()).toBe(MAX_WEEKLY_FREEZES);
    expect(MAX_WEEKLY_FREEZES).toBe(3);
  });

  it('grants +1 reserve freeze upon completing topic (all sets >= 1 star), only once per topic', () => {
    const setsCompleted = [
      { id: 's1', stars: 2 },
      { id: 's2', stars: 1 },
      { id: 's3', stars: 3 },
    ];

    // First completion: granted
    const firstCheck = evaluateTopicReserveFreeze({
      topicId: 'topic-eng-1',
      sets: setsCompleted,
      currentReserve: 1,
      grantedTopicIds: [],
    });
    expect(firstCheck.granted).toBe(true);
    expect(firstCheck.newReserve).toBe(2);
    expect(firstCheck.updatedGrantedTopicIds).toContain('topic-eng-1');

    // Second check: already granted -> not granted again
    const secondCheck = evaluateTopicReserveFreeze({
      topicId: 'topic-eng-1',
      sets: setsCompleted,
      currentReserve: 2,
      grantedTopicIds: firstCheck.updatedGrantedTopicIds,
    });
    expect(secondCheck.granted).toBe(false);
    expect(secondCheck.newReserve).toBe(2);
  });

  it('does not grant reserve freeze if any set in topic has 0 stars or topic has no sets', () => {
    const incompleteSets = [
      { id: 's1', stars: 2 },
      { id: 's2', stars: 0 }, // incomplete!
    ];
    const resIncomplete = evaluateTopicReserveFreeze({
      topicId: 'topic-incomplete',
      sets: incompleteSets,
      currentReserve: 0,
      grantedTopicIds: [],
    });
    expect(resIncomplete.granted).toBe(false);
    expect(resIncomplete.newReserve).toBe(0);

    const resEmpty = evaluateTopicReserveFreeze({
      topicId: 'topic-empty',
      sets: [],
      currentReserve: 0,
      grantedTopicIds: [],
    });
    expect(resEmpty.granted).toBe(false);
  });
});

describe('Game Logic: Topic Chest System (chest.ts)', () => {
  it('unlocks chest when all sets have >= 1 star', () => {
    const sets = [
      { id: 's1', stars: 1 },
      { id: 's2', stars: 3 },
    ];
    expect(canUnlockTopicChest(sets)).toBe(true);
  });

  it('keeps chest locked if any set has 0 stars', () => {
    const sets = [
      { id: 's1', stars: 1 },
      { id: 's2', stars: 0 },
    ];
    expect(canUnlockTopicChest(sets)).toBe(false);
  });

  it('claims chest reward once: +1 reserve freeze and +50 XP', () => {
    const sets = [
      { id: 's1', stars: 1 },
      { id: 's2', stars: 2 },
    ];

    const result = claimTopicChest({
      topicId: 'topic-1',
      sets,
      claimedTopicIds: [],
      currentXP: 100,
      currentReserveFreezes: 0,
    });

    expect(result.success).toBe(true);
    expect(result.reward).toEqual({
      xp: CHEST_REWARD_XP,
      reserveFreeze: CHEST_REWARD_RESERVE_FREEZE,
    });
    expect(result.newXP).toBe(150);
    expect(result.newReserveFreezes).toBe(1);
    expect(result.updatedClaimedTopicIds).toContain('topic-1');
  });

  it('prevents duplicate claims on already claimed chest', () => {
    const sets = [{ id: 's1', stars: 2 }];
    const result = claimTopicChest({
      topicId: 'topic-1',
      sets,
      claimedTopicIds: ['topic-1'],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('ALREADY_CLAIMED');
  });

  it('refuses claim if topic sets are not completed', () => {
    const sets = [{ id: 's1', stars: 0 }];
    const result = claimTopicChest({
      topicId: 'topic-1',
      sets,
      claimedTopicIds: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('TOPIC_NOT_COMPLETED');
  });
});

describe('Game Logic: Daily Streak & Freeze Auto-Consumption (streak.ts)', () => {
  it('starts streak at 1 on first set completed by a new user', () => {
    const freshState = {
      streak: 0,
      maxStreak: 0,
      lastActiveDate: null,
      streakFreezesWeekly: 3,
      streakFreezesReserve: 0,
    };

    const res = completeSetStreak(freshState, '2026-11-23');
    expect(res.state.streak).toBe(1);
    expect(res.state.maxStreak).toBe(1);
    expect(res.state.lastActiveDate).toBe('2026-11-23');
    expect(res.streakIncreased).toBe(true);
    expect(res.streakBroken).toBe(false);
    expect(res.missedDays).toEqual([]);
  });

  it('does not increase streak twice if multiple sets are completed on the same day', () => {
    const activeToday = {
      streak: 3,
      maxStreak: 5,
      lastActiveDate: '2026-11-23',
      streakFreezesWeekly: 3,
      streakFreezesReserve: 0,
    };

    const res = completeSetStreak(activeToday, '2026-11-23');
    expect(res.state.streak).toBe(3); // unchanged
    expect(res.streakIncreased).toBe(false);
  });

  it('increments streak by 1 when completing set on the consecutive day', () => {
    const activeYesterday = {
      streak: 3,
      maxStreak: 5,
      lastActiveDate: '2026-11-23',
      streakFreezesWeekly: 3,
      streakFreezesReserve: 0,
    };

    const res = completeSetStreak(activeYesterday, '2026-11-24');
    expect(res.state.streak).toBe(4);
    expect(res.state.maxStreak).toBe(5);
    expect(res.state.lastActiveDate).toBe('2026-11-24');
    expect(res.streakIncreased).toBe(true);
    expect(res.streakBroken).toBe(false);
  });

  it('missed 1 day: auto-consumes 1 weekly freeze and preserves streak', () => {
    // Active on Tuesday 2026-11-17, opens app on Thursday 2026-11-19 (missed Wednesday 2026-11-18)
    const state = {
      streak: 5,
      maxStreak: 5,
      lastActiveDate: '2026-11-17',
      streakFreezesWeekly: 3,
      streakFreezesReserve: 1,
    };

    const res = evaluateStreakOnAppOpen(state, '2026-11-19');
    expect(res.missedDays).toEqual(['2026-11-18']);
    expect(res.freezesUsed).toEqual([{ date: '2026-11-18', type: 'weekly' }]);
    expect(res.state.streak).toBe(5); // preserved!
    expect(res.state.streakFreezesWeekly).toBe(2);
    expect(res.state.streakFreezesReserve).toBe(1);
    expect(res.streakBroken).toBe(false);

    // Completing set on Thursday increases streak to 6
    const setRes = completeSetStreak(res.state, '2026-11-19');
    expect(setRes.state.streak).toBe(6);
    expect(setRes.state.lastActiveDate).toBe('2026-11-19');
  });

  it('missed 2 days: auto-consumes 2 weekly freezes and preserves streak', () => {
    // Active Tuesday 2026-11-17, opens Friday 2026-11-20 (missed Wed 18, Thu 19)
    const state = {
      streak: 10,
      maxStreak: 10,
      lastActiveDate: '2026-11-17',
      streakFreezesWeekly: 3,
      streakFreezesReserve: 0,
    };

    const res = evaluateStreakOnAppOpen(state, '2026-11-20');
    expect(res.missedDays).toEqual(['2026-11-18', '2026-11-19']);
    expect(res.freezesUsed).toHaveLength(2);
    expect(res.freezesUsed.every((f) => f.type === 'weekly')).toBe(true);
    expect(res.state.streak).toBe(10);
    expect(res.state.streakFreezesWeekly).toBe(1);
    expect(res.streakBroken).toBe(false);
  });

  it('missed 4 days in same week: exhausts 3 weekly freezes then consumes 1 reserve freeze', () => {
    // Active Monday 2026-11-16, opens Saturday 2026-11-21 (missed Tue 17, Wed 18, Thu 19, Fri 20)
    const state = {
      streak: 7,
      maxStreak: 7,
      lastActiveDate: '2026-11-16',
      streakFreezesWeekly: 3,
      streakFreezesReserve: 2,
    };

    const res = evaluateStreakOnAppOpen(state, '2026-11-21');
    expect(res.missedDays).toEqual([
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
    ]);
    expect(res.freezesUsed).toEqual([
      { date: '2026-11-17', type: 'weekly' },
      { date: '2026-11-18', type: 'weekly' },
      { date: '2026-11-19', type: 'weekly' },
      { date: '2026-11-20', type: 'reserve' }, // reserve consumed!
    ]);
    expect(res.state.streak).toBe(7); // streak saved!
    expect(res.state.streakFreezesWeekly).toBe(0);
    expect(res.state.streakFreezesReserve).toBe(1);
    expect(res.streakBroken).toBe(false);
  });

  it('missed days across Monday: Monday resets weekly freeze to 3 (non-cumulative)', () => {
    // Active on Friday 2026-11-20 with 1 weekly freeze and 0 reserve.
    // Misses Sat 21, Sun 22, Mon 23 (Monday!), opens on Tue 2026-11-24.
    // Sat 21: uses 1 weekly freeze (weekly becomes 0).
    // Sun 22: with 0 weekly and 0 reserve -> streak breaks!
    // But what if user had 2 weekly freezes?
    // Let's test with 2 weekly freezes:
    // Sat 21: uses weekly #1 (1 left)
    // Sun 22: uses weekly #2 (0 left)
    // Mon 23 (Monday arrives!): weekly resets to 3!
    // Mon 23 (missed day): uses weekly #1 of new week (2 left)!
    // Tue 24: user completes set. Streak is saved!
    const state = {
      streak: 15,
      maxStreak: 15,
      lastActiveDate: '2026-11-20',
      streakFreezesWeekly: 2,
      streakFreezesReserve: 0,
    };

    const res = evaluateStreakOnAppOpen(state, '2026-11-24');
    expect(res.missedDays).toEqual(['2026-11-21', '2026-11-22', '2026-11-23']);
    expect(res.freezesUsed).toEqual([
      { date: '2026-11-21', type: 'weekly' },
      { date: '2026-11-22', type: 'weekly' },
      { date: '2026-11-23', type: 'weekly' }, // used from new week's 3!
    ]);
    expect(res.streakBroken).toBe(false);
    expect(res.state.streak).toBe(15);
    expect(res.state.streakFreezesWeekly).toBe(2); // 3 - 1 = 2 remaining
  });

  it('resets streak to 0 when freeze passes are exhausted', () => {
    // Active on Monday 2026-11-16, opens on Thursday 2026-11-19 (missed Tue 17, Wed 18).
    // User only had 1 weekly freeze and 0 reserve.
    const state = {
      streak: 8,
      maxStreak: 8,
      lastActiveDate: '2026-11-16',
      streakFreezesWeekly: 1,
      streakFreezesReserve: 0,
    };

    const res = evaluateStreakOnAppOpen(state, '2026-11-19');
    expect(res.missedDays).toEqual(['2026-11-17', '2026-11-18']);
    expect(res.freezesUsed).toEqual([{ date: '2026-11-17', type: 'weekly' }]);
    expect(res.streakBroken).toBe(true);
    expect(res.state.streak).toBe(0); // reset to 0!
    expect(res.state.maxStreak).toBe(8); // maxStreak preserved

    // Now completing set on Thursday restarts streak at 1
    const setRes = completeSetStreak(res.state, '2026-11-19');
    expect(setRes.state.streak).toBe(1);
    expect(setRes.state.lastActiveDate).toBe('2026-11-19');
    expect(setRes.state.maxStreak).toBe(8);
  });

  it('resets weekly freeze to 3 on Monday even if user was active Sunday with 0 missed days', () => {
    // Active on Sunday 2026-11-22 with 1 weekly freeze remaining.
    // Opens app on Monday 2026-11-23.
    const state = {
      streak: 5,
      maxStreak: 5,
      lastActiveDate: '2026-11-22',
      streakFreezesWeekly: 1,
      streakFreezesReserve: 0,
    };

    const res = evaluateStreakOnAppOpen(state, '2026-11-23');
    expect(res.missedDays).toEqual([]);
    expect(res.state.streakFreezesWeekly).toBe(3); // reset to 3!
    expect(res.state.streak).toBe(5);
  });

  it('evaluates helper getStreakStatus accurately', () => {
    const state = {
      streak: 4,
      maxStreak: 6,
      lastActiveDate: '2026-11-23',
      streakFreezesWeekly: 3,
      streakFreezesReserve: 1,
    };

    const statusToday = getStreakStatus(state, '2026-11-23');
    expect(statusToday.isActiveToday).toBe(true);
    expect(statusToday.streak).toBe(4);
    expect(statusToday.daysSinceActive).toBe(0);

    const statusLater = getStreakStatus(state, '2026-11-25');
    expect(statusLater.isActiveToday).toBe(false);
    expect(statusLater.daysSinceActive).toBe(2);
  });
});
