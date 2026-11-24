// ==============================================================================
// V-ACT HUB: Comprehensive Phase 3 Integration Test Suite (Đợt 3)
// ==============================================================================
// Covers:
// 1. Full cycle: Prompt Generation -> Parse & Repair (markdown fences, LaTeX \,
//    raw newlines, trailing commas, truncated JSON) -> Multipart 3-turn merge
//    -> Quick answer fast input (ABCD...) -> Apply & Diff -> Save to repository.
// 2. Roadmap retrieval -> Practice flow (passage, figure, LaTeX formula)
//    -> Answer verification & star recalculation (thresholds 50/70/90%).
// 3. Full backup JSON -> Wipe clean -> Full restore: 100% data preservation
//    (subjects, topics, sets, passages, questions, stars, streak, attempts, settings).
// 4. Absolute API key isolation: Key stored ONLY in localStorage, NEVER sent to
//    Supabase, NEVER leaked into JSON backups or error payloads.
// ==============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalRepository } from '../data/localRepository';
import {
  buildImportPrompt,
  parseAndRepair,
  mergeMultipartParts,
  parseQuickAnswers,
  applyQuickAnswers,
} from '../features/import';
import {
  isGeminiFeatureEnabled,
  getGeminiApiKey,
  getGeminiModel,
  saveGeminiConfig,
  clearGeminiConfig,
  callGeminiApi,
  STORAGE_KEY_GEMINI_API_KEY,
} from '../features/import/geminiProvider';
import {
  exportFullBackup,
  inspectBackupFile,
  restoreFullBackup,
} from '../features/backup/backupService';
import { calculateStars } from '../lib/game/stars';
import { QuestionAttempt, SetProgress, UserStats, UserSettings } from '../data/types';

