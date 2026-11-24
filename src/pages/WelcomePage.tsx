import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Trophy, ArrowRight, GraduationCap, Star, Quote, Compass } from 'lucide-react';
import { Button, Card, Chip } from '../components/ui';
import { useTargetMajorStore } from '../store/targetMajorStore';

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { getTargetMajor } = useTargetMajorStore();
  const targetMajor = getTargetMajor();

  const handleStartLearning = () => {
    sessionStorage.setItem('vact_welcomed_session', 'true');
    navigate('/');
  };

  const handleViewBenchmark = () => {
    sessionStorage.setItem('vact_welcomed_session', 'true');
    navigate('/benchmark');
  };

  const handleChangeTarget = () => {
    sessionStorage.setItem('vact_welcomed_session', 'true');
    navigate('/benchmark');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-6rem)] max-w-2xl mx-auto w-full py-8 px-4 text-center">
      {/* BK Top Logo & Badge */}
      <div className="flex items-center gap-2 mb-4">
        <Chip variant="primary" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />}>
          TUYỂN SINH 2026
        </Chip>
        <Chip variant="yellow" size="sm">
          ĐHQG TP.HCM · ĐH BÁCH KHOA
        </Chip>
      </div>

      <div className="relative mb-6">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-brand-navy p-4 mx-auto shadow-pop border-4 border-brand-border flex items-center justify-center">
          <img
            src="/icons/logobachkhoa.webp"
            alt="Đại học Bách Khoa - ĐHQG TP.HCM"
            className="w-full h-full object-contain"
          />
        </div>
        <span className="absolute -bottom-2 -right-2 p-2 rounded-2xl bg-brand-yellow text-slate-900 border-2 border-white dark:border-slate-900 shadow-md">
          <Trophy className="w-5 h-5 fill-current" />
        </span>
      </div>

      {/* Main Title */}
      <h1 className="text-3xl sm:text-4xl font-black text-brand-navy dark:text-brand-blue tracking-tight leading-tight">
        Chào mừng bạn đến với <br />
        <span className="text-brand-yellow">V-ACT Lingo 2026</span>
      </h1>

      {/* Motivation Quote */}
      <div className="relative mt-4 mb-6 p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-brand-blue/30 max-w-xl mx-auto">
        <Quote className="w-5 h-5 text-brand-blue mb-1 mx-auto opacity-70" />
        <p className="text-sm sm:text-base font-extrabold text-brand-navy dark:text-blue-100 italic leading-relaxed">
          &ldquo;Khát vọng vươn lên đỉnh cao tri thức Bách Khoa — Mỗi câu hỏi hoàn thành hôm nay là một bước vững vàng chạm tới ước mơ giảng đường.&rdquo;
        </p>
      </div>

      {/* Target Major Card */}
      <Card
        variant="3d"
        padding="lg"
        className="w-full mb-8 text-left bg-gradient-to-br from-brand-card via-amber-50/20 to-blue-50/20 dark:from-brand-card dark:via-amber-950/10 dark:to-blue-950/10 border-2 border-brand-yellow/60"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-brand-navy text-white shrink-0 flex items-center justify-center shadow-sm">
              <img src="/icons/logobachkhoa.webp" alt="BK TP.HCM" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-brand-blue">
                  MỤC TIÊU CỦA BẠN (BK 2026)
                </span>
                <Chip variant={targetMajor.program === 'pfiev' ? 'primary' : 'neutral'} size="sm">
                  {targetMajor.program === 'pfiev' ? 'PFIEV Kỹ sư chất lượng cao' : 'Đại trà'}
                </Chip>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-surface-primary mt-1">
                {targetMajor.name}
              </h3>
              <p className="text-xs font-bold text-surface-secondary mt-0.5">
                Mã ngành: <strong className="text-brand-blue">{targetMajor.code}</strong> • Đại học Bách Khoa - ĐHQG TP.HCM
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="text-[11px] font-black uppercase tracking-wider text-surface-secondary block">
              Điểm chuẩn 2026
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-500 flex items-center gap-1 mt-0.5">
              {targetMajor.benchmark.toFixed(2)}
              <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
            </span>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
        <Button
          variant="yellow"
          size="lg"
          rightIcon={<ArrowRight className="w-5 h-5" />}
          onClick={handleStartLearning}
          className="w-full sm:w-auto min-w-[200px] text-base font-black shadow-pop"
        >
          BẮT ĐẦU HỌC
        </Button>

        <Button
          variant="outline"
          size="lg"
          leftIcon={<GraduationCap className="w-5 h-5 text-brand-blue" />}
          onClick={handleViewBenchmark}
          className="w-full sm:w-auto font-bold"
        >
          Xem bảng điểm chuẩn
        </Button>

        <Button
          variant="ghost"
          size="lg"
          onClick={handleChangeTarget}
          className="w-full sm:w-auto text-brand-blue font-bold hover:bg-brand-blue-light/40"
        >
          Đổi mục tiêu
        </Button>
      </div>
    </div>
  );
};
