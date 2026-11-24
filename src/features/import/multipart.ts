// ==============================================================================
// V-ACT HUB: Multipart Import Merger & Tracker
// Handles merging multi-turn chatbot chunks (e.g. "Phần 1/3", "Phần 2/3", "Phần 3/3"),
// tracks missing/duplicate parts, merges & deduplicates passages, renumbers question
// sequence, and warns on subject/topic/set mismatches.
// ==============================================================================

import { ImportPassageV1, ImportQuestionV1, ImportSchemaV1 } from './schema';
import { parseAndRepair, ParseRepairResult } from './parseAndRepair';

export interface MultipartMergeResult {
  merged: ImportSchemaV1 | null;
  totalPartsExpected: number;
  partsReceived: number[];
  missingParts: number[];
  duplicateParts: number[];
  isComplete: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Parses freeform Vietnamese or English text indicators for part information.
 * E.g.: "Phần 1/3", "Phần 2 trên 3", "Part 1 of 3", "1/3"
 */
export function parsePartString(text: string): { index: number; total: number } | null {
  if (!text) return null;

  // Pattern: "1/3" or "Phần 1/3" or "Part 1/3"
  const slashMatch = text.match(/(?:phần|part)?\s*(\d+)\s*\/\s*(\d+)/i);
  if (slashMatch) {
    const index = parseInt(slashMatch[1], 10);
    const total = parseInt(slashMatch[2], 10);
    if (!isNaN(index) && !isNaN(total) && index >= 1 && total >= 1) {
      return { index, total };
    }
  }

  // Pattern: "Phần 1 trên 3" or "Part 1 of 3"
  const ofMatch = text.match(/(?:phần|part)\s*(\d+)\s*(?:trên|of)\s*(\d+)/i);
  if (ofMatch) {
    const index = parseInt(ofMatch[1], 10);
    const total = parseInt(ofMatch[2], 10);
    if (!isNaN(index) && !isNaN(total) && index >= 1 && total >= 1) {
      return { index, total };
    }
  }

  return null;
}

/**
 * Merges an array of parsed Schema v1 parts into a single consolidated ImportSchemaV1.
 */
export function mergeMultipartParts(parts: ImportSchemaV1[]): MultipartMergeResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!parts || parts.length === 0) {
    return {
      merged: null,
      totalPartsExpected: 0,
      partsReceived: [],
      missingParts: [],
      duplicateParts: [],
      isComplete: false,
      warnings,
      errors: ['Không có dữ liệu phần nào để ghép nối'],
    };
  }

  // 1. Analyze part metadata
  let maxTotal = 1;
  const partIndexCounts = new Map<number, number>();
  const partsByIndex = new Map<number, ImportSchemaV1>();

  parts.forEach((p, idx) => {
    let partIdx = idx + 1;
    let partTot = parts.length;

    if (p.part && typeof p.part.index === 'number' && typeof p.part.total === 'number') {
      partIdx = p.part.index;
      partTot = p.part.total;
    }

    if (partTot > maxTotal) {
      maxTotal = partTot;
    }

    const currentCount = partIndexCounts.get(partIdx) || 0;
    partIndexCounts.set(partIdx, currentCount + 1);

    // Keep the latest part entry for this index
    partsByIndex.set(partIdx, p);
  });

  const partsReceived = Array.from(partsByIndex.keys()).sort((a, b) => a - b);
  const duplicateParts: number[] = [];

  partIndexCounts.forEach((count, idx) => {
    if (count > 1) {
      duplicateParts.push(idx);
      warnings.push(`Phát hiện phần ${idx} bị nạp trùng lặp (${count} lần), hệ thống giữ lại bản mới nhất`);
    }
  });

  // 2. Identify missing parts
  const missingParts: number[] = [];
  for (let i = 1; i <= maxTotal; i++) {
    if (!partsByIndex.has(i)) {
      missingParts.push(i);
    }
  }

  const isComplete = missingParts.length === 0;
  if (!isComplete && maxTotal > 1) {
    warnings.push(
      `Chưa đủ toàn bộ các phần: đang thiếu [Phần ${missingParts.join(', ')}] trên tổng số ${maxTotal} phần`
    );
  }

  // 3. Consistency checks on subject, topic, set across parts
  const primaryPart = partsByIndex.get(partsReceived[0]) || parts[0];
  const primarySubject = primaryPart.subject;
  const primaryTopic = primaryPart.topic;
  const primarySet = primaryPart.set;

  partsReceived.forEach((idx) => {
    const part = partsByIndex.get(idx)!;
    if (part.subject && part.subject.trim() !== primarySubject.trim()) {
      warnings.push(`Cảnh báo lệch môn học: Phần ${idx} ('${part.subject}') khác phần đầu ('${primarySubject}')`);
    }
    if (part.topic && part.topic.trim() !== primaryTopic.trim()) {
      warnings.push(`Cảnh báo lệch chuyên đề: Phần ${idx} ('${part.topic}') khác phần đầu ('${primaryTopic}')`);
    }
    if (part.set && part.set.trim() !== primarySet.trim()) {
      warnings.push(`Cảnh báo lệch tên bộ đề: Phần ${idx} ('${part.set}') khác phần đầu ('${primarySet}')`);
    }
  });

  // 4. Merge & Deduplicate Passages
  const uniquePassages: ImportPassageV1[] = [];
  const passageIdMap = new Map<string, string>(); // aliasId -> canonicalId
  const passageContentMap = new Map<string, string>(); // normalizedContent -> canonicalId
  const seenPassageIds = new Set<string>();

  partsReceived.forEach((idx) => {
    const part = partsByIndex.get(idx)!;
    if (Array.isArray(part.passages)) {
      part.passages.forEach((passage) => {
        if (!passage || !passage.id || !passage.content) return;
        const normContent = passage.content.trim();

        // Check if an identical passage already exists with another ID
        if (passageContentMap.has(normContent)) {
          const canonicalId = passageContentMap.get(normContent)!;
          passageIdMap.set(passage.id, canonicalId);
          return;
        }

        // If ID is already seen but content differs, assign unique id
        let effectiveId = passage.id;
        if (seenPassageIds.has(effectiveId)) {
          // Check if same ID already stored
          const existing = uniquePassages.find((p) => p.id === effectiveId);
          if (existing && existing.content.trim() === normContent) {
            return;
          }
          effectiveId = `${passage.id}-part${idx}`;
          passageIdMap.set(passage.id, effectiveId);
        }

        seenPassageIds.add(effectiveId);
        passageContentMap.set(normContent, effectiveId);
        uniquePassages.push({
          id: effectiveId,
          title: passage.title,
          content: passage.content,
        });
      });
    }
  });

  // 5. Merge and Sequence Questions
  const allQuestions: ImportQuestionV1[] = [];
  let questionsRenumbered = false;

  partsReceived.forEach((idx) => {
    const part = partsByIndex.get(idx)!;
    if (Array.isArray(part.questions)) {
      part.questions.forEach((q) => {
        // Clone question
        const qClone: ImportQuestionV1 = { ...q, options: [...q.options] };

        // Remap passageId if needed
        if (qClone.passageId && passageIdMap.has(qClone.passageId)) {
          qClone.passageId = passageIdMap.get(qClone.passageId)!;
        }

        allQuestions.push(qClone);
      });
    }
  });

  // Check if numbering is continuous 1, 2, 3...
  const needRenumbering =
    allQuestions.some((q, i) => q.no !== i + 1) ||
    new Set(allQuestions.map((q) => q.no)).size !== allQuestions.length;

  if (needRenumbering && allQuestions.length > 0) {
    allQuestions.forEach((q, i) => {
      q.no = i + 1;
    });
    questionsRenumbered = true;
    warnings.push(`Đã tự động đánh số lại thứ tự câu hỏi nối tiếp từ 1 đến ${allQuestions.length}`);
  }

  // 6. Build consolidated schema
  const merged: ImportSchemaV1 = {
    schemaVersion: 1,
    subject: primarySubject,
    topic: primaryTopic,
    set: primarySet,
    part: { index: 1, total: 1 }, // Merged result is a unified complete set
    passages: uniquePassages.length > 0 ? uniquePassages : undefined,
    questions: allQuestions,
  };

  return {
    merged,
    totalPartsExpected: maxTotal,
    partsReceived,
    missingParts,
    duplicateParts,
    isComplete,
    warnings,
    errors,
  };
}

