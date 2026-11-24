import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BK_SCORES_2026, BKMajorScore, DEFAULT_TARGET_MAJOR, ProgramType } from '../data/bkScores';
import { getRepository } from '../data';

export interface TargetMajorState {
  program: ProgramType;
  code: string;
  key: string;
  targetCode: string; // compatibility with earlier views
  setTargetMajor: (target: { program: ProgramType; code: string; key: string }) => void;
  setTargetCode: (codeOrKey: string) => void;
  getTargetMajor: () => BKMajorScore;
}

export const useTargetMajorStore = create<TargetMajorState>()(
  persist(
    (set, get) => ({
      program: 'standard',
      code: '106',
      key: '106',
      targetCode: '106',

      setTargetMajor: (target) => {
        const found =
          BK_SCORES_2026.find((m) => m.key === target.key || m.code === target.code) ||
          DEFAULT_TARGET_MAJOR;

        set({
          program: found.program,
          code: found.code,
          key: found.key,
          targetCode: found.code,
        });

        // Sync with repository
        try {
          const repo = getRepository() as any;
          const payload = {
            targetMajorCode: found.code,
            targetMajorName: found.name,
            targetScore: found.benchmark,
          };
          if (typeof repo.saveSettings === 'function') {
            repo.saveSettings(payload).catch?.(() => {});
          } else if (typeof repo.updateUserStats === 'function') {
            repo.updateUserStats(payload).catch?.(() => {});
          }
        } catch (err) {
          console.warn('Could not sync target major to repository:', err);
        }
      },

      setTargetCode: (codeOrKey: string) => {
        const found =
          BK_SCORES_2026.find((m) => m.key === codeOrKey || m.code === codeOrKey) ||
          DEFAULT_TARGET_MAJOR;

        get().setTargetMajor({
          program: found.program,
          code: found.code,
          key: found.key,
        });
      },

      getTargetMajor: () => {
        const { key, code, targetCode } = get();
        const found =
          BK_SCORES_2026.find((m) => m.key === key || m.code === code || m.code === targetCode) ||
          DEFAULT_TARGET_MAJOR;
        return found;
      },
    }),
    {
      name: 'vact_target_major_storage',
    }
  )
);
