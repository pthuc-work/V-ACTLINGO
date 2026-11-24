// ==============================================================================
// V-ACT HUB: Quick Answer String Parser & AI Diff Matcher
// ==============================================================================

export type AnswerLetter = 'A' | 'B' | 'C' | 'D';

export interface ParsedAnswerItem {
  questionNo: number;
  letter: AnswerLetter;
  index: number; // 0 for A, 1 for B, 2 for C, 3 for D
}

export interface ParseQuickAnswerResult {
  answers: Record<number, number>; // questionNo -> 0..3
  items: ParsedAnswerItem[];
  detectedFormat: 'numbered' | 'sequential_letters' | 'empty';
  warnings: string[];
}

export interface QuickAnswerDiff {
  questionNo: number;
  aiAnswer: string | null; // 'A' | 'B' | 'C' | 'D' | null
  userAnswer: AnswerLetter;
  aiIndex: number | null;
  userIndex: number;
  isConflict: boolean;
}

export interface QuickAnswerApplyResult<T> {
  updatedQuestions: T[];
  diffs: QuickAnswerDiff[];
  matchedCount: number;
  conflictCount: number;
  missingQuestions: number[]; // question numbers that user did not provide answer for
  extraAnswers: number[]; // question numbers user provided that don't exist in questions
  warnings: string[];
}

export const LETTER_TO_INDEX: Record<string, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
};

export const INDEX_TO_LETTER: Record<number, AnswerLetter> = {
  0: 'A',
  1: 'B',
  2: 'C',
  3: 'D',
};

export function letterToIndex(letter: string): number | null {
  const upper = letter.trim().toUpperCase();
  if (upper in LETTER_TO_INDEX) {
    return LETTER_TO_INDEX[upper];
  }
  return null;
}

export function indexToLetter(index: number | null | undefined): AnswerLetter | null {
  if (index === null || index === undefined || index < 0 || index > 3) {
    return null;
  }
  return INDEX_TO_LETTER[index] || null;
}

/**
 * Parses quick answer string in multiple formats:
 * 1) Numbered pairs: '1A 2C 3B', '1-A, 2-C', '1.A', 'Câu 1: A', '1: A'
 * 2) Multi-line numbered or letter-per-line:
 *    1. A
 *    2. B
 *    or
 *    A
 *    B
 *    C
 * 3) Contiguous letter string: 'ABCDACBD...' or 'A B C D A C B D'
 */
export function parseQuickAnswers(rawInput: string): ParseQuickAnswerResult {
  const input = rawInput.trim();
  if (!input) {
    return {
      answers: {},
      items: [],
      detectedFormat: 'empty',
      warnings: ['Chuỗi đáp án trống.'],
    };
  }

  const warnings: string[] = [];
  const answers: Record<number, number> = {};
  const items: ParsedAnswerItem[] = [];

  // Regex pattern for numbered answers:
  // e.g. "1A", "1.A", "1. A", "1-A", "1 - A", "1: A", "1) A", "Câu 1: A", "Cau 1 A"
  const numberedPattern = /(?:câu|cau)?\s*(\d+)[\s.:\-_–=)]*\s*([A-Da-d])\b/gi;
  const matches = [...input.matchAll(numberedPattern)];

  if (matches.length > 0) {
    // Numbered format detected
    for (const match of matches) {
      const qNo = parseInt(match[1], 10);
      const letter = match[2].toUpperCase() as AnswerLetter;
      const idx = LETTER_TO_INDEX[letter];

      if (answers[qNo] !== undefined && answers[qNo] !== idx) {
        warnings.push(`Câu ${qNo} xuất hiện nhiều lần với đáp án khác nhau (${INDEX_TO_LETTER[answers[qNo]]} và ${letter}), đã ghi đè bằng ${letter}.`);
      }
      answers[qNo] = idx;
    }

    // Sort items by question number
    const sortedNos = Object.keys(answers)
      .map(Number)
      .sort((a, b) => a - b);

    for (const qNo of sortedNos) {
      items.push({
        questionNo: qNo,
        letter: INDEX_TO_LETTER[answers[qNo]],
        index: answers[qNo],
      });
    }

    return {
      answers,
      items,
      detectedFormat: 'numbered',
      warnings,
    };
  }

  // Not explicit numbered pairs. Check if input is lines of letters or contiguous letters.
  // Clean characters except letters A-D, a-d, and whitespace/newlines
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // If every line is a single letter A-D or letter followed by punctuation
  const singleLetterLines = lines.every((line) => /^[A-Da-d][.\s)]*$/.test(line));

  if (lines.length > 1 && singleLetterLines) {
    lines.forEach((line, idx) => {
      const qNo = idx + 1;
      const char = line.charAt(0).toUpperCase() as AnswerLetter;
      const ansIdx = LETTER_TO_INDEX[char];
      answers[qNo] = ansIdx;
      items.push({
        questionNo: qNo,
        letter: char,
        index: ansIdx,
      });
    });

    return {
      answers,
      items,
      detectedFormat: 'sequential_letters',
      warnings,
    };
  }

  // Check contiguous letters: e.g. "ABCDACBD" or "A B C D" or "A, B, C, D"
  const cleanTokens = input
    .replace(/[^A-Da-d]/g, '')
    .toUpperCase();

  if (cleanTokens.length > 0) {
    for (let i = 0; i < cleanTokens.length; i++) {
      const qNo = i + 1;
      const letter = cleanTokens[i] as AnswerLetter;
      const idx = LETTER_TO_INDEX[letter];
      answers[qNo] = idx;
      items.push({
        questionNo: qNo,
        letter,
        index: idx,
      });
    }

    return {
      answers,
      items,
      detectedFormat: 'sequential_letters',
      warnings,
    };
  }

  return {
    answers: {},
    items: [],
    detectedFormat: 'empty',
    warnings: ['Không tìm thấy ký tự đáp án A, B, C, D hợp lệ trong chuỗi.'],
  };
}

