import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Zap, Target, Clock, RotateCcw, ArrowRight, Map } from 'lucide-react';
import { Button, Card, StarRating } from '../components/ui';

export const CompletionPage: React.FC = () => {
  const navigate = useNavigate();

  const scorePercent = 93;
  const correctCount = 28;
  const totalCount = 30;
  const earnedXp = 50;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] max-w-xl mx-auto w-full text-center py-8">
      {/* Trophy and Stars */}
      <div className="relative mb-6">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-amber-400 text-slate-900 flex items-center justify-center shadow-pop border-4 border-amber-300 animate-bounce duration-1000 mx-auto">
          <Trophy className="w-14 h-14 fill-amber-200" />
        </div>
      </div>

      <h2 className="text-3xl sm:text-4xl font-black text-surface-primary tracking-tight">
        Hoàn thành bài học!
      </h2>
      <p className="text-sm font-extrabold text-surface-secondary mt-1">
        Bạn đã làm rất xuất sắc, tiếp tục duy trì phong độ nhé!
      </p>

      {/* Big Star Display */}
      <div className="my-6">
        <StarRating percentage={scorePercent} size="xl" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 w-full my-4">
        {/* XP Card */}
        <Card variant="3d" padding="sm" className="flex flex-col items-center py-4 bg-brand-card">
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-brand-blue mb-1">
            <Zap className="w-5 h-5 fill-brand-yellow text-brand-yellow" />
          </div>
          <span className="text-xl font-black text-brand-blue">+{earnedXp}</span>
          <span className="text-[11px] font-bold text-surface-secondary">Kinh nghiệm</span>
        </Card>

        {/* Accuracy Card */}
        <Card variant="3d" padding="sm" className="flex flex-col items-center py-4 bg-brand-card">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-brand-green mb-1">
            <Target className="w-5 h-5" />
          </div>
          <span className="text-xl font-black text-brand-green">{scorePercent}%</span>
          <span className="text-[11px] font-bold text-surface-secondary">{correctCount}/{totalCount} đúng</span>
        </Card>

        {/* Time Card */}
        <Card variant="3d" padding="sm" className="flex flex-col items-center py-4 bg-brand-card">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-500 mb-1">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400">12:45</span>
          <span className="text-[11px] font-bold text-surface-secondary">Thời gian</span>
        </Card>
      </div>

      {/* Motivational Note */}
      <div className="p-4 rounded-2xl bg-brand-green-soft border border-brand-green/30 text-emerald-800 dark:text-emerald-200 text-xs font-bold w-full my-2">
        🔥 Chuỗi Streak của bạn đã tăng lên 5 ngày liên tiếp!
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-6">
        <Button
          variant="outline"
          size="lg"
          fullWidth
          leftIcon={<RotateCcw className="w-5 h-5 text-brand-red" />}
          onClick={() => navigate('/practice')}
        >
          Ôn 2 câu sai
        </Button>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          rightIcon={<ArrowRight className="w-5 h-5" />}
          onClick={() => navigate('/')}
        >
          Về Lộ trình
        </Button>
      </div>
    </div>
  );
};
