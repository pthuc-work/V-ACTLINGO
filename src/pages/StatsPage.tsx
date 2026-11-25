import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Award,
  Zap,
  Target,
  ArrowRight,
  BookOpen,
  Sparkles,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { Card, Chip, Button, ProgressBar } from '../components/ui';
import { getRepository } from '../data';
import { Question, QuestionAttempt, UserStats, Topic } from '../data/types';
import { calculateCategoryStats, CategoryStat, CategoryStatsSummary } from '../lib/categoryStats';
import { calculateTopicProgress, TopicProgressResult } from '../lib/progress';
import { useCurriculumStore } from '../store/curriculumStore';
import { SpacedRepetitionWidget } from '../components/SpacedRepetitionWidget';

export const StatsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<QuestionAttempt[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  const { selectedTopicId } = useCurriculumStore();
  const [topicProgress, setTopicProgress] = useState<TopicProgressResult | null>(null);
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);

  useEffect(() => {
    async function loadTopicProg() {
      if (!selectedTopicId) {
        setTopicProgress(null);
        setCurrentTopic(null);
        return;
      }
      try {
        const repo = getRepository();
        const [top, sets, progresses] = await Promise.all([
          repo.getTopic(selectedTopicId),
          repo.getSets(selectedTopicId),
          repo.getAllSetProgress(),
        ]);
        setCurrentTopic(top);
        setTopicProgress(calculateTopicProgress(sets, progresses));
      } catch (e) {
        console.warn('Failed to load topic progress in stats:', e);
      }
    }
    loadTopicProg();
  }, [selectedTopicId]);

  useEffect(() => {
    async function loadData() {
      try {
        const repo = getRepository();
        const [qs, atts, stats] = await Promise.all([
          repo.getQuestions(),
          repo.getAttempts(),
          repo.getUserStats(),
        ]);
        setQuestions(qs);
        setAttempts(atts);
        setUserStats(stats);
      } catch (err) {
        console.error('Failed to load stats data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const statsSummary: CategoryStatsSummary = useMemo(() => {
    return calculateCategoryStats(questions, attempts);
  }, [questions, attempts]);

  const handlePracticeCategory = (category: string) => {
    // Navigate to review filtered by this category
    navigate(`/review?category=${encodeURIComponent(category)}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-blue" />
        <p className="mt-4 text-sm font-bold text-surface-secondary">Đang phân tích dữ liệu dạng bài...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-12">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Chip variant="primary" size="sm" icon={<BarChart3 className="w-3.5 h-3.5" />}>
            THỐNG KÊ NĂNG LỰC
          </Chip>
          <Chip variant="success" size="sm">
            Phân tích theo chuyên đề & dạng bài
          </Chip>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-brand-navy dark:text-brand-blue tracking-tight">
          Báo cáo độ chính xác theo dạng câu hỏi
        </h1>
        <p className="text-xs sm:text-sm font-bold text-surface-secondary mt-1">
          Tự động nhận diện điểm mạnh (≥80%) và lỗ hổng kiến thức (&lt;60%, tối thiểu 5 lần làm) để bạn tập trung luyện đúng trọng tâm V-ACT ĐHQG TP.HCM.
        </p>
      </div>

      {/* Current Active Topic Progress Card */}
      {topicProgress && currentTopic && (
        <Card variant="default" padding="md" className="border border-brand-border bg-brand-card">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div>
              <span className="text-[11px] font-black uppercase text-brand-blue tracking-wider">
                Chuyên đề hiện tại
              </span>
              <h3 className="text-base font-black text-surface-primary">
                {currentTopic.name}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Chip variant="primary" size="sm">
                {topicProgress.formattedSetsProgress}
              </Chip>
              <Chip variant="neutral" size="sm">
                {topicProgress.formattedQuestionsProgress}
              </Chip>
            </div>
          </div>
          <ProgressBar
            value={topicProgress.completedSets}
            max={Math.max(1, topicProgress.totalSets)}
            color="blue"
            size="sm"
            className="mb-2"
          />
          <div className="flex items-center justify-between text-xs font-bold text-surface-secondary">
            <span>Độ chính xác trung bình chuyên đề:</span>
            <span className="font-black text-brand-green">{topicProgress.formattedAccuracy}</span>
          </div>
        </Card>
      )}

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card variant="3d" padding="sm" className="border-brand-blue/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-surface-secondary uppercase">Độ chính xác chung</span>
            <Target className="w-4 h-4 text-brand-blue" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-brand-navy dark:text-brand-blue mt-1">
            {statsSummary.totalAttemptsCount > 0 ? `${statsSummary.overallAccuracy}%` : '—'}
          </div>
          <div className="text-[10px] font-semibold text-surface-muted mt-0.5">
            {statsSummary.totalCorrectCount} / {statsSummary.totalAttemptsCount} câu đúng
          </div>
        </Card>

        <Card variant="3d" padding="sm" className="border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-surface-secondary uppercase">Thế mạnh (≥80%)</span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {statsSummary.strengths.length}
          </div>
          <div className="text-[10px] font-semibold text-surface-muted mt-0.5">dạng bài nắm vững</div>
        </Card>

        <Card variant="3d" padding="sm" className="border-rose-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-surface-secondary uppercase">Cần cải thiện</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {statsSummary.weaknesses.length}
          </div>
          <div className="text-[10px] font-semibold text-surface-muted mt-0.5">&lt;60% (từ 5 lượt làm)</div>
        </Card>

        <Card variant="3d" padding="sm" className="border-brand-yellow/40">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-surface-secondary uppercase">Tổng lượt giải</span>
            <Zap className="w-4 h-4 text-brand-yellow fill-current" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-surface-primary mt-1">
            {statsSummary.totalAttemptsCount}
          </div>
          <div className="text-[10px] font-semibold text-surface-muted mt-0.5">lượt trả lời câu hỏi</div>
        </Card>
      </div>

      {/* Spaced Repetition Card */}
      <SpacedRepetitionWidget />

      {/* Weaknesses Section (Prioritized) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Dạng bài cần cải thiện (&lt;60%, tối thiểu 5 lượt)
          </h2>
          <span className="text-xs font-bold text-surface-muted">
            {statsSummary.weaknesses.length} dạng
          </span>
        </div>

        {statsSummary.weaknesses.length === 0 ? (
          <Card variant="default" padding="md" className="border border-brand-border bg-brand-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black text-surface-primary">
                  Không có dạng bài nào bị yếu (&lt;60%)!
                </div>
                <div className="text-xs font-semibold text-surface-secondary">
                  Tất cả các dạng bài bạn đã luyện trên 5 lần đều đạt tỉ lệ đúng từ 60% trở lên.
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {statsSummary.weaknesses.map((item) => (
              <Card
                key={item.category}
                variant="3d"
                padding="md"
                className="border-2 border-rose-500/40 bg-gradient-to-br from-brand-card to-rose-500/5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-black text-base text-surface-primary">
                      {item.category}
                    </span>
                    <Chip variant="danger" size="sm">
                      Đúng {item.accuracy}%
                    </Chip>
                  </div>

                  <ProgressBar
                    value={item.accuracy}
                    max={100}
                    color="red"
                    size="sm"
                    className="mb-2"
                  />

                  <div className="flex items-center justify-between text-xs font-bold text-surface-secondary">
                    <span>Số lượt làm: {item.totalAttempts}</span>
                    <span className="text-rose-600 dark:text-rose-400">
                      Sai {item.totalAttempts - item.correctAttempts} lượt
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-brand-border flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-surface-muted">
                    Ưu tiên khắc phục
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handlePracticeCategory(item.category)}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                  >
                    Luyện dạng này →
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Strengths Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <Award className="w-5 h-5" />
            Thế mạnh của bạn (≥80%)
          </h2>
          <span className="text-xs font-bold text-surface-muted">
            {statsSummary.strengths.length} dạng
          </span>
        </div>

        {statsSummary.strengths.length === 0 ? (
          <Card variant="default" padding="md" className="border border-brand-border">
            <div className="text-xs sm:text-sm font-semibold text-surface-secondary">
              Chưa có dạng bài nào đạt trên 80% độ chính xác. Hãy tiếp tục giải thêm bài tập để hình thành thế mạnh!
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {statsSummary.strengths.map((item) => (
              <Card
                key={item.category}
                variant="3d"
                padding="md"
                className="border-2 border-emerald-500/40 bg-gradient-to-br from-brand-card to-emerald-500/5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-black text-base text-surface-primary">
                      {item.category}
                    </span>
                    <Chip variant="success" size="sm">
                      Đúng {item.accuracy}%
                    </Chip>
                  </div>

                  <ProgressBar
                    value={item.accuracy}
                    max={100}
                    color="green"
                    size="sm"
                    className="mb-2"
                  />

                  <div className="flex items-center justify-between text-xs font-bold text-surface-secondary">
                    <span>Số lượt làm: {item.totalAttempts}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Đúng {item.correctAttempts}/{item.totalAttempts}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-brand-border flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-surface-muted">
                    Nắm chắc điểm
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePracticeCategory(item.category)}
                    className="text-emerald-600 dark:text-emerald-400 font-bold text-xs"
                  >
                    Luyện dạng này →
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* All Categories Breakdown Table */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-black text-surface-primary flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand-blue" />
          Bảng chi tiết toàn bộ các dạng bài
        </h2>

        <div className="flex flex-col gap-2.5">
          {statsSummary.categories.map((cat) => {
            return (
              <div
                key={cat.category}
                className="p-3 sm:p-4 rounded-2xl bg-brand-card border border-brand-border hover:border-brand-blue/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex-1 w-full sm:w-auto">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-black text-sm text-surface-primary">
                      {cat.category}
                    </span>
                    {cat.isStrength && (
                      <Chip variant="success" size="sm">Thế mạnh (≥80%)</Chip>
                    )}
                    {cat.isWeakness && (
                      <Chip variant="danger" size="sm">Cần cải thiện (&lt;60%)</Chip>
                    )}
                    {cat.status === 'developing' && (
                      <Chip variant="yellow" size="sm">Đang rèn luyện</Chip>
                    )}
                    {cat.status === 'unattempted' && (
                      <Chip variant="neutral" size="sm">Chưa làm</Chip>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full max-w-md">
                    <div className="flex-1">
                      <ProgressBar
                        value={cat.accuracy}
                        max={100}
                        color={cat.isStrength ? 'green' : cat.isWeakness ? 'red' : 'blue'}
                        size="sm"
                      />
                    </div>
                    <span className="text-xs font-black w-10 text-right">
                      {cat.totalAttempts > 0 ? `${cat.accuracy}%` : '—'}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-surface-muted mt-1">
                    {cat.totalAttempts > 0
                      ? `${cat.correctAttempts}/${cat.totalAttempts} câu đúng`
                      : 'Chưa có lượt giải nào'}
                  </div>
                </div>

                <div className="shrink-0 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePracticeCategory(cat.category)}
                    className="text-xs font-bold"
                  >
                    Luyện dạng này
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
