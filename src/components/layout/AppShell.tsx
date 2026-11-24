import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  Sparkles,
  BookOpen,
  FolderTree,
  GraduationCap,
  Sun,
  Moon,
  Flame,
  Zap,
  Target,
  Download,
  Smartphone,
  Menu,
  X,
  ShieldCheck,
  Play,
  ChevronDown,
  Layers,
  Award,
  Settings,
  RotateCcw,
  BarChart3,
} from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useTargetMajorStore } from '../../store/targetMajorStore';
import { useCurriculumStore } from '../../store/curriculumStore';
import { useUserStatsStore } from '../../store/userStatsStore';
import { Button, Card, Chip, Modal, ProgressBar, Toggle } from '../ui';
import { getRepository } from '../../data';
import { Subject, Topic, SetEntity, SetProgress } from '../../data/types';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Lộ trình', icon: Compass },
  { to: '/review', label: 'Kho câu sai', icon: RotateCcw },
  { to: '/stats', label: 'Thống kê dạng bài', icon: BarChart3 },
  { to: '/formulas', label: 'Bảng công thức', icon: BookOpen },
  { to: '/import', label: 'Import tài liệu (AI)', icon: Sparkles, badge: 'AI' },
  { to: '/manage', label: 'Quản lý & Sắp xếp bài', icon: FolderTree },
  { to: '/benchmark', label: 'Điểm chuẩn BK 2026', icon: GraduationCap },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
];

