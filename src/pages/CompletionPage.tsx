import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Trophy,
  Zap,
  Target,
  Clock,
  RotateCcw,
  ArrowRight,
  Download,
  Flame,
  Award,
  Star,
  CheckCircle,
  HelpCircle,
  Sparkles,
  GraduationCap,
} from 'lucide-react';
import { Button, Card, StarRating, Confetti, useToast } from '../components/ui';
import { getRepository } from '../data';
import { SetEntity, Question, UserStats } from '../data/types';
import { calculateStars } from '../lib/game/stars';
import { useTargetMajorStore } from '../store/targetMajorStore';
import { downloadScorecardFile, formatDuration } from '../lib/scorecard';
import { playLessonCompleteSound } from '../lib/sound';

interface CompletionLocationState {
  setId?: string;
  setName?: string;
  score?: number;
  totalQuestions?: number;
  scoredQuestions?: number;
  stars?: number;
  timeSpentSeconds?: number;
  earnedXp?: number;
  streak?: number;
  answers?: Record<string, number | null>;
  flags?: Record<string, boolean>;
  wrongQuestionIds?: string[];
}

export const CompletionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { success, info } = useToast();

  const state = (location.state as CompletionLocationState) || {};
  const querySetId = searchParams.get('setId') || state.setId;

  const [loading, setLoading] = useState(!state.setName && !!querySetId);
  const [currentSet, setCurrentSet] = useState<SetEntity | null>(null);
  const [nextSet, setNextSet] = useState<SetEntity | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  // Target major info
  const targetMajor = useTargetMajorStore((s) => s.getTargetMajor());

  // Fallback defaults from state
  const score = state.score ?? 28;
  const totalQuestions = state.totalQuestions ?? 30;
  const scoredQuestions = state.scoredQuestions ?? 30;
  const stars = state.stars ?? calculateStars(score, scoredQuestions);
  const timeSpentSeconds = state.timeSpentSeconds ?? 765; // ~12m 45s
  const earnedXp = state.earnedXp ?? 50;
  const streak = state.streak ?? 1;
  const setName = state.setName || currentSet?.name || 'Bài tập áp dụng';
  const wrongIds = state.wrongQuestionIds || [];
  const wrongCount = totalQuestions - score;

  const percentage = scoredQuestions > 0 ? Math.round((score / scoredQuestions) * 100) : 0;

  // Sound effect & load set details if missing
  useEffect(() => {
    playLessonCompleteSound();

    let isMounted = true;
    async function loadCompletionData() {
      try {
        const repo = getRepository();
        const stats = await repo.getUserStats();
        if (isMounted) setUserStats(stats);

        if (querySetId) {
          const set = await repo.getSet(querySetId);
          if (set && isMounted) {
            setCurrentSet(set);

            // Find next set in the same topic
            const topicSets = await repo.getSets(set.topicId);
            topicSets.sort((a, b) => a.position - b.position);
            const curIdx = topicSets.findIndex((s) => s.id === set.id);
            if (curIdx >= 0 && curIdx < topicSets.length - 1) {
              setNextSet(topicSets[curIdx + 1]);
            }

            const qs = await repo.getQuestions(set.id);
            if (isMounted) setQuestions(qs);
          }
        }
      } catch (err) {
        console.warn('Error loading completion context:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCompletionData();

    return () => {
      isMounted = false;
    };
  }, [querySetId]);

  // Handle Download Scorecard File
  const handleDownloadScorecard = () => {
    downloadScorecardFile({
      setName,
      timeSpentSeconds,
      totalQuestions,
      scoredQuestions,
      correctCount: score,
      stars,
      earnedXp,
      questions,
      answers: state.answers || {},
      flags: state.flags || {},
    });

    success('Đã tải phiếu kết quả (.txt)!');
  };

  // Handle Review Wrong Questions
  const handleReviewWrong = () => {
    if (wrongCount <= 0) {
      info('Bạn đã làm đúng 100% câu hỏi! Tuyệt vời!');
      navigate(`/practice?setId=${querySetId || ''}`);
      return;
    }

    navigate(`/practice?setId=${querySetId || ''}&filter=incorrect`);
  };

  // Handle Next Set / Continue
  const handleNextSet = () => {
    if (nextSet) {
      navigate(`/practice?setId=${nextSet.id}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] max-w-2xl mx-auto w-full px-4 py-8 text-center">
      {/* Confetti Explosion on mount */}
      <Confetti durationMs={4000} />

      {/* Trophy & Glowing Badge */}
      <div className="relative mb-6">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-amber-400 text-slate-900 flex items-center justify-center shadow-pop border-4 border-amber-300 animate-bounce duration-1000 mx-auto">
          <Trophy className="w-12 h-12 sm:w-14 sm:h-14 fill-amber-200 text-amber-700" />
        </div>
        <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-brand-green text-white shadow-md border-2 border-white dark:border-slate-900">
          <Sparkles className="w-5 h-5 fill-white" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl sm:text-4xl font-black text-surface-primary tracking-tight">
        Hoàn thành: {setName}!
      </h2>
      <p className="text-sm sm:text-base font-extrabold text-surface-secondary mt-1 max-w-lg">
        {stars === 3
          ? 'Xuất sắc tuyệt đối! Bạn đã nắm vững toàn bộ kiến thức của bộ đề này!'
          : stars === 2
          ? 'Rất tốt! Bạn đã đạt trên 70% số điểm, chỉ cần ôn lại một vài câu nữa là hoàn hảo!'
          : stars === 1
          ? 'Đã vượt qua! Hãy xem lại các câu sai để nâng cao số sao nhé!'
          : 'Cố gắng lên nhé! Xem lại lý thuyết và các câu làm sai để làm lại đạt kết quả cao hơn!'}
      </p>

      {/* 3 Stars Display (Gold / Gray) */}
      <div className="my-6 flex items-center justify-center gap-3">
        {[1, 2, 3].map((starIdx) => {
          const isGold = starIdx <= stars;
          return (
            <div
              key={starIdx}
              className={`transition-all duration-300 transform ${
                isGold ? 'scale-110 drop-shadow-lg' : 'scale-95 opacity-50'
              }`}
            >
              <Star
                className={`w-12 h-12 sm:w-16 sm:h-16 ${
                  isGold
                    ? 'fill-amber-400 text-amber-500 drop-shadow-[0_4px_12px_rgba(251,191,36,0.6)]'
                    : 'fill-slate-200 dark:fill-slate-800 text-slate-300 dark:text-slate-700'
                }`}
              />
            </div>
          );
        })}
      </div>
      <div className="text-xs font-black text-amber-600 dark:text-amber-400 -mt-3 mb-6 uppercase tracking-wider">
        Đạt {stars} / 3 Sao
      </div>

      {/* 3 Main Result Cards: ĐÚNG / ĐÃ LÀM / THỜI GIAN */}
      <div className="grid grid-cols-3 gap-3 w-full my-2">
        {/* Card ĐÚNG */}
        <Card variant="3d" padding="sm" className="flex flex-col items-center py-4 bg-brand-card">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-brand-green mb-1.5">
            <Target className="w-5 h-5" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-brand-green">
            {score}/{totalQuestions}
          </span>
          <span className="text-[11px] font-bold text-surface-secondary uppercase tracking-wider">
            Đúng ({percentage}%)
          </span>
        </Card>

        {/* Card ĐÃ LÀM */}
        <Card variant="3d" padding="sm" className="flex flex-col items-center py-4 bg-brand-card">
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-brand-blue mb-1.5">
            <CheckCircle className="w-5 h-5" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-brand-blue">
            {totalQuestions}/{totalQuestions}
          </span>
          <span className="text-[11px] font-bold text-surface-secondary uppercase tracking-wider">
            Đã làm
          </span>
        </Card>

        {/* Card THỜI GIAN */}
        <Card variant="3d" padding="sm" className="flex flex-col items-center py-4 bg-brand-card">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-500 mb-1.5">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
            {formatDuration(timeSpentSeconds)}
          </span>
          <span className="text-[11px] font-bold text-surface-secondary uppercase tracking-wider">
            Thời gian
          </span>
        </Card>
      </div>

      {/* XP & Streak Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full my-3">
        {/* XP earned */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-left">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500 text-white shadow-sm">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <span className="text-xs font-bold text-surface-secondary block">Kinh nghiệm nhận được</span>
              <span className="text-lg font-black text-brand-blue">+{earnedXp} XP</span>
            </div>
          </div>
        </div>

        {/* Streak Update */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 text-left">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500 text-white shadow-sm">
              <Flame className="w-5 h-5 fill-white" />
            </div>
            <div>
              <span className="text-xs font-bold text-surface-secondary block">Chuỗi học tập</span>
              <span className="text-lg font-black text-orange-600 dark:text-orange-400">
                {streak} ngày liên tiếp 🔥
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card: CỘT MỐC TIẾP THEO (Target Major 2026 & Next Milestone) */}
      <Card variant="3d" padding="md" className="w-full text-left bg-brand-card/90 border-brand-border my-2">
        <div className="flex items-center gap-2 text-brand-blue font-black text-xs uppercase tracking-wider mb-2">
          <GraduationCap className="w-4 h-4" />
          <span>Cột mốc tiếp theo · Mục tiêu Bách Khoa 2026</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-brand-border/40 pt-2.5">
          <div>
            <span className="text-xs font-bold text-surface-secondary">Ngành mục tiêu của bạn:</span>
            <h4 className="text-base font-black text-surface-primary">
              {targetMajor.name} ({targetMajor.code})
            </h4>
          </div>
          <div className="sm:text-right">
            <span className="text-xs font-bold text-surface-secondary">Điểm chuẩn dự kiến:</span>
            <div className="text-lg font-black text-brand-blue">{targetMajor.benchmark} điểm</div>
          </div>
        </div>

        <div className="mt-3 p-2.5 rounded-xl bg-brand-border/30 text-xs font-extrabold text-surface-secondary flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            {stars === 3
              ? 'Tuyệt vời! Hoàn thành thêm các bài khác để mở khóa Rương Chuyên Đề (+50 XP, +1 Băng bảo vệ)!'
              : `Còn ${3 - stars} sao nữa để đạt tối đa số sao của bộ đề này. Làm lại ngay để cải thiện điểm!`}
          </span>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-6">
        {/* Button XEM LẠI CÂU SAI */}
        <Button
          variant={wrongCount > 0 ? 'outline' : 'ghost'}
          size="lg"
          fullWidth
          leftIcon={<RotateCcw className="w-5 h-5 text-brand-red" />}
          onClick={handleReviewWrong}
        >
          {wrongCount > 0 ? `Xem lại ${wrongCount} câu sai` : 'Ôn lại bộ đề này'}
        </Button>

        {/* Button TẢI PHIẾU KẾT QUẢ (.TXT) */}
        <Button
          variant="outline"
          size="lg"
          fullWidth
          leftIcon={<Download className="w-5 h-5 text-brand-blue" />}
          onClick={handleDownloadScorecard}
        >
          Tải phiếu kết quả (.txt)
        </Button>

        {/* Button BÀI TIẾP THEO */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          rightIcon={<ArrowRight className="w-5 h-5" />}
          onClick={handleNextSet}
        >
          {nextSet ? 'Bài tiếp theo' : 'Về Lộ trình'}
        </Button>
      </div>
    </div>
  );
};
