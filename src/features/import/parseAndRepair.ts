// ==============================================================================
// V-ACT HUB: parseAndRepair - Fault-Tolerant JSON Parsing & Repair Engine
// Repairs common LLM formatting issues: markdown fences, conversational chatter,
// unescaped LaTeX backslashes, smart quotes, raw newlines, trailing commas,
// and recovers truncated JSON streams.
// ==============================================================================

import { ImportSchemaV1, validateSchemaV1 } from './schema';

export interface ParseRepairResult {
  data: ImportSchemaV1 | null;
  repairs: string[];
  errors: string[];
  warnings: string[];
}

/**
 * Strips markdown code fences (```json ... ```) and leading/trailing conversational text.
 */
function stripFencesAndConversationalText(input: string): { text: string; repaired: boolean } {
  let text = input.trim();
  let repaired = false;

  // 1. Check for markdown code fences ```json ... ``` or ``` ... ```
  const fenceRegex = /```(?:json|JSON)?\s*([\s\S]*?)\s*```/;
  const fenceMatch = text.match(fenceRegex);
  if (fenceMatch && fenceMatch[1]) {
    text = fenceMatch[1].trim();
    repaired = true;
  }

  // 2. Strip leading text before the first opening brace '{'
  const firstBrace = text.indexOf('{');
  if (firstBrace > 0) {
    text = text.slice(firstBrace).trim();
    repaired = true;
  }

  // 3. Strip trailing text after the last closing brace '}' (only if closing brace exists)
  const lastBrace = text.lastIndexOf('}');
  if (lastBrace !== -1 && lastBrace < text.length - 1) {
    text = text.slice(0, lastBrace + 1).trim();
    repaired = true;
  }

  return { text, repaired };
}

/**
 * Normalizes smart quotes used as JSON syntax delimiters while protecting inner quotes.
 */
function normalizeSmartQuotes(input: string): { text: string; repaired: boolean } {
  let text = input;
  let repaired = false;

  // Check if smart quotes exist
  if (/[“”‘’]/.test(text)) {
    // Replace smart single quotes with standard ASCII single quote
    text = text.replace(/[‘’]/g, "'");

    // Replace structural smart double quotes at JSON boundaries
    const beforeStructure = text;
    text = text
      .replace(/([{[,:\s])“/g, '$1"')
      .replace(/”([},\]:\s])/g, '"$1')
      .replace(/^“/gm, '"')
      .replace(/”$/gm, '"');

    if (text !== beforeStructure || /[‘’]/.test(beforeStructure)) {
      repaired = true;
    }
  }

  return { text, repaired };
}

/**
 * Scans JSON strings to:
 * 1. Escape unescaped LaTeX backslashes (\frac, \ce, \alpha, \times...) without breaking \n, \", \\, \uXXXX.
 * 2. Convert literal raw newlines inside strings to escaped \n.
 */