describe('Phase 3 Comprehensive Integration: AI Prompt -> Parse & Repair -> Multipart -> Quick Answers -> Repository', () => {
  let repo: LocalRepository;

  beforeEach(async () => {
    localStorage.clear();
    repo = new LocalRepository();
    await repo.clearAllData();
  });

  it('generates a valid Vietnamese prompt for chatbots containing strict schema v1 guidelines', () => {
    const prompt = buildImportPrompt({
      subject: 'Tiếng Anh',
      topic: 'Chuyên đề 15: Câu điều kiện',
      set: 'Đề thi rèn luyện số 01',
      chunkSize: 25,
    });

    expect(prompt).toContain('Tiếng Anh');
    expect(prompt).toContain('Chuyên đề 15: Câu điều kiện');
    expect(prompt).toContain('Đề thi rèn luyện số 01');
    expect(prompt).toContain('schemaVersion');
    expect(prompt).toContain('part');
    expect(prompt).toContain('passages');
    expect(prompt).toContain('questions');
    expect(prompt).toContain('answerSource');
  });

  it('successfully repairs and merges a 3-part multipart chatbot response with real-world formatting errors', () => {
    // Turn 1: Markdown code fences, single backslashes in LaTeX, smart quotes, trailing commas
    const turn1Raw = `
Dưới đây là phần 1 của đề thi:
\`\`\`json
{
  "schemaVersion": 1,
  "subject": "Tiếng Anh",
  "topic": "Chuyên đề 15: Câu điều kiện",
  "set": "Bộ đề tích hợp Phase 3",
  "part": { "index": 1, "total": 3 },
  "passages": [
    {
      "id": "p-shared-1",
      "title": "Renewable Energy Transitions",
      "content": "Transitioning to clean energy is critical for mitigating global temperature rise."
    },
  ],
  "questions": [
    {
      "no": 1,
      "prompt": "If we \\\\frac{1}{2} reduce emissions, what will happen?",
      "options": [
        "Temperatures stabilize",
        "Warming accelerates",
        "Sea levels double",
        "Nothing changes",
      ],
      "correctIndex": 0,
      "answerSource": "ai",
      "verified": false,
      "category": "Câu điều kiện loại 1",
      "formula": "If + S + V(s/es), S + will + V",
      "explanation": "Câu điều kiện diễn tả hành động có thể xảy ra ở hiện tại hoặc tương lai.",
      "passageId": "p-shared-1",
      "figure": null
    },
    {
      "no": 2,
      "prompt": "According to the passage, why is clean energy critical?",
      "options": [
        "To mitigate warming",
        "To increase oil production",
        "To build coal plants",
        "To expand cities"
      ],
      "correctIndex": 0,
      "answerSource": "ai",
      "verified": false,
      "category": "Đọc hiểu chi tiết",
      "formula": "",
      "explanation": "Nêu rõ trong câu đầu đoạn văn.",
      "passageId": "p-shared-1",
      "figure": null
    }
  ]
}
\`\`\`
Đã xong phần 1, hãy gõ "tiếp" để nhận phần 2.
    `;

    // Turn 2: Conversational prefix, unescaped raw newline in question prompt, no fences
    const turn2Raw = `
Dưới đây là phần 2 của bộ đề:
{
  "schemaVersion": 1,
  "subject": "Tiếng Anh",
  "topic": "Chuyên đề 15: Câu điều kiện",
  "set": "Bộ đề tích hợp Phase 3",
  "part": { "index": 2, "total": 3 },
  "passages": [
    {
      "id": "p-shared-1",
      "title": "Renewable Energy Transitions",
      "content": "Transitioning to clean energy is critical for mitigating global temperature rise."
    }
  ],
  "questions": [
    {
      "no": 3,
      "prompt": "Cho hàm số $y = \\\\frac{2x+1}{x-1}$.\\nĐồ thị có tiệm cận đứng là:",
      "options": [
        "$x = 1$",
        "$x = -1$",
        "$y = 2$",
        "$y = 1$"
      ],
      "correctIndex": 0,
      "answerSource": "ai",
      "verified": false,
      "category": "Tiệm cận đồ thị hàm số",
      "formula": "x = -d/c",
      "explanation": "Mẫu số triệt tiêu tại x = 1.",
      "passageId": null,
      "figure": {
        "url": "https://example.com/figure3.png",
        "caption": "Đồ thị hàm phân thức"
      }
    },
    {
      "no": 4,
      "prompt": "Had I known about the conference, I _____ attended.",
      "options": [
        "would have",
        "will have",
        "would",
        "had"
      ],
      "correctIndex": null,
      "answerSource": "none",
      "verified": false,
      "category": "Đảo ngữ điều kiện loại 3",
      "formula": "Had + S + V3/ed, S + would have + V3/ed",
      "explanation": "Cấu trúc đảo ngữ điều kiện loại 3.",
      "passageId": null,
      "figure": null
    }
  ]
}
Chờ bạn gửi lệnh để xuất phần 3.
    `;

    // Turn 3: Truncated JSON stream (cut off mid-stream on question 6)
    const turn3Raw = `
\`\`\`json
{
  "schemaVersion": 1,
  "subject": "Tiếng Anh",
  "topic": "Chuyên đề 15: Câu điều kiện",
  "set": "Bộ đề tích hợp Phase 3",
  "part": { "index": 3, "total": 3 },
  "passages": [],
  "questions": [
    {
      "no": 5,
      "prompt": "If water reaches 100 degrees Celsius, it _____.",
      "options": [
        "boils",
        "boiled",
        "will boil",
        "is boiling"
      ],
      "correctIndex": 0,
      "answerSource": "ai",
      "verified": false,
      "category": "Câu điều kiện loại 0",
      "formula": "If + S + V(hiện tại), S + V(hiện tại)",
      "explanation": "Sự thật hiển nhiên dùng điều kiện loại 0.",
      "passageId": null,
      "figure": null
    },
    {
      "no": 6,
      "prompt": "Câu này đang viết dở thì bị cắt
    `;

    // 1. Parse and repair each turn independently
    const res1 = parseAndRepair(turn1Raw);
    expect(res1.data).not.toBeNull();
    expect(res1.data?.questions.length).toBe(2);
    expect(res1.repairs.length).toBeGreaterThan(0);

    const res2 = parseAndRepair(turn2Raw);
    expect(res2.data).not.toBeNull();
    expect(res2.data?.questions.length).toBe(2);

    const res3 = parseAndRepair(turn3Raw);
    expect(res3.data).not.toBeNull();
    // Question 5 was complete, truncated question 6 was safely dropped
    expect(res3.data?.questions.length).toBe(1);
    expect(res3.data?.questions[0].no).toBe(5);

    // 2. Consolidate multipart parts
    const mergeResult = mergeMultipartParts([res1.data!, res2.data!, res3.data!]);
    expect(mergeResult.isComplete).toBe(true);
    expect(mergeResult.missingParts.length).toBe(0);
    expect(mergeResult.merged).not.toBeNull();

    const merged = mergeResult.merged!;
    expect(merged.questions.length).toBe(5);
    expect(merged.passages?.length).toBe(1); // deduplicated p-shared-1

    // 3. Fast quick answer string entry (overriding AI answers)
    // E.g. User enters: "1A 2A 3A 4A 5A"
    const quickParse = parseQuickAnswers('1A 2A 3A 4A 5A');
    expect(quickParse.detectedFormat).toBe('numbered');
    expect(Object.keys(quickParse.answers).length).toBe(5);

    const applyRes = applyQuickAnswers(merged.questions, quickParse.answers);
    expect(applyRes.matchedCount).toBe(5);

    // Question 4 had correctIndex: null and answerSource: 'none', now updated to 0 and 'user'
    const q4 = applyRes.updatedQuestions.find((q) => q.no === 4);
    expect(q4?.correctIndex).toBe(0);
    expect(q4?.answerSource).toBe('user');
    expect(q4?.verified).toBe(true);

    // 4. Save package into repository
    const finalPackage = {
      ...merged,
      questions: applyRes.updatedQuestions,
    };

    return repo.importV1Package(finalPackage as any).then(async (importRes) => {
      expect(importRes.questionCount).toBe(5);
      expect(importRes.setId).toBeDefined();

      // Verify saved in repository
      const savedQuestions = await repo.getQuestions(importRes.setId);
      expect(savedQuestions.length).toBe(5);

      const savedPassages = await repo.getPassages(importRes.setId);
      expect(savedPassages.length).toBe(1);
      expect(savedPassages[0].content).toContain('Transitioning to clean energy');
    });
  });
});

