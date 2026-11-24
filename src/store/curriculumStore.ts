import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CurriculumState {
  selectedSubjectId: string | null;
  selectedTopicId: string | null;
  setSelectedSubjectId: (id: string | null) => void;
  setSelectedTopicId: (id: string | null) => void;
}

export const useCurriculumStore = create<CurriculumState>()(
  persist(
    (set) => ({
      selectedSubjectId: null,
      selectedTopicId: null,
      setSelectedSubjectId: (id) => set({ selectedSubjectId: id, selectedTopicId: null }),
      setSelectedTopicId: (id) => set({ selectedTopicId: id }),
    }),
    {
      name: 'vact_active_curriculum',
    }
  )
);
