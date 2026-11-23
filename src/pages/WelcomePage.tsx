import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Trophy, ShieldCheck, ArrowRight, GraduationCap, Flame, BookOpen } from 'lucide-react';
import { Button, Card, Chip } from '../components/ui';

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] max-w-3xl mx-auto w-full py-8 text-center">
      {/* Hero Badge */}
      <div className="flex items-center gap-2 mb-4">
        <Chip variant="primary" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
          PHIÊN BẢN 2026
        </Chip>
        <Chip variant="yellow" size="sm">
          ĐHQG TP.HCM · ĐH BÁCH KHOA
        </Chip>
      </div>

      {/* Mascot / Logo illustration */}
      <div className="relative mb-6">
        <img
          src="/icons/bk-logo.svg"
          alt="BK TP.HCM"
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl shadow-pop mx-auto border-4 border-brand-border/60"
        />
        <span className="absolute -bottom-2 -right-2 p-2 rounded-2xl bg-brand-yellow text-slate-900 border-2 border-white dark:border-slate-900 shadow-md">
          <Trophy className="w-5 h-5 fill-current" />
        </span>
      </div>

      {/* Main Title */}
      <h1 className="text-3xl sm:text-5xl font-black text-brand-navy dark:text-brand-blue tracking-tight leading-tight">
        Luyện thi V-ACT ĐHQG-HCM <br />
        <span className="text-brand-yellow">Phong cách Duolingo</span>
      </h1>

      <p className="text-sm sm:text-base font-bold text-surface-secondary mt-3 max-w-xl leading-relaxed">
        Hệ thống luyện trắc nghiệm đánh giá năng lực ĐHQG TP.HCM với lộ trình không khóa bài, streak bảo lưu linh hoạt, tích hợp KaTeX và tóm tắt kiến thức thông minh.
      </p>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full my-8 text-left">
        <Card variant="3d" padding="md">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-500 w-fit mb-2">
            <Flame className="w-5 h-5 fill-current" />
          </div>
          <h4 className="text-sm font-black text-surface-primary">Streak linh hoạt</h4>
          <p className="text-xs font-semibold text-surface-secondary mt-1">
            Không lo mất tim, bảo lưu chuỗi học với 3 lượt đóng băng mỗi tuần.
          </p>
        </Card>

        <Card variant="3d" padding="md">
          <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-brand-blue w-fit mb-2">
            <BookOpen className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-black text-surface-primary">Lộ trình bài bản</h4>
          <p className="text-xs font-semibold text-surface-secondary mt-1">
            130+ câu hỏi Tiếng Anh & Tiếng Việt chuẩn hóa kèm công thức và giải thích chi tiết.
          </p>
        </Card>

        <Card variant="3d" padding="md">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-brand-green w-fit mb-2">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-black text-surface-primary">Mục tiêu Bách Khoa</h4>
          <p className="text-xs font-semibold text-surface-secondary mt-1">
            Tra cứu điểm chuẩn BK 2026 tất cả ngành Đại trà và PFIEV nhanh chóng.
          </p>
        </Card>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <Button
          variant="primary"
          size="lg"
          rightIcon={<ArrowRight className="w-5 h-5" />}
          onClick={() => navigate('/')}
          className="w-full sm:w-auto min-w-[200px]"
        >
          Bắt đầu luyện ngay
        </Button>
        <Button
          variant="outline"
          size="lg"
          leftIcon={<GraduationCap className="w-5 h-5 text-brand-blue" />}
          onClick={() => navigate('/benchmark')}
          className="w-full sm:w-auto"
        >
          Tra cứu điểm chuẩn BK
        </Button>
      </div>
    </div>
  );
};
