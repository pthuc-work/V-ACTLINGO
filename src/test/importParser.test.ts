import { describe, it, expect } from 'vitest';
import {
  validateSchemaV1,
  isImportSchemaV1,
  ImportSchemaV1,
} from '../features/import/schema';
import {
  buildImportPrompt,
  getSampleSchemaV1Json,
  DEFAULT_SUBJECTS,
} from '../features/import/promptBuilder';
import { parseAndRepair } from '../features/import/parseAndRepair';
import {
  mergeMultipartParts,
  parsePartString,
  MultipartTracker,
} from '../features/import/multipart';

describe('Stream A: AI Import Engine (Schema v1, PromptBuilder, parseAndRepair, Multipart)', () => {
  // ============================================================================
  // GROUP 1: PromptBuilder & Default Subjects
  // ============================================================================
  describe('1. PromptBuilder', () => {
    it('should generate Vietnamese prompt for English subject with Schema v1 specs', () => {
      const prompt = buildImportPrompt({
        subject: 'Tiếng Anh',
        topic: 'Chuyên đề 15: Câu điều kiện',
        set: 'Bài tập 01',
        chunkSize: 25,
      });

      expect(prompt).toContain('V-ACT HUB');
      expect(prompt).toContain('schemaVersion');
      expect(prompt).toContain('Tiếng Anh');
      expect(prompt).toContain('Chuyên đề 15: Câu điều kiện');
      expect(prompt).toContain('DUY NHẤT MỘT KHỐI JSON HỢP LỆ');
      expect(prompt).toContain('escape thành \\\\');
      expect(prompt).toContain('answerSource');
      expect(prompt).toContain('tối đa 25 câu');
      expect(prompt).toContain('part');
      expect(prompt).toContain('passages');
    });

    it('should generate tailored prompt for Vietnamese V-ACT subject', () => {
      const prompt = buildImportPrompt({
        subject: 'Tiếng Việt',
        topic: 'Đọc hiểu và Ngữ liệu',
      });

      expect(prompt).toContain('MÔN TIẾNG VIỆT (ĐGNL V-ACT)');
      expect(prompt).toContain('ngữ liệu văn học');
      expect(prompt).toContain('Biện pháp tu từ');
      expect(prompt).toContain('Phong cách ngôn ngữ');
    });

    it('should generate tailored prompt for Math, Physics, and Chemistry', () => {
      const mathPrompt = buildImportPrompt({ subject: 'Toán học' });
      expect(mathPrompt).toContain('KaTeX/LaTeX');
      expect(mathPrompt).toContain('figure');
      expect(mathPrompt).toContain('formula');

      const chemPrompt = buildImportPrompt({ subject: 'Hóa học' });
      expect(chemPrompt).toContain('mhchem');
      expect(chemPrompt).toContain('\\\\ce{');

      const physPrompt = buildImportPrompt({ subject: 'Vật lí' });
      expect(physPrompt).toContain('sơ đồ mạch điện');
    });

    it('should provide valid Schema v1 sample JSON embedding in prompt', () => {
      const sample = getSampleSchemaV1Json();
      expect(sample).toBeDefined();
      const parsed = JSON.parse(sample);
      const validation = validateSchemaV1(parsed);
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should list all default supported subjects', () => {
      expect(DEFAULT_SUBJECTS.length).toBeGreaterThanOrEqual(5);
      const codes = DEFAULT_SUBJECTS.map((s) => s.code);
      expect(codes).toContain('ENG');
      expect(codes).toContain('VIE');
      expect(codes).toContain('MATH');
    });
  });

  // ============================================================================
  // GROUP 2: Schema v1 Validator
  // ============================================================================
  describe('2. Schema v1 Validator', () => {
    const validData: ImportSchemaV1 = {
      schemaVersion: 1,
      subject: 'Tiếng Anh',
      topic: 'Chuyên đề 15',
      set: 'Bài tập 01',
      part: { index: 1, total: 2 },
      passages: [
        {
          id: 'p-1',
          title: 'Reading 1',
          content: 'This is the passage content.',
        },
      ],
      questions: [
        {
          no: 1,
          prompt: 'Choose the correct answer',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctIndex: 1,
          answerSource: 'document',
          category: 'Grammar',
          formula: '',
          explanation: 'B is right',
          passageId: 'p-1',
          figure: null,
        },
      ],
    };

    it('should validate a clean, compliant Schema v1 object', () => {
      const res = validateSchemaV1(validData);
      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(isImportSchemaV1(validData)).toBe(true);
    });

    it('should reject missing or non-object input', () => {
      expect(validateSchemaV1(null).isValid).toBe(false);
      expect(validateSchemaV1(undefined).isValid).toBe(false);
      expect(validateSchemaV1('string').isValid).toBe(false);
    });

    it('should reject invalid schemaVersion', () => {
      const invalid = { ...validData, schemaVersion: 2 };
      const res = validateSchemaV1(invalid);
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toContain('schemaVersion không được hỗ trợ');
    });

    it('should reject empty or missing subject/topic/set', () => {
      const invalid = { ...validData, subject: '', topic: '   ', set: '' };
      const res = validateSchemaV1(invalid);
      expect(res.isValid).toBe(false);
      expect(res.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('should reject questions with fewer or more than 4 options or empty option string', () => {
      const badOptions = {
        ...validData,
        questions: [
          {
            ...validData.questions[0],
            options: ['A', 'B', ''], // 3 options and one empty
          },
        ],
      };
      const res = validateSchemaV1(badOptions);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('cần đúng 4 phần tử'))).toBe(true);
      expect(res.errors.some((e) => e.includes('rỗng'))).toBe(true);
    });

    it('should reject invalid correctIndex (out of bounds or negative)', () => {
      const badIndex = {
        ...validData,
        questions: [
          {
            ...validData.questions[0],
            correctIndex: 4, // 0..3 only
          },
        ],
      };
      const res = validateSchemaV1(badIndex);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('correctIndex'))).toBe(true);
    });

    it('should allow correctIndex: null and validate answerSource', () => {
      const nullAnswer = {
        ...validData,
        questions: [
          {
            ...validData.questions[0],
            correctIndex: null,
            answerSource: 'none' as const,
          },
        ],
      };
      const res = validateSchemaV1(nullAnswer);
      expect(res.isValid).toBe(true);
    });

    it('should reject duplicate question numbers', () => {
      const dupNo = {
        ...validData,
        questions: [
          { ...validData.questions[0], no: 1 },
          { ...validData.questions[0], no: 1 },
        ],
      };
      const res = validateSchemaV1(dupNo);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('Trùng lặp số thứ tự câu hỏi'))).toBe(true);
    });

    it('should reject dangling passageId reference not present in passages', () => {
      const dangling = {
        ...validData,
        questions: [
          {
            ...validData.questions[0],
            passageId: 'non-existent-passage',
          },
        ],
      };
      const res = validateSchemaV1(dangling);
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('không tồn tại trong danh sách passages'))).toBe(true);
    });
  });

  // ============================================================================
  // GROUP 3: parseAndRepair Core Engine
  // ============================================================================
  describe('3. parseAndRepair Core Engine', () => {
    it('should strip markdown code block fences (```json ... ```) and leading/trailing chat text', () => {
      const input = `
Xin chào! Dưới đây là kết quả chuyển đổi số đề thi:
\`\`\`json
{
  "schemaVersion": 1,
  "subject": "Tiếng Anh",
  "topic": "Chuyên đề 15",
  "set": "Bài 1",
  "questions": [
    {
      "no": 1,
      "prompt": "Hello world",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "answerSource": "document",
      "category": "Basic"
    }
  ]
}
\`\`\`
Chúc bạn ôn luyện đạt điểm cao!
`;
      const res = parseAndRepair(input);
      expect(res.errors).toHaveLength(0);
      expect(res.data).not.toBeNull();
      expect(res.data?.questions[0].prompt).toBe('Hello world');
      expect(res.repairs.some((r) => r.includes('markdown code block'))).toBe(true);
    });

    it('should normalize smart curly quotes (“ ” ‘ ’) at JSON boundaries', () => {
      const input = `{
  “schemaVersion”: 1,
  “subject”: “Tiếng Anh”,
  “topic”: “Chuyên đề 15”,
  “set”: “Bài tập 01”,
  “questions”: [
    {
      “no”: 1,
      “prompt”: “She said ‘yes’ immediately.”,
      “options”: [“A”, “B”, “C”, “D”],
      “correctIndex”: 0,
      “answerSource”: “document”,
      “category”: “Grammar”
    }
  ]
}`;
      const res = parseAndRepair(input);
      expect(res.errors).toHaveLength(0);
      expect(res.data).not.toBeNull();
      expect(res.data?.subject).toBe('Tiếng Anh');
      expect(res.repairs.some((r) => r.includes('dấu nháy cong'))).toBe(true);
    });

    it('should remove trailing commas in arrays and objects', () => {
      const input = `{
  "schemaVersion": 1,
  "subject": "Tiếng Anh",
  "topic": "Chuyên đề 15",
  "set": "Bài 1",
  "questions": [
    {
      "no": 1,
      "prompt": "Test trailing comma",
      "options": [
        "Option 1",
        "Option 2",
        "Option 3",
        "Option 4",
      ],
      "correctIndex": 2,
      "answerSource": "document",
      "category": "Test",
    },
  ],
}`;
      const res = parseAndRepair(input);
      expect(res.errors).toHaveLength(0);
      expect(res.data).not.toBeNull();
      expect(res.data?.questions).toHaveLength(1);
      expect(res.repairs.some((r) => r.includes('dấu phẩy thừa'))).toBe(true);
    });

    it('should convert raw literal newlines inside JSON strings', () => {
      // String with actual literal newlines inside prompt
      const input = `{
  "schemaVersion": 1,
  "subject": "Tiếng Việt",
  "topic": "Văn học",
  "set": "Bài 1",
  "questions": [
    {
      "no": 1,
      "prompt": "Đọc đoạn thơ sau:
Sóng bắt đầu từ gió
Gió bắt đầu từ đâu?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "answerSource": "document",
      "category": "Đọc hiểu"
    }
  ]
}`;
      const res = parseAndRepair(input);
      expect(res.errors).toHaveLength(0);
      expect(res.data).not.toBeNull();
      expect(res.data?.questions[0].prompt).toContain('Sóng bắt đầu từ gió');
      expect(res.repairs.some((r) => r.includes('xuống dòng thô'))).toBe(true);
    });

    it('should escape single backslashes in LaTeX (\\frac, \\ce, \\alpha, \\times) without damaging \\n, \\", \\\\, \\u', () => {
      const input = `{
  "schemaVersion": 1,
  "subject": "Toán học",
  "topic": "Đạo hàm và Tích phân",
  "set": "Bài 1",
  "questions": [
    {
      "no": 1,
      "prompt": "Tính tích phân I = \\int_{0}^{1} \\frac{x}{\\sqrt{x^2 + 1}} dx với \\alpha = 2.\\nĐáp án có dạng a \\times b.",
      "options": [
        "A. $\\frac{1}{2}$",
        "B. $\\sqrt{2} - 1$",
        "C. $\\pm 2$",
        "D. $\\ce{H2SO4}$"
      ],
      "correctIndex": 1,
      "answerSource": "ai",
      "category": "Tích phân",
      "formula": "\\int u' u^n dx = \\frac{u^{n+1}}{n+1}",
      "explanation": "Dòng 1:\\nLời giải chi tiết."
    }
  ]
}`;
      const res = parseAndRepair(input);
      expect(res.errors).toHaveLength(0);
      expect(res.data).not.toBeNull();
      const q = res.data!.questions[0];

      // Check that LaTeX commands parsed properly into strings
      expect(q.prompt).toContain('\\int');
      expect(q.prompt).toContain('\\frac');
      expect(q.prompt).toContain('\\sqrt');
      expect(q.prompt).toContain('\\times');
      expect(q.prompt).toContain('\nĐáp án'); // \n preserved
      expect(q.options[0]).toContain('\\frac{1}{2}');
      expect(q.options[1]).toContain('\\sqrt{2}');
      expect(q.options[2]).toContain('\\pm 2');
      expect(q.options[3]).toContain('\\ce{H2SO4}');
      expect(q.explanation).toContain('Dòng 1:\nLời giải chi tiết.');

      expect(res.repairs.some((r) => r.includes('LaTeX'))).toBe(true);
    });

    it('should recover truncated JSON when cut off mid-question and emit required warning', () => {
      const truncatedInput = `{
  "schemaVersion": 1,
  "subject": "Tiếng Anh",
  "topic": "Chuyên đề 15",
  "set": "Bài 1",
  "questions": [
    {
      "no": 1,
      "prompt": "Question 1 prompt",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "answerSource": "document",
      "category": "Grammar"
    },
    {
      "no": 2,
      "prompt": "Question 2 prompt",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 1,
      "answerSource": "document",
      "category": "Grammar"
    },
    {
      "no": 3,
      "prompt": "Question 3 was abruptly cut off by token limit here and never finished
`;

      const res = parseAndRepair(truncatedInput);
      expect(res.errors).toHaveLength(0);
      expect(res.data).not.toBeNull();
      expect(res.data?.questions).toHaveLength(2);
      expect(res.data?.questions[0].no).toBe(1);
      expect(res.data?.questions[1].no).toBe(2);

      // Verify exact repair message and warning message
      expect(res.repairs.some((r) => r.includes('Phục hồi JSON bị cắt ngắn'))).toBe(true);
      expect(
        res.warnings.some((w) =>
          w.includes('Đã nhận đến câu số 2, hãy yêu cầu chatbot "tiếp từ câu 3"')
        )
      ).toBe(true);
    });

    it('should preserve Vietnamese diacritics and Unicode characters accurately', () => {
      const input = `{
  "schemaVersion": 1,
  "subject": "Tiếng Việt",
  "topic": "Chuyên đề: Biện pháp tu từ tiếng Việt ĐGNL",
  "set": "Đề thi thử số 03",
  "questions": [
    {
      "no": 1,
      "prompt": "Trong câu: “Bác đã đi rồi sao, Bác ơi! / Mùa thu đang đẹp, nắng xanh trời”, tác giả sử dụng biện pháp tu từ nào?",
      "options": [
        "Hoán dụ và nhân hóa",
        "Nói giảm nói tránh và cảm thán",
        "Ẩn dụ chuyển đổi cảm giác",
        "Điệp từ và so sánh tương phản"
      ],
      "correctIndex": 1,
      "answerSource": "document",
      "category": "Biện pháp tu từ",
      "formula": "",
      "explanation": "Tác giả Tố Hữu dùng từ 'đi' để nói giảm nói tránh cho cái chết của Bác."
    }
  ]
}`;
      const res = parseAndRepair(input);
      expect(res.errors).toHaveLength(0);
      expect(res.data).not.toBeNull();
      expect(res.data?.subject).toBe('Tiếng Việt');
      expect(res.data?.questions[0].prompt).toContain('Bác đã đi rồi sao');
      expect(res.data?.questions[0].options[1]).toBe('Nói giảm nói tránh và cảm thán');
    });

    it('should handle large payloads (50+ questions) with high performance', () => {
      const questions = Array.from({ length: 55 }, (_, i) => ({
        no: i + 1,
        prompt: `Question number ${i + 1} with some formula $\\frac{${i + 1}}{10}$`,
        options: [`Option A ${i}`, `Option B ${i}`, `Option C ${i}`, `Option D ${i}`],
        correctIndex: i % 4,
        answerSource: 'document',
        category: `Category ${i % 5}`,
      }));

      const rawJson = JSON.stringify({
        schemaVersion: 1,
        subject: 'Toán học',
        topic: 'Đề tổng hợp',
        set: '55 câu',
        questions,
      });

      const res = parseAndRepair(rawJson);
      expect(res.errors).toHaveLength(0);
      expect(res.data?.questions.length).toBe(55);
    });

    it('should return errors for completely unrepairable broken text', () => {
      const input = 'This is completely non-JSON plain text with no brackets whatsoever.';
      const res = parseAndRepair(input);
      expect(res.data).toBeNull();
      expect(res.errors.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // GROUP 4: Multipart Import Merger & Tracker
  // ============================================================================
  describe('4. Multipart Import Merger & Tracker', () => {
    const part1: ImportSchemaV1 = {
      schemaVersion: 1,
      subject: 'Tiếng Anh',
      topic: 'Chuyên đề 15',
      set: 'Bộ đề 01',
      part: { index: 1, total: 3 },
      passages: [
        {
          id: 'reading-1',
          title: 'Passage One',
          content: 'This is passage content for reading 1.',
        },
      ],
      questions: [
        {
          no: 1,
          prompt: 'Question 1',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 0,
          answerSource: 'document',
          category: 'Vocab',
          passageId: 'reading-1',
        },
        {
          no: 2,
          prompt: 'Question 2',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 1,
          answerSource: 'document',
          category: 'Grammar',
        },
      ],
    };

    const part2: ImportSchemaV1 = {
      schemaVersion: 1,
      subject: 'Tiếng Anh',
      topic: 'Chuyên đề 15',
      set: 'Bộ đề 01',
      part: { index: 2, total: 3 },
      passages: [
        {
          id: 'reading-1', // Duplicated identical passage
          title: 'Passage One',
          content: 'This is passage content for reading 1.',
        },
      ],
      questions: [
        {
          no: 1, // Chatbot restarted numbering from 1!
          prompt: 'Question 3 (was #1 in part 2)',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 2,
          answerSource: 'document',
          category: 'Reading',
          passageId: 'reading-1',
        },
      ],
    };

    const part3: ImportSchemaV1 = {
      schemaVersion: 1,
      subject: 'Tiếng Anh',
      topic: 'Chuyên đề 15',
      set: 'Bộ đề 01',
      part: { index: 3, total: 3 },
      questions: [
        {
          no: 4,
          prompt: 'Question 4',
          options: ['A', 'B', 'C', 'D'],
          correctIndex: 3,
          answerSource: 'document',
          category: 'Reading',
        },
      ],
    };

    it('should merge 3 parts in correct order and sequence question numbers', () => {
      const res = mergeMultipartParts([part1, part2, part3]);
      expect(res.errors).toHaveLength(0);
      expect(res.isComplete).toBe(true);
      expect(res.totalPartsExpected).toBe(3);
      expect(res.partsReceived).toEqual([1, 2, 3]);
      expect(res.missingParts).toHaveLength(0);

      // Verify merged data
      expect(res.merged?.questions).toHaveLength(4);
      // Continuous numbering check
      expect(res.merged?.questions[0].no).toBe(1);
      expect(res.merged?.questions[1].no).toBe(2);
      expect(res.merged?.questions[2].no).toBe(3);
      expect(res.merged?.questions[3].no).toBe(4);

      // Passages deduplicated: only 1 unique passage
      expect(res.merged?.passages).toHaveLength(1);
      expect(res.merged?.passages?.[0].id).toBe('reading-1');
    });

    it('should sort parts even when received out-of-order', () => {
      // Pass parts in reverse order: 3, 1, 2
      const res = mergeMultipartParts([part3, part1, part2]);
      expect(res.isComplete).toBe(true);
      expect(res.partsReceived).toEqual([1, 2, 3]);
      expect(res.merged?.questions[0].prompt).toBe('Question 1');
      expect(res.merged?.questions[3].prompt).toBe('Question 4');
    });

    it('should detect missing parts and report warning', () => {
      // Received part 1 and part 3 of 3 (missing part 2)
      const res = mergeMultipartParts([part1, part3]);
      expect(res.isComplete).toBe(false);
      expect(res.missingParts).toEqual([2]);
      expect(res.warnings.some((w) => w.includes('thiếu [Phần 2]'))).toBe(true);
    });

    it('should detect duplicate parts and keep the latest', () => {
      const updatedPart1: ImportSchemaV1 = {
        ...part1,
        questions: [
          {
            ...part1.questions[0],
            prompt: 'Updated Question 1',
          },
        ],
      };

      const res = mergeMultipartParts([part1, updatedPart1, part2, part3]);
      expect(res.duplicateParts).toContain(1);
      expect(res.warnings.some((w) => w.includes('bị nạp trùng lặp'))).toBe(true);
      // Latest version should be kept
      expect(res.merged?.questions[0].prompt).toBe('Updated Question 1');
    });

    it('should warn when subject, topic, or set names differ between parts', () => {
      const mismatchedPart2: ImportSchemaV1 = {
        ...part2,
        subject: 'Toán học', // Mismatched subject
        topic: 'Chuyên đề 16 Khác', // Mismatched topic
      };

      const res = mergeMultipartParts([part1, mismatchedPart2]);
      expect(res.warnings.some((w) => w.includes('lệch môn học'))).toBe(true);
      expect(res.warnings.some((w) => w.includes('lệch chuyên đề'))).toBe(true);
    });

    it('should deduplicate passages having different IDs but identical content', () => {
      const p1: ImportSchemaV1 = {
        ...part1,
        passages: [{ id: 'p-alpha', content: 'Same passage text' }],
        questions: [{ ...part1.questions[0], passageId: 'p-alpha' }],
      };
      const p2: ImportSchemaV1 = {
        ...part2,
        passages: [{ id: 'p-beta', content: 'Same passage text' }],
        questions: [{ ...part2.questions[0], passageId: 'p-beta' }],
      };

      const res = mergeMultipartParts([p1, p2]);
      expect(res.merged?.passages).toHaveLength(1);
      // Both questions should point to the same canonical passage id
      const qPassageIds = res.merged?.questions.map((q) => q.passageId);
      expect(qPassageIds?.[0]).toBe('p-alpha');
      expect(qPassageIds?.[1]).toBe('p-alpha');
    });

    it('should parse freeform part indicators with parsePartString', () => {
      expect(parsePartString('Phần 1/3')).toEqual({ index: 1, total: 3 });
      expect(parsePartString('Phần 2 trên 4')).toEqual({ index: 2, total: 4 });
      expect(parsePartString('Part 3 of 5')).toEqual({ index: 3, total: 5 });
      expect(parsePartString('4/10')).toEqual({ index: 4, total: 10 });
      expect(parsePartString('Không có số')).toBeNull();
    });

    it('should track sequential parts via MultipartTracker', () => {
      const tracker = new MultipartTracker();
      expect(tracker.getSummary()).toBe('Chưa nhận được phần nào');

      tracker.addPart(part1);
      expect(tracker.getSummary()).toContain('Đã nhận 1/3 phần (Chưa hoàn tất)');

      tracker.addPart(part2);
      expect(tracker.getSummary()).toContain('Đã nhận 2/3 phần');

      tracker.addPart(part3);
      expect(tracker.getSummary()).toContain('Đã nhận 3/3 phần (Đầy đủ)');

      tracker.reset();
      expect(tracker.getParts()).toHaveLength(0);
    });
  });
});
