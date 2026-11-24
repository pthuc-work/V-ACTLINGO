// ==============================================================================
// V-ACT HUB: Schema v1 Definitions & Validator for AI Import
// ==============================================================================

export type AnswerSource = 'document' | 'ai' | 'none' | 'user';

export interface ImportFigureV1 {
  page?: number; // 1-based page number in document (optional if url provided)
  bbox?: [number, number, number, number]; // [x0, y0, x1, y1] normalized to 0.0 - 1.0
  url?: string;
  caption?: string;
}

export interface ImportPassageV1 {
  id: string; // Unique passage identifier (e.g. "passage-1")
  title?: string;
  content: string;
}

export interface ImportPartMeta {
  index: number; // 1-based part index (e.g. 1)
  total: number; // Total parts (e.g. 3)
}

export interface ImportQuestionV1 {
  no: number; // Question number from document (1, 2, ...)
  prompt: string; // Question statement
  options: string[]; // Exactly 4 options [A, B, C, D]
  correctIndex: number | null; // 0 (A), 1 (B), 2 (C), 3 (D), or null if unknown
  answerSource: AnswerSource; // 'document' | 'ai' | 'none' | 'user'
  category: string; // e.g. "Ngữ pháp", "Từ vựng", "Đọc hiểu", "Hàm số"
  formula?: string; // Key rule or KaTeX formula (can be empty string)
  explanation?: string; // Concise explanation
  passageId?: string | null; // Reference to ImportPassageV1.id or null
  figure?: ImportFigureV1 | null; // Figure reference or null
  verified?: boolean; // Whether the answer has been verified by user
}

export interface ImportSchemaV1 {
  schemaVersion: 1;
  subject: string; // e.g. "Tiếng Anh", "Tiếng Việt"
  topic: string; // e.g. "Chuyên đề 15: Câu điều kiện"
  set: string; // e.g. "Bài tập áp dụng"
  part?: ImportPartMeta; // Optional multipart metadata
  passages?: ImportPassageV1[]; // Shared reading comprehension passages
  questions: ImportQuestionV1[]; // List of questions
}

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates whether an arbitrary data object conforms strictly to Schema v1.
 * Pure TypeScript validator with no external dependencies.
 */
