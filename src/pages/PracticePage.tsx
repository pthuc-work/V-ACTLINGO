import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  X,
  Flag,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Clock,
  RotateCcw,
  Download,
  BookOpen,
  Sparkles,
  HelpCircle,
  Eye,
  Check,
  Send,
  SlidersHorizontal,
} from 'lucide-react';
import { Button, Card, Chip, ProgressBar, useToast } from '../components/ui';
import { RichText } from '../components/ui/RichText';
import { getRepository } from '../data';
import { Question, Passage, SetEntity, SetProgress, ResumeState } from '../data/types';
import { isSeedDataLoaded, loadSeedData } from '../data/seed';
import { calculateStars, countScoredQuestions } from '../lib/game/stars';
import { calculateSessionXP } from '../lib/game/xp';
import { formatVietnamDate } from '../lib/game/dateUtils';
import { playCorrectSound, playIncorrectSound, playLessonCompleteSound } from '../lib/sound';
import { downloadScorecardFile, formatDuration } from '../lib/scorecard';
import { FormulaModal } from '../components/formula/FormulaModal';

type PracticeMode = 'practice' | 'exam';
type MatrixFilter = 'all' | 'unanswered' | 'flagged' | 'incorrect';

export const PracticePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast, success, error, info } = useToast();

  const querySetId = searchParams.get('setId');
  const queryMode = searchParams.get('mode') as PracticeMode | null;
  const initialFilter = searchParams.get('filter') as MatrixFilter | null;

  // Loading & Data State
  const [loading, setLoading] = useState(true);
  const [currentSet, setCurrentSet] = useState<SetEntity | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [passages, setPassages] = useState<Record<string, Passage>>({});
  const [mode, setMode] = useState<PracticeMode>(queryMode === 'exam' ? 'exam' : 'practice');

  // Session State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [firstAttemptAnswers, setFirstAttemptAnswers] = useState<Record<string, number | null>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [matrixFilter, setMatrixFilter] = useState<MatrixFilter>(initialFilter || 'all');
  const [overrideModalQId, setOverrideModalQId] = useState<string | null>(null);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);

  // Resume state ref to prevent initial save loop
  const isLoadedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasRestoredToastRef = useRef(false);

  // ---------------------------------------------------------------------------
  // 1. Data Initialization & Resume State Restoration
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    hasRestoredToastRef.current = false;

    async function loadData() {
      setLoading(true);
      try {
        const repo = getRepository();

        // 1. Ensure seed data loaded if empty
        const seedLoaded = await isSeedDataLoaded(repo);
        if (!seedLoaded) {
          await loadSeedData(repo);
        }

        // 2. Resolve Set
        const allSets = await repo.getSets();
        let targetSet: SetEntity | null = null;

        if (querySetId) {
          targetSet = (await repo.getSet(querySetId)) || allSets.find((s) => s.id === querySetId) || null;
        }

        if (!targetSet) {
          const storedSetId = localStorage.getItem('vact_current_set_id');
          if (storedSetId) {
            targetSet = (await repo.getSet(storedSetId)) || allSets.find((s) => s.id === storedSetId) || null;
          }
        }

        if (!targetSet && allSets.length > 0) {
          // Prefer "Bài tập áp dụng" if present, else first set
          targetSet = allSets.find((s) => s.name.toLowerCase().includes('áp dụng')) || allSets[0];
        }

        if (!targetSet) {
          if (isMounted) setLoading(false);
          return;
        }

        if (isMounted) {
          setCurrentSet(targetSet);
          localStorage.setItem('vact_current_set_id', targetSet.id);
        }

        // 3. Load Questions & Passages
        const fetchedQuestions = await repo.getQuestions(targetSet.id);
        // Sort questions by position/no
        fetchedQuestions.sort((a, b) => (a.position ?? a.no) - (b.position ?? b.no));

        const setPassagesList = await repo.getPassages(targetSet.id);
        const passageMap: Record<string, Passage> = {};
        for (const p of setPassagesList) {
          passageMap[p.id] = p;
        }

        // 4. Check for saved resume_state in SetProgress
        const progress = await repo.getSetProgress(targetSet.id);
        const resume: ResumeState | null = (progress?.resume_state ?? (progress as any)?.resumeState) || null;

        if (isMounted) {
          setQuestions(fetchedQuestions);
          setPassages(passageMap);

          if (resume && !progress?.completed) {
            setCurrentIndex(Math.min(resume.currentQuestionIndex || 0, Math.max(0, fetchedQuestions.length - 1)));
            setAnswers(resume.answers || {});
            setFlags(resume.flags || {});
            if (resume.mode) setMode(resume.mode);
            if (resume.timeSpentSeconds) setTimeSpentSeconds(resume.timeSpentSeconds);
            if (resume.submitted) setIsSubmitted(resume.submitted);
            if (!hasRestoredToastRef.current) {
              hasRestoredToastRef.current = true;
              info(`Đã khôi phục bài làm dở: Câu ${(resume.currentQuestionIndex || 0) + 1}`);
            }
          } else if (progress?.completed && resume?.answers) {
            // If already completed previously, restore answers to allow review
            setAnswers(resume.answers || {});
            setFlags(resume.flags || {});
            setIsSubmitted(true);
          }

          setLoading(false);
          isLoadedRef.current = true;
        }
      } catch (err) {
        console.error('Error loading practice data:', err);
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [querySetId]);

  // ---------------------------------------------------------------------------
  // 2. Timer
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (loading || isSubmitted) return;

    timerRef.current = setInterval(() => {
      setTimeSpentSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, isSubmitted]);

  // ---------------------------------------------------------------------------
  // 3. Question Scoring Computations
  // ---------------------------------------------------------------------------
  const currentQuestion: Question | undefined = questions[currentIndex];

  const scoredQuestions = useMemo(() => {
    return questions.filter((q) => q.correctIndex !== null && q.correctIndex !== undefined);
  }, [questions]);

  const totalScored = scoredQuestions.length;

  const correctCount = useMemo(() => {
    let count = 0;
    for (const q of scoredQuestions) {
      if (answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] === q.correctIndex) {
        count++;
      }
    }
    return count;
  }, [scoredQuestions, answers]);

  const answeredCount = useMemo(() => {
    return Object.values(answers).filter((a) => a !== null && a !== undefined).length;
  }, [answers]);

  const currentStars = useMemo(() => {
    return calculateStars(correctCount, totalScored);
  }, [correctCount, totalScored]);

  // ---------------------------------------------------------------------------
  // 4. Autosave Resume State to Repository
  // ---------------------------------------------------------------------------
  const saveResumeState = useCallback(
    async (overrideIndex?: number) => {
      if (!isLoadedRef.current || !currentSet || isSubmitted) return;

      try {
        const repo = getRepository();
        const resume: ResumeState = {
          currentQuestionIndex: overrideIndex !== undefined ? overrideIndex : currentIndex,
          answers,
          flags,
          mode,
          timeSpentSeconds,
          submitted: false,
        };

        const existingProgress = await repo.getSetProgress(currentSet.id);

        await repo.saveSetProgress({
          setId: currentSet.id,
          completed: false,
          score: correctCount,
          totalQuestions: questions.length,
          stars: currentStars,
          attemptsCount: existingProgress?.attemptsCount || 1,
          lastAttemptedAt: new Date().toISOString(),
          position: currentSet.position ?? 0,
          resume_state: resume,
          resumeState: resume,
        });
      } catch (err) {
        console.warn('Could not autosave resume state:', err);
      }
    },
    [currentSet, isSubmitted, currentIndex, answers, flags, mode, timeSpentSeconds, correctCount, questions.length, currentStars]
  );

  useEffect(() => {
    if (isLoadedRef.current && !isSubmitted) {
      saveResumeState();
    }
  }, [currentIndex, answers, flags, mode, saveResumeState, isSubmitted]);

  // ---------------------------------------------------------------------------
  // 5. User Actions
  // ---------------------------------------------------------------------------
  const handleSelectOption = (index: number) => {
    if (!currentQuestion) return;

    // In practice mode, lock once chosen unless changing wasn't checked
    if (mode === 'practice' && answers[currentQuestion.id] !== undefined && answers[currentQuestion.id] !== null) {
      return;
    }

    const isFirstTry = firstAttemptAnswers[currentQuestion.id] === undefined;
    if (isFirstTry) {
      setFirstAttemptAnswers((prev) => ({ ...prev, [currentQuestion.id]: index }));
    }

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: index,
    }));

    if (mode === 'practice') {
      const isRight = currentQuestion.correctIndex !== null && index === currentQuestion.correctIndex;
      if (isRight) {
        playCorrectSound();
      } else {
        playIncorrectSound();
      }
    }
  };

  const handleToggleFlag = () => {
    if (!currentQuestion) return;
    setFlags((prev) => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id],
    }));
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      saveResumeState(newIndex);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      saveResumeState(newIndex);
    } else {
      // Last question reached
      if (mode === 'exam' && !isSubmitted) {
        handleSubmitExam();
      } else {
        handleFinishSession();
      }
    }
  };

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input, textarea, or editable element
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const key = e.key.toLowerCase();

      // Options: A, B, C, D or 1, 2, 3, 4
      if (key === 'a' || key === '1') {
        e.preventDefault();
        handleSelectOption(0);
      } else if (key === 'b' || key === '2') {
        e.preventDefault();
        handleSelectOption(1);
      } else if (key === 'c' || key === '3') {
        e.preventDefault();
        handleSelectOption(2);
      } else if (key === 'd' || key === '4') {
        e.preventDefault();
        handleSelectOption(3);
      } else if (key === 'arrowleft') {
        e.preventDefault();
        handlePrev();
      } else if (key === 'arrowright') {
        e.preventDefault();
        handleNext();
      } else if (key === 'f') {
        e.preventDefault();
        handleToggleFlag();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentIndex, questions.length, answers, currentQuestion, mode, handlePrev, handleNext]);

  // AI Answer Override Handler
  const handleOverrideAnswer = async (questionId: string, newCorrectIndex: number) => {
    try {
      const repo = getRepository();
      await repo.updateQuestion(questionId, {
        correctIndex: newCorrectIndex,
        answerSource: 'user',
        verified: true,
      });

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, correctIndex: newCorrectIndex, answerSource: 'user', verified: true }
            : q
        )
      );

      setOverrideModalQId(null);
      success(`Đã cập nhật đáp án đúng thành ${String.fromCharCode(65 + newCorrectIndex)}!`);
    } catch (err) {
      console.error('Failed to override answer:', err);
      error('Lỗi khi cập nhật đáp án.');
    }
  };

  // Reset Set
  const handleResetSet = async () => {
    if (!window.confirm('Bạn có chắc muốn làm lại toàn bộ bộ đề này từ đầu?')) {
      return;
    }

    setAnswers({});
    setFirstAttemptAnswers({});
    setFlags({});
    setTimeSpentSeconds(0);
    setCurrentIndex(0);
    setIsSubmitted(false);

    if (currentSet) {
      try {
        const repo = getRepository();
        await repo.saveSetProgress({
          setId: currentSet.id,
          completed: false,
          score: 0,
          totalQuestions: questions.length,
          stars: 0,
          attemptsCount: 1,
          position: currentSet.position ?? 0,
          resume_state: null,
          resumeState: null,
        });
      } catch (err) {
        console.warn('Error clearing progress:', err);
      }
    }

    info('Đã thiết lập lại bài tập!');
  };

  // Submit Exam
  const handleSubmitExam = async () => {
    if (answeredCount < questions.length) {
      const unanswered = questions.length - answeredCount;
      const confirm = window.confirm(`Bạn còn ${unanswered} câu chưa trả lời. Bạn có chắc chắn muốn nộp bài?`);
      if (!confirm) return;
    }

    setIsSubmitted(true);
    playLessonCompleteSound();
    await recordSessionAndNavigate();
  };

  // Finish Practice Session
  const handleFinishSession = async () => {
    setIsSubmitted(true);
    playLessonCompleteSound();
    await recordSessionAndNavigate();
  };

  // Record attempts, progress, XP, streak in repository and navigate
  const recordSessionAndNavigate = async () => {
    if (!currentSet) return;

    try {
      const repo = getRepository();

      // 1. Record Question Attempts
      for (const q of questions) {
        const selected = answers[q.id];
        const isAnswered = selected !== null && selected !== undefined;
        const isRight = isAnswered && q.correctIndex !== null && selected === q.correctIndex;

        await repo.recordAttempt({
          questionId: q.id,
          setId: currentSet.id,
          selectedIndex: isAnswered ? selected : null,
          isCorrect: isRight,
          isFlagged: flags[q.id] || false,
          timeSpentSeconds: Math.round(timeSpentSeconds / Math.max(1, questions.length)),
          position: q.position ?? q.no,
        });
      }

      // 2. Compute XP
      let firstAttemptCorrectCount = 0;
      for (const q of scoredQuestions) {
        if (firstAttemptAnswers[q.id] !== undefined && firstAttemptAnswers[q.id] === q.correctIndex) {
          firstAttemptCorrectCount++;
        }
      }

      const existingProgress = await repo.getSetProgress(currentSet.id);
      const previousStars = existingProgress?.stars || 0;

      const xpResult = calculateSessionXP({
        correctFirstAttemptsCount: firstAttemptCorrectCount,
        isSetCompleted: true,
        previousStars,
        currentStars,
      });

      // 3. Update User Stats & Streak
      const userStats = await repo.getUserStats();
      const todayVN = formatVietnamDate(new Date());
      let newStreak = userStats.streak || 0;

      if (userStats.lastActiveDate !== todayVN) {
        newStreak = Math.max(1, (userStats.streak || 0) + 1);
      }

      const maxStreak = Math.max(userStats.maxStreak || 0, newStreak);

      await repo.updateUserStats({
        xp: (userStats.xp || 0) + xpResult.totalXP,
        streak: newStreak,
        maxStreak,
        lastActiveDate: todayVN,
      });

      // 4. Save Final SetProgress
      const finalStars = Math.max(previousStars, currentStars);
      const finalResume: ResumeState = {
        currentQuestionIndex: currentIndex,
        answers,
        flags,
        mode,
        timeSpentSeconds,
        submitted: true,
      };

      await repo.saveSetProgress({
        setId: currentSet.id,
        completed: true,
        score: correctCount,
        totalQuestions: questions.length,
        stars: finalStars,
        attemptsCount: (existingProgress?.attemptsCount || 0) + 1,
        lastAttemptedAt: new Date().toISOString(),
        position: currentSet.position ?? 0,
        resume_state: finalResume,
        resumeState: finalResume,
      });

      // 5. Navigate to Completion
      const wrongIds = questions
        .filter((q) => q.correctIndex !== null && answers[q.id] !== q.correctIndex)
        .map((q) => q.id);

      navigate('/completion', {
        state: {
          setId: currentSet.id,
          setName: currentSet.name,
          score: correctCount,
          totalQuestions: questions.length,
          scoredQuestions: totalScored,
          stars: currentStars,
          timeSpentSeconds,
          earnedXp: xpResult.totalXP,
          streak: newStreak,
          answers,
          flags,
          wrongQuestionIds: wrongIds,
        },
      });
    } catch (err) {
      console.error('Error completing practice session:', err);
      // Fallback navigation
      navigate('/completion');
    }
  };

  // Exit back to roadmap
  const handleExit = () => {
    saveResumeState();
    navigate('/');
  };

  // Download scorecard text file
  const handleDownloadScorecard = () => {
    if (!currentSet) return;
    downloadScorecardFile({
      setName: currentSet.name,
      timeSpentSeconds,
      totalQuestions: questions.length,
      scoredQuestions: totalScored,
      correctCount,
      stars: currentStars,
      earnedXp: correctCount * 10 + 20,
      questions,
      answers,
      flags,
    });
    success('Đã tải phiếu kết quả (.txt)!');
  };

  // ---------------------------------------------------------------------------
  // 6. Matrix Item Filter Logic
  // ---------------------------------------------------------------------------
  const filteredQuestionIndices = useMemo(() => {
    return questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q }) => {
        if (matrixFilter === 'unanswered') {
          return answers[q.id] === undefined || answers[q.id] === null;
        }
        if (matrixFilter === 'flagged') {
          return flags[q.id] === true;
        }
        if (matrixFilter === 'incorrect') {
          const ans = answers[q.id];
          return ans !== undefined && ans !== null && q.correctIndex !== null && ans !== q.correctIndex;
        }
        return true;
      })
      .map(({ idx }) => idx);
  }, [questions, matrixFilter, answers, flags]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-base font-extrabold text-surface-secondary">Đang tải bộ câu hỏi V-ACT...</p>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <h2 className="text-2xl font-black text-surface-primary">Không tìm thấy câu hỏi</h2>
        <p className="text-surface-secondary font-bold mt-2">Bộ đề này hiện chưa có câu hỏi nào.</p>
        <Button variant="primary" className="mt-4" onClick={() => navigate('/')}>
          Về Lộ trình
        </Button>
      </div>
    );
  }

  const currentPassage = currentQuestion.passageId ? passages[currentQuestion.passageId] : null;
  const currentAnswer = answers[currentQuestion.id];
  const isCurrentAnswered = currentAnswer !== undefined && currentAnswer !== null;
  const isPracticeReveal = mode === 'practice' && isCurrentAnswered;
  const isExamReveal = mode === 'exam' && isSubmitted;
  const showFeedback = isPracticeReveal || isExamReveal;
  const isCurrentCorrect = isCurrentAnswered && currentQuestion.correctIndex !== null && currentAnswer === currentQuestion.correctIndex;
  const isCurrentFlagged = flags[currentQuestion.id] || false;
  const isAiUnverified = (currentQuestion.answerSource === 'ai' || (currentQuestion as any).answer_source === 'ai') && !currentQuestion.verified;

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)] max-w-7xl mx-auto w-full px-2 sm:px-4 pb-28">
      {/* =======================================================================
          TOP BAR
          ======================================================================= */}
      <div className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-brand-border/80 py-3 mb-4 -mx-2 sm:-mx-4 px-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          {/* Close Button */}
          <button
            type="button"
            onClick={handleExit}
            className="p-2 rounded-2xl text-surface-secondary hover:text-surface-primary hover:bg-brand-border/40 transition-colors shrink-0"
            title="Thoát về lộ trình"
            aria-label="Thoát"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Progress Bar */}
          <div className="flex-1 max-w-md hidden sm:block">
            <ProgressBar value={answeredCount} max={questions.length} color="blue" size="md" />
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-brand-border/30 p-1 rounded-2xl border border-brand-border/60 shrink-0">
            <button
              type="button"
              onClick={() => setMode('practice')}
              className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-black transition-all ${
                mode === 'practice'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'text-surface-secondary hover:text-surface-primary'
              }`}
              title="Xem đáp án và giải thích ngay khi chọn"
            >
              Luyện tập
            </button>
            <button
              type="button"
              onClick={() => setMode('exam')}
              className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-black transition-all ${
                mode === 'exam'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'text-surface-secondary hover:text-surface-primary'
              }`}
              title="Làm toàn bộ bài thi, chấm điểm khi nộp"
            >
              Thi thử
            </button>
          </div>

          {/* Accuracy Counter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-black text-xs sm:text-sm shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              {mode === 'practice' || isSubmitted
                ? `Đúng ${correctCount}/${totalScored}`
                : `Đã làm ${answeredCount}/${questions.length}`}
            </span>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-brand-border/40 border border-brand-border font-black text-xs sm:text-sm text-surface-primary shrink-0">
            <Clock className="w-4 h-4 text-brand-blue" />
            <span>{formatDuration(timeSpentSeconds)}</span>
          </div>

          {/* Formula Modal Button */}
          <button
            type="button"
            onClick={() => setIsFormulaModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-brand-blue/10 hover:bg-brand-blue/20 border border-brand-blue/30 text-brand-blue font-black text-xs sm:text-sm shrink-0 transition-colors"
            title="Mở bảng công thức chuyên đề"
            aria-label="Bảng công thức"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden md:inline">Công thức</span>
          </button>
        </div>

        {/* Mobile Progress Bar */}
        <div className="mt-2 block sm:hidden">
          <ProgressBar value={answeredCount} max={questions.length} color="blue" size="sm" />
        </div>
      </div>

      {/* =======================================================================
          MAIN CONTENT AREA (Passage + Question + Right Matrix)
          ======================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left/Middle Column: Question & (optional) Passage */}
        <div className={`flex flex-col gap-5 ${currentPassage ? 'lg:col-span-8' : 'lg:col-span-8'}`}>
          {/* Passage View (if present) */}
          {currentPassage && (
            <Card variant="3d" padding="md" className="border-brand-border bg-brand-card/70">
              <div className="flex items-center gap-2 mb-2 text-brand-blue font-black text-xs uppercase tracking-wider">
                <BookOpen className="w-4 h-4" />
                <span>Đoạn văn đọc hiểu</span>
              </div>
              {currentPassage.title && (
                <h3 className="text-base font-extrabold text-surface-primary mb-2">
                  {currentPassage.title}
                </h3>
              )}
              <div className="max-h-72 overflow-y-auto pr-2 text-sm leading-relaxed text-surface-secondary border-t border-brand-border/40 pt-2">
                <RichText content={currentPassage.content} />
              </div>
            </Card>
          )}

          {/* Question Metadata Chips & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Chip variant="primary" size="md">
                Câu {currentIndex + 1} / {questions.length}
              </Chip>

              {currentQuestion.category && (
                <Chip variant="neutral" size="md">
                  {currentQuestion.category}
                </Chip>
              )}

              {/* Null correctIndex check */}
              {currentQuestion.correctIndex === null ? (
                <Chip variant="neutral" size="md" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Chưa có đáp án
                </Chip>
              ) : isAiUnverified ? (
                <div className="flex items-center gap-1">
                  <Chip variant="ai" size="md" className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> AI tạo
                  </Chip>
                  <button
                    type="button"
                    onClick={() => setOverrideModalQId(currentQuestion.id)}
                    className="text-xs font-bold text-brand-blue hover:underline px-1.5 py-0.5 rounded bg-brand-blue/10"
                    title="Nhấn để sửa lại đáp án đúng"
                  >
                    Đáp án sai?
                  </button>
                </div>
              ) : (
                <Chip variant="verified" size="md">
                  Đã xác minh
                </Chip>
              )}
            </div>

            {/* Flag Button */}
            <button
              type="button"
              onClick={handleToggleFlag}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-extrabold transition-all border ${
                isCurrentFlagged
                  ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 shadow-sm'
                  : 'text-surface-secondary hover:text-surface-primary bg-brand-card hover:bg-brand-border/40 border-brand-border'
              }`}
              title="Đánh dấu câu hỏi để xem lại sau (Phím F)"
            >
              <Flag className={`w-4 h-4 ${isCurrentFlagged ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span>{isCurrentFlagged ? 'Đã gắn cờ' : 'Gắn cờ'}</span>
            </button>
          </div>

          {/* AI Override Selector (when opened) */}
          {overrideModalQId === currentQuestion.id && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/80 border-2 border-amber-300 dark:border-amber-700 text-xs">
              <p className="font-extrabold text-amber-900 dark:text-amber-200 mb-2">
                Sửa đáp án đúng của câu này thành:
              </p>
              <div className="flex items-center gap-2">
                {currentQuestion.options.map((_, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => handleOverrideAnswer(currentQuestion.id, optIdx)}
                      className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center transition-all ${
                        currentQuestion.correctIndex === optIdx
                          ? 'bg-amber-500 text-white'
                          : 'bg-brand-card text-surface-primary border border-brand-border hover:bg-amber-100 dark:hover:bg-amber-900/40'
                      }`}
                    >
                      {letter}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setOverrideModalQId(null)}
                  className="ml-auto text-xs font-bold text-surface-secondary hover:text-surface-primary px-2 py-1"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          {/* Figure View (if present) */}
          {currentQuestion.figure && currentQuestion.figure.url && (
            <div className="flex flex-col items-center p-3 rounded-2xl bg-brand-card border border-brand-border">
              <img
                src={currentQuestion.figure.url}
                alt={currentQuestion.figure.caption || 'Hình minh họa'}
                className="max-h-64 object-contain rounded-xl border border-brand-border/60"
              />
              {currentQuestion.figure.caption && (
                <p className="text-xs italic text-surface-secondary mt-1.5 font-semibold">
                  {currentQuestion.figure.caption}
                </p>
              )}
            </div>
          )}

          {/* Question Prompt */}
          <Card variant="3d" padding="lg" className="border-brand-border/90">
            <div className="text-lg sm:text-xl font-bold text-surface-primary leading-relaxed">
              <RichText content={currentQuestion.prompt} />
            </div>
          </Card>

          {/* 4 Options Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {currentQuestion.options.map((option, index) => {
              const letter = String.fromCharCode(65 + index);
              const isSelected = currentAnswer === index;
              const isOptionRight = currentQuestion.correctIndex === index;

              let buttonStyle =
                'bg-brand-card border-2 border-brand-border hover:border-brand-blue/60 text-surface-primary shadow-sm hover:translate-y-[-1px]';
              let badgeStyle = 'bg-brand-border/40 text-surface-secondary border-brand-border/80';

              if (showFeedback) {
                if (isOptionRight) {
                  buttonStyle =
                    'bg-emerald-50 dark:bg-emerald-950/60 border-2 border-brand-green text-surface-primary font-bold shadow-md';
                  badgeStyle = 'bg-brand-green text-white border-brand-green-press';
                } else if (isSelected) {
                  buttonStyle =
                    'bg-rose-50 dark:bg-rose-950/60 border-2 border-brand-red text-surface-primary font-bold shadow-md';
                  badgeStyle = 'bg-brand-red text-white border-brand-red-press';
                } else {
                  buttonStyle = 'bg-brand-card/50 border border-brand-border/40 opacity-60 text-surface-muted';
                }
              } else if (isSelected) {
                // Exam mode selection
                buttonStyle =
                  'bg-brand-blue-light/50 border-2 border-brand-blue text-brand-blue font-extrabold shadow-pop translate-y-[-1px]';
                badgeStyle = 'bg-brand-blue text-white border-brand-blue-press';
              }

              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => handleSelectOption(index)}
                  disabled={showFeedback && mode === 'practice'}
                  className={`flex items-center gap-3.5 p-4 rounded-2xl text-left transition-all duration-100 cursor-pointer outline-none ${buttonStyle}`}
                >
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${badgeStyle}`}
                  >
                    {letter}
                  </span>
                  <div className="text-base font-bold flex-1 leading-normal">
                    <RichText content={option} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explanation & Formula Box (When Revealed) */}
          {showFeedback && (
            <div
              className={`p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 ${
                isCurrentCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/70 border-brand-green text-slate-900 dark:text-emerald-100 shadow-md'
                  : 'bg-rose-50 dark:bg-rose-950/70 border-brand-red text-slate-900 dark:text-rose-100 shadow-md'
              }`}
            >
              <div className="flex items-start gap-3">
                {isCurrentCorrect ? (
                  <CheckCircle2 className="w-7 h-7 text-brand-green shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-7 h-7 text-brand-red shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h4 className="text-base sm:text-lg font-black leading-tight">
                    {isCurrentCorrect ? 'Chính xác! +10 XP 🎉' : 'Chưa chính xác!'}
                  </h4>

                  {!isCurrentCorrect && currentQuestion.correctIndex !== null && (
                    <p className="text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-300 mt-1">
                      Đáp án đúng:{' '}
                      <span className="font-extrabold underline">
                        {String.fromCharCode(65 + currentQuestion.correctIndex)}.{' '}
                        {currentQuestion.options[currentQuestion.correctIndex]}
                      </span>
                    </p>
                  )}

                  {/* Formula */}
                  {currentQuestion.formula && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-brand-border/50 text-xs sm:text-sm font-semibold">
                      <span className="font-extrabold text-brand-blue uppercase text-[11px] block mb-0.5">
                        Công thức:
                      </span>
                      <RichText content={currentQuestion.formula} />
                    </div>
                  )}

                  {/* Explanation */}
                  {currentQuestion.explanation && (
                    <div className="mt-2 text-xs sm:text-sm font-medium text-surface-secondary leading-relaxed">
                      <span className="font-extrabold text-surface-primary block mb-0.5">Giải thích:</span>
                      <RichText content={currentQuestion.explanation} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =====================================================================
            RIGHT COLUMN: Question Matrix & Actions
            ===================================================================== */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <Card variant="3d" padding="md" className="border-brand-border">
            {/* Header with Title & Filter Tabs */}
            <div className="flex items-center justify-between pb-3 border-b border-brand-border/60 mb-3">
              <h3 className="font-black text-sm text-surface-primary flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-brand-blue" />
                <span>Bảng câu hỏi ({questions.length})</span>
              </h3>
            </div>

            {/* Matrix Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3">
              <button
                type="button"
                onClick={() => setMatrixFilter('all')}
                className={`py-1 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                  matrixFilter === 'all'
                    ? 'bg-brand-blue text-white shadow-xs'
                    : 'bg-brand-border/30 text-surface-secondary hover:text-surface-primary'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setMatrixFilter('unanswered')}
                className={`py-1 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                  matrixFilter === 'unanswered'
                    ? 'bg-brand-blue text-white shadow-xs'
                    : 'bg-brand-border/30 text-surface-secondary hover:text-surface-primary'
                }`}
              >
                Chưa làm
              </button>
              <button
                type="button"
                onClick={() => setMatrixFilter('flagged')}
                className={`py-1 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                  matrixFilter === 'flagged'
                    ? 'bg-brand-blue text-white shadow-xs'
                    : 'bg-brand-border/30 text-surface-secondary hover:text-surface-primary'
                }`}
              >
                Gắn cờ
              </button>
              <button
                type="button"
                onClick={() => setMatrixFilter('incorrect')}
                className={`py-1 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                  matrixFilter === 'incorrect'
                    ? 'bg-brand-blue text-white shadow-xs'
                    : 'bg-brand-border/30 text-surface-secondary hover:text-surface-primary'
                }`}
              >
                Làm sai
              </button>
            </div>

            {/* 5-Column Question Grid */}
            <div className="grid grid-cols-5 gap-2 max-h-[360px] overflow-y-auto p-1">
              {questions.map((q, idx) => {
                const ans = answers[q.id];
                const isAns = ans !== null && ans !== undefined;
                const isFlag = flags[q.id] || false;
                const isCur = currentIndex === idx;
                const isFilteredOut = !filteredQuestionIndices.includes(idx);

                let btnStyle = 'bg-brand-card text-surface-primary border-2 border-brand-border hover:border-brand-blue/60';

                if (mode === 'practice' || isSubmitted) {
                  if (isAns) {
                    if (q.correctIndex === null) {
                      btnStyle = 'bg-slate-200 dark:bg-slate-800 text-surface-secondary border-2 border-slate-300';
                    } else if (ans === q.correctIndex) {
                      btnStyle = 'bg-brand-green text-white border-2 border-brand-green font-black';
                    } else {
                      btnStyle = 'bg-brand-red text-white border-2 border-brand-red font-black';
                    }
                  }
                } else if (isAns) {
                  // Exam mode: answered
                  btnStyle = 'bg-blue-100 dark:bg-blue-950/80 text-brand-blue border-2 border-brand-blue font-black';
                }

                if (isCur) {
                  btnStyle += ' ring-2 ring-brand-blue ring-offset-2 dark:ring-offset-slate-900';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      saveResumeState(idx);
                    }}
                    className={`relative h-10 rounded-xl flex items-center justify-center text-xs font-extrabold transition-all duration-100 ${btnStyle} ${
                      isFilteredOut ? 'opacity-30' : 'opacity-100'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlag && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-between text-[11px] font-bold text-surface-secondary pt-3 mt-3 border-t border-brand-border/60">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-md bg-brand-green" /> Đúng
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-md bg-brand-red" /> Sai
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-md bg-amber-500" /> Cờ
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-md border-2 border-brand-border" /> Trắng
              </span>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5">
            <Button
              variant={mode === 'exam' && !isSubmitted ? 'primary' : 'success'}
              size="lg"
              fullWidth
              leftIcon={<Send className="w-5 h-5" />}
              onClick={mode === 'exam' && !isSubmitted ? handleSubmitExam : handleFinishSession}
            >
              {mode === 'exam' && !isSubmitted ? 'Nộp bài & Chấm điểm' : 'Hoàn thành bài tập'}
            </Button>

            <Button
              variant="outline"
              size="md"
              fullWidth
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleDownloadScorecard}
            >
              Tải phiếu kết quả (.txt)
            </Button>

            <Button
              variant="ghost"
              size="sm"
              fullWidth
              leftIcon={<RotateCcw className="w-4 h-4 text-surface-secondary" />}
              onClick={handleResetSet}
              className="text-surface-secondary hover:text-surface-primary"
            >
              Làm lại bộ đề này
            </Button>
          </div>
        </div>
      </div>

      {/* =======================================================================
          BOTTOM NAVIGATION BAR (Sticky footer)
          ======================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-brand-border py-3 px-4 sm:px-6 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Button
            variant="outline"
            size="md"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            Câu trước
          </Button>

          {/* Shortcuts hint */}
          <div className="hidden md:flex items-center gap-2 text-xs font-bold text-surface-secondary">
            <span>Phím tắt:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-brand-border/60 text-surface-primary font-mono text-[10px]">A-D / 1-4</kbd>
            <span>chọn</span>
            <kbd className="px-1.5 py-0.5 rounded bg-brand-border/60 text-surface-primary font-mono text-[10px]">← / →</kbd>
            <span>chuyển câu</span>
            <kbd className="px-1.5 py-0.5 rounded bg-brand-border/60 text-surface-primary font-mono text-[10px]">F</kbd>
            <span>gắn cờ</span>
          </div>

          <Button
            variant="primary"
            size="md"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={handleNext}
          >
            {currentIndex === questions.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo'}
          </Button>
        </div>
      </div>

      {/* Formula Modal */}
      <FormulaModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
        topicId={currentSet?.topicId}
      />
    </div>
  );
};