/**
 * Stateful tracker for incremental multi-turn import sessions.
 */
export class MultipartTracker {
  private parts: ImportSchemaV1[] = [];

  /**
   * Adds an already-parsed ImportSchemaV1 part.
   */
  public addPart(part: ImportSchemaV1): MultipartMergeResult {
    this.parts.push(part);
    return this.getMergeResult();
  }

  /**
   * Parses raw string input with parseAndRepair, then adds to tracker if valid.
   */
  public addRawPart(rawInput: string): {
    parseResult: ParseRepairResult;
    mergeResult: MultipartMergeResult;
  } {
    const parseResult = parseAndRepair(rawInput);
    let mergeResult: MultipartMergeResult;

    if (parseResult.data) {
      mergeResult = this.addPart(parseResult.data);
    } else {
      mergeResult = this.getMergeResult();
    }

    return { parseResult, mergeResult };
  }

  /**
   * Returns current consolidated merge result.
   */
  public getMergeResult(): MultipartMergeResult {
    return mergeMultipartParts(this.parts);
  }

  /**
   * Returns all raw stored parts.
   */
  public getParts(): ImportSchemaV1[] {
    return [...this.parts];
  }

  /**
   * Clears all stored parts.
   */
  public reset(): void {
    this.parts = [];
  }

  /**
   * Returns human-readable summary of current progress.
   */
  public getSummary(): string {
    const res = this.getMergeResult();
    if (res.totalPartsExpected === 0) return 'Chưa nhận được phần nào';

    return `Đã nhận ${res.partsReceived.length}/${res.totalPartsExpected} phần (${
      res.isComplete ? 'Đầy đủ' : 'Chưa hoàn tất'
    }) - Tổng cộng ${res.merged?.questions.length || 0} câu hỏi`;
  }
}