export function validateSchemaV1(data: unknown): SchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: ['Dữ liệu không phải là một đối tượng JSON hợp lệ'],
      warnings: [],
    };
  }

  const obj = data as Record<string, unknown>;

  // 1. schemaVersion
  if (obj.schemaVersion !== 1) {
    if (obj.schemaVersion === undefined) {
      errors.push('Thiếu trường bắt buộc "schemaVersion": 1');
    } else {
      errors.push(`Phiên bản schemaVersion không được hỗ trợ (cần 1, nhận được ${String(obj.schemaVersion)})`);
    }
  }

  // 2. subject, topic, set
  if (typeof obj.subject !== 'string' || !obj.subject.trim()) {
    errors.push('Trường "subject" (Môn học) là bắt buộc và không được để trống');
  }
  if (typeof obj.topic !== 'string' || !obj.topic.trim()) {
    errors.push('Trường "topic" (Chuyên đề) là bắt buộc và không được để trống');
  }
  if (typeof obj.set !== 'string' || !obj.set.trim()) {
    errors.push('Trường "set" (Bộ đề/Bài học) là bắt buộc và không được để trống');
  }

  // 3. part (optional)
  if (obj.part !== undefined && obj.part !== null) {
    if (typeof obj.part !== 'object') {
      errors.push('Trường "part" phải là một đối tượng chứa { index, total }');
    } else {
      const part = obj.part as Record<string, unknown>;
      const idx = Number(part.index);
      const tot = Number(part.total);
      if (!Number.isInteger(idx) || idx < 1) {
        errors.push('"part.index" phải là số nguyên dương >= 1');
      }
      if (!Number.isInteger(tot) || tot < 1) {
        errors.push('"part.total" phải là số nguyên dương >= 1');
      }
      if (Number.isInteger(idx) && Number.isInteger(tot) && idx > tot) {
        errors.push(`"part.index" (${idx}) không thể lớn hơn "part.total" (${tot})`);
      }
    }
  }

  // 4. passages (optional)
  const passageIds = new Set<string>();
  if (obj.passages !== undefined && obj.passages !== null) {
    if (!Array.isArray(obj.passages)) {
      errors.push('Trường "passages" phải là một mảng đối tượng');
    } else {
      obj.passages.forEach((p: unknown, pIdx: number) => {
        if (!p || typeof p !== 'object') {
          errors.push(`Passage tại vị trí ${pIdx} không hợp lệ`);
          return;
        }
        const passage = p as Record<string, unknown>;
        if (typeof passage.id !== 'string' || !passage.id.trim()) {
          errors.push(`Passage #${pIdx + 1} thiếu trường "id" định danh`);
        } else {
          const id = passage.id.trim();
          if (passageIds.has(id)) {
            errors.push(`Trùng lặp passage id "${id}" trong danh sách passages`);
          }
          passageIds.add(id);
        }

        if (typeof passage.content !== 'string' || !passage.content.trim()) {
          errors.push(`Passage #${pIdx + 1} ("${String(passage.id || '')}") có nội dung "content" rỗng`);
        }
      });
    }
  }

  // 5. questions (mandatory array)
  if (!Array.isArray(obj.questions)) {
    errors.push('Trường "questions" phải là một mảng các câu hỏi');
    return { isValid: errors.length === 0, errors, warnings };
  }

  if (obj.questions.length === 0) {
    errors.push('Danh sách "questions" không được rỗng (cần ít nhất 1 câu hỏi)');
  }

  const seenQuestionNos = new Set<number>();

  obj.questions.forEach((q: unknown, qIdx: number) => {
    if (!q || typeof q !== 'object') {
      errors.push(`Câu hỏi tại vị trí ${qIdx} không hợp lệ`);
      return;
    }
    const qObj = q as Record<string, unknown>;

    // no
    const qNo = typeof qObj.no === 'number' ? qObj.no : parseInt(String(qObj.no), 10);
    if (isNaN(qNo) || qNo < 1) {
      errors.push(`Câu hỏi #${qIdx + 1} có số thứ tự "no" không hợp lệ (cần số >= 1)`);
    } else {
      if (seenQuestionNos.has(qNo)) {
        errors.push(`Trùng lặp số thứ tự câu hỏi: câu số ${qNo} xuất hiện nhiều hơn 1 lần`);
      }
      seenQuestionNos.add(qNo);
    }

    const questionLabel = `Câu ${isNaN(qNo) ? qIdx + 1 : qNo}`;

    // prompt
    if (typeof qObj.prompt !== 'string' || !qObj.prompt.trim()) {
      errors.push(`${questionLabel}: Đề bài "prompt" không được để trống`);
    }

    // options: exactly 4 items, non-empty
    if (!Array.isArray(qObj.options)) {
      errors.push(`${questionLabel}: "options" phải là mảng chứa 4 đáp án [A, B, C, D]`);
    } else {
      if (qObj.options.length !== 4) {
        errors.push(`${questionLabel}: "options" cần đúng 4 phần tử (nhận được ${qObj.options.length})`);
      }
      qObj.options.forEach((opt: unknown, optIdx: number) => {
        if (typeof opt !== 'string' || !opt.trim()) {
          const letter = String.fromCharCode(65 + optIdx);
          errors.push(`${questionLabel}: Phương án ${letter} (vị trí ${optIdx}) rỗng hoặc không phải chuỗi`);
        }
      });
    }

    // correctIndex: 0, 1, 2, 3 or null
    const cIdx = qObj.correctIndex;
    if (cIdx !== null && cIdx !== undefined) {
      if (typeof cIdx !== 'number' || !Number.isInteger(cIdx) || cIdx < 0 || cIdx > 3) {
        errors.push(`${questionLabel}: "correctIndex" phải là 0, 1, 2, 3 hoặc null (nhận được ${String(cIdx)})`);
      }
    }

    // answerSource: 'document' | 'ai' | 'none' | 'user'
    const validSources = ['document', 'ai', 'none', 'user'];
    if (typeof qObj.answerSource !== 'string' || !validSources.includes(qObj.answerSource)) {
      errors.push(`${questionLabel}: "answerSource" phải là 'document', 'ai', 'none', hoặc 'user' (nhận được '${String(qObj.answerSource)}')`);
    } else {
      // consistency warnings
      if (cIdx === null && qObj.answerSource !== 'none') {
        warnings.push(`${questionLabel}: "correctIndex" là null nhưng "answerSource" là '${qObj.answerSource}' (nên là 'none')`);
      }
      if (cIdx !== null && cIdx !== undefined && qObj.answerSource === 'none') {
        warnings.push(`${questionLabel}: Có "correctIndex" (${cIdx}) nhưng "answerSource" lại là 'none'`);
      }
    }

    // category
    if (typeof qObj.category !== 'string' || !qObj.category.trim()) {
      warnings.push(`${questionLabel}: Thiếu phân loại dạng bài "category"`);
    }

    // passageId reference check
    if (qObj.passageId !== null && qObj.passageId !== undefined && String(qObj.passageId).trim() !== '') {
      const pId = String(qObj.passageId).trim();
      if (!passageIds.has(pId)) {
        errors.push(`${questionLabel}: Tham chiếu passageId "${pId}" không tồn tại trong danh sách passages`);
      }
    }

    // figure check
    if (qObj.figure !== null && qObj.figure !== undefined) {
      if (typeof qObj.figure !== 'object') {
        errors.push(`${questionLabel}: "figure" phải là một đối tượng { page, bbox } hoặc null`);
      } else {
        const fig = qObj.figure as Record<string, unknown>;
        if (fig.page !== undefined && fig.page !== null) {
          if (typeof fig.page !== 'number' || fig.page < 1) {
            errors.push(`${questionLabel}: figure.page phải là số nguyên dương >= 1`);
          }
        }
        if (fig.bbox !== undefined && fig.bbox !== null) {
          if (!Array.isArray(fig.bbox) || fig.bbox.length !== 4) {
            errors.push(`${questionLabel}: figure.bbox phải là mảng 4 số [x0, y0, x1, y1]`);
          } else {
            const [x0, y0, x1, y1] = fig.bbox.map(Number);
            if ([x0, y0, x1, y1].some(isNaN)) {
              errors.push(`${questionLabel}: figure.bbox chứa tọa độ không phải số`);
            } else if (x0 < 0 || y0 < 0 || x1 > 1 || y1 > 1 || x0 >= x1 || y0 >= y1) {
              warnings.push(`${questionLabel}: figure.bbox [${x0}, ${y0}, ${x1}, ${y1}] có thể nằm ngoài khoảng chuẩn hóa [0, 1]`);
            }
          }
        }
        if (!fig.url && fig.page === undefined && fig.bbox === undefined) {
          errors.push(`${questionLabel}: "figure" phải chứa ít nhất "url" hoặc "page" và "bbox"`);
        }
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Type guard for ImportSchemaV1
 */
export function isImportSchemaV1(data: unknown): data is ImportSchemaV1 {
  return validateSchemaV1(data).isValid;
}