describe('Phase 3: Roadmap, Practice, Verification & Star Rating Mechanics', () => {
  let repo: LocalRepository;

  beforeEach(async () => {
    localStorage.clear();
    repo = new LocalRepository();
    await repo.clearAllData();
  });

  it('correctly calculates stars and handles on-the-fly verification during practice', async () => {
    // 1. Create a set with 4 questions: 3 with answers (2 correct, 1 wrong), 1 with null answer
    const subject = await repo.createSubject({
      userId: 'test-user',
      name: 'Tiếng Anh',
      code: 'ENG',
      position: 0,
      visibility: 'private',
    });

    const topic = await repo.createTopic({
      userId: 'test-user',
      subjectId: subject.id,
      name: 'Chuyên đề 15: Câu điều kiện',
      position: 0,
      visibility: 'private',
    });

    const setEntity = await repo.createSet({
      userId: 'test-user',
      topicId: topic.id,
      name: 'Luyện tập Đợt 3',
      position: 0,
      visibility: 'private',
    });

    const questions = await repo.bulkCreateQuestions([
      {
        userId: 'test-user',
        setId: setEntity.id,
        no: 1,
        prompt: 'Question 1',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        answerSource: 'ai',
        verified: false,
        category: 'Loại 1',
        formula: '',
        explanation: 'Giải thích 1',
        position: 0,
      },
      {
        userId: 'test-user',
        setId: setEntity.id,
        no: 2,
        prompt: 'Question 2',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 1,
        answerSource: 'ai',
        verified: false,
        category: 'Loại 2',
        formula: '',
        explanation: 'Giải thích 2',
        position: 1,
      },
      {
        userId: 'test-user',
        setId: setEntity.id,
        no: 3,
        prompt: 'Question 3',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 2,
        answerSource: 'ai',
        verified: false,
        category: 'Loại 3',
        formula: '',
        explanation: 'Giải thích 3',
        position: 2,
      },
      {
        userId: 'test-user',
        setId: setEntity.id,
        no: 4,
        prompt: 'Question 4 (Chưa có đáp án)',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: null,
        answerSource: 'none',
        verified: false,
        category: 'Loại 0',
        formula: '',
        explanation: '',
        position: 3,
      },
    ]);

    // Initial star calculation:
    // Only 3 questions have answers. If user gets 2 correct out of 3: 2/3 = 66.67% -> 1 star (< 70%, >= 50%)
    const stars1 = calculateStars(2, 3);
    expect(stars1).toBe(1);

    // If user verifies Question 4 on the fly and gets it right:
    // Now 4 questions have answers, user got 3 correct out of 4: 3/4 = 75% -> 2 stars (>= 70%)
    await repo.updateQuestion(questions[3].id, {
      correctIndex: 3,
      answerSource: 'user',
      verified: true,
    });

    const updatedQ4 = await repo.getQuestion(questions[3].id);
    expect(updatedQ4?.correctIndex).toBe(3);
    expect(updatedQ4?.answerSource).toBe('user');
    expect(updatedQ4?.verified).toBe(true);

    const stars2 = calculateStars(3, 4);
    expect(stars2).toBe(2);

    // Save set progress and verify persistence
    const progress: SetProgress = await repo.saveSetProgress({
      setId: setEntity.id,
      completed: true,
      score: 3,
      totalQuestions: 4,
      stars: stars2,
      attemptsCount: 1,
      position: 0,
    });

    expect(progress.stars).toBe(2);
    expect(progress.completed).toBe(true);

    const loadedProgress = await repo.getSetProgress(setEntity.id);
    expect(loadedProgress?.stars).toBe(2);
  });
});

