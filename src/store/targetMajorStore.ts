import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BENCHMARK_2026_MAJORS, Major } from '../data/benchmarkData';

interface TargetMajorState {
  targetCode: string;
  setTargetCode: (code: string) => void;
  getTargetMajor: () => Major;
}

export const useTargetMajorStore = create<TargetMajorState>()(
  persist(
    (set, get) => ({
      targetCode: '106', // Default: 106 Khoa học Máy tính 85.45
      setTargetCode: (code: string) => set({ targetCode: code }),
      getTargetMajor: () => {
        const { targetCode } = get();
        const found = BENCHMARK_2026_MAJORS.find((m) => m.code === targetCode);
        return (
          found ||
          BENCHMARK_2026_MAJORS.find((m) => m.code === '106') ||
          BENCHMARK_2026_MAJORS[0]
        );
      },
    }),
    {
      name: 'vact_target_major_storage',
    }
  )
);
