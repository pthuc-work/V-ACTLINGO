import { describe, it, expect } from 'vitest';
import {
  parseQuickAnswers,
  applyQuickAnswers,
  letterToIndex,
  indexToLetter,
} from '../features/import/quickAnswerInput';

describe('quickAnswerInput Module', () => {
  it('converts letter to index and vice versa', () => {
    expect(letterToIndex('A')).toBe(0);
    expect(letterToIndex('b')).toBe(1);
    expect(letterToIndex('C')).toBe(2);
    expect(letterToIndex('d')).toBe(3);
    expect(letterToIndex('E')).toBeNull();

    expect(indexToLetter(0)).toBe('A');
    expect(indexToLetter(1)).toBe('B');
    expect(indexToLetter(2)).toBe('C');
    expect(indexToLetter(3)).toBe('D');
    expect(indexToLetter(4)).toBeNull();
    expect(indexToLetter(null)).toBeNull();
  });

  it('parses numbered format "1A 2C 3B"', () => {
    const res = parseQuickAnswers('1A 2C 3B 4D');
    expect(res.detectedFormat).toBe('numbered');
    expect(res.answers).toEqual({ 1: 0, 2: 2, 3: 1, 4: 3 });
    expect(res.items.length).toBe(4);
    expect(res.items[0]).toEqual({ questionNo: 1, letter: 'A', index: 0 });
    expect(res.items[1]).toEqual({ questionNo: 2, letter: 'C', index: 2 });
  });

  it('parses separated numbered format "1-A, 2-C, 3.B, Câu 4: D"', () => {
    const res = parseQuickAnswers('1-A, 2-C, 3.B, Câu 4: D');
    expect(res.detectedFormat).toBe('numbered');
    expect(res.answers).toEqual({ 1: 0, 2: 2, 3: 1, 4: 3 });
  });

  it('parses multi-line single letter format', () => {
    const raw = `A\nC\nB\nD\nA`;
    const res = parseQuickAnswers(raw);
    expect(res.detectedFormat).toBe('sequential_letters');
    expect(res.answers).toEqual({ 1: 0, 2: 2, 3: 1, 4: 3, 5: 0 });
  });

  it('parses contiguous letter string "ABCDACBD"', () => {
    const res = parseQuickAnswers('ABCDACBD');
    expect(res.detectedFormat).toBe('sequential_letters');
    expect(res.items.map((i) => i.letter).join('')).toBe('ABCDACBD');
    expect(res.answers[1]).toBe(0); // A
    expect(res.answers[2]).toBe(1); // B
    expect(res.answers[3]).toBe(2); // C
    expect(res.answers[4]).toBe(3); // D
    expect(res.answers[8]).toBe(3); // D
  });

  it('applies user answers and detects conflicts with AI answers', () => {
    const initialQuestions = [
      { no: 1, prompt: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 1, answerSource: 'ai', verified: false },
      { no: 2, prompt: 'Q2', options: ['A', 'B', 'C', 'D'], correctIndex: 2, answerSource: 'ai', verified: false },
      { no: 3, prompt: 'Q3', options: ['A', 'B', 'C', 'D'], correctIndex: null, answerSource: 'none', verified: false },
    ];

    // User gives: 1A (differs from AI: B), 2C (matches AI: C), 3D (fills missing), 4A (extra)
    const parsed = parseQuickAnswers('1A 2C 3D 4A');
    const result = applyQuickAnswers(initialQuestions, parsed.answers);

    expect(result.matchedCount).toBe(3);
    expect(result.conflictCount).toBe(1); // Q1: user A vs AI B
    expect(result.extraAnswers).toEqual([4]); // Q4 does not exist in initialQuestions
    expect(result.missingQuestions).toEqual([]);

    // Check updated questions
    expect(result.updatedQuestions[0].correctIndex).toBe(0); // A
    expect(result.updatedQuestions[0].answerSource).toBe('user');
    expect(result.updatedQuestions[0].verified).toBe(true);

    expect(result.updatedQuestions[1].correctIndex).toBe(2); // C
    expect(result.updatedQuestions[1].answerSource).toBe('user');
    expect(result.updatedQuestions[1].verified).toBe(true);

    expect(result.updatedQuestions[2].correctIndex).toBe(3); // D
    expect(result.updatedQuestions[2].answerSource).toBe('user');
    expect(result.updatedQuestions[2].verified).toBe(true);

    // Check diff details
    const diffQ1 = result.diffs.find((d) => d.questionNo === 1);
    expect(diffQ1).toBeDefined();
    expect(diffQ1?.isConflict).toBe(true);
    expect(diffQ1?.aiAnswer).toBe('B');
    expect(diffQ1?.userAnswer).toBe('A');

    const diffQ2 = result.diffs.find((d) => d.questionNo === 2);
    expect(diffQ2?.isConflict).toBe(false);
    expect(diffQ2?.aiAnswer).toBe('C');
    expect(diffQ2?.userAnswer).toBe('C');

    const diffQ3 = result.diffs.find((d) => d.questionNo === 3);
    expect(diffQ3?.isConflict).toBe(false);
    expect(diffQ3?.aiAnswer).toBeNull();
    expect(diffQ3?.userAnswer).toBe('D');
  });

  it('reports missing questions when user input has gaps', () => {
    const questions = [
      { no: 1, prompt: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: null },
      { no: 2, prompt: 'Q2', options: ['A', 'B', 'C', 'D'], correctIndex: null },
      { no: 3, prompt: 'Q3', options: ['A', 'B', 'C', 'D'], correctIndex: null },
    ];

    const parsed = parseQuickAnswers('1A 3C');
    const result = applyQuickAnswers(questions, parsed.answers);

    expect(result.missingQuestions).toEqual([2]);
    expect(result.warnings.some((w) => w.includes('chưa có đáp án'))).toBe(true);
  });
});
