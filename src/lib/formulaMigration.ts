import { DataRepository } from '../data/repository';
import { FormulaGroup, FormulaItem, Question } from '../data/types';

export const FORMULA_MIGRATION_VERSION = 'v1';
export const FORMULA_MIGRATION_FLAG_PREFIX = 'vact_formula_migration_';

export interface GroupSummary {
  groupId: string;
  title: string;
  itemCount: number;
}

export interface MigrationReport {
  migrated: boolean;
  topicId?: string;
  totalQuestionsWithFormula: number;
  totalFormulasExtracted: number;
  totalGroupsCreated: number;
  groupsSummary: GroupSummary[];
  otherCount: number;
}

/**
 * Tách tag ngắn và gom nhóm kiến thức:
 * - "ĐK Loại x", "ĐK Trộn...", "Cấu trúc Unless...", "Cấu trúc Otherwise..." → "Câu điều kiện"
 *   (nếu có tiền tố "Đảo ngữ" → "Đảo ngữ câu điều kiện")
 * - Tiền tố "Đảo ngữ..." → "Đảo ngữ câu điều kiện"
 * - Các trường hợp còn lại → "Khác"
 */
export function categorizeFormula(categoryRaw: string): { groupTitle: string; tag: string } {
  const cat = (categoryRaw || '').trim();
  if (!cat) {
    return { groupTitle: 'Khác', tag: 'Chung' };
  }

  const isDaoNgu = /^đảo ngữ/i.test(cat) || cat.toLowerCase().includes('đảo ngữ');

  let tag = cat;
  if (/^đảo ngữ\s+(?:đk\s+)?/i.test(tag)) {
    const cleaned = tag.replace(/^đảo ngữ\s+(?:đk\s+)?/i, '').trim();
    tag = `Đảo ngữ ${cleaned}`;
  } else if (/^đk\s+/i.test(tag)) {
    tag = tag.replace(/^đk\s+/i, '').trim();
  } else if (/^cấu trúc\s+/i.test(tag)) {
    tag = tag.replace(/^cấu trúc\s+/i, '').trim();
  } else if (/^từ tương đương\s+/i.test(tag)) {
    tag = tag.replace(/^từ tương đương\s+/i, 'Tương đương ').trim();
  }

  // Simplify "(Loại x)" if tag already says "Unless (Loại 1)" -> "Unless", etc.
  if (/^(unless|otherwise|but for|without)\s*\([^)]*\)$/i.test(tag)) {
    tag = tag.replace(/\s*\([^)]*\)$/i, '').trim();
  }
  if (/^đảo ngữ\s+(but for|without)\s*\([^)]*\)$/i.test(tag)) {
    tag = tag.replace(/\s*\([^)]*\)$/i, '').trim();
  }

  if (isDaoNgu) {
    return { groupTitle: 'Đảo ngữ câu điều kiện', tag };
  }

  const isCondition =
    /^(đk\b|cấu trúc\s+(unless|otherwise|but for|without|if)|từ tương đương\s+if)/i.test(cat) ||
    /loại\s+[0-3]/i.test(cat) ||
    /câu điều kiện/i.test(cat);

  if (isCondition) {
    return { groupTitle: 'Câu điều kiện', tag };
  }

  return { groupTitle: 'Khác', tag };
}

export function isTopicMigrated(topicId: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(`${FORMULA_MIGRATION_FLAG_PREFIX}${topicId}`) === FORMULA_MIGRATION_VERSION;
  } catch {
    return false;
  }
}

export function markTopicMigrated(topicId: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`${FORMULA_MIGRATION_FLAG_PREFIX}${topicId}`, FORMULA_MIGRATION_VERSION);
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

/**
 * Migrate formulas for a single topic.
 * Safe to call repeatedly: will not duplicate groups if already migrated unless forced.
 */
