import { describe, it, expect, vi } from 'vitest';
import {
  SEED_PACKAGES,
  getSeedQuestionsTotal,
  loadSeedData,
  isSeedDataLoaded,
} from './seed';
import { DataRepository } from './repository';

describe('Seed Data Loader (seed.ts)', () => {
  it('contains exactly 3 packages and 130 questions in total', () => {
    expect(SEED_PACKAGES).toHaveLength(3);
    expect(getSeedQuestionsTotal()).toBe(130);

    const set1 = SEED_PACKAGES.find((p) => p.set === 'Bài tập áp dụng');
    const set2 = SEED_PACKAGES.find((p) => p.set === 'Bài luyện tập số 1');
    const set3 = SEED_PACKAGES.find((p) => p.set === 'Bài luyện tập số 2');

    expect(set1).toBeDefined();
    expect(set1?.questions).toHaveLength(30);

    expect(set2).toBeDefined();
    expect(set2?.questions).toHaveLength(50);

    expect(set3).toBeDefined();
    expect(set3?.questions).toHaveLength(50);
  });

  it('validates all questions in SEED_PACKAGES have valid fields', () => {
    for (const pkg of SEED_PACKAGES) {
      expect(pkg.schemaVersion).toBe(1);
      expect(pkg.subject).toBe('Tiếng Anh');
      expect(pkg.topic).toBe('Chuyên đề 15: Câu điều kiện');
      expect(pkg.passages).toEqual([]);

      pkg.questions.forEach((q, idx) => {
        expect(q.no).toBe(idx + 1);
        expect(q.prompt).toBeTruthy();
        expect(q.options).toHaveLength(4);
        q.options.forEach((opt) => expect(opt).toBeTruthy());
        expect([0, 1, 2, 3]).toContain(q.correctIndex);
        expect(q.category).toBeTruthy();
        expect(q.formula).toBeTruthy();
        expect(q.explanation).toBeTruthy();
        expect(q.answerSource).toBe('document');
        expect(q.figure).toBeNull();
      });
    }
  });

  it('correctly reports isSeedDataLoaded as false when empty', async () => {
    const mockRepo: Partial<DataRepository> = {
      getSubjects: vi.fn().mockResolvedValue([]),
    };

    const loaded = await isSeedDataLoaded(mockRepo as DataRepository);
    expect(loaded).toBe(false);
  });

  it('successfully executes loadSeedData against a repository', async () => {
    const importedPackages: any[] = [];
    const mockRepo: Partial<DataRepository> = {
      getSubjects: vi.fn().mockResolvedValue([]),
      getTopics: vi.fn().mockResolvedValue([]),
      getSets: vi.fn().mockResolvedValue([]),
      importV1Package: vi.fn().mockImplementation(async (pkg) => {
        importedPackages.push(pkg);
        return {
          subjectId: 'sub-1',
          topicId: 'top-1',
          setId: `set-${pkg.set}`,
          questionCount: pkg.questions.length,
        };
      }),
    };

    const result = await loadSeedData(mockRepo as DataRepository);

    expect(result.success).toBe(true);
    expect(result.importedSets).toBe(3);
    expect(result.importedQuestions).toBe(130);
    expect(importedPackages).toHaveLength(3);
    expect(result.details).toHaveLength(3);
    expect(result.details.map((d) => d.status)).toEqual(['imported', 'imported', 'imported']);
  });

  it('skips reloading when sets already exist and force is false (idempotent)', async () => {
    const mockRepo: Partial<DataRepository> = {
      getSubjects: vi.fn().mockResolvedValue([{ id: 'sub-eng', name: 'Tiếng Anh', code: 'ENG' }]),
      getTopics: vi.fn().mockResolvedValue([{ id: 'top-cond', name: 'Chuyên đề 15: Câu điều kiện' }]),
      getSets: vi.fn().mockResolvedValue([
        { id: 's1', name: 'Bài tập áp dụng' },
        { id: 's2', name: 'Bài luyện tập số 1' },
        { id: 's3', name: 'Bài luyện tập số 2' },
      ]),
      getQuestions: vi.fn().mockResolvedValue(new Array(30).fill({ id: 'dummy' })),
      importV1Package: vi.fn(),
    };

    const result = await loadSeedData(mockRepo as DataRepository, { force: false });

    expect(result.success).toBe(true);
    expect(result.importedSets).toBe(0);
    expect(result.importedQuestions).toBe(0);
    expect(result.details.every((d) => d.status === 'skipped_already_exists')).toBe(true);
    expect(mockRepo.importV1Package).not.toHaveBeenCalled();
  });
});