function repairStringEscapesAndNewlines(raw: string): {
  text: string;
  latexFixed: boolean;
  newlinesFixed: boolean;
} {
  let inString = false;
  let result = '';
  let latexFixed = false;
  let newlinesFixed = false;

  const len = raw.length;

  for (let i = 0; i < len; i++) {
    const ch = raw[i];

    if (!inString) {
      if (ch === '"') {
        inString = true;
      }
      result += ch;
      continue;
    }

    // Inside a JSON string literal:
    if (ch === '\\') {
      const next1 = raw[i + 1];

      // 1. Already escaped backslash \\ or escaped quote \" or solidus \/
      if (next1 === '\\' || next1 === '"' || next1 === '/') {
        result += '\\' + next1;
        i++;
        continue;
      }

      // 2. Unicode escape sequence \uXXXX
      if (next1 === 'u' && /^[0-9a-fA-F]{4}/.test(raw.slice(i + 2, i + 6))) {
        result += raw.slice(i, i + 6);
        i += 5;
        continue;
      }

      // 3. LaTeX commands that collide with standard JSON escapes \n, \r, \t, \f, \b
      const rest = raw.slice(i + 1);

      // \frac -> \f followed by rac
      if (/^frac\b/.test(rest)) {
        result += '\\\\';
        latexFixed = true;
        continue;
      }

      // \times, \theta, \text, \tau, \tan, \to, \tilde
      if (/^(times|theta|text|textbf|textit|tau|tan|to|tilde)\b/.test(rest)) {
        result += '\\\\';
        latexFixed = true;
        continue;
      }

      // \nabla, \neq, \nu
      if (/^(nabla|neq|nu)\b/.test(rest)) {
        result += '\\\\';
        latexFixed = true;
        continue;
      }

      // \beta, \bar, \begin, \bf
      if (/^(beta|bar|begin|bf)\b/.test(rest)) {
        result += '\\\\';
        latexFixed = true;
        continue;
      }

      // \rho, \right, \rm
      if (/^(rho|right|rm)\b/.test(rest)) {
        result += '\\\\';
        latexFixed = true;
        continue;
      }

      // 4. Standard valid JSON escapes: \n, \r, \t, \b, \f
      if (next1 === 'n' || next1 === 'r' || next1 === 't' || next1 === 'b' || next1 === 'f') {
        result += '\\' + next1;
        i++;
        continue;
      }

      // 5. Any other character after \ is an invalid JSON escape (e.g. \alpha, \sqrt, \ce, \pm, \(, \))
      // Escape the backslash so it becomes valid JSON
      result += '\\\\';
      latexFixed = true;
      continue;
    }

    if (ch === '"') {
      inString = false;
      result += ch;
      continue;
    }

    // Convert raw literal newlines inside string literals to \n
    if (ch === '\r') {
      if (raw[i + 1] === '\n') {
        i++;
      }
      result += '\\n';
      newlinesFixed = true;
      continue;
    }

    if (ch === '\n') {
      result += '\\n';
      newlinesFixed = true;
      continue;
    }

    result += ch;
  }

  return { text: result, latexFixed, newlinesFixed };
}

/**
 * Removes trailing commas in arrays and objects before closing brackets.
 */
function removeTrailingCommas(input: string): { text: string; repaired: boolean } {
  const trailingCommaRegex = /,\s*([\]}])/g;
  const repaired = trailingCommaRegex.test(input);
  const text = input.replace(trailingCommaRegex, '$1');
  return { text, repaired };
}

/**
 * Recovers truncated JSON caused by token limits by searching backwards
 * for the last completed question object and auto-closing brackets.
 */
function recoverTruncatedJson(text: string): {
  recoveredText: string;
  lastQuestionNo: number;
} | null {
  const questionsMatch = text.match(/"questions"\s*:\s*\[/);
  if (!questionsMatch || questionsMatch.index === undefined) {
    return null;
  }

  const questionsStart = questionsMatch.index + questionsMatch[0].length;
  const questionsPart = text.slice(questionsStart);

  let searchPos = questionsPart.length;

  while (searchPos > 0) {
    const lastBrace = questionsPart.lastIndexOf('}', searchPos);
    if (lastBrace === -1) break;

    const candidateQuestions = questionsPart.slice(0, lastBrace + 1);
    const candidateFull = text.slice(0, questionsStart) + candidateQuestions + '\n  ]\n}';
    const cleaned = candidateFull.replace(/,\s*([\]}])/g, '$1');

    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        const lastQ = parsed.questions[parsed.questions.length - 1];
        const lastNo = typeof lastQ.no === 'number' ? lastQ.no : parseInt(String(lastQ.no), 10);
        return {
          recoveredText: cleaned,
          lastQuestionNo: isNaN(lastNo) ? parsed.questions.length : lastNo,
        };
      }
    } catch {
      // Continue search backwards
    }

    searchPos = lastBrace - 1;
  }

  return null;
}

