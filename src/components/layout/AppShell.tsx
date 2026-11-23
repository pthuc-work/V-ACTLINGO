import React, { useState } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
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
  CheckCircle2,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';
import { useTargetMajorStore } from '../../store/targetMajorStore';
import { Button, Card, Chip, Modal, ProgressBar, Toggle } from '../ui';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Lộ trình', icon: Compass },
  { to: '/import', label: 'Import tài liệu (AI)', icon: Sparkles, badge: 'AI' },
  { to: '/formulas', label: 'Bảng công thức', icon: BookOpen },
  { to: '/manage', label: 'Quản lý & Sắp xếp bài', icon: FolderTree },
  { to: '/benchmark', label: 'Điểm chuẩn BK 2026', icon: GraduationCap },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
];

interface AppShellProps {
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const { effectiveTheme, toggleTheme } = useThemeStore();
  const { getTargetMajor } = useTargetMajorStore();
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);

  const targetMajor = getTargetMajor();

  // Mocked state for widgets (can be bound to stats store in Phase 2)
  const streakDays = 5;
  const streakFreezesLeft = 3;
  const totalXp = 350;
  const dailySolved = 20;
  const dailyTarget = 30;

  return (
    <div className="min-h-screen bg-brand-bg text-surface-primary flex flex-col">
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
          <div className="flex items-center gap-2">
            <img src="/icons/logobachkhoa.webp" alt="BK TP.HCM" className="w-8 h-8 object-contain drop-shadow-sm" />
            <div className="leading-tight">
              <span className="font-black text-base text-brand-navy dark:text-brand-blue tracking-tight block">
                V-ACT HUB
              </span>
              <span className="text-[10px] font-extrabold text-surface-secondary block -mt-0.5">
                ĐHQG TP.HCM
              </span>
            </div>
          </div>
        </div>

        {/* Quick pills for Streak & XP */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 font-black text-xs">
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>{streakDays}</span>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800 text-brand-blue font-black text-xs">
            <Zap className="w-3.5 h-3.5 fill-current text-brand-yellow" />
            <span>{totalXp} XP</span>
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
          <div className="flex items-center gap-3 px-3 mb-8">
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
                Luyện thi ĐHQG-HCM
              </p>
            </div>
          </div>

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
            {/* Dark / Light Toggle */}
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

            {/* Install / Shortcut Button */}
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
        <aside className="hidden lg:flex flex-col w-80 shrink-0 sticky top-0 h-screen py-6 pl-4 border-l border-brand-border/80 overflow-y-auto custom-scrollbar gap-5">
          {/* Streak Card */}
          <Card variant="3d" padding="md" className="relative overflow-hidden bg-gradient-to-br from-brand-card to-amber-50/20 dark:to-amber-950/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-500 border border-amber-300 dark:border-amber-700">
                  <Flame className="w-6 h-6 fill-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-black text-surface-primary">Chuỗi học tập</h3>
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400">{streakDays} ngày liên tiếp!</p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-brand-border/60 flex items-center justify-between text-xs font-bold text-surface-secondary">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-blue" />
                Đóng băng tuần
              </span>
              <span className="font-extrabold text-brand-blue bg-brand-blue-light dark:bg-brand-blue-light/40 px-2 py-0.5 rounded-full">
                {streakFreezesLeft}/3 lượt
              </span>
            </div>
          </Card>

          {/* XP & Level Card */}
          <Card variant="default" padding="md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-brand-blue border border-blue-300 dark:border-blue-700">
                  <Zap className="w-6 h-6 fill-brand-yellow text-brand-yellow" />
                </div>
                <div>
                  <h3 className="text-base font-black text-surface-primary">Điểm kinh nghiệm</h3>
                  <p className="text-xs font-extrabold text-brand-blue">{totalXp} XP · Hạng Đồng</p>
                </div>
              </div>
            </div>

            <ProgressBar value={totalXp % 100} max={100} color="yellow" size="sm" />
            <div className="flex justify-between text-[11px] font-bold text-surface-muted mt-1.5">
              <span>Cấp 3</span>
              <span>{(totalXp % 100)}/100 XP lên cấp</span>
            </div>
          </Card>

          {/* Daily Goal Widget */}
          <Card variant="default" padding="md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black text-surface-primary flex items-center gap-2">
                <Target className="w-4 h-4 text-brand-green" />
                Mục tiêu hôm nay
              </h3>
              <span className="text-xs font-black text-brand-green">
                {dailySolved}/{dailyTarget} câu
              </span>
            </div>

            <ProgressBar value={dailySolved} max={dailyTarget} color="green" size="md" />

            <p className="text-xs font-bold text-surface-secondary mt-2.5 leading-relaxed">
              {dailySolved >= dailyTarget
                ? '🎉 Tuyệt vời! Bạn đã hoàn thành mục tiêu ngày hôm nay!'
                : `Còn ${dailyTarget - dailySolved} câu nữa để giữ vững phong độ!`}
            </p>
          </Card>

          {/* Target Major Card (Bách Khoa TP.HCM) */}
          <Link to="/benchmark" className="block group">
            <Card
              variant="flat"
              padding="md"
              className="border-brand-blue/30 bg-brand-blue-light/30 dark:bg-brand-blue-light/10 hover:border-brand-blue hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-brand-navy text-white shrink-0 mt-0.5 flex items-center justify-center">
                  <img src="/icons/logobachkhoa.webp" alt="BK TP.HCM" className="w-5 h-5 object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-blue block">
                      Ngành mục tiêu 2026
                    </span>
                    <span className="text-[10px] font-bold text-surface-muted group-hover:text-brand-blue transition-colors">
                      Đổi &rarr;
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-surface-primary mt-0.5 truncate" title={targetMajor.name}>
                    {targetMajor.name} ({targetMajor.code})
                  </h4>
                  <p className="text-xs font-extrabold text-surface-secondary mt-0.5">
                    ĐH Bách Khoa TP.HCM
                  </p>
                  <div className="mt-2 flex items-center justify-between pt-2 border-t border-brand-border/60">
                    <span className="text-xs font-bold text-surface-muted">Điểm chuẩn tham khảo:</span>
                    <span className="text-xs font-black text-amber-500 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                      {targetMajor.benchmark.toFixed(2)} ⭐
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
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

            {/* Streak & XP cards inside drawer */}
            <Card variant="3d" padding="md">
              <div className="flex items-center gap-2 mb-2 text-amber-500 font-black">
                <Flame className="w-5 h-5 fill-current" />
                <span>{streakDays} ngày liên tiếp</span>
              </div>
              <p className="text-xs font-bold text-surface-secondary">
                Đóng băng tuần: {streakFreezesLeft}/3 lượt
              </p>
            </Card>

            <Card variant="default" padding="md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-surface-primary">Mục tiêu hôm nay</span>
                <span className="text-xs font-black text-brand-green">
                  {dailySolved}/{dailyTarget} câu
                </span>
              </div>
              <ProgressBar value={dailySolved} max={dailyTarget} color="green" size="md" />
            </Card>
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