/**
 * Compares parsed user answers against questions (from AI or document),
 * overrides correctIndex, verified: true, answerSource: 'user',
 * and produces difference reports and warning flags.
 */
export function applyQuickAnswers<
  T extends {
    no?: number;
    correctIndex?: number | null;
    answerSource?: any;
    verified?: boolean;
    [key: string]: any;
  }
>(questions: T[], answers: Record<number, number>): QuickAnswerApplyResult<T> {
  const diffs: QuickAnswerDiff[] = [];
  const warnings: string[] = [];
  let matchedCount = 0;
  let conflictCount = 0;

  const validQuestionNos = new Set<number>();

  const updatedQuestions = questions.map((q, idx) => {
    const qNo = typeof q.no === 'number' && q.no > 0 ? q.no : idx + 1;
    validQuestionNos.add(qNo);

    if (answers[qNo] !== undefined) {
      const userIdx = answers[qNo];
      const userLetter = INDEX_TO_LETTER[userIdx];
      const aiIdx = q.correctIndex ?? null;
      const aiLetter = aiIdx !== null ? INDEX_TO_LETTER[aiIdx] : null;

      const isConflict = aiIdx !== null && aiIdx !== userIdx;
      if (isConflict) {
        conflictCount++;
      }
      matchedCount++;

      diffs.push({
        questionNo: qNo,
        aiAnswer: aiLetter,
        userAnswer: userLetter,
        aiIndex: aiIdx,
        userIndex: userIdx,
        isConflict,
      });

      return {
        ...q,
        no: qNo,
        correctIndex: userIdx,
        answerSource: 'user',
        verified: true,
      };
    }

    return {
      ...q,
      no: qNo,
    };
  });

  // Check missing questions
  const missingQuestions: number[] = [];
  questions.forEach((q, idx) => {
    const qNo = typeof q.no === 'number' && q.no > 0 ? q.no : idx + 1;
    if (answers[qNo] === undefined) {
      missingQuestions.push(qNo);
    }
  });

  // Check extra answers
  const extraAnswers: number[] = [];
  for (const qNoStr of Object.keys(answers)) {
    const qNo = Number(qNoStr);
    if (!validQuestionNos.has(qNo)) {
      extraAnswers.push(qNo);
    }
  }

  if (missingQuestions.length > 0) {
    warnings.push(`Có ${missingQuestions.length} câu hỏi chưa có đáp án người dùng (Câu: ${missingQuestions.join(', ')}).`);
  }
  if (extraAnswers.length > 0) {
    extraAnswers.sort((a, b) => a - b);
    warnings.push(`Có ${extraAnswers.length} đáp án thừa không khớp với câu hỏi nào (Câu: ${extraAnswers.join(', ')}).`);
  }
  if (conflictCount > 0) {
    warnings.push(`Phát hiện ${conflictCount} câu có đáp án người dùng khác với đáp án AI/tài liệu ban đầu.`);
  }

  return {
    updatedQuestions,
    diffs,
    matchedCount,
    conflictCount,
    missingQuestions,
    extraAnswers,
    warnings,
  };
}
