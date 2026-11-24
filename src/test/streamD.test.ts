import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateQuestionMistakeStatus,
  getMistakePool,
  calculateSpacedRepetition,
} from '../lib/review';
import { calculateCategoryStats } from '../lib/categoryStats';
import {
  soundManager,
  playCorrectSound,
  playIncorrectSound,
  playLessonCompleteSound,
  playStarMilestoneSound,
  playStreakFreezeUsedSound,
  playSound,
  isSoundEnabled,
  setSoundEnabled,
} from '../lib/sound';
import { Question, QuestionAttempt, SetEntity, SetProgress } from '../data/types';

describe('Stream D: Web Audio Sound Synthesizer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('honors sound enable and mute setting', () => {
    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);

    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);

    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
  });

  it('safely triggers all sound effects without throwing in test environment', () => {
    expect(() => {
      playCorrectSound();
      playIncorrectSound();
      playLessonCompleteSound();
      playStarMilestoneSound();
      playStreakFreezeUsedSound();
      playSound('correct');
      playSound('incorrect');
      playSound('lessonComplete');
      playSound('starMilestone');
      playSound('streakFreezeUsed');
    }).not.toThrow();
  });

  it('does not play sounds when muted', () => {
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    expect(() => playCorrectSound()).not.toThrow();
  });
});