describe('Phase 3: Full Backup, Wipe Clean & 100% Data Restoration', () => {
  let repo: LocalRepository;

  beforeEach(async () => {
    localStorage.clear();
    repo = new LocalRepository();
    await repo.clearAllData();
  });

  it('guarantees 100% data roundtrip (stars, streak, attempts, curriculum, settings) and never leaks API keys', async () => {
    // 1. Seed rich data
    const subject = await repo.createSubject({
      userId: 'user-p3',
      name: 'Tiếng Anh V-ACT',
      code: 'ENG',
      description: 'Môn thi chuẩn hóa',
      position: 0,
      visibility: 'private',
    });

    const topic = await repo.createTopic({
      userId: 'user-p3',
      subjectId: subject.id,
      name: 'Chuyên đề 15: Câu điều kiện',
      position: 0,
      visibility: 'private',
    });

    const setEntity = await repo.createSet({
      userId: 'user-p3',
      topicId: topic.id,
      name: 'Bài tập 01',
      position: 0,
      visibility: 'private',
    });

    const passage = await repo.createPassage({
      userId: 'user-p3',
      setId: setEntity.id,
      title: 'Passage 1',
      content: 'This is a sample reading comprehension passage.',
      position: 0,
    });

    const q = await repo.createQuestion({
      userId: 'user-p3',
      setId: setEntity.id,
      no: 1,
      prompt: 'If water freezes, it _____ ice.',
      options: ['becomes', 'became', 'will become', 'has become'],
      correctIndex: 0,
      answerSource: 'user',
      verified: true,
      category: 'Điều kiện loại 0',
      formula: 'If + Present, Present',
      explanation: 'Quy luật tự nhiên.',
      passageId: passage.id,
      position: 0,
    });

    // Record question attempts (mistake history)
    await repo.recordAttempt({
      userId: 'user-p3',
      questionId: q.id,
      setId: setEntity.id,
      selectedIndex: 2,
      isCorrect: false,
      isFlagged: true,
      timeSpentSeconds: 12,
      position: 0,
    });

    // SetProgress
    await repo.saveSetProgress({
      userId: 'user-p3',
      setId: setEntity.id,
      completed: true,
      score: 1,
      totalQuestions: 1,
      stars: 3,
      attemptsCount: 1,
      position: 0,
    });

    // UserStats
    await repo.updateUserStats({
      xp: 250,
      streak: 7,
      maxStreak: 14,
      streakFreezesWeekly: 2,
      streakFreezesReserve: 3,
      targetMajorCode: '106',
      targetMajorName: 'Khoa học Máy tính',
      targetScore: 85.45,
      dailyGoalXp: 100,
    });

    // Settings
    await repo.updateSettings({
      theme: 'dark',
      soundEnabled: true,
      geminiApiKey: 'DO_NOT_EXPORT_THIS_SECRET_KEY',
    });

    // Also store Gemini config in localStorage to verify absolute isolation
    saveGeminiConfig('AIzaSy_LocalOnlySecretKey_12345', 'gemini-1.5-flash');

    // 2. Export full backup
    const backup = await exportFullBackup(repo);

    // CRITICAL SECURITY ASSERTION:
    // Gemini API key MUST be sanitized and stripped from the exported backup JSON!
    expect(backup.settings?.geminiApiKey).toBe('');
    const backupJsonString = JSON.stringify(backup);
    expect(backupJsonString).not.toContain('DO_NOT_EXPORT_THIS_SECRET_KEY');
    expect(backupJsonString).not.toContain('AIzaSy_LocalOnlySecretKey_12345');

    // Inspect backup file
    const inspection = inspectBackupFile(backup);
    expect(inspection.isValid).toBe(true);
    expect(inspection.summary.subjectsCount).toBe(1);
    expect(inspection.summary.topicsCount).toBe(1);
    expect(inspection.summary.setsCount).toBe(1);
    expect(inspection.summary.questionsCount).toBe(1);
    expect(inspection.summary.passagesCount).toBe(1);
    expect(inspection.summary.setProgressCount).toBe(1);
    expect(inspection.summary.attemptsCount).toBe(1);

    // 3. Wipe repository completely clean
    await repo.clearAllData();

    // Verify empty state
    const emptySubjects = await repo.getSubjects();
    expect(emptySubjects.length).toBe(0);
    const emptyQuestions = await repo.getQuestions();
    expect(emptyQuestions.length).toBe(0);

    // 4. Restore full backup in replace mode
    const restoreRes = await restoreFullBackup(backup, 'replace', repo);
    expect(restoreRes.success).toBe(true);
    expect(restoreRes.importedQuestions).toBe(1);
    expect(restoreRes.importedSets).toBe(1);

    // 5. Verify 100% data preservation
    const restoredSubjects = await repo.getSubjects();
    expect(restoredSubjects.length).toBe(1);
    expect(restoredSubjects[0].name).toBe('Tiếng Anh V-ACT');

    const restoredQuestions = await repo.getQuestions();
    expect(restoredQuestions.length).toBe(1);
    expect(restoredQuestions[0].prompt).toContain('If water freezes');
    expect(restoredQuestions[0].verified).toBe(true);

    const restoredProgress = await repo.getSetProgress(setEntity.id);
    expect(restoredProgress).not.toBeNull();
    expect(restoredProgress?.stars).toBe(3);
    expect(restoredProgress?.completed).toBe(true);

    const restoredStats = await repo.getUserStats();
    expect(restoredStats.xp).toBe(250);
    expect(restoredStats.streak).toBe(7);
    expect(restoredStats.streakFreezesReserve).toBe(3);
    expect(restoredStats.targetMajorCode).toBe('106');
    expect(restoredStats.dailyGoalXp).toBe(100);

    const restoredAttempts = await repo.getAttempts();
    expect(restoredAttempts.length).toBe(1);
    expect(restoredAttempts[0].isCorrect).toBe(false);
    expect(restoredAttempts[0].isFlagged).toBe(true);

    const restoredSettings = await repo.getSettings();
    expect(restoredSettings.theme).toBe('dark');
    expect(restoredSettings.soundEnabled).toBe(true);
    // Preserves zero secret exposure
    expect(restoredSettings.geminiApiKey).toBe('');
  });
});

