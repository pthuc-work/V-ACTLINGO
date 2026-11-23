/**
 * V-ACT HUB: Seed Data Loader
 *
 * Populates the 130 legacy English questions (Chuyên đề 15: Câu điều kiện)
 * into the user's active DataRepository (IndexedDB LocalRepository or SupabaseRepository).
 */

import { DataRepository } from './repository';
import { getRepository } from './index';
import { V1ImportPackage } from './types';
import legacyLibraryData from '../../data/seed/legacy-library.json';

export interface SeedResultItem {
  subjectName: string;
  topicName: string;
  setName: string;
  questionCount: number;
  status: 'imported' | 'skipped_already_exists' | 'updated';
}

export interface SeedResult {
  success: boolean;
  importedSets: number;
  importedQuestions: number;
  totalAvailableQuestions: number;
  message?: string;
  details: SeedResultItem[];
  error?: string;
}

export interface LoadSeedOptions {
  /**
   * If true, forces deletion of existing questions in the seed sets and re-imports them.
   * If false (default), preserves existing questions to ensure idempotency.
   */
  force?: boolean;
}

export const SEED_PACKAGES: V1ImportPackage[] = legacyLibraryData as unknown as V1ImportPackage[];

/**
 * Returns the total count of questions across all seed packages (130 questions).
 */
export function getSeedQuestionsTotal(): number {
  return SEED_PACKAGES.reduce((sum, pkg) => sum + (pkg.questions ? pkg.questions.length : 0), 0);
}

/**
 * Checks whether the seed data (or any portion of it) has already been loaded into the active repository.
 */
export async function isSeedDataLoaded(repo?: DataRepository): Promise<boolean> {
  try {
    const activeRepo = repo || getRepository();
    const subjects = await activeRepo.getSubjects();
    const engSubject = subjects.find(
      (s) => s.code.toLowerCase() === 'eng' || s.name.toLowerCase().includes('tiếng anh')
    );
    if (!engSubject) return false;

    const topics = await activeRepo.getTopics(engSubject.id);
    const condTopic = topics.find((t) => t.name.toLowerCase().includes('câu điều kiện'));
    if (!condTopic) return false;

    const sets = await activeRepo.getSets(condTopic.id);
    if (sets.length === 0) return false;

    let questionCount = 0;
    for (const set of sets) {
      const qs = await activeRepo.getQuestions(set.id);
      questionCount += qs.length;
    }

    return questionCount > 0;
  } catch (err) {
    console.error('Error checking seed data presence:', err);
    return false;
  }
}

/**
 * Loads the 130 seed questions from data/seed/legacy-library.json into the given or default repository.
 */
export async function loadSeedData(repo?: DataRepository, options?: LoadSeedOptions): Promise<SeedResult> {
  const activeRepo = repo || getRepository();
  const details: SeedResultItem[] = [];
  let importedSetsCount = 0;
  let importedQuestionsCount = 0;
  const force = options?.force ?? false;

  try {
    // 1. Get existing subjects to locate English subject if present
    const existingSubjects = await activeRepo.getSubjects();
    const engSubject = existingSubjects.find(
      (s) => s.code.toLowerCase() === 'eng' || s.name.toLowerCase().includes('tiếng anh')
    );

    let existingTopics: any[] = [];
    if (engSubject) {
      existingTopics = await activeRepo.getTopics(engSubject.id);
    }

    for (const pkg of SEED_PACKAGES) {
      const subjectName = typeof pkg.subject === 'string' ? pkg.subject : pkg.subject.name;
      const topicName = typeof pkg.topic === 'string' ? pkg.topic : pkg.topic.name;
      const setName = typeof pkg.set === 'string' ? pkg.set : pkg.set.name;
      const targetQuestionsCount = pkg.questions ? pkg.questions.length : 0;

      // Check if set already exists
      const targetTopic = existingTopics.find((t) => t.name.toLowerCase() === topicName.toLowerCase());
      let existingSet: any = null;
      let existingQs: any[] = [];

      if (targetTopic) {
        const setsInTopic = await activeRepo.getSets(targetTopic.id);
        existingSet = setsInTopic.find((s) => s.name.toLowerCase() === setName.toLowerCase());
        if (existingSet) {
          existingQs = await activeRepo.getQuestions(existingSet.id);
        }
      }

      if (existingSet && existingQs.length > 0 && !force) {
        // Already populated and not forcing reload
        details.push({
          subjectName,
          topicName,
          setName,
          questionCount: existingQs.length,
          status: 'skipped_already_exists',
        });
        continue;
      }

      // If forcing reload and set exists with questions, clean out old questions first
      if (existingSet && existingQs.length > 0 && force) {
        for (const q of existingQs) {
          await activeRepo.deleteQuestion(q.id);
        }
      }

      // Import the V1 package
      const res = await activeRepo.importV1Package(pkg);
      importedSetsCount++;
      importedQuestionsCount += res.questionCount;

      details.push({
        subjectName,
        topicName,
        setName,
        questionCount: res.questionCount,
        status: existingSet ? 'updated' : 'imported',
      });
    }

    const message =
      importedQuestionsCount > 0
        ? `Nạp thành công ${importedQuestionsCount} câu hỏi thuộc ${importedSetsCount} bài tập!`
        : `Toàn bộ ${getSeedQuestionsTotal()} câu hỏi mẫu (Chuyên đề 15) đã có sẵn trong hệ thống.`;

    return {
      success: true,
      importedSets: importedSetsCount,
      importedQuestions: importedQuestionsCount,
      totalAvailableQuestions: getSeedQuestionsTotal(),
      message,
      details,
    };
  } catch (error: any) {
    console.error('Failed to load seed data:', error);
    return {
      success: false,
      importedSets: importedSetsCount,
      importedQuestions: importedQuestionsCount,
      totalAvailableQuestions: getSeedQuestionsTotal(),
      details,
      error: error?.message || String(error),
    };
  }
}