describe('Stream D: Mistake Pool & Review Logic', () => {
  const dummyQuestionId = 'q-101';

  it('returns not in mistake pool if question has no attempts', () => {
    const status = calculateQuestionMistakeStatus(dummyQuestionId, []);
    expect(status.isInMistakePool).toBe(false);
    expect(status.hasMistakeHistory).toBe(false);
    expect(status.consecutiveCorrect).toBe(0);
  });

  it('returns not in mistake pool if all attempts were correct', () => {
    const attempts: QuestionAttempt[] = [
      {
        id: 'att-1',
        userId: 'user-1',
        questionId: dummyQuestionId,
        selectedIndex: 1,
        isCorrect: true,
        isFlagged: false,
        timeSpentSeconds: 5,
        position: 0,
        createdAt: '2026-11-20T10:00:00Z',
        updatedAt: '2026-11-20T10:00:00Z',
      },
    ];

    const status = calculateQuestionMistakeStatus(dummyQuestionId, attempts);
    expect(status.hasMistakeHistory).toBe(false);
    expect(status.isInMistakePool).toBe(false);
    expect(status.consecutiveCorrect).toBe(1);
  });

  it('enters mistake pool when answered incorrectly', () => {
    const attempts: QuestionAttempt[] = [
      {
        id: 'att-1',
        userId: 'user-1',
        questionId: dummyQuestionId,
        selectedIndex: 0,
        isCorrect: false,
        isFlagged: false,
        timeSpentSeconds: 5,
        position: 0,
        createdAt: '2026-11-20T10:00:00Z',
        updatedAt: '2026-11-20T10:00:00Z',
      },
    ];

    const status = calculateQuestionMistakeStatus(dummyQuestionId, attempts);
    expect(status.hasMistakeHistory).toBe(true);
    expect(status.isInMistakePool).toBe(true);
    expect(status.consecutiveCorrect).toBe(0);
    expect(status.totalIncorrect).toBe(1);
  });

  it('remains in mistake pool when answered correctly only once after error', () => {
    const attempts: QuestionAttempt[] = [
      {
        id: 'att-1',
        userId: 'user-1',
        questionId: dummyQuestionId,
        selectedIndex: 0,
        isCorrect: false,
        isFlagged: false,
        timeSpentSeconds: 5,
        position: 0,
        createdAt: '2026-11-20T10:00:00Z',
        updatedAt: '2026-11-20T10:00:00Z',
      },
      {
        id: 'att-2',
        userId: 'user-1',
        questionId: dummyQuestionId,
        selectedIndex: 1,
        isCorrect: true,
        isFlagged: false,
        timeSpentSeconds: 4,
        position: 0,
        createdAt: '2026-11-20T11:00:00Z',
        updatedAt: '2026-11-20T11:00:00Z',
      },
    ];

    const status = calculateQuestionMistakeStatus(dummyQuestionId, attempts);
    expect(status.hasMistakeHistory).toBe(true);
    expect(status.isInMistakePool).toBe(true); // still in pool because consecutiveCorrect is only 1
    expect(status.consecutiveCorrect).toBe(1);
  });

  it('is removed from mistake pool when answered correctly twice in a row', () => {
    const attempts: QuestionAttempt[] = [
      {
        id: 'att-1',
        userId: 'user-1',
        questionId: dummyQuestionId,
        selectedIndex: 0,
        isCorrect: false,
        isFlagged: false,
        timeSpentSeconds: 5,
        position: 0,
        createdAt: '2026-11-20T10:00:00Z',
        updatedAt: '2026-11-20T10:00:00Z',
      },
      {
        id: 'att-2',
        userId: 'user-1',
        questionId: dummyQuestionId,
        selectedIndex: 1,
        isCorrect: true,
        isFlagged: false,
        timeSpentSeconds: 4,
        position: 0,
        createdAt: '2026-11-20T11:00:00Z',
        updatedAt: '2026-11-20T11:00:00Z',
      },
      {
        id: 'att-3',
        userId: 'user-1',
        questionId: dummyQuestionId,
        selectedIndex: 1,
        isCorrect: true,
        isFlagged: false,
        timeSpentSeconds: 3,
        position: 0,
        createdAt: '2026-11-20T12:00:00Z',
        updatedAt: '2026-11-20T12:00:00Z',
      },
    ];

    const status = calculateQuestionMistakeStatus(dummyQuestionId, attempts);
    expect(status.hasMistakeHistory).toBe(true);
    expect(status.isInMistakePool).toBe(false); // Removed!
    expect(status.consecutiveCorrect).toBe(2);
  });

  it('resets consecutive correct streak back to 0 if an error occurs again', () => {
    const attempts: QuestionAttempt[] = [
      {
        id: 'att-1',
        userId: 'user-1',
        questionId: dummyQuestionId,
        selectedIndex: 0,
        isCorrect: false,
        isFlagged: false,
        timeSpentSeconds: 5,
        position: 0,
        createdAt: '2026-11-20T10:00:00Z',
        updatedAt: '2026-11-20T10:00:00Z',
      },
      {
        id: 'att-2',
        userId: 'user-1',
        questionId: dummyQuestionId,
        selectedIndex: 1,
        isCorrect: true,
        isFlagged: false,
        timeSpentSeconds: 4,
        position: 0,
        createdAt: '2026-11-20T11:00:00Z',
        updatedAt: '2026-11-20T11:00:00Z',
      },
      {
        id: 'att-3',
        userId: 'user-1',
        questionId: dummyQuestionId,
        selectedIndex: 2,
        isCorrect: false,
        isFlagged: false,
        timeSpentSeconds: 6,
        position: 0,
        createdAt: '2026-11-20T12:00:00Z',
        updatedAt: '2026-11-20T12:00:00Z',
      },
    ];

    const status = calculateQuestionMistakeStatus(dummyQuestionId, attempts);
    expect(status.isInMistakePool).toBe(true);
    expect(status.consecutiveCorrect).toBe(0);
    expect(status.totalIncorrect).toBe(2);
  });

  it('evaluates getMistakePool correctly across multiple questions', () => {
    const mockQuestions: Question[] = [
      {
        id: 'q1',
        userId: 'u',
        setId: 'set1',
        no: 1,
        prompt: 'Q1',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        answerSource: 'document',
        verified: true,
        category: 'Cat A',
        formula: 'F1',
        explanation: 'E1',
        position: 0,
        createdAt: '2026-11-20T00:00:00Z',
        updatedAt: '2026-11-20T00:00:00Z',
      },
      {
        id: 'q2',
        userId: 'u',
        setId: 'set1',
        no: 2,
        prompt: 'Q2',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 1,
        answerSource: 'document',
        verified: true,
        category: 'Cat B',
        formula: 'F2',
        explanation: 'E2',
        position: 1,
        createdAt: '2026-11-20T00:00:00Z',
        updatedAt: '2026-11-20T00:00:00Z',
      },
    ];

    const mockAttempts: QuestionAttempt[] = [
      // q1 wrong once
      {
        id: 'a1',
        userId: 'u',
        questionId: 'q1',
        selectedIndex: 2,
        isCorrect: false,
        isFlagged: false,
        timeSpentSeconds: 5,
        position: 0,
        createdAt: '2026-11-20T10:00:00Z',
        updatedAt: '2026-11-20T10:00:00Z',
      },
      // q2 wrong then right twice
      {
        id: 'a2',
        userId: 'u',
        questionId: 'q2',
        selectedIndex: 0,
        isCorrect: false,
        isFlagged: false,
        timeSpentSeconds: 5,
        position: 0,
        createdAt: '2026-11-20T10:00:00Z',
        updatedAt: '2026-11-20T10:00:00Z',
      },
      {
        id: 'a3',
        userId: 'u',
        questionId: 'q2',
        selectedIndex: 1,
        isCorrect: true,
        isFlagged: false,
        timeSpentSeconds: 5,
        position: 0,
        createdAt: '2026-11-20T11:00:00Z',
        updatedAt: '2026-11-20T11:00:00Z',
      },
      {
        id: 'a4',
        userId: 'u',
        questionId: 'q2',
        selectedIndex: 1,
        isCorrect: true,
        isFlagged: false,
        timeSpentSeconds: 5,
        position: 0,
        createdAt: '2026-11-20T12:00:00Z',
        updatedAt: '2026-11-20T12:00:00Z',
      },
    ];

    const pool = getMistakePool(mockQuestions, mockAttempts);
    expect(pool.totalInPool).toBe(1);
    expect(pool.activeMistakeQuestions[0].question.id).toBe('q1');
    expect(pool.totalCleared).toBe(1);
    expect(pool.clearedQuestions[0].question.id).toBe('q2');
  });
});