interface AppShellProps {
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { effectiveTheme, toggleTheme } = useThemeStore();
  const { getTargetMajor } = useTargetMajorStore();
  const { selectedSubjectId, selectedTopicId, setSelectedSubjectId, setSelectedTopicId } = useCurriculumStore();
  const { stats, refreshStats } = useUserStatsStore();

  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);

  // Curriculum data
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sets, setSets] = useState<SetEntity[]>([]);
  const [progresses, setProgresses] = useState<SetProgress[]>([]);

  const targetMajor = getTargetMajor();
  const isDedicatedScreen = location.pathname === '/practice' || location.pathname === '/completion';

  useEffect(() => {
    if (isDedicatedScreen) return;
    refreshStats();
  }, [refreshStats, isDedicatedScreen]);

  // Load subjects
  useEffect(() => {
    if (isDedicatedScreen) return;
    let isMounted = true;
    async function loadData() {
      try {
        const repo = getRepository();
        const subs = await repo.getSubjects();
        if (!isMounted) return;
        setSubjects(subs);

        const currentSubId = selectedSubjectId || (subs.length > 0 ? subs[0].id : null);
        if (currentSubId && currentSubId !== selectedSubjectId) {
          setSelectedSubjectId(currentSubId);
        }

        if (currentSubId) {
          const topList = await repo.getTopics(currentSubId);
          if (!isMounted) return;
          setTopics(topList);

          const currentTopId = selectedTopicId || (topList.length > 0 ? topList[0].id : null);
          if (currentTopId && currentTopId !== selectedTopicId) {
            setSelectedTopicId(currentTopId);
          }

          if (currentTopId) {
            const setList = await repo.getSets(currentTopId);
            const progList = await repo.getAllSetProgress();
            if (!isMounted) return;
            setSets(setList);
            setProgresses(progList);
          }
        }
      } catch (err) {
        console.warn('Error loading shell curriculum:', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [selectedSubjectId, selectedTopicId, setSelectedSubjectId, setSelectedTopicId]);

  // Handle subject change
  const handleSubjectChange = async (newSubjectId: string) => {
    setSelectedSubjectId(newSubjectId);
    try {
      const repo = getRepository();
      const topList = await repo.getTopics(newSubjectId);
      setTopics(topList);
      if (topList.length > 0) {
        setSelectedTopicId(topList[0].id);
        const setList = await repo.getSets(topList[0].id);
        setSets(setList);
      } else {
        setSelectedTopicId(null);
        setSets([]);
      }
    } catch (err) {
      console.warn('Failed to switch subject:', err);
    }
  };

  // Handle topic change
  const handleTopicChange = async (newTopicId: string) => {
    setSelectedTopicId(newTopicId);
    try {
      const repo = getRepository();
      const setList = await repo.getSets(newTopicId);
      setSets(setList);
    } catch (err) {
      console.warn('Failed to switch topic:', err);
    }
  };

  // Stats calculation
  const streakDays = stats?.streak ?? 5;
  const weeklyFreezes = stats?.streakFreezesWeekly ?? 3;
  const reserveFreezes = stats?.streakFreezesReserve ?? 0;
  const totalFreezes = weeklyFreezes + reserveFreezes;
  const totalXp = stats?.xp ?? 150;
  const dailyGoalXp = stats?.dailyGoalXp ?? 50;

  // Topic progress calculations
  const topicProgress = useMemo(() => {
    if (sets.length === 0) return { completedCount: 0, totalCount: 0, percent: 0, accuracy: 0 };
    const setIds = new Set(sets.map((s) => s.id));
    const matchingProgs = progresses.filter((p) => setIds.has(p.setId));
    const completedCount = matchingProgs.filter((p) => p.completed || p.stars > 0).length;

    let totalScore = 0;
    let totalQuestions = 0;
    matchingProgs.forEach((p) => {
      totalScore += p.score || 0;
      totalQuestions += p.totalQuestions || 0;
    });

    const percent = Math.round((completedCount / sets.length) * 100);
    const accuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 100;

    return {
      completedCount,
      totalCount: sets.length,
      percent,
      accuracy,
    };
  }, [sets, progresses]);

  // Next incompleted set for "TIẾP TỤC LÀM BÀI"
  const nextSet = useMemo(() => {
    if (sets.length === 0) return null;
    const completedSetIds = new Set(
      progresses.filter((p) => p.completed || p.stars > 0).map((p) => p.setId)
    );
    return sets.find((s) => !completedSetIds.has(s.id)) || sets[0];
  }, [sets, progresses]);

  const handleContinueLearning = () => {
    if (nextSet) {
      navigate(`/practice?setId=${nextSet.id}`);
    } else {
      navigate('/practice');
    }
  };

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);
  const currentTopic = topics.find((t) => t.id === selectedTopicId);

  // Dedicated full-screen view for Practice and Completion modes (Duolingo style - no sidebars)
  if (isDedicatedScreen) {
    return (
      <div className="min-h-screen bg-brand-bg text-surface-primary flex flex-col font-sans">
        <main className="flex-1 w-full min-h-screen">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg text-surface-primary flex flex-col font-sans">
      {/* =========================================================================
          MOBILE / TABLET TOP BAR (< 1024px)
          ========================================================================= */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-brand-card/95 backdrop-blur-md border-b border-brand-border shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 rounded-xl hover:bg-brand-border/40 text-surface-primary md:hidden"
            aria-label="Mở menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img src="/icons/logobachkhoa.webp" alt="BK TP.HCM" className="w-8 h-8 object-contain drop-shadow-sm" />
            <div className="leading-tight">
              <span className="font-black text-base text-brand-navy dark:text-brand-blue tracking-tight block">
                V-ACT HUB
              </span>
              <span className="text-[10px] font-extrabold text-surface-secondary block -mt-0.5">
                ĐHQG TP.HCM · 2026
              </span>
            </div>
          </Link>
        </div>

        {/* Quick pills for Streak & XP & Freezes */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 font-black text-xs"
            title={`${streakDays} ngày streak`}
          >
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>{streakDays}</span>
          </div>

          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800 text-brand-blue font-black text-xs"
            title={`${totalXp} XP`}
          >
            <Zap className="w-3.5 h-3.5 fill-current text-brand-yellow" />
            <span>{totalXp}</span>
          </div>

          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 font-black text-xs"
            title={`Đóng băng: ${weeklyFreezes} tuần + ${reserveFreezes} vĩnh viễn`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{totalFreezes}</span>
          </div>

          {/* Right sidebar drawer toggle for tablet */}
          <button
            type="button"
            onClick={() => setIsRightDrawerOpen(!isRightDrawerOpen)}
            className="hidden sm:flex lg:hidden p-1.5 rounded-xl text-surface-secondary hover:text-surface-primary hover:bg-brand-border/40"
            aria-label="Tiến độ"
          >
            <Target className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* =========================================================================
          MAIN 3-COLUMN DESKTOP CONTAINER
          ========================================================================= */}
      <div className="flex-1 w-full max-w-7xl mx-auto flex items-start justify-center px-0 md:px-4 lg:px-6">
        {/* ---------------------------------------------------------------------
            LEFT SIDEBAR (Desktop)
            --------------------------------------------------------------------- */}
        <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 sticky top-0 h-screen py-6 pr-4 border-r border-brand-border/80">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 px-3 mb-8">
            <img
              src="/icons/logobachkhoa.webp"
              alt="BK TP.HCM"
              className="w-11 h-11 object-contain drop-shadow-sm"
            />
            <div>
              <h1 className="font-black text-xl text-brand-navy dark:text-brand-blue tracking-tight leading-none">
                V-ACT HUB
              </h1>
              <p className="text-xs font-bold text-surface-secondary mt-1">
                Luyện thi ĐHQG-HCM 2026
              </p>
            </div>
          </Link>

          {/* Navigation Items */}
          <nav className="flex-1 flex flex-col gap-1.5 px-1" aria-label="Menu chính">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`group flex items-center justify-between px-4 py-3 rounded-2xl font-extrabold text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-blue-light/70 dark:bg-brand-blue-light/30 text-brand-blue border-2 border-brand-blue/30 shadow-sm translate-x-1'
                      : 'text-surface-secondary hover:text-surface-primary hover:bg-brand-card hover:border hover:border-brand-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`p-1.5 rounded-xl transition-colors ${
                        isActive
                          ? 'bg-brand-blue text-white shadow-sm'
                          : 'bg-brand-border/40 text-surface-secondary group-hover:text-surface-primary'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="tracking-wide">{item.label}</span>
                  </div>
                  {item.badge && (
                    <Chip variant="ai" size="sm">
                      {item.badge}
                    </Chip>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Bottom Controls: Theme Toggle & Shortcut/Install Button */}
          <div className="pt-4 mt-auto border-t border-brand-border/80 px-2 flex flex-col gap-3">
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-brand-card border border-brand-border">
              <span className="text-xs font-extrabold text-surface-secondary flex items-center gap-2">
                {effectiveTheme === 'dark' ? (
                  <Moon className="w-4 h-4 text-brand-blue" />
                ) : (
                  <Sun className="w-4 h-4 text-brand-yellow" />
                )}
                {effectiveTheme === 'dark' ? 'Chế độ Tối' : 'Chế độ Sáng'}
              </span>
              <Toggle
                checked={effectiveTheme === 'dark'}
                onChange={() => toggleTheme()}
                size="sm"
                leftIcon={<Sun className="w-3 h-3 text-amber-500" />}
                rightIcon={<Moon className="w-3 h-3 text-indigo-500" />}
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              fullWidth
              leftIcon={<Smartphone className="w-4 h-4 text-brand-blue" />}
              onClick={() => setIsShortcutModalOpen(true)}
              className="text-xs font-bold py-2.5"
            >
              Cài đặt App / Tạo Shortcut
            </Button>
          </div>
        </aside>

        {/* ---------------------------------------------------------------------
            MIDDLE CONTENT AREA
            --------------------------------------------------------------------- */}
        <main className="flex-1 w-full min-w-0 py-4 sm:py-6 px-3 sm:px-6 lg:px-8 pb-24 md:pb-8">
          {children}
        </main>

        {/* ---------------------------------------------------------------------
            RIGHT SIDEBAR (Desktop - >= 1024px)
            --------------------------------------------------------------------- */}
        <aside className="hidden lg:flex flex-col w-80 shrink-0 sticky top-0 h-screen py-6 pl-4 border-l border-brand-border/80 overflow-y-auto custom-scrollbar gap-4">
          {/* Target Major Card (Bách Khoa TP.HCM) */}
          <Link to="/benchmark" className="block group">
            <Card
              variant="flat"
              padding="md"
              className="border-2 border-brand-blue/30 bg-gradient-to-br from-brand-card to-blue-50/30 dark:to-blue-950/20 hover:border-brand-blue hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-2xl bg-brand-navy text-white shrink-0 mt-0.5 flex items-center justify-center shadow-sm">
                  <img src="/icons/logobachkhoa.webp" alt="BK TP.HCM" className="w-6 h-6 object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-blue block">
                      Mục tiêu Bách Khoa 2026
                    </span>
                    <span className="text-[10px] font-extrabold text-surface-muted group-hover:text-brand-blue transition-colors">
                      Đổi &rarr;
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-surface-primary mt-1 truncate" title={targetMajor.name}>
                    {targetMajor.name}
                  </h4>
                  <p className="text-xs font-bold text-surface-secondary mt-0.5">
                    Mã {targetMajor.code} · {targetMajor.program === 'pfiev' ? 'PFIEV' : 'Đại trà'}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-brand-border/60">
                    <span className="text-xs font-bold text-surface-muted">Điểm chuẩn 2026:</span>
                    <span className="text-xs font-black text-amber-500 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      {targetMajor.benchmark.toFixed(2)} ⭐
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </Link>

          {/* Subject & Topic Selectors */}
          <Card variant="default" padding="sm" className="flex flex-col gap-2.5 bg-brand-card">
            <div>
              <label className="text-[11px] font-black uppercase tracking-wider text-surface-secondary flex items-center gap-1.5 mb-1">
                <Layers className="w-3.5 h-3.5 text-brand-blue" />
                Môn học & Chuyên đề
              </label>
              <div className="flex flex-col gap-2">
                {/* Subject dropdown */}
                <select
                  value={selectedSubjectId || ''}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-brand-bg border border-brand-border text-surface-primary outline-none focus:border-brand-blue"
                  aria-label="Chọn môn học"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                  {subjects.length === 0 && <option value="">Môn Tiếng Anh</option>}
                </select>

                {/* Topic dropdown */}
                <select
                  value={selectedTopicId || ''}
                  onChange={(e) => handleTopicChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-brand-bg border border-brand-border text-surface-primary outline-none focus:border-brand-blue"
                  aria-label="Chọn chuyên đề"
                >
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                  {topics.length === 0 && <option value="">Chuyên đề 15: Câu điều kiện</option>}
                </select>
              </div>
            </div>

            {/* Topic Progress Widget */}
            <div className="pt-2 border-t border-brand-border/60">
              <div className="flex items-center justify-between text-xs font-black mb-1.5">
                <span className="text-surface-secondary">Tiến độ chuyên đề:</span>
                <span className="text-brand-blue">
                  {topicProgress.completedCount}/{topicProgress.totalCount} bài ({topicProgress.percent}%)
                </span>
              </div>
              <ProgressBar value={topicProgress.completedCount} max={Math.max(1, topicProgress.totalCount)} color="blue" size="sm" />
              <div className="flex items-center justify-between text-[11px] font-bold text-surface-muted mt-1.5">
                <span>Độ chính xác trung bình:</span>
                <span className="font-black text-brand-green">{topicProgress.accuracy}%</span>
              </div>
            </div>

            {/* "TIẾP TỤC LÀM BÀI" Primary Button */}
            <Button
              variant="yellow"
              size="md"
              fullWidth
              leftIcon={<Play className="w-4 h-4 fill-current" />}
              onClick={handleContinueLearning}
              className="mt-1 font-black shadow-pop"
            >
              TIẾP TỤC LÀM BÀI
            </Button>
          </Card>

          {/* Streak & Freeze Passes Card */}
          <Card variant="3d" padding="md" className="relative overflow-hidden bg-gradient-to-br from-brand-card to-amber-50/20 dark:to-amber-950/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-500 border border-amber-300 dark:border-amber-700">
                  <Flame className="w-6 h-6 fill-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-black text-surface-primary">Chuỗi học tập</h3>
                  <p className="text-xs font-black text-amber-600 dark:text-amber-400">{streakDays} ngày liên tiếp!</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-brand-border/60 flex flex-col gap-1.5 text-xs font-bold text-surface-secondary">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-blue" />
                  Đóng băng tuần
                </span>
                <span className="font-extrabold text-brand-blue bg-brand-blue-light dark:bg-brand-blue-light/40 px-2 py-0.5 rounded-full">
                  {weeklyFreezes}/3 lượt
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-purple-500" />
                  Đóng băng vĩnh viễn (Rương)
                </span>
                <span className="font-extrabold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full">
                  +{reserveFreezes} lượt
                </span>
              </div>
            </div>
          </Card>

          {/* XP & Daily Goal Card */}
          <Card variant="default" padding="md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-brand-blue border border-blue-300 dark:border-blue-700">
                  <Zap className="w-6 h-6 fill-brand-yellow text-brand-yellow" />
                </div>
                <div>
                  <h3 className="text-base font-black text-surface-primary">Kinh nghiệm hôm nay</h3>
                  <p className="text-xs font-extrabold text-brand-blue">{totalXp} XP tổng tích lũy</p>
                </div>
              </div>
            </div>

            <div className="mb-2">
              <div className="flex justify-between text-xs font-black mb-1">
                <span className="text-surface-secondary">Mục tiêu ngày:</span>
                <span className="text-brand-green font-bold">
                  {Math.min(totalXp, dailyGoalXp)}/{dailyGoalXp} XP
                </span>
              </div>
              <ProgressBar value={totalXp} max={dailyGoalXp} color="green" size="md" />
            </div>

            <p className="text-[11px] font-bold text-surface-secondary leading-relaxed">
              {totalXp >= dailyGoalXp
                ? '🎉 Đạt mục tiêu ngày! Tiếp tục học để gom thêm XP Bách Khoa nhé!'
                : `Còn thiếu ${Math.max(0, dailyGoalXp - totalXp)} XP nữa để hoàn thành mục tiêu ngày.`}
            </p>
          </Card>
        </aside>
      </div>

      {/* =========================================================================
          MOBILE BOTTOM NAVIGATION (< 768px)
          ========================================================================= */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-brand-card/95 backdrop-blur-lg border-t border-brand-border px-2 py-1.5 flex items-center justify-around shadow-lg"
        aria-label="Điều hướng dưới"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-transform ${
                isActive
                  ? 'text-brand-blue font-black scale-105'
                  : 'text-surface-secondary font-bold hover:text-surface-primary'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{item.label.split(' ')[0]}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* =========================================================================
          MOBILE SIDEBAR DRAWER (When hamburger clicked on mobile)
          ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-brand-card h-full p-6 flex flex-col z-10 border-r border-brand-border shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-brand-border">
              <div className="flex items-center gap-2.5">
                <img src="/icons/logobachkhoa.webp" alt="BK TP.HCM" className="w-9 h-9 object-contain" />
                <span className="font-black text-lg text-brand-navy dark:text-brand-blue">
                  V-ACT HUB
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-xl hover:bg-brand-border/40 text-surface-secondary"
                aria-label="Đóng menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-2 flex-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.to === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.to);

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-extrabold text-sm ${
                      isActive
                        ? 'bg-brand-blue text-white shadow-sm'
                        : 'text-surface-secondary hover:bg-brand-border/40'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-brand-border flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-surface-secondary">Chế độ giao diện:</span>
                <Toggle
                  checked={effectiveTheme === 'dark'}
                  onChange={() => toggleTheme()}
                  size="sm"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsShortcutModalOpen(true);
                }}
              >
                Cài đặt App / Shortcut
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TABLET RIGHT DRAWER (When target icon clicked on tablet)
          ========================================================================= */}
      {isRightDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsRightDrawerOpen(false)}
          />
          <div className="relative w-80 bg-brand-card h-full p-6 flex flex-col z-10 border-l border-brand-border shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200 gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border">
              <h3 className="font-black text-lg text-surface-primary">Tiến độ học tập</h3>
              <button
                type="button"
                onClick={() => setIsRightDrawerOpen(false)}
                className="p-1 rounded-xl text-surface-secondary hover:text-surface-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Major Pill */}
            <Link to="/benchmark" onClick={() => setIsRightDrawerOpen(false)}>
              <Card variant="flat" padding="sm" className="border border-brand-blue/30 bg-brand-blue-light/20">
                <span className="text-[10px] font-black uppercase text-brand-blue">Mục tiêu Bách Khoa</span>
                <h4 className="text-xs font-black text-surface-primary truncate">{targetMajor.name}</h4>
                <div className="text-xs font-black text-amber-500 mt-1">{targetMajor.benchmark.toFixed(2)} ⭐</div>
              </Card>
            </Link>

            {/* Streak & XP cards inside drawer */}
            <Card variant="3d" padding="md">
              <div className="flex items-center gap-2 mb-2 text-amber-500 font-black">
                <Flame className="w-5 h-5 fill-current" />
                <span>{streakDays} ngày liên tiếp</span>
              </div>
              <p className="text-xs font-bold text-surface-secondary">
                Đóng băng tuần: {weeklyFreezes}/3 • Vĩnh viễn: +{reserveFreezes}
              </p>
            </Card>

            <Button
              variant="yellow"
              size="md"
              fullWidth
              leftIcon={<Play className="w-4 h-4 fill-current" />}
              onClick={() => {
                setIsRightDrawerOpen(false);
                handleContinueLearning();
              }}
            >
              TIẾP TỤC LÀM BÀI
            </Button>
          </div>
        </div>
      )}

      {/* =========================================================================
          APP INSTALL / SHORTCUT MODAL
          ========================================================================= */}
      <Modal
        isOpen={isShortcutModalOpen}
        onClose={() => setIsShortcutModalOpen(false)}
        title="Cài đặt V-ACT HUB"
        description="Dùng mượt mà như app gốc trên máy tính và điện thoại, không cần cài đặt từ App Store."
      >
        <div className="flex flex-col gap-4 py-2">
          <div className="p-4 rounded-2xl bg-brand-blue-light/50 dark:bg-brand-blue-light/20 border border-brand-blue/30 flex items-start gap-3">
            <Download className="w-6 h-6 text-brand-blue shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-surface-primary">
              <strong className="block text-sm font-bold text-brand-blue mb-1">
                Cài đặt PWA (Progressive Web App)
              </strong>
              Ứng dụng có thể chạy ngoại tuyến (Offline), lưu tiến độ bài tập và công thức toán ngay trên thiết bị của bạn.
            </div>
          </div>

          <div className="flex flex-col gap-2.5 text-xs font-semibold text-surface-secondary">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                1
              </span>
              <span>
                <strong>Trên máy tính (Chrome/Edge):</strong> Bấm vào biểu tượng cài đặt ứng dụng ở góc phải thanh địa chỉ URL.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                2
              </span>
              <span>
                <strong>Trên điện thoại (iOS / Safari):</strong> Bấm nút <em>Chia sẻ (Share)</em> &rarr; Chọn <em>"Thêm vào Màn hình chính" (Add to Home Screen)</em>.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                3
              </span>
              <span>
                <strong>Trên điện thoại (Android / Chrome):</strong> Bấm menu 3 chấm &rarr; Chọn <em>"Cài đặt ứng dụng"</em>.
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-brand-border flex justify-end">
            <Button variant="primary" size="md" onClick={() => setIsShortcutModalOpen(false)}>
              Đã hiểu
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