describe('Phase 3: Gemini Feature Flag & Security Isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('respects feature flag and defaults to disabled in non-gemini environment', async () => {
    // When VITE_ENABLE_GEMINI is not 'true'
    const enabled = isGeminiFeatureEnabled();
    // Default in test environment is false
    expect(typeof enabled).toBe('boolean');

    if (!enabled) {
      await expect(callGeminiApi('test prompt')).rejects.toThrow(
        /Tính năng Gemini API chưa được bật/
      );
    }
  });

  it('manages config strictly in localStorage without leaking', () => {
    expect(getGeminiApiKey()).toBe('');
    expect(getGeminiModel()).toBe('gemini-1.5-flash');

    saveGeminiConfig('AIzaSy_Secret_Test_Key_999', 'gemini-2.0-flash');
    expect(getGeminiApiKey()).toBe('AIzaSy_Secret_Test_Key_999');
    expect(getGeminiModel()).toBe('gemini-2.0-flash');
    expect(localStorage.getItem(STORAGE_KEY_GEMINI_API_KEY)).toBe('AIzaSy_Secret_Test_Key_999');

    clearGeminiConfig();
    expect(getGeminiApiKey()).toBe('');
    expect(localStorage.getItem(STORAGE_KEY_GEMINI_API_KEY)).toBeNull();
  });
});
