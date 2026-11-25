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
  Layers,
  Award,
  Settings,
  RotateCcw,
  BarChart3,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useTargetMajorStore } from '../../store/targetMajorStore';
import { useCurriculumStore } from '../../store/curriculumStore';
import { useUserStatsStore } from '../../store/userStatsStore';
import { Button, Card, Chip, Modal, ProgressBar, Toggle } from '../ui';
import { getRepository } from '../../data';
import { Subject, Topic, SetEntity, SetProgress } from '../../data/types';
import { calculateTopicProgress } from '../../lib/progress';

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Học tập & Ôn luyện',
    items: [
      { to: '/', label: 'Lộ trình', icon: Compass },
      { to: '/review', label: 'Kho câu sai', icon: RotateCcw },
      { to: '/stats', label: 'Thống kê dạng bài', icon: BarChart3 },
      { to: '/formulas', label: 'Bảng công thức', icon: BookOpen },
    ],
  },
  {
    title: 'Công cụ & Quản lý',
    items: [
      { to: '/import', label: 'Import tài liệu (AI)', icon: Sparkles, badge: 'AI' },
      { to: '/manage', label: 'Quản lý & Sắp xếp bài', icon: FolderTree },
      { to: '/benchmark', label: 'Điểm chuẩn BK 2026', icon: GraduationCap },
      { to: '/settings', label: 'Cài đặt', icon: Settings },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

// 5 primary items for mobile bottom nav
export const MOBILE_PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Lộ trình', icon: Compass },
  { to: '/review', label: 'Câu sai', icon: RotateCcw },
  { to: '/stats', label: 'Thống kê', icon: BarChart3 },
  { to: '/formulas', label: 'Công thức', icon: BookOpen },
  { to: '/benchmark', label: 'Điểm chuẩn', icon: GraduationCap },
];

export type LayoutBreakpoint = 'mobile' | 'tablet-compact' | 'desktop-compact' | 'desktop-wide';

export function getLayoutBreakpoint(width: number): LayoutBreakpoint {
  if (width < 768) return 'mobile';
  if (width < 1100) return 'tablet-compact'; // 768-1099px
  if (width < 1440) return 'desktop-compact'; // 1100-1439px
  return 'desktop-wide'; // >= 1440px
}

export const PANEL_ROUTES = ['/', '/practice', '/review', '/stats'];
export const HIDDEN_PANEL_ROUTES = ['/import', '/formulas', '/formula', '/manage', '/settings', '/welcome'];

export function isRouteWithRightPanel(pathname: string): boolean {
  if (pathname === '/' || pathname === '/roadmap') return true;
  if (pathname.startsWith('/practice')) return true;
  if (pathname.startsWith('/review')) return true;
  if (pathname.startsWith('/stats')) return true;
  return false;
}

export function useWindowWidth() {
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1440));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
}

interface AppShellProps {
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const windowWidth = useWindowWidth();
  const breakpoint = getLayoutBreakpoint(windowWidth);

  const { effectiveTheme, toggleTheme } = useThemeStore();
  const { getTargetMajor } = useTargetMajorStore();
  const { selectedSubjectId, selectedTopicId, setSelectedSubjectId, setSelectedTopicId, selectSubject } = useCurriculumStore();
  const { stats, refreshStats } = useUserStatsStore();

  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [isSidebarOverlayOpen, setIsSidebarOverlayOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);