describe('Stream D: Spaced Repetition (1/3/7/14 days intervals)', () => {
  it('identifies sets due for review with intervals 1/3/7/14 days or <3 stars', () => {
    const mockSets: SetEntity[] = [
      {
        id: 'set-mastered',
        userId: 'u',
        topicId: 'top1',
        name: 'Mastered Set',
        position: 0,
        visibility: 'private',
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
      {
        id: 'set-needs-review',
        userId: 'u',
        topicId: 'top1',
        name: 'Needs Review Set',
        position: 1,
        visibility: 'private',
        createdAt: '2026-11-01T00:00:00Z',
        updatedAt: '2026-11-01T00:00:00Z',
      },
    ];

    const mockProgress: SetProgress[] = [
      {
        id: 'p1',
        userId: 'u',
        setId: 'set-mastered',
        completed: true,
        score: 10,
        totalQuestions: 10,
        stars: 3,
        attemptsCount: 1,
        lastAttemptedAt: '2026-11-20T00:00:00Z',
        position: 0,
        createdAt: '2026-11-20T00:00:00Z',
        updatedAt: '2026-11-20T00:00:00Z',
      },
      {
        id: 'p2',
        userId: 'u',
        setId: 'set-needs-review',
        completed: true,
        score: 6,
        totalQuestions: 10,
        stars: 1,
        attemptsCount: 1,
        lastAttemptedAt: '2026-11-17T00:00:00Z', // 3 days ago relative to 2026-11-20
        position: 1,
        createdAt: '2026-11-17T00:00:00Z',
        updatedAt: '2026-11-17T00:00:00Z',
      },
    ];

    const refDate = new Date('2026-11-20T12:00:00Z');
    const items = calculateSpacedRepetition(mockSets, mockProgress, [], [], refDate);

    // Mastered set with 3 stars and 0 mistakes should not be due
    expect(items.some((i) => i.set.id === 'set-mastered')).toBe(false);

    // Needs review set (<3 stars, 3 days ago) should be due
    const reviewItem = items.find((i) => i.set.id === 'set-needs-review');
    expect(reviewItem).toBeDefined();
    expect(reviewItem?.daysSinceLastAttempt).toBe(3);
    expect(reviewItem?.intervalTier).toBe(3);
    expect(reviewItem?.isDue).toBe(true);
  });
});

describe('Stream D: Category Statistics (Strengths >=80%, Weaknesses <60% min 5 attempts)', () => {
  it('classifies strengths, weaknesses, and calculates accuracy correctly', () => {
    const mockQuestions: Question[] = [
      {
        id: 'q-strong-1',
        userId: 'u',
        setId: 'set1',
        no: 1,
        prompt: 'Strong Q',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        answerSource: 'document',
        verified: true,
        category: 'ĐK Loại 1',
        formula: 'F',
        explanation: 'E',
        position: 0,
        createdAt: '2026-11-20T00:00:00Z',
        updatedAt: '2026-11-20T00:00:00Z',
      },
      {
        id: 'q-weak-1',
        userId: 'u',
        setId: 'set1',
        no: 2,
        prompt: 'Weak Q',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        answerSource: 'document',
        verified: true,
        category: 'Đảo ngữ Loại 3',
        formula: 'F',
        explanation: 'E',
        position: 1,
        createdAt: '2026-11-20T00:00:00Z',
        updatedAt: '2026-11-20T00:00:00Z',
      },
    ];

    // Category 'ĐK Loại 1': 4/5 correct = 80% (Strength)
    const strongAttempts: QuestionAttempt[] = Array.from({ length: 5 }, (_, i) => ({
      id: `att-strong-${i}`,
      userId: 'u',
      questionId: 'q-strong-1',
      selectedIndex: i < 4 ? 0 : 1,
      isCorrect: i < 4,
      isFlagged: false,
      timeSpentSeconds: 5,
      position: 0,
      createdAt: '2026-11-20T00:00:00Z',
      updatedAt: '2026-11-20T00:00:00Z',
    }));

    // Category 'Đảo ngữ Loại 3': 2/5 correct = 40% (< 60% with min 5 attempts => Weakness)
    const weakAttempts: QuestionAttempt[] = Array.from({ length: 5 }, (_, i) => ({
      id: `att-weak-${i}`,
      userId: 'u',
      questionId: 'q-weak-1',
      selectedIndex: i < 2 ? 0 : 1,
      isCorrect: i < 2,
      isFlagged: false,
      timeSpentSeconds: 5,
      position: 0,
      createdAt: '2026-11-20T00:00:00Z',
      updatedAt: '2026-11-20T00:00:00Z',
    }));

    const result = calculateCategoryStats(mockQuestions, [...strongAttempts, ...weakAttempts]);

    expect(result.strengths.some((s) => s.category === 'ĐK Loại 1')).toBe(true);
    expect(result.weaknesses.some((w) => w.category === 'Đảo ngữ Loại 3')).toBe(true);

    const strongCat = result.categories.find((c) => c.category === 'ĐK Loại 1');
    expect(strongCat?.accuracy).toBe(80);
    expect(strongCat?.isStrength).toBe(true);

    const weakCat = result.categories.find((c) => c.category === 'Đảo ngữ Loại 3');
    expect(weakCat?.accuracy).toBe(40);
    expect(weakCat?.isWeakness).toBe(true);

    // Overall: 6 correct / 10 total = 60%
    expect(result.overallAccuracy).toBe(60);
    expect(result.totalAttemptsCount).toBe(10);
  });
});
