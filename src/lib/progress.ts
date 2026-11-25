import { SetEntity, SetProgress } from '../data/types';

export interface TopicProgressResult {
  completedSets: number;
  totalSets: number;
  setPercent: number;
  formattedSetsProgress: string;

  attemptedQuestions: number;
  totalQuestions: number;
  questionPercent: number;
  formattedQuestionsProgress: string;

  totalScore: number;
  accuracy: number | null;
  formattedAccuracy: string;
}

/**
 * Thống nhất cách tính tiến độ chuyên đề:
 * - Tiến độ bài: completedSets / totalSets (ví dụ: '1/3 bài (33%)')
 * - Tiến độ câu: attemptedQuestions / totalQuestions (ví dụ: '30/90 câu')
 * - Độ chính xác trung bình: Tính trên số câu ĐÃ LÀM (totalScore / attemptedQuestions).
 *   Nếu chưa làm câu nào (attemptedQuestions === 0), trả về '—' thay vì 0% hay 100%.
 */
export function calculateTopicProgress(
  sets: Array<{ id: string } | SetEntity>,
  progresses: Array<Partial<SetProgress> & { setId: string }>,
  questionsCountBySet?: Record<string, number>
): TopicProgressResult {
  const totalSets = sets.length;
  if (totalSets === 0) {
    return {
      completedSets: 0,
      totalSets: 0,
      setPercent: 0,
      formattedSetsProgress: '0/0 bài (0%)',
      attemptedQuestions: 0,
      totalQuestions: 0,
      questionPercent: 0,
      formattedQuestionsProgress: '0/0 câu',
      totalScore: 0,
      accuracy: null,
      formattedAccuracy: '—',
    };
  }

  const setIds = new Set(sets.map((s) => s.id));
  const progressMap = new Map<string, Partial<SetProgress>>();
  for (const p of progresses) {
    if (setIds.has(p.setId)) {
      progressMap.set(p.setId, p);
    }
  }

  let completedSets = 0;
  let totalQuestions = 0;
  let attemptedQuestions = 0;
  let totalScore = 0;

  for (const set of sets) {
    const p = progressMap.get(set.id);
    const setTotalQ =
      questionsCountBySet?.[set.id] ??
      (p?.totalQuestions && p.totalQuestions > 0 ? p.totalQuestions : 30);
    totalQuestions += setTotalQ;

    if (p) {
      const isCompleted = Boolean(p.completed || (p.stars && p.stars > 0));
      if (isCompleted) {
        completedSets += 1;
      }

      let attemptedInSet = 0;
      if (isCompleted) {
        attemptedInSet = p.totalQuestions || setTotalQ;
      } else if (typeof p.attemptsCount === 'number' && p.attemptsCount > 0) {
        attemptedInSet = Math.min(p.attemptsCount, setTotalQ);
      } else if (typeof p.score === 'number' && p.score > 0) {
        attemptedInSet = p.score;
      }

      attemptedQuestions += attemptedInSet;
      totalScore += p.score || 0;
    }
  }

  const setPercent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  const questionPercent =
    totalQuestions > 0 ? Math.round((attemptedQuestions / totalQuestions) * 100) : 0;

  let accuracy: number | null = null;
  let formattedAccuracy = '—';

  if (attemptedQuestions > 0) {
    accuracy = Math.min(100, Math.round((totalScore / attemptedQuestions) * 100));
    formattedAccuracy = `${accuracy}%`;
  }

  return {
    completedSets,
    totalSets,
    setPercent,
    formattedSetsProgress: `${completedSets}/${totalSets} bài (${setPercent}%)`,
    attemptedQuestions,
    totalQuestions,
    questionPercent,
    formattedQuestionsProgress: `${attemptedQuestions}/${totalQuestions} câu`,
    totalScore,
    accuracy,
    formattedAccuracy,
  };
}