  // Curriculum data
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sets, setSets] = useState<SetEntity[]>([]);
  const [progresses, setProgresses] = useState<SetProgress[]>([]);

  const targetMajor = getTargetMajor();
  const isDedicatedScreen = location.pathname === '/completion';
  const shouldRouteHavePanel = isRouteWithRightPanel(location.pathname);
  const shouldShowDockedPanel = breakpoint === 'desktop-wide' && shouldRouteHavePanel;

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
        if (currentSubId) {
          const topList = await repo.getTopics(currentSubId);
          if (!isMounted) return;
          setTopics(topList);

          const topIds = topList.map((t) => t.id);
          if (currentSubId !== selectedSubjectId || !selectedTopicId || !topIds.includes(selectedTopicId)) {
            selectSubject(currentSubId, topIds);
          }

          const activeTopId = useCurriculumStore.getState().selectedTopicId;
          if (activeTopId) {
            const setList = await repo.getSets(activeTopId);
            const progList = await repo.getAllSetProgress();
            if (!isMounted) return;
            setSets(setList);
            setProgresses(progList);
          } else {
            setSets([]);
          }
        } else {
          setTopics([]);
          setSets([]);
        }
      } catch (err) {
        console.warn('Error loading shell curriculum:', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [selectedSubjectId, selectedTopicId, selectSubject, isDedicatedScreen]);

  // Handle subject change
  const handleSubjectChange = async (newSubjectId: string) => {
    try {
      const repo = getRepository();
      const topList = await repo.getTopics(newSubjectId);
      setTopics(topList);
      selectSubject(newSubjectId, topList.map((t) => t.id));

      const activeTopicId = useCurriculumStore.getState().selectedTopicId;
      if (activeTopicId) {
        const setList = await repo.getSets(activeTopicId);
        setSets(setList);
      } else {
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

  // Topic progress calculations using unified progress logic
  const topicProgress = useMemo(() => {
    return calculateTopicProgress(sets, progresses);
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

  // Dedicated full-screen view for Completion mode
  if (isDedicatedScreen) {
    return (
      <div className="w-full h-screen h-[100dvh] max-w-none m-0 p-0 overflow-y-auto bg-brand-bg text-surface-primary flex flex-col font-sans">
        <main className="flex-1 w-full min-h-screen">
          {children}
        </main>
      </div>
    );
  }

  // Render Right Panel Widgets (shared between docked panel & drawer)
  const renderRightPanelContent = (isDrawer = false) => (
    <div className="flex flex-col gap-4">
      {/* Target Major Card (Bách Khoa TP.HCM) */}
      <Link
        to="/benchmark"
        onClick={() => isDrawer && setIsRightDrawerOpen(false)}
        className="block group"
      >
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
              {subjects.length === 0 && <option value="">Chưa có môn học</option>}
            </select>

            {/* Topic dropdown */}
            <select
              value={selectedTopicId || ''}
              onChange={(e) => handleTopicChange(e.target.value)}
              disabled={topics.length === 0}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-brand-bg border border-brand-border text-surface-primary outline-none focus:border-brand-blue disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Chọn chuyên đề"
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
              {topics.length === 0 && <option value="">Chưa có chuyên đề</option>}
            </select>
          </div>
        </div>

        {/* Topic Progress Widget */}
        <div className="pt-2 border-t border-brand-border/60">
          <div className="flex items-center justify-between text-xs font-black mb-1.5">
            <span className="text-surface-secondary">Tiến độ bài:</span>
            <span className="text-brand-blue">
              {topicProgress.formattedSetsProgress}
            </span>
          </div>
          <ProgressBar value={topicProgress.completedSets} max={Math.max(1, topicProgress.totalSets)} color="blue" size="sm" />
          
          <div className="flex items-center justify-between text-[11px] font-bold text-surface-muted mt-2">
            <span>Tiến độ câu:</span>
            <span className="font-extrabold text-surface-primary">{topicProgress.formattedQuestionsProgress}</span>
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-surface-muted mt-1.5">
            <span>Độ chính xác trung bình:</span>
            <span className="font-black text-brand-green">{topicProgress.formattedAccuracy}</span>
          </div>
        </div>

        {/* "TIẾP TỤC LÀM BÀI" Primary Button */}
        <Button
          variant="yellow"
          size="md"
          fullWidth
          disabled={sets.length === 0}
          title={sets.length === 0 ? 'Chưa có bài nào cho chuyên đề này' : 'Tiếp tục làm bài'}
          leftIcon={<Play className="w-4 h-4 fill-current" />}
          onClick={() => {
            if (isDrawer) setIsRightDrawerOpen(false);
            handleContinueLearning();
          }}
          className="mt-1 font-black shadow-pop disabled:opacity-60 disabled:cursor-not-allowed"
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
    </div>
  );

  // Determine CSS Grid column template based on breakpoint & panel presence
  const gridLayoutClass = useMemo(() => {
    switch (breakpoint) {
      case 'mobile':
        return 'grid-cols-1';
      case 'tablet-compact':
        return 'grid-cols-[72px_minmax(0,1fr)]';
      case 'desktop-compact':
        return 'grid-cols-[272px_minmax(0,1fr)]';
      case 'desktop-wide':
      default:
        return shouldShowDockedPanel
          ? 'grid-cols-[272px_minmax(0,1fr)_336px]'
          : 'grid-cols-[272px_minmax(0,1fr)]';
    }
  }, [breakpoint, shouldShowDockedPanel]);

  return (
    <div
      data-testid="app-shell-root"
      className="w-full h-screen h-[100dvh] max-w-none m-0 p-0 overflow-hidden bg-brand-bg text-surface-primary flex flex-col font-sans select-none sm:select-auto"
    >
      {/* =========================================================================
          MAIN 3-REGION CSS GRID (100% width, 100dvh, thin subtle borders)
          ========================================================================= */}
      <div className={`w-full h-full overflow-hidden grid ${gridLayoutClass}`}>
        {/* ---------------------------------------------------------------------
            REGION 1: LEFT SIDEBAR
            - Full (272px) at >= 1100px
            - Icon Rail (~72px) at 768px-1099px
            - Hidden (<768px)
            --------------------------------------------------------------------- */}
        {breakpoint === 'tablet-compact' ? (
          /* Tablet Compact Icon Rail (72px) */
          <aside
            data-testid="left-sidebar-rail"
            className="w-[72px] h-full flex flex-col items-center py-4 border-r border-brand-border/60 bg-brand-card/30 overflow-y-auto no-scrollbar shrink-0"
          >
            {/* Logo */}
            <Link to="/" className="p-2 mb-4 hover:scale-105 transition-transform" title="V-ACT HUB - ĐHQG TP.HCM">
              <img src="/icons/logobachkhoa.webp" alt="BK TP.HCM" className="w-9 h-9 object-contain drop-shadow-sm" />
            </Link>

            {/* Navigation Icons with Tooltips */}
            <nav className="flex-1 flex flex-col items-center gap-2 w-full px-2" aria-label="Menu biểu tượng">
              {ALL_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-brand-blue text-white shadow-md'
                        : 'text-surface-secondary hover:text-surface-primary hover:bg-brand-card'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </NavLink>
                );
              })}
            </nav>

            {/* Expand sidebar button & theme */}
            <div className="pt-3 border-t border-brand-border/60 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSidebarOverlayOpen(true)}
                title="Mở rộng menu"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-surface-secondary hover:text-brand-blue hover:bg-brand-card transition-colors"
                aria-label="Mở rộng menu"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => toggleTheme()}
                title={effectiveTheme === 'dark' ? 'Chuyển sang Chế độ Sáng' : 'Chuyển sang Chế độ Tối'}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-surface-secondary hover:text-brand-yellow hover:bg-brand-card transition-colors"
                aria-label="Đổi giao diện"
              >
                {effectiveTheme === 'dark' ? <Moon className="w-5 h-5 text-brand-blue" /> : <Sun className="w-5 h-5 text-brand-yellow" />}
              </button>
            </div>
          </aside>
        ) : breakpoint === 'desktop-compact' || breakpoint === 'desktop-wide' ? (
          /* Full Desktop Sidebar (272px) */
          <aside
            data-testid="left-sidebar-full"
            className="w-[272px] h-full flex flex-col py-5 px-3 border-r border-brand-border/60 bg-brand-card/30 overflow-y-auto custom-scrollbar shrink-0 text-left"
          >
            {/* Top Logo & Title */}
            <Link to="/" className="flex items-center gap-3 px-2 mb-6">
              <img
                src="/icons/logobachkhoa.webp"
                alt="BK TP.HCM"
                className="w-11 h-11 object-contain drop-shadow-sm shrink-0"
              />
              <div className="min-w-0">
                <h1 className="font-black text-xl text-brand-navy dark:text-brand-blue tracking-tight leading-none truncate">
                  V-ACT HUB
                </h1>
                <p className="text-[11px] font-bold text-surface-secondary mt-1 truncate">
                  ĐHQG TP.HCM · 2026
                </p>
              </div>
            </Link>

            {/* Grouped Navigation */}
            <div className="flex-1 flex flex-col gap-5 px-1">
              {NAV_GROUPS.map((group) => (
                <div key={group.title} className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-surface-muted px-3 mb-1">
                    {group.title}
                  </span>
                  <nav className="flex flex-col gap-1" aria-label={group.title}>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        item.to === '/'
                          ? location.pathname === '/'
                          : location.pathname.startsWith(item.to);

                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={`group flex items-center justify-between px-3 py-2.5 rounded-2xl font-extrabold text-sm transition-all duration-150 ${
                            isActive
                              ? 'bg-brand-blue-light/70 dark:bg-brand-blue-light/30 text-brand-blue border border-brand-blue/30 shadow-sm translate-x-1'
                              : 'text-surface-secondary hover:text-surface-primary hover:bg-brand-card'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`p-1.5 rounded-xl shrink-0 transition-colors ${
                                isActive
                                  ? 'bg-brand-blue text-white shadow-sm'
                                  : 'bg-brand-border/40 text-surface-secondary group-hover:text-surface-primary'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </span>
                            <span className="tracking-wide text-xs truncate">{item.label}</span>
                          </div>
                          {item.badge && (
                            <Chip variant="ai" size="sm" className="ml-1 shrink-0">
                              {item.badge}
                            </Chip>
                          )}
                        </NavLink>
                      );
                    })}
                  </nav>
                </div>
              ))}
            </div>

            {/* Fixed Bottom Block: Theme & Shortcut */}
            <div className="pt-4 mt-auto border-t border-brand-border/60 px-1 flex flex-col gap-2.5">
              <div className="flex items-center justify-between p-2 rounded-2xl bg-brand-card border border-brand-border/80">
                <span className="text-xs font-extrabold text-surface-secondary flex items-center gap-2">
                  {effectiveTheme === 'dark' ? (
                    <Moon className="w-4 h-4 text-brand-blue" />
                  ) : (
                    <Sun className="w-4 h-4 text-brand-yellow" />
                  )}
                  {effectiveTheme === 'dark' ? 'Giao diện tối' : 'Giao diện sáng'}
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
                className="text-xs font-bold py-2"
              >
                Cài đặt App / Shortcut
              </Button>
            </div>
          </aside>
        ) : null}

        {/* ---------------------------------------------------------------------
            REGION 2: MIDDLE CONTENT AREA (minmax(0, 1fr))
            Contains Topbar Header + Scrollable Page Body
            --------------------------------------------------------------------- */}
        <section
          data-testid="middle-content-area"
          className="h-full flex flex-col overflow-hidden min-w-0"
        >
          {/* Topbar: Always shown on mobile/tablet/desktop-compact, OR when docked panel is hidden */}
          {(!shouldShowDockedPanel || breakpoint !== 'desktop-wide') && (
            <header
              data-testid="app-topbar"
              className="h-14 shrink-0 px-4 sm:px-6 flex items-center justify-between border-b border-brand-border/60 bg-brand-card/60 backdrop-blur-md z-20"
            >
              {/* Left brand or breadcrumb */}
              <div className="flex items-center gap-2.5">
                {breakpoint === 'mobile' && (
                  <button
                    type="button"
                    onClick={() => setIsSidebarOverlayOpen(true)}
                    className="p-1.5 rounded-xl hover:bg-brand-border/40 text-surface-primary"
                    aria-label="Mở menu"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                )}

                <Link to="/" className="flex items-center gap-2">
                  {breakpoint === 'mobile' && (
                    <img src="/icons/logobachkhoa.webp" alt="BK TP.HCM" className="w-7 h-7 object-contain drop-shadow-sm" />
                  )}
                  <div className="leading-tight">
                    <span className="font-black text-sm sm:text-base text-brand-navy dark:text-brand-blue tracking-tight block">
                      V-ACT HUB
                    </span>
                    <span className="text-[10px] font-extrabold text-surface-secondary hidden sm:block -mt-0.5">
                      ĐHQG TP.HCM · 2026
                    </span>
                  </div>
                </Link>
              </div>

              {/* Right Quick Chips (XP, Streak, Mục tiêu BK) - Click to open Right Drawer */}
              <div className="flex items-center gap-2">
                {/* Streak Chip */}
                <button
                  type="button"
                  onClick={() => setIsRightDrawerOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 font-black text-xs hover:scale-105 transition-transform"
                  title={`${streakDays} ngày streak - Bấm xem chi tiết`}
                  aria-label="Chuỗi học tập"
                >
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  <span>{streakDays}</span>
                </button>

                {/* XP Chip */}
                <button
                  type="button"
                  onClick={() => setIsRightDrawerOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800 text-brand-blue font-black text-xs hover:scale-105 transition-transform"
                  title={`${totalXp} XP - Bấm xem chi tiết`}
                  aria-label="Kinh nghiệm"
                >
                  <Zap className="w-3.5 h-3.5 fill-current text-brand-yellow" />
                  <span>{totalXp}</span>
                </button>

                {/* BK Target Chip */}
                <button
                  type="button"
                  onClick={() => setIsRightDrawerOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-navy text-white font-extrabold text-xs hover:opacity-90 shadow-sm"
                  title={`Mục tiêu: ${targetMajor.name} (${targetMajor.benchmark.toFixed(2)}⭐) - Bấm xem chi tiết`}
                  aria-label="Mục tiêu Bách Khoa"
                >
                  <Target className="w-3.5 h-3.5 text-brand-yellow" />
                  <span className="max-w-[120px] truncate">{targetMajor.name}</span>
                  <span className="text-amber-300 font-black">({targetMajor.benchmark.toFixed(1)}⭐)</span>
                </button>

                {/* Drawer Button */}
                <button
                  type="button"
                  onClick={() => setIsRightDrawerOpen(true)}
                  className="p-1.5 rounded-xl text-surface-secondary hover:text-surface-primary hover:bg-brand-border/40"
                  aria-label="Mở tiến độ và mục tiêu"
                  title="Tiến độ & Mục tiêu"
                >
                  <Target className="w-5 h-5 text-brand-blue" />
                </button>
              </div>
            </header>
          )}

          {/* Scrollable Content Body */}
          <main
            data-testid="main-content-scroll"
            className="flex-1 w-full overflow-y-auto custom-scrollbar px-3 sm:px-6 lg:px-8 py-5 pb-24 md:pb-8"
          >
            {children}
          </main>
        </section>

        {/* ---------------------------------------------------------------------
            REGION 3: RIGHT PANEL (336px)
            - Visible inline ONLY on desktop-wide (>=1440px) AND on PANEL_ROUTES
            - Hidden on all other routes & screen widths
            --------------------------------------------------------------------- */}
        {shouldShowDockedPanel && (
          <aside
            data-testid="right-panel-docked"
            className="w-[336px] h-full overflow-y-auto custom-scrollbar p-5 border-l border-brand-border/60 bg-brand-card/20 flex flex-col gap-4 shrink-0 text-left"
          >
            {renderRightPanelContent(false)}
          </aside>
        )}
      </div>

      {/* =========================================================================
          MOBILE BOTTOM NAVIGATION (< 768px)
          - 5 primary items + "Thêm" (More) button
          - Minimum touch target >= 44px
          ========================================================================= */}
      {breakpoint === 'mobile' && (
        <nav
          data-testid="mobile-bottom-nav"
          className="fixed bottom-0 left-0 right-0 z-40 bg-brand-card/95 backdrop-blur-lg border-t border-brand-border/60 px-1 py-1 flex items-center justify-around shadow-lg h-16"
          aria-label="Điều hướng dưới mobile"
        >
          {MOBILE_PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`min-h-[44px] min-w-[44px] flex-1 flex flex-col items-center justify-center p-1 rounded-xl transition-transform ${
                  isActive
                    ? 'text-brand-blue font-black scale-105'
                    : 'text-surface-secondary font-bold hover:text-surface-primary'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] mt-0.5 truncate">{item.label}</span>
              </NavLink>
            );
          })}

          {/* Button 6: "Thêm" (More menu drawer) */}
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen(true)}
            className="min-h-[44px] min-w-[44px] flex-1 flex flex-col items-center justify-center p-1 rounded-xl text-surface-secondary font-bold hover:text-surface-primary"
            aria-label="Thêm tùy chọn"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Thêm</span>
          </button>
        </nav>
      )}

      {/* =========================================================================
          MOBILE "THÊM" (MORE) SECONDARY MENU SHEET
          ========================================================================= */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsMoreMenuOpen(false)}
          />
          <div className="relative w-full bg-brand-card rounded-t-3xl p-6 flex flex-col z-10 border-t border-brand-border shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border mb-4">
              <h3 className="font-black text-base text-surface-primary">Công cụ & Cài đặt</h3>
              <button
                type="button"
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1 rounded-xl text-surface-secondary hover:text-surface-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <NavLink
                to="/import"
                onClick={() => setIsMoreMenuOpen(false)}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-brand-border/40 font-bold text-sm text-surface-primary"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-brand-blue" />
                  <span>Import tài liệu (AI)</span>
                </div>
                <Chip variant="ai" size="sm">AI</Chip>
              </NavLink>

              <NavLink
                to="/manage"
                onClick={() => setIsMoreMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-brand-border/40 font-bold text-sm text-surface-primary"
              >
                <FolderTree className="w-5 h-5 text-brand-blue" />
                <span>Quản lý & Sắp xếp bài</span>
              </NavLink>

              <NavLink
                to="/settings"
                onClick={() => setIsMoreMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-brand-border/40 font-bold text-sm text-surface-primary"
              >
                <Settings className="w-5 h-5 text-brand-blue" />
                <span>Cài đặt ứng dụng</span>
              </NavLink>
            </div>

            <div className="pt-4 mt-4 border-t border-brand-border flex flex-col gap-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-surface-secondary">Chế độ giao diện:</span>
                <Toggle
                  checked={effectiveTheme === 'dark'}
                  onChange={() => toggleTheme()}
                  size="sm"
                />
              </div>

              <Button
                variant="outline"
                size="md"
                fullWidth
                leftIcon={<Smartphone className="w-4 h-4 text-brand-blue" />}
                onClick={() => {
                  setIsMoreMenuOpen(false);
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
          MOBILE / TABLET SIDEBAR OVERLAY DRAWER
          ========================================================================= */}
      {isSidebarOverlayOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsSidebarOverlayOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-brand-card h-full p-6 flex flex-col z-10 border-r border-brand-border shadow-2xl animate-in slide-in-from-left duration-200 overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-brand-border">
              <div className="flex items-center gap-2.5">
                <img src="/icons/logobachkhoa.webp" alt="BK TP.HCM" className="w-9 h-9 object-contain" />
                <span className="font-black text-lg text-brand-navy dark:text-brand-blue">
                  V-ACT HUB
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSidebarOverlayOpen(false)}
                className="p-1.5 rounded-xl hover:bg-brand-border/40 text-surface-secondary"
                aria-label="Đóng menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-2 flex-1" aria-label="Menu mở rộng">
              {ALL_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsSidebarOverlayOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl font-extrabold text-sm ${
                      isActive
                        ? 'bg-brand-blue text-white shadow-sm'
                        : 'text-surface-secondary hover:bg-brand-border/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
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

            <div className="pt-4 mt-4 border-t border-brand-border flex flex-col gap-3">
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
                  setIsSidebarOverlayOpen(false);
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
          RIGHT DRAWER (When panel is hidden or on narrow screens)
          ========================================================================= */}
      {isRightDrawerOpen && (
        <div data-testid="right-drawer" className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsRightDrawerOpen(false)}
          />
          <div className="relative w-80 sm:w-96 bg-brand-card h-full p-5 flex flex-col z-10 border-l border-brand-border shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border mb-4">
              <h3 className="font-black text-base text-surface-primary flex items-center gap-2">
                <Target className="w-5 h-5 text-brand-blue" />
                Tiến độ học tập & Mục tiêu
              </h3>
              <button
                type="button"
                onClick={() => setIsRightDrawerOpen(false)}
                className="p-1 rounded-xl text-surface-secondary hover:text-surface-primary"
                aria-label="Đóng tiến độ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderRightPanelContent(true)}
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
