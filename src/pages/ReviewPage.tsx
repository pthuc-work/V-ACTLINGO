import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Filter,
  Flame,
  Zap,
  ArrowRight,
  BookOpen,
  ArrowLeft,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Button, Card, Chip, ProgressBar } from '../components/ui';
import { RichText } from '../components/ui/RichText';
import { getRepository } from '../data';
import { Question, QuestionAttempt, SetEntity, Topic, Subject } from '../data/types';
import { calculateQuestionMistakeStatus, getMistakePool, QuestionMistakeStatus } from '../lib/review';
import { playCorrectSound, playIncorrectSound, playStarMilestoneSound, playLessonCompleteSound } from '../lib/sound';
import { SpacedRepetitionWidget } from '../components/SpacedRepetitionWidget';

export const ReviewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<QuestionAttempt[]>([]);
  const [sets, setSets] = useState<SetEntity[]>([]);

  // Filtering state
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get('category') || 'ALL'
  );
  const [filterConsecutive, setFilterConsecutive] = useState<'ALL' | '0' | '1'>('ALL');

  // Interactive Review Practice state
  const [activePracticeIndex, setActivePracticeIndex] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [earnedXpSession, setEarnedXpSession] = useState<number>(0);
  const [sessionClearedCount, setSessionClearedCount] = useState<number>(0);

  // Load all questions, attempts, and sets
  const loadData = async () => {
    try {
      const repo = getRepository();
      const [allQuestions, allAttempts, allSets] = await Promise.all([
        repo.getQuestions(),
        repo.getAttempts(),
        repo.getSets(),
      ]);
      setQuestions(allQuestions);
      setAttempts(allAttempts);
      setSets(allSets);
    } catch (err) {
      console.error('Error loading review data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute mistake pool
  const mistakeData = useMemo(() => {
    return getMistakePool(questions, attempts);
  }, [questions, attempts]);

  // Categories present in the mistake pool
  const categoriesInPool = useMemo(() => {
    const set = new Set<string>();
    mistakeData.activeMistakeQuestions.forEach((item) => {
      if (item.question.category) set.add(item.question.category);
    });
    return Array.from(set).sort();
  }, [mistakeData]);

  // Filtered mistake items
  const filteredMistakeItems = useMemo(() => {
    return mistakeData.activeMistakeQuestions.filter((item) => {
      if (selectedCategory !== 'ALL' && item.question.category !== selectedCategory) {
        return false;
      }
      if (filterConsecutive === '0' && item.status.consecutiveCorrect !== 0) {
        return false;
      }
      if (filterConsecutive === '1' && item.status.consecutiveCorrect !== 1) {
        return false;
      }
      return true;
    });
  }, [mistakeData, selectedCategory, filterConsecutive]);

  // Handle answering in review practice mode
  const handleSelectOption = async (optionIndex: number) => {
    if (isSubmitted || activePracticeIndex === null) return;
    const currentItem = filteredMistakeItems[activePracticeIndex];
    if (!currentItem) return;

    setSelectedOption(optionIndex);
    setIsSubmitted(true);

    const isCorrect = currentItem.question.correctIndex === optionIndex;
    const repo = getRepository();

    try {
      // 1. Record attempt in question_attempts
      await repo.recordAttempt({
        questionId: currentItem.question.id,
        setId: currentItem.question.setId,
        selectedIndex: optionIndex,
        isCorrect,
        isFlagged: false,
        timeSpentSeconds: 10,
        position: 0,
      });

      // 2. Award normal XP (+10 XP) on correct, WITHOUT reducing or altering original set stars!
      if (isCorrect) {
        playCorrectSound();
        const stats = await repo.getUserStats();
        await repo.updateUserStats({
          xp: (stats.xp || 0) + 10,
        });
        setEarnedXpSession((prev) => prev + 10);

        // If this makes it 2 in a row (previous consecutive was 1)
        if (currentItem.status.consecutiveCorrect === 1) {
          playStarMilestoneSound();
          setSessionClearedCount((prev) => prev + 1);
        }
      } else {
        playIncorrectSound();
      }

      // 3. Refresh attempts data
      const updatedAttempts = await repo.getAttempts();
      setAttempts(updatedAttempts);
    } catch (err) {
      console.error('Error recording review attempt:', err);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setIsSubmitted(false);

    if (activePracticeIndex !== null) {
      if (activePracticeIndex + 1 < filteredMistakeItems.length) {
        setActivePracticeIndex(activePracticeIndex + 1);
      } else {
        // End of list
        setActivePracticeIndex(null);
        playLessonCompleteSound();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-blue" />
        <p className="mt-4 text-sm font-bold text-surface-secondary">Đang tải kho câu sai...</p>
      </div>
    );
  }

  const activeQuestionItem =
    activePracticeIndex !== null ? filteredMistakeItems[activePracticeIndex] : null;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-12">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Chip variant="danger" size="sm" icon={<RotateCcw className="w-3.5 h-3.5" />}>
            KHO CÂU SAI (MISTAKE POOL)
          </Chip>
          <Chip variant="yellow" size="sm">
            Quy tắc: Đúng 2 lần liên tiếp để xóa
          </Chip>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-brand-navy dark:text-brand-blue tracking-tight">
          Ôn tập & Khắc phục câu sai
        </h1>
        <p className="text-xs sm:text-sm font-bold text-surface-secondary mt-1">
          Luyện tập các câu bạn từng làm sai. Làm đúng 2 lần liên tiếp sẽ tự động xóa câu hỏi khỏi kho sai. Điểm XP vẫn được cộng bình thường mà không ảnh hưởng sao của đề gốc!
        </p>
      </div>

      {/* Spaced Repetition Card Reminder */}
      <SpacedRepetitionWidget />

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card variant="default" padding="sm" className="border border-brand-border">
          <div className="text-[11px] font-bold text-surface-secondary uppercase">Cần khắc phục</div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {mistakeData.totalInPool}
          </div>
          <div className="text-[10px] font-semibold text-surface-muted mt-0.5">câu trong kho sai</div>
        </Card>

        <Card variant="default" padding="sm" className="border border-brand-border">
          <div className="text-[11px] font-bold text-surface-secondary uppercase">Đã xóa thành công</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {mistakeData.totalCleared}
          </div>
          <div className="text-[10px] font-semibold text-surface-muted mt-0.5">đúng 2 lần liên tiếp</div>
        </Card>

        <Card variant="default" padding="sm" className="border border-brand-border">
          <div className="text-[11px] font-bold text-surface-secondary uppercase">XP phiên ôn tập</div>
          <div className="text-2xl font-black text-brand-yellow mt-1 flex items-center gap-1">
            <Zap className="w-5 h-5 fill-current" />
            +{earnedXpSession}
          </div>
          <div className="text-[10px] font-semibold text-surface-muted mt-0.5">XP tích lũy phiên này</div>
        </Card>

        <Card variant="default" padding="sm" className="border border-brand-border">
          <div className="text-[11px] font-bold text-surface-secondary uppercase">Xóa trong phiên</div>
          <div className="text-2xl font-black text-brand-blue mt-1">
            {sessionClearedCount}
          </div>
          <div className="text-[10px] font-semibold text-surface-muted mt-0.5">câu vừa làm chủ</div>
        </Card>
      </div>

      {/* Interactive Practice Mode when an active index is selected */}
      {activeQuestionItem ? (
        <Card variant="3d" padding="lg" className="border-2 border-brand-blue/40 bg-brand-card">
          {/* Practice Top Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-brand-border mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActivePracticeIndex(null);
                  setSelectedOption(null);
                  setIsSubmitted(false);
                }}
                className="text-xs font-bold"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Dừng ôn
              </Button>
              <Chip variant="yellow" size="sm">
                Câu {(activePracticeIndex ?? 0) + 1} / {filteredMistakeItems.length}
              </Chip>
              {activeQuestionItem.question.category && (
                <Chip variant="primary" size="sm">
                  {activeQuestionItem.question.category}
                </Chip>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-surface-secondary">
                Tiến độ câu này:
              </span>
              <Chip
                variant={activeQuestionItem.status.consecutiveCorrect === 1 ? 'yellow' : 'neutral'}
                size="sm"
              >
                Đúng {activeQuestionItem.status.consecutiveCorrect}/2 lần
              </Chip>
            </div>
          </div>

          {/* Question Prompt */}
          <div className="mb-6">
            <div className="text-xs font-black uppercase text-surface-secondary mb-2">
              NỘI DUNG CÂU HỎI
            </div>
            <div className="text-lg font-black text-surface-primary leading-relaxed p-4 rounded-2xl bg-brand-bg border border-brand-border/80">
              <RichText content={activeQuestionItem.question.prompt} />
            </div>
          </div>

          {/* Figure if available */}
          {activeQuestionItem.question.figure && (
            <div className="mb-6 rounded-2xl overflow-hidden border border-brand-border bg-brand-bg p-2 flex flex-col items-center">
              <img
                src={activeQuestionItem.question.figure.url}
                alt={activeQuestionItem.question.figure.caption || 'Hình vẽ đính kèm'}
                className="max-h-60 object-contain rounded-xl"
              />
              {activeQuestionItem.question.figure.caption && (
                <span className="text-xs font-semibold text-surface-secondary mt-2">
                  {activeQuestionItem.question.figure.caption}
                </span>
              )}
            </div>
          )}

          {/* Options (A, B, C, D) */}
          <div className="grid grid-cols-1 gap-3 mb-6">
            {activeQuestionItem.question.options.map((opt, idx) => {
              const letter = ['A', 'B', 'C', 'D'][idx];
              const isSelected = selectedOption === idx;
              const isCorrectOpt = activeQuestionItem.question.correctIndex === idx;

              let btnClass = 'p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3 ';
              if (!isSubmitted) {
                btnClass +=
                  'bg-brand-bg hover:bg-brand-border/30 border-brand-border cursor-pointer text-surface-primary';
              } else if (isCorrectOpt) {
                btnClass += 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-bold';
              } else if (isSelected && !isCorrectOpt) {
                btnClass += 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-100 font-bold';
              } else {
                btnClass += 'bg-brand-bg/50 border-brand-border/50 text-surface-muted opacity-60';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => handleSelectOption(idx)}
                  className={btnClass}
                >
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      isSubmitted && isCorrectOpt
                        ? 'bg-emerald-500 text-white'
                        : isSubmitted && isSelected && !isCorrectOpt
                        ? 'bg-rose-500 text-white'
                        : 'bg-brand-card border border-brand-border text-surface-primary'
                    }`}
                  >
                    {letter}
                  </span>
                  <div className="text-sm sm:text-base font-semibold pt-0.5">
                    <RichText content={opt} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Answer Feedback & Explanation */}
          {isSubmitted && (
            <div className="p-4 rounded-2xl bg-brand-bg border border-brand-border mb-6">
              <div className="flex items-center gap-2 mb-2">
                {selectedOption === activeQuestionItem.question.correctIndex ? (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Chính xác! (+10 XP)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black">
                    <AlertCircle className="w-5 h-5" />
                    <span>Chưa chính xác. Đã đặt lại số lần đúng liên tiếp về 0/2.</span>
                  </div>
                )}
              </div>

              {/* Formula & Explanation */}
              {activeQuestionItem.question.formula && (
                <div className="mt-3 p-3 rounded-xl bg-brand-card border border-brand-blue/30 text-xs font-bold text-brand-blue">
                  <span className="text-[10px] uppercase font-black tracking-wider text-surface-secondary block mb-1">
                    CÔNG THỨC ÁP DỤNG:
                  </span>
                  <RichText content={activeQuestionItem.question.formula} />
                </div>
              )}

              {activeQuestionItem.question.explanation && (
                <div className="mt-3 text-xs sm:text-sm text-surface-secondary font-semibold leading-relaxed">
                  <span className="text-[10px] uppercase font-black tracking-wider text-surface-primary block mb-1">
                    GIẢI THÍCH CHI TIẾT:
                  </span>
                  <RichText content={activeQuestionItem.question.explanation} />
                </div>
              )}
            </div>
          )}

          {/* Bottom Actions */}
          <div className="flex items-center justify-end">
            {isSubmitted ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleNextQuestion}
                className="px-6 py-2.5 font-black text-sm"
              >
                {(activePracticeIndex ?? 0) + 1 < filteredMistakeItems.length
                  ? 'Câu tiếp theo →'
                  : 'Hoàn thành lượt ôn 🎉'}
              </Button>
            ) : (
              <div className="text-xs font-bold text-surface-muted italic">
                Chọn một đáp án để kiểm tra ngay lập tức
              </div>
            )}
          </div>
        </Card>
      ) : (
        /* Overview Mode & Mistake List */
        <div className="flex flex-col gap-4">
          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-brand-card border border-brand-border shadow-sm">
            <div>
              <div className="text-base font-black text-surface-primary">
                Sẵn sàng giải quyết {filteredMistakeItems.length} câu hỏi?
              </div>
              <div className="text-xs font-semibold text-surface-secondary mt-0.5">
                Mỗi câu làm đúng mang lại 10 XP và tiến gần hơn đến việc làm chủ hoàn toàn!
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              disabled={filteredMistakeItems.length === 0}
              onClick={() => {
                setActivePracticeIndex(0);
                setSelectedOption(null);
                setIsSubmitted(false);
              }}
              className="w-full sm:w-auto font-black px-6"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              BẮT ĐẦU LUYỆN TẬP CÂU SAI
            </Button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-surface-secondary flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Lọc dạng:
            </span>

            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'bg-brand-card hover:bg-brand-border/40 text-surface-secondary border border-brand-border'
              }`}
            >
              Tất cả ({mistakeData.totalInPool})
            </button>

            {categoriesInPool.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory === cat
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'bg-brand-card hover:bg-brand-border/40 text-surface-secondary border border-brand-border'
                }`}
              >
                {cat}
              </button>
            ))}

            <div className="h-4 w-px bg-brand-border mx-1 hidden sm:block" />

            <button
              type="button"
              onClick={() =>
                setFilterConsecutive((prev) =>
                  prev === 'ALL' ? '0' : prev === '0' ? '1' : 'ALL'
                )
              }
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-card border border-brand-border text-surface-secondary hover:text-surface-primary"
            >
              Đúng liên tiếp: {filterConsecutive === 'ALL' ? 'Tất cả' : `${filterConsecutive}/2`}
            </button>
          </div>

          {/* List of Mistakes */}
          {filteredMistakeItems.length === 0 ? (
            <Card variant="default" padding="lg" className="text-center py-12 border border-brand-border">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-surface-primary">
                {mistakeData.totalInPool === 0
                  ? 'Kho câu sai trống!'
                  : 'Không tìm thấy câu phù hợp với bộ lọc'}
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-surface-secondary max-w-md mx-auto mt-1">
                {mistakeData.totalInPool === 0
                  ? 'Tuyệt vời! Bạn không còn câu nào trong danh sách cần khắc phục. Hãy tiếp tục học bài mới trên Lộ trình!'
                  : 'Hãy đổi bộ lọc để xem các câu hỏi khác trong kho sai.'}
              </p>
              {mistakeData.totalInPool === 0 && (
                <Link to="/" className="inline-block mt-4">
                  <Button variant="primary" size="sm">
                    Về Lộ trình học →
                  </Button>
                </Link>
              )}
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredMistakeItems.map((item, idx) => (
                <Card
                  key={item.question.id}
                  variant="3d"
                  padding="md"
                  className="hover:border-brand-blue/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Chip variant="neutral" size="sm">
                        Câu #{item.question.no}
                      </Chip>
                      {item.question.category && (
                        <Chip variant="primary" size="sm">
                          {item.question.category}
                        </Chip>
                      )}
                      <Chip
                        variant={item.status.consecutiveCorrect === 1 ? 'yellow' : 'danger'}
                        size="sm"
                      >
                        Đúng {item.status.consecutiveCorrect}/2 lần
                      </Chip>
                      <span className="text-[11px] font-semibold text-surface-muted">
                        Đã làm sai {item.status.totalIncorrect} lần
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActivePracticeIndex(idx);
                        setSelectedOption(null);
                        setIsSubmitted(false);
                      }}
                      className="text-xs font-bold text-brand-blue shrink-0"
                    >
                      Luyện câu này →
                    </Button>
                  </div>

                  <div className="text-sm font-bold text-surface-primary mb-2">
                    <RichText content={item.question.prompt} />
                  </div>

                  {item.question.formula && (
                    <div className="p-2.5 rounded-xl bg-brand-bg border border-brand-border/70 text-xs font-mono text-brand-blue dark:text-brand-yellow">
                      <span className="text-[10px] font-bold uppercase text-surface-secondary block -mb-0.5">
                        Công thức:
                      </span>
                      <RichText content={item.question.formula} />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
