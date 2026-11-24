import { describe, it, expect, beforeEach } from 'vitest';
import { BK_SCORES_2026, DEFAULT_TARGET_MAJOR } from '../data/bkScores';
import { useTargetMajorStore } from '../store/targetMajorStore';
import { canUnlockTopicChest, claimTopicChest } from '../lib/game/chest';

describe('Stream A: BK Admission Benchmarks 2026 & Target Major Store', () => {
  it('should have exactly 29 standard majors and 7 PFIEV majors (total 36)', () => {
    const standardMajors = BK_SCORES_2026.filter((m) => m.program === 'standard');
    const pfievMajors = BK_SCORES_2026.filter((m) => m.program === 'pfiev');

    expect(standardMajors.length).toBe(29);
    expect(pfievMajors.length).toBe(7);
    expect(BK_SCORES_2026.length).toBe(36);
  });

  it('should default to 106 Khoa học Máy tính with benchmark 85.45', () => {
    expect(DEFAULT_TARGET_MAJOR.code).toBe('106');
    expect(DEFAULT_TARGET_MAJOR.name).toBe('Khoa học Máy tính');
    expect(DEFAULT_TARGET_MAJOR.benchmark).toBe(85.45);
    expect(DEFAULT_TARGET_MAJOR.program).toBe('standard');
  });

  it('should not contain 2025 anywhere in notes or descriptions', () => {
    for (const m of BK_SCORES_2026) {
      if (m.note) {
        expect(m.note).not.toContain('2025');
      }
    }
  });

  it('should initialize useTargetMajorStore with default major', () => {
    const state = useTargetMajorStore.getState();
    const current = state.getTargetMajor();
    expect(current.code).toBe('106');
    expect(current.name).toBe('Khoa học Máy tính');
    expect(current.benchmark).toBe(85.45);
  });

  it('should allow setting target major by code or key', () => {
    const store = useTargetMajorStore.getState();
    store.setTargetCode('PFIEV-108');

    const updated = useTargetMajorStore.getState().getTargetMajor();
    expect(updated.code).toBe('PFIEV-108');
    expect(updated.program).toBe('pfiev');
    expect(updated.benchmark).toBe(84.29);
  });

  it('should correctly evaluate topic chest unlock and reward', () => {
    const incompleteSets = [
      { id: 'set-1', stars: 2 },
      { id: 'set-2', stars: 0 },
    ];
    expect(canUnlockTopicChest(incompleteSets)).toBe(false);

    const completedSets = [
      { id: 'set-1', stars: 2 },
      { id: 'set-2', stars: 1 },
      { id: 'set-3', stars: 3 },
    ];
    expect(canUnlockTopicChest(completedSets)).toBe(true);

    const claimResult = claimTopicChest({
      topicId: 'topic-test',
      sets: completedSets,
      claimedTopicIds: [],
      currentXP: 100,
      currentReserveFreezes: 0,
    });

    expect(claimResult.success).toBe(true);
    expect(claimResult.reward?.xp).toBe(50);
    expect(claimResult.reward?.reserveFreeze).toBe(1);
    expect(claimResult.newXP).toBe(150);
    expect(claimResult.newReserveFreezes).toBe(1);
  });
});
