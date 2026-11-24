import { describe, it, expect } from 'vitest';
import { generateScorecardText, formatDuration } from '../lib/scorecard';
import { calculateStars, countScoredQuestions } from '../lib/game/stars';
import { Question } from '../data/types';
import { parseQuickAnswers, applyQuickAnswers } from '../features/import/quickAnswerInput';
import { bboxToCropArea, cropAreaToBbox, clamp, saveFigure } from '../features/import/figureCrop';

describe('Stream B - Practice & Completion Logic', () => {
  it('formats duration correctly in MM:SS', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(765)).toBe('12:45');
  });

  it('calculates stars excluding null correctIndex', () => {
    const questions: Partial<Question>[] = [
      { id: '1', correctIndex: 0 },
      { id: '2', correctIndex: 1 },
      { id: '3', correctIndex: null }, // unverified/no answer
      { id: '4', correctIndex: 2 },
    ];

    const scoredCount = countScoredQuestions(questions as Question[]);
    expect(scoredCount).toBe(3);

    // 3 out of 3 = 100% -> 3 stars
    expect(calculateStars(3, scoredCount)).toBe(3);
    // 2 out of 3 = 66.6% -> 1 star (>=50% and <70%)
    expect(calculateStars(2, scoredCount)).toBe(1);
    // 1 out of 3 = 33.3% -> 0 stars
    expect(calculateStars(1, scoredCount)).toBe(0);
  });

  it('generates valid scorecard txt with correct sections and details', () => {
    const sampleQuestions: Question[] = [
      {
        id: 'q1',
        userId: 'u1',
        setId: 'set1',
        no: 1,
        prompt: 'If she had studied harder, she ______ passed.',
        options: ['would have', 'will have', 'had', 'has'],
        correctIndex: 0,
        answerSource: 'document',
        verified: true,
        category: 'Câu điều kiện loại 3',
        formula: 'If + had + V3, would have + V3',
        explanation: 'Past unreal conditional',
        position: 1,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'q2',
        userId: 'u1',
        setId: 'set1',
        no: 2,
        prompt: 'If water reaches 100 degrees, it ______.',
        options: ['boil', 'boils', 'boiled', 'will boil'],
        correctIndex: 1,
        answerSource: 'document',
        verified: true,
        category: 'Câu điều kiện loại 0',
        formula: 'If + V(s/es), V(s/es)',
        explanation: 'Zero conditional for facts',
        position: 2,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    const scorecardText = generateScorecardText({
      setName: 'Bài tập áp dụng',
      topicName: 'Câu điều kiện',
      subjectName: 'Tiếng Anh',
      timeSpentSeconds: 125,
      totalQuestions: 2,
      scoredQuestions: 2,
      correctCount: 2,
      stars: 3,
      earnedXp: 50,
      questions: sampleQuestions,
      answers: { q1: 0, q2: 1 },
      flags: { q1: false, q2: true },
    });

    expect(scorecardText).toContain('V-ACT HUB - PHIẾU KẾT QUẢ BÀI LUYỆN TẬP');
    expect(scorecardText).toContain('Bộ đề:            Bài tập áp dụng');
    expect(scorecardText).toContain('Kết quả đạt được: 2 / 2 câu đúng (100%)');
    expect(scorecardText).toContain('Đánh giá sao:     ★★★ (3/3 Sao)');
    expect(scorecardText).toContain('Câu 1 / 2 [ĐÚNG]');
    expect(scorecardText).toContain('Câu 2 / 2 [ĐÚNG] [GẮN CỜ ⚑]');
    expect(scorecardText).toContain('Công thức: If + had + V3, would have + V3');
    expect(scorecardText).toContain('CHÚC BẠN ÔN LUYỆN TỐT & ĐỖ NGUYỆN VỌNG BÁCH KHOA 2026!');
  });

  describe('Stream B - Quick Answer & Figure Cropping Logic', () => {
    it('parses diverse quick answer formats into standardized index mappings', () => {
      // 1) Space separated: '1A 2C 3B'
      const f1 = parseQuickAnswers('1A 2C 3B 4D');
      expect(f1.detectedFormat).toBe('numbered');
      expect(f1.answers).toEqual({ 1: 0, 2: 2, 3: 1, 4: 3 });

      // 2) Hyphen and dot separated: '1-A, 2-C, 3.B, 4. D'
      const f2 = parseQuickAnswers('1-A, 2-C, 3.B, 4. D');
      expect(f2.detectedFormat).toBe('numbered');
      expect(f2.answers).toEqual({ 1: 0, 2: 2, 3: 1, 4: 3 });

      // 3) Multi-line format (one question per line)
      const f3 = parseQuickAnswers('A\nC\nB\nD');
      expect(f3.detectedFormat).toBe('sequential_letters');
      expect(f3.answers).toEqual({ 1: 0, 2: 2, 3: 1, 4: 3 });

      // 4) Contiguous string 'ABCDACBD'
      const f4 = parseQuickAnswers('ABCDACBD');
      expect(f4.detectedFormat).toBe('sequential_letters');
      expect(f4.answers[1]).toBe(0);
      expect(f4.answers[2]).toBe(1);
      expect(f4.answers[3]).toBe(2);
      expect(f4.answers[4]).toBe(3);
      expect(f4.answers[8]).toBe(3);
    });

    it('overrides AI answers with user answers, sets verified: true, and generates accurate diffs', () => {
      const questions = [
        { no: 1, prompt: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 1, answerSource: 'ai', verified: false },
        { no: 2, prompt: 'Q2', options: ['A', 'B', 'C', 'D'], correctIndex: 2, answerSource: 'ai', verified: false },
        { no: 3, prompt: 'Q3', options: ['A', 'B', 'C', 'D'], correctIndex: null, answerSource: 'none', verified: false },
      ];

      // User says 1 is A (conflict with AI 1=B), 2 is C (matches AI 2=C), 3 is D (fills missing)
      const parsed = parseQuickAnswers('1A 2C 3D');
      const result = applyQuickAnswers(questions, parsed.answers);

      expect(result.matchedCount).toBe(3);
      expect(result.conflictCount).toBe(1);

      // Check question 1
      expect(result.updatedQuestions[0].correctIndex).toBe(0);
      expect(result.updatedQuestions[0].answerSource).toBe('user');
      expect(result.updatedQuestions[0].verified).toBe(true);

      // Check conflict diff item
      const diff1 = result.diffs.find((d) => d.questionNo === 1);
      expect(diff1?.isConflict).toBe(true);
      expect(diff1?.aiAnswer).toBe('B');
      expect(diff1?.userAnswer).toBe('A');

      // Check matching diff item
      const diff2 = result.diffs.find((d) => d.questionNo === 2);
      expect(diff2?.isConflict).toBe(false);
      expect(diff2?.aiAnswer).toBe('C');
      expect(diff2?.userAnswer).toBe('C');
    });

    it('correctly handles bounding box calculations and clamp utilities', () => {
      expect(clamp(1.5, 0, 1)).toBe(1);
      expect(clamp(-0.2, 0, 1)).toBe(0);
      expect(clamp(0.45, 0, 1)).toBe(0.45);

      const area = bboxToCropArea([0.1, 0.2, 0.7, 0.8]);
      expect(area.x).toBeCloseTo(0.1);
      expect(area.y).toBeCloseTo(0.2);
      expect(area.width).toBeCloseTo(0.6);
      expect(area.height).toBeCloseTo(0.6);

      const bbox = cropAreaToBbox(area);
      expect(bbox[0]).toBeCloseTo(0.1);
      expect(bbox[1]).toBeCloseTo(0.2);
      expect(bbox[2]).toBeCloseTo(0.7);
      expect(bbox[3]).toBeCloseTo(0.8);
    });

    it('saves figures in local/offline mode returning data URLs or URLs', async () => {
      const sampleDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const savedUrl = await saveFigure(sampleDataUrl, { userId: 'local-user' });
      expect(savedUrl).toBe(sampleDataUrl);

      const httpUrl = 'https://example.com/figure.png';
      const savedHttp = await saveFigure(httpUrl);
      expect(savedHttp).toBe(httpUrl);
    });
  });
});
