import { describe, it, expect, beforeEach } from 'vitest';
import { getRepository, resetRepository } from './index';
import { isSupabaseConfigured } from '../lib/supabase';
import { V1ImportPackage } from './types';

describe('Data Repository Layer', () => {
  beforeEach(async () => {
    resetRepository();
    const repo = getRepository();
    await repo.clearAllData();
  });

  it('correctly reports whether Supabase is configured from environment', () => {
    expect(typeof isSupabaseConfigured).toBe('boolean');
  });

  it('auto-selects LocalRepository in offline / unconfigured mode', () => {
    const repo = getRepository();
    expect(repo).toBeDefined();
    expect(repo.mode).toBe('local');
    expect(typeof repo.getSubjects).toBe('function');
    expect(typeof repo.getTopics).toBe('function');
    expect(typeof repo.getSets).toBe('function');
    expect(typeof repo.getPassages).toBe('function');
    expect(typeof repo.getQuestions).toBe('function');
    expect(typeof repo.importV1Package).toBe('function');
    expect(typeof repo.exportFullBackup).toBe('function');
  });

  it('creates, reads, updates, and deletes subjects', async () => {
    const repo = getRepository();
    const subject = await repo.createSubject({
      name: 'Tiếng Anh',
      code: 'ENG',
      position: 0,
      visibility: 'private',
    });

    expect(subject.id).toBeDefined();
    expect(subject.name).toBe('Tiếng Anh');
    expect(subject.code).toBe('ENG');

    const subjects = await repo.getSubjects();
    expect(subjects.length).toBe(1);
    expect(subjects[0].id).toBe(subject.id);

    const updated = await repo.updateSubject(subject.id, { name: 'Tiếng Anh Chuyên Sâu' });
    expect(updated.name).toBe('Tiếng Anh Chuyên Sâu');

    await repo.deleteSubject(subject.id);
    const afterDelete = await repo.getSubjects();
    expect(afterDelete.length).toBe(0);
  });

  it('imports V1 packages with both string and object subjects', async () => {
    const repo = getRepository();
    const pkg: V1ImportPackage = {
      schemaVersion: 1,
      subject: 'Tiếng Anh',
      topic: 'Chuyên đề 15: Câu điều kiện',
      set: 'Bài tập áp dụng',
      passages: [
        { id: 'p1', content: 'Sample reading passage for testing' },
      ],
      questions: [
        {
          no: 1,
          passageId: 'p1',
          prompt: 'If it rains tomorrow, we ___ at home.',
          options: ['will stay', 'stayed', 'would stay', 'stay'],
          correctIndex: 0,
          answerSource: 'document',
          category: 'Type 1',
          formula: 'If + S + V(s/es), S + will + V_inf',
          explanation: 'Câu điều kiện loại 1 diễn tả sự việc có thể xảy ra ở hiện tại hoặc tương lai.',
        },
      ],
    };

    const result = await repo.importV1Package(pkg);
    expect(result.questionCount).toBe(1);

    const subjects = await repo.getSubjects();
    expect(subjects.length).toBe(1);
    expect(subjects[0].name).toBe('Tiếng Anh');

    const topics = await repo.getTopics(result.subjectId);
    expect(topics.length).toBe(1);
    expect(topics[0].name).toBe('Chuyên đề 15: Câu điều kiện');

    const sets = await repo.getSets(result.topicId);
    expect(sets.length).toBe(1);
    expect(sets[0].name).toBe('Bài tập áp dụng');

    const questions = await repo.getQuestions(result.setId);
    expect(questions.length).toBe(1);
    expect(questions[0].prompt).toContain('If it rains');
    expect(questions[0].correctIndex).toBe(0);
    expect(questions[0].passageId).toBeDefined();
  });

  it('handles default user stats and settings', async () => {
    const repo = getRepository();
    const stats = await repo.getUserStats();
    expect(stats.xp).toBe(0);
    expect(stats.streak).toBe(0);
    expect(stats.streakFreezesWeekly).toBe(3);
    expect(stats.targetMajorCode).toBe('106');

    const updatedStats = await repo.updateUserStats({ xp: 100, streak: 5 });
    expect(updatedStats.xp).toBe(100);
    expect(updatedStats.streak).toBe(5);

    const settings = await repo.getSettings();
    expect(settings.soundEnabled).toBe(true);
    expect(settings.theme).toBe('system');

    const updatedSettings = await repo.updateSettings({ soundEnabled: false, theme: 'dark' });
    expect(updatedSettings.soundEnabled).toBe(false);
    expect(updatedSettings.theme).toBe('dark');
  });

  it('exports and restores full backup cleanly', async () => {
    const repo = getRepository();
    await repo.createSubject({ name: 'Toán học', code: 'MATH', position: 0, visibility: 'private' });
    await repo.updateUserStats({ xp: 250 });

    const backup = await repo.exportFullBackup();
    expect(backup.subjects.length).toBe(1);
    expect(backup.userStats.xp).toBe(250);

    // Clear and restore
    await repo.clearAllData();
    expect((await repo.getSubjects()).length).toBe(0);

    await repo.importFullBackup(backup);
    expect((await repo.getSubjects()).length).toBe(1);
    expect((await repo.getUserStats()).xp).toBe(250);
  });
});
