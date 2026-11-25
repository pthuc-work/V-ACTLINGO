import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CurriculumState {
  selectedSubjectId: string | null;
  selectedTopicId: string | null;
  lastTopicBySubject: Record<string, string>;
  setSelectedSubjectId: (id: string | null) => void;
  setSelectedTopicId: (id: string | null) => void;
  selectSubject: (subjectId: string, availableTopicIds?: string[]) => void;
  setCurriculum: (subjectId: string | null, topicId: string | null) => void;
  setLastTopicBySubject: (lastTopicBySubject: Record<string, string>) => void;
  resetCurriculum: () => void;
}

const initialState = {
  selectedSubjectId: null,
  selectedTopicId: null,
  lastTopicBySubject: {} as Record<string, string>,
};

export const useCurriculumStore = create<CurriculumState>()(
  persist(
    (set) => ({
      ...initialState,

      setSelectedSubjectId: (id) =>
        set((state) => {
          if (!id) {
            return { selectedSubjectId: null, selectedTopicId: null };
          }
          const remembered = state.lastTopicBySubject[id] || null;
          return {
            selectedSubjectId: id,
            selectedTopicId: remembered,
          };
        }),

      setSelectedTopicId: (id) =>
        set((state) => {
          const nextLast = { ...state.lastTopicBySubject };
          if (state.selectedSubjectId && id) {
            nextLast[state.selectedSubjectId] = id;
          }
          return {
            selectedTopicId: id,
            lastTopicBySubject: nextLast,
          };
        }),

      selectSubject: (subjectId: string, availableTopicIds: string[] = []) =>
        set((state) => {
          if (!subjectId) {
            return { selectedSubjectId: null, selectedTopicId: null };
          }
          let targetTopicId: string | null = null;
          const remembered = state.lastTopicBySubject[subjectId];

          if (remembered && (availableTopicIds.length === 0 || availableTopicIds.includes(remembered))) {
            targetTopicId = remembered;
          } else if (availableTopicIds.length > 0) {
            targetTopicId = availableTopicIds[0];
          } else {
            targetTopicId = null;
          }

          const nextLast = { ...state.lastTopicBySubject };
          if (targetTopicId) {
            nextLast[subjectId] = targetTopicId;
          }

          return {
            selectedSubjectId: subjectId,
            selectedTopicId: targetTopicId,
            lastTopicBySubject: nextLast,
          };
        }),

      setCurriculum: (subjectId, topicId) =>
        set((state) => {
          const nextLast = { ...state.lastTopicBySubject };
          if (subjectId && topicId) {
            nextLast[subjectId] = topicId;
          }
          return {
            selectedSubjectId: subjectId,
            selectedTopicId: topicId,
            lastTopicBySubject: nextLast,
          };
        }),

      setLastTopicBySubject: (lastTopicBySubject) =>
        set(() => ({
          lastTopicBySubject: { ...lastTopicBySubject },
        })),

      resetCurriculum: () => set(initialState),
    }),
    {
      name: 'vact_active_curriculum',
    }
  )
);