/**
 * Main Pure Function: Parses arbitrary input string, repairs common formatting
 * anomalies, and validates against Schema v1.
 */
export function parseAndRepair(rawInput: string): ParseRepairResult {
  const repairs: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rawInput || !rawInput.trim()) {
    return {
      data: null,
      repairs,
      errors: ['Nội dung nhập vào trống, vui lòng dán JSON hoặc văn bản đề thi'],
      warnings,
    };
  }

  let text = rawInput;

  // Step 1: Strip markdown code blocks and conversational fluff
  const step1 = stripFencesAndConversationalText(text);
  if (step1.repaired) {
    repairs.push('Đã loại bỏ markdown code block (```) và văn bản trò chuyện thừa bên ngoài JSON');
  }
  text = step1.text;

  // Step 2: Repair unescaped LaTeX backslashes & raw newlines inside strings first
  const step2 = repairStringEscapesAndNewlines(text);
  if (step2.latexFixed) {
    repairs.push("Đã tự động escape các dấu gạch chéo ngược (\\) của công thức LaTeX thành '\\\\'");
  }
  if (step2.newlinesFixed) {
    repairs.push("Đã chuyển đổi các ký tự xuống dòng thô bên trong chuỗi văn bản thành '\\n'");
  }
  text = step2.text;

  // Step 3: Remove trailing commas
  const step3 = removeTrailingCommas(text);
  if (step3.repaired) {
    repairs.push('Đã loại bỏ dấu phẩy thừa cuối mảng hoặc đối tượng JSON');
  }
  text = step3.text;

  // Step 4: Attempt standard JSON parse
  let parsedObj: unknown = null;
  let parsedSuccessfully = false;

  try {
    parsedObj = JSON.parse(text);
    parsedSuccessfully = true;
  } catch (initialErr) {
    // Step 5: If parsing failed, check if smart quotes were used as JSON delimiters
    const smartQuoteCheck = normalizeSmartQuotes(text);
    if (smartQuoteCheck.repaired) {
      let candidate = smartQuoteCheck.text;
      const fixLatex = repairStringEscapesAndNewlines(candidate);
      candidate = removeTrailingCommas(fixLatex.text).text;

      try {
        parsedObj = JSON.parse(candidate);
        parsedSuccessfully = true;
        text = candidate;
        repairs.push('Đã chuyển đổi dấu nháy cong kiểu văn bản (“ ” ‘ ’) thành dấu nháy chuẩn');
      } catch {
        parsedSuccessfully = false;
      }
    }

    // Step 6: Attempt truncated JSON recovery if still failing
    if (!parsedSuccessfully) {
      const recovery = recoverTruncatedJson(text);
      if (recovery) {
        try {
          parsedObj = JSON.parse(recovery.recoveredText);
          parsedSuccessfully = true;
          repairs.push('Phục hồi JSON bị cắt ngắn: tự động đóng ngoặc và loại bỏ câu dở dang');
          warnings.push(
            `Dữ liệu bị cắt ngang ở câu dở dang. Đã nhận đến câu số ${recovery.lastQuestionNo}, hãy yêu cầu chatbot "tiếp từ câu ${recovery.lastQuestionNo + 1}"`
          );
        } catch {
          parsedSuccessfully = false;
        }
      }
    }

    if (!parsedSuccessfully) {
      const errMsg = initialErr instanceof Error ? initialErr.message : String(initialErr);
      errors.push(`Không thể phân tích cú pháp JSON: ${errMsg}`);
      return {
        data: null,
        repairs,
        errors,
        warnings,
      };
    }
  }

  // Step 7: Validate parsed object against Schema v1
  const validation = validateSchemaV1(parsedObj);
  if (!validation.isValid) {
    errors.push(...validation.errors);
  }
  if (validation.warnings.length > 0) {
    warnings.push(...validation.warnings);
  }

  return {
    data: errors.length === 0 ? (parsedObj as ImportSchemaV1) : null,
    repairs,
    errors,
    warnings,
  };
}