export async function migrateFormulasForTopic(
  repo: DataRepository,
  topicId: string,
  options?: { force?: boolean }
): Promise<MigrationReport> {
  const existingGroups = await repo.getFormulaGroups(topicId);

  // Check version flag and existing data
  const alreadyMigrated = isTopicMigrated(topicId) || existingGroups.length > 0;
  if (alreadyMigrated && !options?.force) {
    let otherCount = 0;
    const groupsSummary = existingGroups.map((g) => {
      if (g.title === 'Khác') {
        otherCount += g.items.length;
      }
      return {
        groupId: g.id,
        title: g.title,
        itemCount: g.items.length,
      };
    });

    const totalFormulas = existingGroups.reduce((acc, g) => acc + g.items.length, 0);

    return {
      migrated: false,
      topicId,
      totalQuestionsWithFormula: totalFormulas,
      totalFormulasExtracted: totalFormulas,
      totalGroupsCreated: existingGroups.length,
      groupsSummary,
      otherCount,
    };
  }

  // Load sets & questions of this topic
  const sets = await repo.getSets(topicId);
  const questionsNested = await Promise.all(sets.map((s) => repo.getQuestions(s.id)));
  const allQuestions: Question[] = questionsNested.flat();

  const questionsWithFormula = allQuestions.filter((q) => Boolean(q.formula && q.formula.trim()));

  // Map to collect items by groupTitle
  const groupItemsMap = new Map<string, FormulaItem[]>();
  const seenKeySet = new Set<string>();

  for (const q of questionsWithFormula) {
    const formulaText = q.formula.trim();
    const { groupTitle, tag } = categorizeFormula(q.category);

    const dedupeKey = `${groupTitle}:::${tag}:::${formulaText}`;
    if (seenKeySet.has(dedupeKey)) continue;
    seenKeySet.add(dedupeKey);

    if (!groupItemsMap.has(groupTitle)) {
      groupItemsMap.set(groupTitle, []);
    }

    const item: FormulaItem = {
      id: `fm_${q.id || Math.random().toString(36).substring(2, 9)}`,
      tag,
      structure: formulaText,
      usage: q.category ? `Áp dụng trong: ${q.category}` : undefined,
      example: q.prompt ? q.prompt.trim() : undefined,
      note: q.explanation ? q.explanation.trim() : undefined,
    };

    groupItemsMap.get(groupTitle)!.push(item);
  }

  // If force is set and existing groups exist, delete them first
  if (options?.force && existingGroups.length > 0) {
    for (const eg of existingGroups) {
      await repo.deleteFormulaGroup(eg.id);
    }
  }

  // Determine standard group orders
  const standardOrder: Record<string, number> = {
    'Câu điều kiện': 1,
    'Đảo ngữ câu điều kiện': 2,
    Khác: 99,
  };

  const groupsSummary: GroupSummary[] = [];
  let otherCount = 0;
  let orderIndex = 3;

  for (const [title, items] of groupItemsMap.entries()) {
    const order = standardOrder[title] ?? orderIndex++;
    const groupId = `fg_${topicId}_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    const newGroup: FormulaGroup = {
      id: groupId,
      topicId,
      title,
      order,
      items,
    };

    await repo.saveFormulaGroup(newGroup);

    if (title === 'Khác') {
      otherCount += items.length;
    }

    groupsSummary.push({
      groupId,
      title,
      itemCount: items.length,
    });
  }

  // Mark migrated
  markTopicMigrated(topicId);

  const report: MigrationReport = {
    migrated: true,
    topicId,
    totalQuestionsWithFormula: questionsWithFormula.length,
    totalFormulasExtracted: seenKeySet.size,
    totalGroupsCreated: groupsSummary.length,
    groupsSummary,
    otherCount,
  };

  console.log(
    `[FormulaMigration] Topic ${topicId}: Trước (câu hỏi có formula) = ${report.totalQuestionsWithFormula}, ` +
      `Sau (công thức hợp nhất) = ${report.totalFormulasExtracted}, ` +
      `Nhóm tạo = ${report.totalGroupsCreated}, Công thức nhóm "Khác" = ${report.otherCount}`
  );

  return report;
}

/**
 * Migrate formulas for all topics in the repository.
 */
export async function migrateAllFormulas(
  repo: DataRepository,
  options?: { force?: boolean }
): Promise<MigrationReport[]> {
  const topics = await repo.getTopics();
  const reports: MigrationReport[] = [];

  for (const topic of topics) {
    const report = await migrateFormulasForTopic(repo, topic.id, options);
    reports.push(report);
  }

  return reports;
}
