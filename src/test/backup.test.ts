import { describe, it, expect, beforeEach } from 'vitest';
import { getRepository, resetRepository } from '../data';
import {
  exportFullBackup,
  exportFullBackupToFile,
  inspectBackupFile,
  restoreFullBackup,
  generateBackupFileName,
  convertLegacyToFullBackup,
} from '../lib/backup';
import { FullBackupData, Question } from '../data/types';

describe('Backup & Restore Service (Luồng C)', () => {
  beforeEach(async () => {
    resetRepository();
    const repo = getRepository();
    await repo.clearAllData();
  });

  it('generates filename matching standard vact-backup-YYYYMMDD-HHmm.json pattern', () => {
    const testDate = new Date('2026-11-23T14:35:00');
    const fileName = generateBackupFileName(testDate);
    expect(fileName).toBe('vact-backup-20261123-1435.json');
    expect(fileName).toMatch(/^vact-backup-\d{8}-\d{4}\.json$/);
  });

  it('TUYỆT ĐỐI KHÔNG BAO GỒM khóa API Gemini trong bản sao lưu', async () => {
    const repo = getRepository();

    // Set a secret Gemini API key
    await repo.updateSettings({
      geminiApiKey: 'AIzaSySecretApiKey1234567890',
      geminiModel: 'gemini-1.5-pro',
      soundEnabled: true,
      theme: 'dark',
    });

    const backup = await exportFullBackup(repo);

    // Assert key is stripped
    expect(backup.settings.geminiApiKey).toBe('');
    expect(JSON.stringify(backup)).not.toContain('AIzaSySecretApiKey1234567890');
    expect(backup.settings.geminiModel).toBe('gemini-1.5-pro');
  });

  it('inspects backup files and accurately classifies full_backup, legacy_library, and v1_package', () => {
    // 1. Full Backup
    const sampleFull: Partial<FullBackupData> = {
      version: 1,
      exportedAt: new Date().toISOString(),
      subjects: [
        {
          id: 's1',
          userId: 'u1',
          name: 'Tiếng Anh',
          code: 'ENG',
          position: 0,
          visibility: 'private',
          createdAt: '',
          updatedAt: '',
        },
      ],
      topics: [
        {
          id: 't1',
          userId: 'u1',
          subjectId: 's1',
          name: 'Câu điều kiện',
          position: 0,
          visibility: 'private',
          createdAt: '',
          updatedAt: '',
        },
      ],
      sets: [
        {
          id: 'st1',
          userId: 'u1',
          topicId: 't1',
          name: 'Bài 1',
          position: 0,
          visibility: 'private',
          createdAt: '',
          updatedAt: '',
        },
      ],
      passages: [],
      questions: [
        {
          id: 'q1',
          userId: 'u1',
          setId: 'st1',
          no: 1,
          prompt: 'Test?',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
          answerSource: 'document',
          verified: true,
          category: 'Grammar',
          formula: '',
          explanation: '',
          position: 0,
          createdAt: '',
          updatedAt: '',
        },
      ],
      setProgress: [],
      questionAttempts: [],
      userStats: {
        id: 'stat1',
        userId: 'u1',
        xp: 150,
        streak: 5,
        maxStreak: 10,
        streakFreezesWeekly: 2,
        streakFreezesReserve: 1,
        targetMajorCode: '106',
        targetMajorName: 'Khoa học Máy tính',
        targetScore: 85.5,
        dailyGoalXp: 50,
        position: 0,
        createdAt: '',
        updatedAt: '',
      },
      settings: {
        id: 'set1',
        userId: 'u1',
        soundEnabled: true,
        hapticsEnabled: true,
        theme: 'light',
        geminiApiKey: '',
        geminiModel: 'gemini-1.5-flash',
        position: 0,
        createdAt: '',
        updatedAt: '',
      },
    };

    const inspectFull = inspectBackupFile(JSON.stringify(sampleFull));
    expect(inspectFull.isValid).toBe(true);
    expect(inspectFull.format).toBe('full_backup');
    expect(inspectFull.summary.subjectsCount).toBe(1);
    expect(inspectFull.summary.topicsCount).toBe(1);
    expect(inspectFull.summary.setsCount).toBe(1);
    expect(inspectFull.summary.questionsCount).toBe(1);
    expect(inspectFull.summary.hasUserStats).toBe(true);

    // 2. Legacy Library Format (like V-ACT_app.html DEFAULT_LIBRARY)
    const sampleLegacy = [
      {
        id: 'subj-english',
        name: 'Tiếng Anh',
        topics: [
          {
            id: 'topic-1',
            name: 'Chuyên đề 15',
            sets: [
              {
                id: 'set-1',
                name: 'Bài tập áp dụng (30 câu)',
                questions: [
                  {
                    id: 1,
                    prompt: 'He didn\'t study, so he failed the exam.',
                    options: ['A', 'B', 'C', 'D'],
                    correctIndex: 1,
                    formula: 'If + had + P2',
                    explanation: 'ĐK loại 3',
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const inspectLegacy = inspectBackupFile(JSON.stringify(sampleLegacy));
    expect(inspectLegacy.isValid).toBe(true);
    expect(inspectLegacy.format).toBe('legacy_library');
    expect(inspectLegacy.summary.subjectsCount).toBe(1);
    expect(inspectLegacy.summary.topicsCount).toBe(1);
    expect(inspectLegacy.summary.setsCount).toBe(1);
    expect(inspectLegacy.summary.questionsCount).toBe(1);

    // 3. Invalid JSON string
    const inspectInvalid = inspectBackupFile('{ corrupted: json...');
    expect(inspectInvalid.isValid).toBe(false);
    expect(inspectInvalid.error).toBeDefined();
  });

  it('performs full roundtrip: backup -> clear -> restore with 100% data integrity', async () => {
    const repo = getRepository();

    // Seed test data
    const subj = await repo.createSubject({ name: 'Tiếng Anh', code: 'ENG', position: 0, visibility: 'private' });
    const topic = await repo.createTopic({ subjectId: subj.id, name: 'Câu điều kiện', position: 0, visibility: 'private' });
    const setEntity = await repo.createSet({ topicId: topic.id, name: 'Bài tập áp dụng', position: 0, visibility: 'private' });

    const q1: Question = await repo.createQuestion({
      setId: setEntity.id,
      no: 1,
      prompt: 'If it rains, we will stay home.',
      options: ['rains', 'rained', 'will rain', 'had rained'],
      correctIndex: 0,
      answerSource: 'document',
      verified: true,
      category: 'ĐK Loại 1',
      formula: 'If + S + V(s/es), S + will + V',
      explanation: 'Điều kiện có thật ở hiện tại',
      position: 0,
    });

    await repo.saveSetProgress({
      setId: setEntity.id,
      completed: true,
      score: 100,
      totalQuestions: 1,
      stars: 3,
      attemptsCount: 2,
      position: 0,
    });

    await repo.recordAttempt({
      questionId: q1.id,
      setId: setEntity.id,
      selectedIndex: 0,
      isCorrect: true,
      isFlagged: false,
      timeSpentSeconds: 15,
      position: 0,
    });

    await repo.updateUserStats({
      xp: 250,
      streak: 7,
      maxStreak: 14,
      streakFreezesWeekly: 2,
      streakFreezesReserve: 3,
    });

    // Step 1: Export Full Backup
    const backup = await exportFullBackup(repo);
    expect(backup.subjects.length).toBe(1);
    expect(backup.questions.length).toBe(1);
    expect(backup.setProgress.length).toBe(1);
    expect(backup.questionAttempts.length).toBe(1);
    expect(backup.userStats.xp).toBe(250);

    // Step 2: Clear all data
    await repo.clearAllData();
    expect((await repo.getSubjects()).length).toBe(0);
    expect((await repo.getQuestions()).length).toBe(0);

    // Step 3: Restore Full Backup (replace mode)
    const restoreResult = await restoreFullBackup(backup, 'replace', repo);
    expect(restoreResult.success).toBe(true);
    expect(restoreResult.importedSubjects).toBe(1);
    expect(restoreResult.importedQuestions).toBe(1);

    // Verify 100% matched
    const restoredSubjects = await repo.getSubjects();
    expect(restoredSubjects.length).toBe(1);
    expect(restoredSubjects[0].id).toBe(subj.id);
    expect(restoredSubjects[0].name).toBe('Tiếng Anh');

    const restoredQuestions = await repo.getQuestions(setEntity.id);
    expect(restoredQuestions.length).toBe(1);
    expect(restoredQuestions[0].prompt).toBe('If it rains, we will stay home.');
    expect(restoredQuestions[0].answerSource).toBe('document');
    expect(restoredQuestions[0].verified).toBe(true);

    const restoredProgress = await repo.getSetProgress(setEntity.id);
    expect(restoredProgress).not.toBeNull();
    expect(restoredProgress?.stars).toBe(3);
    expect(restoredProgress?.score).toBe(100);

    const restoredStats = await repo.getUserStats();
    expect(restoredStats.xp).toBe(250);
    expect(restoredStats.streak).toBe(7);
  });

  it('properly merges data in merge mode: retains higher stars, higher XP, and max progress', async () => {
    const repo = getRepository();

    // 1. Existing local state: Set 1 has 1 star, 60% score, 100 XP, streak 5
    const subj = await repo.createSubject({ id: 'subj_test', name: 'Tiếng Anh', code: 'ENG', position: 0, visibility: 'private' });
    const topic = await repo.createTopic({ id: 'top_test', subjectId: subj.id, name: 'Chuyên đề 1', position: 0, visibility: 'private' });
    const set1 = await repo.createSet({ id: 'set_1', topicId: topic.id, name: 'Bài 1', position: 0, visibility: 'private' });

    await repo.saveSetProgress({
      setId: set1.id,
      completed: true,
      score: 60,
      totalQuestions: 10,
      stars: 1, // Current stars = 1
      attemptsCount: 1,
      position: 0,
    });

    await repo.updateUserStats({
      xp: 100,
      streak: 5,
      maxStreak: 8,
      streakFreezesReserve: 1,
    });

    // 2. Incoming backup data:
    // - Set 1 has 3 stars, 90% score
    // - Set 2 is a brand new lesson with 2 stars
    // - UserStats has 300 XP, streak 3
    const incomingBackup: FullBackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      subjects: [subj],
      topics: [topic],
      sets: [
        set1,
        {
          id: 'set_2',
          userId: 'u1',
          topicId: topic.id,
          name: 'Bài 2 mới',
          position: 1,
          visibility: 'private',
          createdAt: '',
          updatedAt: '',
        },
      ],
      passages: [],
      questions: [
        {
          id: 'q_new_2',
          userId: 'u1',
          setId: 'set_2',
          no: 1,
          prompt: 'New question?',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 2,
          answerSource: 'ai',
          verified: false,
          category: '',
          formula: '',
          explanation: '',
          position: 0,
          createdAt: '',
          updatedAt: '',
        },
      ],
      setProgress: [
        {
          id: 'p1',
          userId: 'u1',
          setId: 'set_1',
          completed: true,
          score: 90,
          totalQuestions: 10,
          stars: 3, // Backup has 3 stars
          attemptsCount: 3,
          position: 0,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'p2',
          userId: 'u1',
          setId: 'set_2',
          completed: true,
          score: 80,
          totalQuestions: 5,
          stars: 2, // New set has 2 stars
          attemptsCount: 1,
          position: 1,
          createdAt: '',
          updatedAt: '',
        },
      ],
      questionAttempts: [],
      userStats: {
        id: 'stat1',
        userId: 'u1',
        xp: 300,
        streak: 3,
        maxStreak: 12,
        streakFreezesWeekly: 1,
        streakFreezesReserve: 4,
        targetMajorCode: '106',
        targetMajorName: 'Khoa học Máy tính',
        targetScore: 85.5,
        dailyGoalXp: 50,
        position: 0,
        createdAt: '',
        updatedAt: '',
      },
      settings: {
        id: 'sett1',
        userId: 'u1',
        soundEnabled: true,
        hapticsEnabled: true,
        theme: 'light',
        geminiApiKey: '',
        geminiModel: 'gemini-1.5-flash',
        position: 0,
        createdAt: '',
        updatedAt: '',
      },
    };

    // Restore with MERGE mode
    const mergeResult = await restoreFullBackup(incomingBackup, 'merge', repo);
    expect(mergeResult.success).toBe(true);
    expect(mergeResult.mode).toBe('merge');

    // Verify Set 1 progress: Math.max(1, 3) = 3 stars, Math.max(60, 90) = 90 score
    const mergedProg1 = await repo.getSetProgress('set_1');
    expect(mergedProg1?.stars).toBe(3);
    expect(mergedProg1?.score).toBe(90);

    // Verify Set 2 was added with 2 stars
    const mergedProg2 = await repo.getSetProgress('set_2');
    expect(mergedProg2?.stars).toBe(2);
    expect(mergedProg2?.score).toBe(80);

    // Verify UserStats kept Math.max
    const mergedStats = await repo.getUserStats();
    expect(mergedStats.xp).toBe(300); // Math.max(100, 300)
    expect(mergedStats.streak).toBe(5); // Math.max(5, 3)
    expect(mergedStats.maxStreak).toBe(12); // Math.max(8, 12)
    expect(mergedStats.streakFreezesReserve).toBe(4); // Math.max(1, 4)
  });

  it('imports legacy library from V-ACT_app.html and creates subjects, topics, sets, and questions', async () => {
    const repo = getRepository();

    const legacyLibrary = [
      {
        id: 'subj-english',
        name: 'Tiếng Anh',
        topics: [
          {
            id: 'topic-cond-15',
            name: 'Chuyên đề 15: Câu điều kiện',
            sets: [
              {
                id: 'set-cond-apply',
                name: 'Bài tập áp dụng (30 câu)',
                questions: [
                  {
                    id: 1,
                    category: 'ĐK Loại 3',
                    prompt: 'He didn\'t study, so he failed the exam.',
                    options: [
                      'Providing he studied, he wouldn\'t fail the exam.',
                      'If he had studied, he wouldn\'t have failed the exam.',
                      'Had he studied, he wouldn\'t fail the exam now.',
                      'Unless he studied, he wouldn\'t have failed the exam.',
                    ],
                    correctIndex: 1,
                    formula: 'If + S + had + P2, S + would + have + P2',
                    explanation: 'Câu gốc ở quá khứ đơn nên đặt giả định ĐK loại 3.',
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const result = await restoreFullBackup(legacyLibrary, 'replace', repo);
    expect(result.success).toBe(true);
    expect(result.format).toBe('legacy_library');
    expect(result.importedSubjects).toBe(1);
    expect(result.importedTopics).toBe(1);
    expect(result.importedSets).toBe(1);
    expect(result.importedQuestions).toBe(1);

    const subjects = await repo.getSubjects();
    expect(subjects.length).toBe(1);
    expect(subjects[0].name).toBe('Tiếng Anh');
    expect(subjects[0].code).toBe('ENG');

    const topics = await repo.getTopics(subjects[0].id);
    expect(topics.length).toBe(1);
    expect(topics[0].name).toBe('Chuyên đề 15: Câu điều kiện');

    const sets = await repo.getSets(topics[0].id);
    expect(sets.length).toBe(1);
    expect(sets[0].name).toBe('Bài tập áp dụng (30 câu)');

    const questions = await repo.getQuestions(sets[0].id);
    expect(questions.length).toBe(1);
    expect(questions[0].prompt).toBe('He didn\'t study, so he failed the exam.');
    expect(questions[0].correctIndex).toBe(1);
    expect(questions[0].category).toBe('ĐK Loại 3');
    expect(questions[0].formula).toBe('If + S + had + P2, S + would + have + P2');
  });

  it('preserves existing Gemini API key on replace restore', async () => {
    const repo = getRepository();

    // 1. User has their personal API key configured
    await repo.updateSettings({
      geminiApiKey: 'MY_PERSONAL_GEMINI_KEY_XYZ',
      theme: 'dark',
    });

    // 2. Backup file has NO api key (empty string)
    const backup: FullBackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      subjects: [],
      topics: [],
      sets: [],
      passages: [],
      questions: [],
      setProgress: [],
      questionAttempts: [],
      userStats: {
        id: 's',
        userId: 'u',
        xp: 50,
        streak: 1,
        maxStreak: 1,
        streakFreezesWeekly: 3,
        streakFreezesReserve: 0,
        targetMajorCode: '106',
        targetMajorName: '',
        targetScore: 80,
        dailyGoalXp: 50,
        position: 0,
        createdAt: '',
        updatedAt: '',
      },
      settings: {
        id: 'st',
        userId: 'u',
        soundEnabled: false,
        hapticsEnabled: true,
        theme: 'light',
        geminiApiKey: '', // Empty in backup
        geminiModel: 'gemini-1.5-flash',
        position: 0,
        createdAt: '',
        updatedAt: '',
      },
    };

    await restoreFullBackup(backup, 'replace', repo);

    // 3. Verify user's personal key was not wiped out
    const settingsAfter = await repo.getSettings();
    expect(settingsAfter.geminiApiKey).toBe('MY_PERSONAL_GEMINI_KEY_XYZ');
  });
});
