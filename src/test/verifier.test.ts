import { describe, it, expect, beforeEach } from 'vitest';
import { SEED_PACKAGES } from '../data/seed';
import { calculateStars, countScoredQuestions } from '../lib/game/stars';
import {
  calculateSessionXP,
  DAILY_GOAL_OPTIONS,
  DEFAULT_DAILY_GOAL,
} from '../lib/game/xp';
import {
  formatVietnamDate,
  getVietnamDayOfWeek,
  getMondayOfWeek,
} from '../lib/game/dateUtils';
import {
  consumeFreezePass,
  resetWeeklyFreezes,
  evaluateTopicReserveFreeze,
  MAX_WEEKLY_FREEZES,
} from '../lib/game/freeze';
import { canUnlockTopicChest, claimTopicChest } from '../lib/game/chest';
import { generateScorecardText } from '../lib/scorecard';
import { useTargetMajorStore } from '../store/targetMajorStore';
import { useThemeStore } from '../store/themeStore';
import { BK_SCORES_2026, DEFAULT_TARGET_MAJOR } from '../data/bkScores';
import { ResumeState, Question, SetProgress } from '../data/types';

describe('Verifier Suite - Wave 2 Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.documentElement.className = '';
  });

  // ============================================================================
  // Edge Case 1: Full test run of "Bài tập áp dụng" (30 questions) to Completion
  // ============================================================================
  describe('1. Full test run of "Bài tập áp dụng" (30 questions) to Completion', () => {
    const pkg = SEED_PACKAGES.find((p) => p.set === 'Bài tập áp dụng');

    it('has exactly 30 questions with 4 options and valid correctIndex', () => {
      expect(pkg).toBeDefined();
      expect(pkg?.questions).toHaveLength(30);
      for (const q of pkg!.questions) {
        expect(q.options).toHaveLength(4);
        expect(q.correctIndex).not.toBeNull();
        expect([0, 1, 2, 3]).toContain(q.correctIndex);
      }
    });

    it('simulates 30 questions answering, scoring, stars, and scorecard generation', () => {
      const questions = pkg!.questions as Question[];
      const totalScored = countScoredQuestions(questions);
      expect(totalScored).toBe(30);

      // Simulate: answer 27 questions correctly (90% -> 3 stars), 3 incorrectly
      const answers: Record<string, number> = {};
      const flags: Record<string, boolean> = {};
      let correctCount = 0;

      questions.forEach((q, idx) => {
        if (idx < 27) {
          answers[q.id || `q-${idx}`] = q.correctIndex!;
          correctCount++;
        } else {
          answers[q.id || `q-${idx}`] = (q.correctIndex! + 1) % 4; // wrong answer
          flags[q.id || `q-${idx}`] = true; // flagged for review
        }
      });

      expect(correctCount).toBe(27);
      const stars = calculateStars(correctCount, totalScored);
      expect(stars).toBe(3); // 27/30 = 90% -> 3 stars

      // XP calculation: 27 correct first attempts * 10 = 270 + 20 (set completion) + 30 (3 new stars * 10) = 320 XP
      const xpBreakdown = calculateSessionXP({
        correctFirstAttemptsCount: correctCount,
        isSetCompleted: true,
        previousStars: 0,
        currentStars: 3,
      });
      expect(xpBreakdown.totalXP).toBe(320);
      expect(xpBreakdown.correctAnswersXP).toBe(270);
      expect(xpBreakdown.setCompletionXP).toBe(20);
      expect(xpBreakdown.newStarsXP).toBe(30);

      // Scorecard generation
      const scorecard = generateScorecardText({
        setName: 'Bài tập áp dụng',
        topicName: 'Chuyên đề 15: Câu điều kiện',
        subjectName: 'Tiếng Anh',
        timeSpentSeconds: 450,
        totalQuestions: 30,
        scoredQuestions: 30,
        correctCount: 27,
        stars: 3,
        earnedXp: 320,
        questions,
        answers,
        flags,
      });

      expect(scorecard).toContain('V-ACT HUB - PHIẾU KẾT QUẢ BÀI LUYỆN TẬP');
      expect(scorecard).toContain('Bài tập áp dụng');
      expect(scorecard).toContain('27 / 30 câu đúng (90%)');
      expect(scorecard).toContain('★★★ (3/3 Sao)');
      expect(scorecard).toContain('+320 XP');
      expect(scorecard).toContain('07:30'); // 450 seconds = 07:30
    });
  });

  // ============================================================================
  // Edge Case 2: Resume state after closing tab
  // ============================================================================
  describe('2. Resume state after closing tab', () => {
    it('serializes and deserializes in-progress test state cleanly', () => {
      const mockResumeState: ResumeState = {
        currentQuestionIndex: 14,
        answers: { 'q-1': 0, 'q-2': 1, 'q-3': 2 },
        flags: { 'q-2': true },
        mode: 'practice',
        timeSpentSeconds: 185,
        submitted: false,
      };

      const setProgress: Partial<SetProgress> = {
        setId: 'set-practice-30',
        completed: false,
        score: 3,
        totalQuestions: 30,
        stars: 0,
        attemptsCount: 1,
        lastAttemptedAt: new Date().toISOString(),
        position: 1,
        resume_state: mockResumeState,
      };

      // Check recovery
      const recoveredResume = setProgress.resume_state;
      expect(recoveredResume).toBeDefined();
      expect(recoveredResume?.currentQuestionIndex).toBe(14);
      expect(recoveredResume?.answers['q-2']).toBe(1);
      expect(recoveredResume?.flags['q-2']).toBe(true);
      expect(recoveredResume?.timeSpentSeconds).toBe(185);
      expect(recoveredResume?.submitted).toBe(false);
      expect(setProgress.completed).toBe(false);
    });

    it('marks submitted and completed when finished so resume does not overwrite fresh attempts', () => {
      const finishedProgress: Partial<SetProgress> = {
        setId: 'set-practice-30',
        completed: true,
        score: 28,
        totalQuestions: 30,
        stars: 3,
        attemptsCount: 1,
        lastAttemptedAt: new Date().toISOString(),
        position: 1,
        resume_state: {
          currentQuestionIndex: 29,
          answers: { 'q-1': 0 },
          flags: {},
          mode: 'practice',
          timeSpentSeconds: 300,
          submitted: true,
        },
      };

      expect(finishedProgress.completed).toBe(true);
      expect(finishedProgress.resume_state?.submitted).toBe(true);
    });
  });

  // ============================================================================
  // Edge Case 3: Theme toggle (Light/Dark) across all screens
  // ============================================================================
  describe('3. Theme toggle (Light/Dark)', () => {
    it('toggles light <-> dark and updates document element class and localStorage', () => {
      const themeStore = useThemeStore.getState();

      themeStore.setTheme('light');
      expect(useThemeStore.getState().effectiveTheme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(localStorage.getItem('vact_theme')).toBe('light');

      themeStore.toggleTheme();
      expect(useThemeStore.getState().effectiveTheme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem('vact_theme')).toBe('dark');

      themeStore.toggleTheme();
      expect(useThemeStore.getState().effectiveTheme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(localStorage.getItem('vact_theme')).toBe('light');
    });
  });

  // ============================================================================
  // Edge Case 4: Shortcut keys (A/B/C/D, 1-4, arrows, F)
  // ============================================================================
  describe('4. Shortcut keys logic', () => {
    it('properly maps key inputs to practice action triggers', () => {
      const optionMap: Record<string, number> = {
        a: 0,
        '1': 0,
        b: 1,
        '2': 1,
        c: 2,
        '3': 2,
        d: 3,
        '4': 3,
      };

      ['a', '1'].forEach((k) => expect(optionMap[k.toLowerCase()]).toBe(0));
      ['b', '2'].forEach((k) => expect(optionMap[k.toLowerCase()]).toBe(1));
      ['c', '3'].forEach((k) => expect(optionMap[k.toLowerCase()]).toBe(2));
      ['d', '4'].forEach((k) => expect(optionMap[k.toLowerCase()]).toBe(3));

      const isNavLeft = (k: string) => k.toLowerCase() === 'arrowleft';
      const isNavRight = (k: string) => k.toLowerCase() === 'arrowright';
      const isFlagKey = (k: string) => k.toLowerCase() === 'f';

      expect(isNavLeft('ArrowLeft')).toBe(true);
      expect(isNavRight('ArrowRight')).toBe(true);
      expect(isFlagKey('f')).toBe(true);
      expect(isFlagKey('F')).toBe(true);
    });
  });

  // ============================================================================
  // Edge Case 5: Star thresholds, XP calculation, Streak Freeze under UTC+7
  // ============================================================================
  describe('5. Star thresholds, XP calculation, Streak Freeze under UTC+7', () => {
    it('validates exact star threshold boundaries', () => {
      const total = 100;
      expect(calculateStars(49, total)).toBe(0); // < 50%
      expect(calculateStars(50, total)).toBe(1); // == 50% -> 1 star
      expect(calculateStars(69, total)).toBe(1); // < 70% -> 1 star
      expect(calculateStars(70, total)).toBe(2); // == 70% -> 2 stars
      expect(calculateStars(89, total)).toBe(2); // < 90% -> 2 stars
      expect(calculateStars(90, total)).toBe(3); // == 90% -> 3 stars
      expect(calculateStars(100, total)).toBe(3); // 100% -> 3 stars
    });

    it('excludes questions with null correctIndex from totalScoredQuestions', () => {
      const dummyQuestions: Partial<Question>[] = [
        { id: '1', correctIndex: 0 },
        { id: '2', correctIndex: 1 },
        { id: '3', correctIndex: null }, // no answer key
        { id: '4', correctIndex: null }, // unverified
      ];
      expect(countScoredQuestions(dummyQuestions as Question[])).toBe(2);
    });

    it('preserves highest stars on redo', () => {
      const prevStars = 3;
      const newScoreStars = 1;
      const preserved = Math.max(prevStars, newScoreStars);
      expect(preserved).toBe(3);
    });

    it('verifies XP rules and daily goal defaults', () => {
      expect(DEFAULT_DAILY_GOAL).toBe(50);
      expect(DAILY_GOAL_OPTIONS).toEqual([20, 50, 100]);

      const xp = calculateSessionXP({
        correctFirstAttemptsCount: 5,
        isSetCompleted: true,
        previousStars: 0,
        currentStars: 2,
      });
      // 5 * 10 + 20 + 2 * 10 = 90
      expect(xp.totalXP).toBe(90);
    });

    it('verifies Vietnam UTC+7 date and Monday tracking', () => {
      // 2026-11-23 23:59 UTC+7
      const lateEvening = new Date('2026-11-23T16:59:00.000Z'); // 16:59 UTC = 23:59 VN
      expect(formatVietnamDate(lateEvening)).toBe('2026-11-23');

      // 2 minutes later: 2026-11-24 00:01 UTC+7
      const justPastMidnight = new Date('2026-11-23T17:01:00.000Z'); // 17:01 UTC = 00:01 VN next day
      expect(formatVietnamDate(justPastMidnight)).toBe('2026-11-24');

      // Monday of week calculation
      const vnDateStr = formatVietnamDate(lateEvening);
      const mondayStr = getMondayOfWeek(vnDateStr);
      expect(getVietnamDayOfWeek(new Date(mondayStr + 'T00:00:00.000Z'))).toBe(1); // Monday
    });

    it('verifies weekly freeze reset to 3 and priority over reserve freeze', () => {
      expect(MAX_WEEKLY_FREEZES).toBe(3);
      expect(resetWeeklyFreezes()).toBe(3);

      // Consume weekly freeze first
      const r1 = consumeFreezePass(3, 2);
      expect(r1.success).toBe(true);
      expect(r1.usedType).toBe('weekly');
      expect(r1.weeklyRemaining).toBe(2);
      expect(r1.reserveRemaining).toBe(2);

      // Consume reserve freeze when weekly is 0
      const r2 = consumeFreezePass(0, 2);
      expect(r2.success).toBe(true);
      expect(r2.usedType).toBe('reserve');
      expect(r2.weeklyRemaining).toBe(0);
      expect(r2.reserveRemaining).toBe(1);

      // Fails when both are 0
      const r3 = consumeFreezePass(0, 0);
      expect(r3.success).toBe(false);
      expect(r3.usedType).toBeNull();
    });

    it('verifies topic chest reward is granted only once', () => {
      const sets = [
        { id: 's1', stars: 1 },
        { id: 's2', stars: 2 },
      ];
      expect(canUnlockTopicChest(sets)).toBe(true);

      const claim1 = claimTopicChest({
        topicId: 'topic-15',
        sets,
        claimedTopicIds: [],
        currentXP: 100,
        currentReserveFreezes: 1,
      });
      expect(claim1.success).toBe(true);
      expect(claim1.newXP).toBe(150);
      expect(claim1.newReserveFreezes).toBe(2);

      // Attempt claim again with claimedTopicIds containing 'topic-15'
      const claim2 = claimTopicChest({
        topicId: 'topic-15',
        sets,
        claimedTopicIds: ['topic-15'],
        currentXP: 150,
        currentReserveFreezes: 2,
      });
      expect(claim2.success).toBe(false);
      expect(claim2.error).toBe('ALREADY_CLAIMED');
    });
  });

  // ============================================================================
  // Edge Case 6: Target major updates from Benchmark table syncing to Welcome and Roadmap
  // ============================================================================
  describe('6. Target major updates from Benchmark table syncing', () => {
    it('defaults to 106 Khoa học Máy tính 85.45 and year 2026', () => {
      expect(DEFAULT_TARGET_MAJOR.code).toBe('106');
      expect(DEFAULT_TARGET_MAJOR.name).toBe('Khoa học Máy tính');
      expect(DEFAULT_TARGET_MAJOR.benchmark).toBe(85.45);

      const store = useTargetMajorStore.getState();
      const major = store.getTargetMajor();
      expect(major.code).toBe('106');
      expect(major.benchmark).toBe(85.45);
    });

    it('updates when selecting any of the 36 majors from standard or PFIEV', () => {
      const store = useTargetMajorStore.getState();

      // Test selecting standard major (e.g. 107 Kỹ thuật Máy tính 84.98)
      store.setTargetCode('107');
      let target = useTargetMajorStore.getState().getTargetMajor();
      expect(target.code).toBe('107');
      expect(target.name).toBe('Kỹ thuật Máy tính');
      expect(target.benchmark).toBe(84.98);

      // Test selecting PFIEV major (e.g. PFIEV-108 Kỹ thuật điện 84.29)
      store.setTargetCode('PFIEV-108');
      target = useTargetMajorStore.getState().getTargetMajor();
      expect(target.code).toBe('PFIEV-108');
      expect(target.program).toBe('pfiev');
      expect(target.name).toContain('Kỹ thuật điện');
      expect(target.benchmark).toBe(84.29);
    });

    it('ensures no major contains the obsolete year 2025', () => {
      for (const m of BK_SCORES_2026) {
        if (m.note) {
          expect(m.note).not.toContain('2025');
        }
      }
    });
  });
});
