// ==============================================================================
// V-ACT HUB: Settings Page (Cài đặt ứng dụng)
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  Database,
  Key,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  Smartphone,
  Laptop,
  Apple,
  Target,
  Zap,
  LogOut,
  RefreshCw,
  Sparkles,
  Info,
  ShieldCheck,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useUserStatsStore } from '../store/userStatsStore';
import { useTargetMajorStore } from '../store/targetMajorStore';
import { BK_SCORES_2026, ProgramType } from '../data/bkScores';
import { Button, Card, Chip, Toggle } from '../components/ui';
import { loadSeedData } from '../data/seed';
import { getRepository } from '../data';
import { isSoundEnabled, setSoundEnabled, playCorrectSound } from '../lib/sound';
import {
  isGeminiFeatureEnabled,
  getGeminiApiKey,
  getGeminiModel,
  saveGeminiConfig,
  clearGeminiConfig,
  testGeminiApiKey,
} from '../features/import/geminiProvider';
import {
  exportFullBackupToFile,
  inspectBackupFile,
  restoreFullBackup,
  BackupInspectionResult,
} from '../features/backup/backupService';
import { isSupabaseConfigured, getCurrentUser, signOut } from '../lib/supabase';
import { AuthModal } from '../components/auth/AuthModal';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useThemeStore();
  const { stats, updateStats, refreshStats } = useUserStatsStore();
  const { program: curProgram, code: curCode, key: curKey, setTargetMajor } = useTargetMajorStore();

  // Sound State
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());

  // Daily Goal State
  const currentGoalXp = stats?.dailyGoalXp || 50;

  // Major Target State
  const [majorTab, setMajorTab] = useState<'all' | 'standard' | 'pfiev'>('all');
  const [majorSearch, setMajorSearch] = useState('');

  // Seed Data State
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);

  // Backup & Restore State
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreInspection, setRestoreInspection] = useState<BackupInspectionResult | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [restoring, setRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PWA State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [pwaInstalledSuccess, setPwaInstalledSuccess] = useState(false);

  // Gemini API State (Only used when feature enabled)
  const geminiAvailable = isGeminiFeatureEnabled();
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => getGeminiApiKey());
  const [geminiModelInput, setGeminiModelInput] = useState(() => getGeminiModel());
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<{ text: string; isError?: boolean } | null>(null);
  const [geminiTesting, setGeminiTesting] = useState(false);

  // Auth / Supabase State
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Initialize and check standalone / beforeinstallprompt
  useEffect(() => {
    // Check if app is installed / running in standalone mode
    if (typeof window !== 'undefined') {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);

      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

  // Check auth user
  useEffect(() => {
    if (isSupabaseConfigured) {
      getCurrentUser().then((user) => {
        if (user) setCurrentUserEmail(user.email || 'Học viên');
      });
    }
  }, []);

  // Handle Sound Toggle
  const handleToggleSound = (enabled: boolean) => {
    setSoundOn(enabled);
    setSoundEnabled(enabled);
    if (enabled) {
      playCorrectSound();
    }
  };

  // Handle Daily Goal Change
  const handleSelectDailyGoal = async (xp: number) => {
    try {
      await updateStats({ dailyGoalXp: xp });
      const repo = getRepository();
      if (typeof repo.saveSettings === 'function') {
        await repo.saveSettings({ dailyGoalXp: xp });
      }
    } catch (err) {
      console.warn('Failed to update daily goal:', err);
    }
  };

  // Handle Target Major Change
  const handleSelectMajor = (major: typeof BK_SCORES_2026[0]) => {
    setTargetMajor({
      program: major.program,
      code: major.code,
      key: major.key,
    });
  };

  // Handle Seed Data Loader
  const handleLoadSeed = async (force: boolean = false) => {
    try {
      setSeedLoading(true);
      setSeedStatus(null);
      const res = await loadSeedData(undefined, { force });
      if (res.success) {
        setSeedStatus(
          res.message || `Nạp thành công ${res.importedQuestions} câu hỏi thuộc ${res.importedSets} bài tập!`
        );
        refreshStats();
      } else {
        setSeedStatus(`Lỗi nạp dữ liệu: ${res.error || 'Vui lòng thử lại'}`);
      }
    } catch (err: any) {
      setSeedStatus(`Lỗi: ${err.message || String(err)}`);
    } finally {
      setSeedLoading(false);
    }
  };

  // Handle Full JSON Export
  const handleExportBackup = async () => {
    try {
      setBackupLoading(true);
      setBackupMessage(null);
      const { fileName, data } = await exportFullBackupToFile();
      const qCount = data.questions?.length || 0;
      setBackupMessage({
        text: `Đã xuất tệp sao lưu "${fileName}" (${qCount} câu hỏi, ${data.sets?.length || 0} bài tập). Khóa API không bao giờ được đưa vào bản sao lưu.`,
      });
    } catch (err: any) {
      setBackupMessage({
        text: `Lỗi xuất dữ liệu: ${err.message || String(err)}`,
        isError: true,
      });
    } finally {
      setBackupLoading(false);
    }
  };

  // Handle File Selection for Restore
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setRestoreFile(file);
      setBackupMessage(null);
      const text = await file.text();
      const inspection = inspectBackupFile(text);
      setRestoreInspection(inspection);

      if (!inspection.isValid) {
        setBackupMessage({
          text: inspection.error || 'Tệp sao lưu không đúng định dạng JSON hợp lệ.',
          isError: true,
        });
      }
    } catch (err: any) {
      setBackupMessage({
        text: `Lỗi đọc tệp: ${err.message || String(err)}`,
        isError: true,
      });
    }
  };

  // Handle Restore Confirmation
  const handleExecuteRestore = async () => {
    if (!restoreInspection || !restoreInspection.isValid) return;

    try {
      setRestoring(true);
      setBackupMessage(null);
      const result = await restoreFullBackup(restoreInspection.data, restoreMode);

      if (result.success) {
        setBackupMessage({
          text: `Khôi phục thành công (${result.mode === 'replace' ? 'Thay thế sạch' : 'Gộp dữ liệu'}): ${result.importedQuestions} câu hỏi, ${result.importedSets} bài tập đã sẵn sàng!`,
        });
        setRestoreFile(null);
        setRestoreInspection(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        await refreshStats();
      } else {
        setBackupMessage({
          text: `Lỗi khôi phục: ${result.error || result.message}`,
          isError: true,
        });
      }
    } catch (err: any) {
      setBackupMessage({
        text: `Lỗi ngoại lệ khi khôi phục: ${err.message || String(err)}`,
        isError: true,
      });
    } finally {
      setRestoring(false);
    }
  };

  // Handle PWA Install Button Click
  const handlePwaInstall = async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setPwaInstalledSuccess(true);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.warn('PWA install error:', err);
    }
  };

  // Handle Gemini Config Save
  const handleSaveGeminiConfig = () => {
    saveGeminiConfig(geminiKeyInput, geminiModelInput);
    setGeminiStatus({
      text: 'Đã lưu khóa API và Model vào bộ nhớ trình duyệt cục bộ (localStorage).',
    });
  };

  // Handle Gemini Config Clear
  const handleClearGeminiConfig = () => {
    clearGeminiConfig();
    setGeminiKeyInput('');
    setGeminiModelInput('gemini-1.5-flash');
    setGeminiStatus({
      text: 'Đã xóa khóa API và cấu hình Gemini khỏi trình duyệt.',
    });
  };

  // Handle Gemini Connection Test
  const handleTestGemini = async () => {
    try {
      setGeminiTesting(true);
      setGeminiStatus(null);
      const res = await testGeminiApiKey(geminiKeyInput, geminiModelInput);
      setGeminiStatus({
        text: res.message,
        isError: !res.success,
      });
    } catch (err: any) {
      setGeminiStatus({
        text: `Lỗi kiểm tra: ${err.message || String(err)}`,
        isError: true,
      });
    } finally {
      setGeminiTesting(false);
    }
  };

  // Filtered Majors for Target Selection
  const filteredMajors = BK_SCORES_2026.filter((m) => {
    if (majorTab === 'standard' && m.program !== 'standard') return false;
    if (majorTab === 'pfiev' && m.program !== 'pfiev') return false;
    if (majorSearch.trim()) {
      const q = majorSearch.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.code.toLowerCase().includes(q) ||
        m.benchmark.toString().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Chip variant="primary" size="sm" icon={<Settings className="w-3.5 h-3.5" />}>
            HỆ THỐNG
          </Chip>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-brand-navy dark:text-brand-blue tracking-tight">
          Cài đặt ứng dụng
        </h2>
        <p className="text-xs sm:text-sm font-bold text-surface-secondary mt-1">
          Tùy chỉnh giao diện hiển thị, âm thanh, mục tiêu học tập, sao lưu & khôi phục CSDL.
        </p>
      </div>

      {/* 1. Theme Settings */}
      <Card variant="3d" padding="md">
        <h3 className="text-base font-black text-surface-primary mb-3">Giao diện (Theme)</h3>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 transition-all font-bold text-xs ${
              theme === 'light'
                ? 'border-brand-blue bg-brand-blue-light/40 text-brand-blue shadow-sm ring-2 ring-brand-blue/20'
                : 'border-brand-border bg-brand-card text-surface-secondary hover:border-brand-gray/40'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <span>Sáng (Light)</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 transition-all font-bold text-xs ${
              theme === 'dark'
                ? 'border-brand-blue bg-brand-blue-light/40 text-brand-blue shadow-sm ring-2 ring-brand-blue/20'
                : 'border-brand-border bg-brand-card text-surface-secondary hover:border-brand-gray/40'
            }`}
          >
            <Moon className="w-5 h-5 text-indigo-400" />
            <span>Tối (Dark)</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 transition-all font-bold text-xs ${
              theme === 'system'
                ? 'border-brand-blue bg-brand-blue-light/40 text-brand-blue shadow-sm ring-2 ring-brand-blue/20'
                : 'border-brand-border bg-brand-card text-surface-secondary hover:border-brand-gray/40'
            }`}
          >
            <Monitor className="w-5 h-5 text-brand-gray" />
            <span>Theo thiết bị</span>
          </button>
        </div>
      </Card>

      {/* 2. Procedural Web Audio Sound Settings */}
      <Card variant="default" padding="md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl transition-colors ${
                soundOn
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-500'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-sm font-black text-surface-primary">Âm thanh & Hiệu ứng tương tác</h4>
              <p className="text-xs font-semibold text-surface-secondary">
                Bộ tổng hợp âm thanh Web Audio API (không tải file audio tĩnh) khi đúng/sai, thăng hạng sao.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {soundOn && (
              <button
                type="button"
                onClick={() => playCorrectSound()}
                className="text-xs font-black text-brand-blue hover:underline px-2 py-1 rounded bg-brand-blue-light/30"
                title="Bấm để nghe thử âm thanh"
              >
                Thử âm
              </button>
            )}
            <Toggle checked={soundOn} onChange={handleToggleSound} size="md" />
          </div>
        </div>
      </Card>

      {/* 3. Daily XP Goal */}
      <Card variant="3d" padding="md">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-brand-yellow" />
          <h3 className="text-base font-black text-surface-primary">Mục tiêu kinh nghiệm mỗi ngày</h3>
        </div>
        <p className="text-xs font-semibold text-surface-secondary mb-4">
          Chọn chỉ tiêu XP hàng ngày để duy trì động lực rèn luyện và hoàn thành bài tập V-ACT.
        </p>

        <div className="grid grid-cols-3 gap-3">
          {[
            { xp: 20, label: 'Thư giãn', desc: 'Khoảng 1 bài/ngày' },
            { xp: 50, label: 'Tiêu chuẩn', desc: 'Khoảng 2-3 bài/ngày' },
            { xp: 100, label: 'Tăng tốc', desc: 'Chinh phục top điểm' },
          ].map((item) => (
            <button
              key={item.xp}
              type="button"
              onClick={() => handleSelectDailyGoal(item.xp)}
              className={`p-3.5 rounded-2xl border-2 text-center transition-all ${
                currentGoalXp === item.xp
                  ? 'border-brand-green bg-brand-green-light/30 text-brand-green shadow-sm ring-2 ring-brand-green/20'
                  : 'border-brand-border bg-brand-card text-surface-secondary hover:border-brand-gray/30'
              }`}
            >
              <div className="text-lg font-black">{item.xp} XP</div>
              <div className="text-xs font-black mt-0.5">{item.label}</div>
              <div className="text-[10px] text-surface-secondary mt-1">{item.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* 4. Target Major Bách Khoa 2026 */}
      <Card variant="3d" padding="md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-brand-red" />
            <h3 className="text-base font-black text-surface-primary">Mục tiêu Bách Khoa TP.HCM 2026</h3>
          </div>
          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-brand-blue-light text-brand-blue">
            {curProgram === 'pfiev' ? 'PFIEV (7 ngành)' : 'Đại trà (29 ngành)'}
          </span>
        </div>
        <p className="text-xs font-semibold text-surface-secondary mb-3">
          Chọn ngành mục tiêu chính thức để hiển thị trên bản đồ Lộ trình, Màn chào mừng và thanh điểm chuẩn.
        </p>

        {/* Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="flex gap-1.5 p-1 bg-brand-bg rounded-xl border border-brand-border shrink-0">
            <button
              type="button"
              onClick={() => setMajorTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                majorTab === 'all'
                  ? 'bg-brand-blue text-white shadow-xs'
                  : 'text-surface-secondary hover:text-surface-primary'
              }`}
            >
              Tất cả (36)
            </button>
            <button
              type="button"
              onClick={() => setMajorTab('standard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                majorTab === 'standard'
                  ? 'bg-brand-blue text-white shadow-xs'
                  : 'text-surface-secondary hover:text-surface-primary'
              }`}
            >
              Đại trà (29)
            </button>
            <button
              type="button"
              onClick={() => setMajorTab('pfiev')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                majorTab === 'pfiev'
                  ? 'bg-brand-blue text-white shadow-xs'
                  : 'text-surface-secondary hover:text-surface-primary'
              }`}
            >
              PFIEV (7)
            </button>
          </div>

          <input
            type="text"
            value={majorSearch}
            onChange={(e) => setMajorSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc mã ngành..."
            className="flex-1 p-2 rounded-xl bg-brand-bg border border-brand-border text-xs text-surface-primary outline-none focus:border-brand-blue"
          />
        </div>

        {/* Major Selector List (Max Height scroll) */}
        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border border-brand-border/60 rounded-xl p-2 bg-brand-bg/50">
          {filteredMajors.map((m) => {
            const isSelected = m.key === curKey || (m.code === curCode && m.program === curProgram);
            return (
              <div
                key={m.key}
                onClick={() => handleSelectMajor(m)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                  isSelected
                    ? 'border-brand-blue bg-brand-blue-light/50 text-brand-blue font-black shadow-xs'
                    : 'border-brand-border bg-brand-card hover:border-brand-gray/40 text-surface-primary'
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-brand-bg border border-brand-border shrink-0">
                    {m.code}
                  </span>
                  <span className="truncate">{m.name}</span>
                  {m.program === 'pfiev' && (
                    <span className="text-[10px] px-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-600 font-bold shrink-0">
                      PFIEV
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-black text-brand-navy dark:text-brand-blue">
                    {m.benchmark.toFixed(2)}
                  </span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-blue shrink-0" />}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 5. Seed Data Loader */}
      <Card variant="3d" padding="md">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-brand-blue shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-base font-black text-surface-primary">Nạp dữ liệu mẫu ban đầu</h4>
            <p className="text-xs font-semibold text-surface-secondary mt-1 leading-relaxed">
              Tự động nạp 130 câu hỏi chuẩn hóa môn Tiếng Anh (Chuyên đề 15: Câu điều kiện) từ kho thư viện di sản vào bộ nhớ máy (IndexedDB / Supabase).
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                size="md"
                loading={seedLoading}
                onClick={() => handleLoadSeed(false)}
              >
                Nạp dữ liệu mẫu (130 câu)
              </Button>
              <Button
                variant="outline"
                size="md"
                loading={seedLoading}
                onClick={() => handleLoadSeed(true)}
              >
                Nạp lại từ đầu
              </Button>
            </div>

            {seedStatus && (
              <div className="mt-3 p-3 rounded-xl bg-brand-bg border border-brand-border text-xs font-bold text-surface-primary flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0" />
                <span>{seedStatus}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 6. Full JSON Backup & Restore (Integrated with backupService.ts) */}
      <Card variant="3d" padding="md">
        <div className="flex items-center gap-2 mb-2">
          <Download className="w-5 h-5 text-brand-blue" />
          <h3 className="text-base font-black text-surface-primary">Sao lưu & Khôi phục dữ liệu toàn diện (JSON)</h3>
        </div>
        <p className="text-xs font-semibold text-surface-secondary mb-4 leading-relaxed">
          Xuất toàn bộ CSDL gồm Môn học, Chuyên đề, Bài tập, Câu hỏi, Đoạn văn, Tiến độ, Lịch sử câu sai và Sao đạt được thành một tệp JSON duy nhất. Tuyệt đối không bao gồm khóa API Gemini.
        </p>

        {/* Action Buttons: Export & Select File */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            size="md"
            loading={backupLoading}
            onClick={handleExportBackup}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Xuất bản sao lưu (JSON)
          </Button>

          <label className="cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-brand-border bg-brand-card hover:bg-brand-bg text-surface-primary font-black text-xs transition-all shadow-xs">
              <Upload className="w-4 h-4 text-brand-blue" />
              Chọn tệp sao lưu (.json)
            </span>
          </label>
        </div>

        {/* Backup Status / Error Message */}
        {backupMessage && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs font-bold flex items-start gap-2 ${
              backupMessage.isError
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            {backupMessage.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{backupMessage.text}</span>
          </div>
        )}

        {/* Restore File Preview & Mode Selection */}
        {restoreInspection && restoreInspection.isValid && (
          <div className="mt-4 p-4 rounded-2xl bg-brand-bg border border-brand-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-yellow" />
                <h4 className="text-xs font-black text-surface-primary uppercase tracking-wider">
                  Xem trước tệp sao lưu
                </h4>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-blue-light text-brand-blue">
                {restoreInspection.format === 'legacy_library' ? 'Định dạng Di sản (Legacy)' : 'Bản sao lưu đầy đủ v1'}
              </span>
            </div>

            {/* Statistics Preview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-brand-card border border-brand-border">
                <div className="text-base font-black text-surface-primary">
                  {restoreInspection.summary.subjectsCount}
                </div>
                <div className="text-[10px] font-bold text-surface-secondary">Môn học</div>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-card border border-brand-border">
                <div className="text-base font-black text-surface-primary">
                  {restoreInspection.summary.setsCount}
                </div>
                <div className="text-[10px] font-bold text-surface-secondary">Bài tập</div>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-card border border-brand-border">
                <div className="text-base font-black text-brand-blue">
                  {restoreInspection.summary.questionsCount}
                </div>
                <div className="text-[10px] font-bold text-surface-secondary">Câu hỏi</div>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-card border border-brand-border">
                <div className="text-base font-black text-brand-green">
                  {restoreInspection.summary.setProgressCount}
                </div>
                <div className="text-[10px] font-bold text-surface-secondary">Tiến độ bài</div>
              </div>
            </div>

            {/* Restore Mode Choice */}
            <div>
              <label className="text-xs font-black text-surface-primary block mb-2">
                Chọn chế độ khôi phục:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRestoreMode('replace')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    restoreMode === 'replace'
                      ? 'border-brand-red bg-rose-50/60 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 ring-2 ring-brand-red/20'
                      : 'border-brand-border bg-brand-card text-surface-secondary'
                  }`}
                >
                  <div className="text-xs font-black">Xóa sạch & Thay thế (Replace)</div>
                  <div className="text-[10px] mt-0.5 opacity-80">
                    Xóa sạch CSDL hiện tại và đưa toàn bộ nội dung từ bản sao lưu vào.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRestoreMode('merge')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    restoreMode === 'merge'
                      ? 'border-brand-green bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 ring-2 ring-brand-green/20'
                      : 'border-brand-border bg-brand-card text-surface-secondary'
                  }`}
                >
                  <div className="text-xs font-black">Gộp dữ liệu (Merge)</div>
                  <div className="text-[10px] mt-0.5 opacity-80">
                    Giữ nguyên dữ liệu hiện có, gộp thêm bài mới và giữ số sao cao hơn.
                  </div>
                </button>
              </div>
            </div>

            {/* Confirm Restore Button */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant={restoreMode === 'replace' ? 'danger' : 'primary'}
                size="md"
                loading={restoring}
                onClick={handleExecuteRestore}
              >
                {restoreMode === 'replace' ? 'Xác nhận xóa & Khôi phục' : 'Xác nhận gộp dữ liệu'}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setRestoreInspection(null);
                  setRestoreFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-3 py-2 text-xs font-bold text-surface-secondary hover:text-surface-primary"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* 7. PWA Section: Install App / Create Shortcut */}
      <Card variant="3d" padding="md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-indigo-500" />
            <h3 className="text-base font-black text-surface-primary">Cài đặt App / Tạo Shortcut</h3>
          </div>
          {isStandalone ? (
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã cài đặt
            </span>
          ) : (
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              PWA Offline
            </span>
          )}
        </div>
        <p className="text-xs font-semibold text-surface-secondary mb-4 leading-relaxed">
          Cài đặt V-ACT HUB trực tiếp vào màn hình chính máy tính hoặc điện thoại để học tập ngoại tuyến tốc độ cao như ứng dụng gốc, không cần qua App Store/Google Play.
        </p>

        {/* Prompt Install Button if available */}
        {deferredPrompt && !isStandalone && (
          <div className="mb-4 p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black text-indigo-900 dark:text-indigo-200">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Trình duyệt đã sẵn sàng để cài đặt!</span>
            </div>
            <Button variant="primary" size="sm" onClick={handlePwaInstall}>
              Cài đặt ngay
            </Button>
          </div>
        )}

        {pwaInstalledSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Chúc mừng bạn đã cài đặt thành công V-ACT HUB!</span>
          </div>
        )}

        {/* Step-by-Step Instructions for Desktop, Android, iOS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Desktop Instruction */}
          <div className="p-3.5 rounded-2xl bg-brand-bg border border-brand-border">
            <div className="flex items-center gap-2 mb-2 font-black text-xs text-surface-primary">
              <Laptop className="w-4 h-4 text-brand-blue" />
              <span>Máy tính (Chrome / Edge)</span>
            </div>
            <p className="text-[11px] font-semibold text-surface-secondary leading-relaxed">
              Bấm vào biểu tượng <strong>Cài đặt</strong> (hình máy tính nhỏ có mũi tên tải xuống) trên thanh địa chỉ URL, hoặc mở menu <strong>⋮</strong> &rarr; chọn <strong>"Cài đặt V-ACT HUB"</strong>.
            </p>
          </div>

          {/* Android Instruction */}
          <div className="p-3.5 rounded-2xl bg-brand-bg border border-brand-border">
            <div className="flex items-center gap-2 mb-2 font-black text-xs text-surface-primary">
              <Smartphone className="w-4 h-4 text-emerald-500" />
              <span>Điện thoại Android</span>
            </div>
            <p className="text-[11px] font-semibold text-surface-secondary leading-relaxed">
              Bấm vào biểu tượng <strong>3 chấm ⋮</strong> ở góc trên bên phải trình duyệt Chrome / Cốc Cốc &rarr; Chọn <strong>"Thêm vào màn hình chính"</strong> (Add to Home screen).
            </p>
          </div>

          {/* iOS Instruction */}
          <div className="p-3.5 rounded-2xl bg-brand-bg border border-brand-border">
            <div className="flex items-center gap-2 mb-2 font-black text-xs text-surface-primary">
              <Apple className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              <span>iPhone / iPad (Safari)</span>
            </div>
            <p className="text-[11px] font-semibold text-surface-secondary leading-relaxed">
              Mở app trong Safari, chạm vào biểu tượng <strong>Chia sẻ</strong> (hình ô vuông có mũi tên chỉ lên) ở thanh dưới &rarr; Kéo xuống chọn <strong>"Thêm vào MH chính"</strong>.
            </p>
          </div>
        </div>
      </Card>

      {/* 8. Gemini API Key Section (ONLY rendered if VITE_ENABLE_GEMINI === 'true') */}
      {geminiAvailable && (
        <Card variant="flat" padding="md" className="border-2 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-black text-surface-primary">Khóa Gemini API (Cục bộ & Bảo mật)</h4>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  Ẩn / Local Only
                </span>
              </div>
              <p className="text-xs font-semibold text-surface-secondary mt-1 leading-relaxed">
                Khóa API và model được lưu duy nhất trên <code>localStorage</code> của trình duyệt này. Tuyệt đối không bao giờ gửi lên Supabase và không bao giờ xuất vào file sao lưu JSON.
              </p>

              {/* API Key Input */}
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-bold text-surface-primary block mb-1">
                    Gemini API Key:
                  </label>
                  <div className="relative">
                    <input
                      type={showGeminiKey ? 'text' : 'password'}
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full p-2.5 pr-10 rounded-xl bg-brand-bg border border-brand-border text-xs font-mono text-surface-primary outline-none focus:border-brand-blue"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-3 top-2.5 text-surface-secondary hover:text-surface-primary"
                    >
                      {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-surface-primary block mb-1">
                    Mô hình (Model name):
                  </label>
                  <input
                    type="text"
                    value={geminiModelInput}
                    onChange={(e) => setGeminiModelInput(e.target.value)}
                    placeholder="gemini-1.5-flash"
                    className="w-full p-2.5 rounded-xl bg-brand-bg border border-brand-border text-xs font-mono text-surface-primary outline-none focus:border-brand-blue"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button variant="primary" size="sm" onClick={handleSaveGeminiConfig}>
                    Lưu cấu hình
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    loading={geminiTesting}
                    onClick={handleTestGemini}
                  >
                    Kiểm tra kết nối
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearGeminiConfig}
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Xóa khóa
                  </Button>
                </div>

                {geminiStatus && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                      geminiStatus.isError
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-700'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800'
                    }`}
                  >
                    {geminiStatus.isError ? (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    )}
                    <span>{geminiStatus.text}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 9. Logout & Supabase Synchronization */}
      <Card variant="3d" padding="md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-black text-surface-primary">Đồng bộ & Tài khoản</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-bg border border-brand-border">
                  {isSupabaseConfigured ? 'Chế độ Supabase Online' : 'Chế độ Cục bộ (Local IDB)'}
                </span>
              </div>
              <p className="text-xs font-semibold text-surface-secondary mt-0.5">
                {currentUserEmail ? (
                  <span>Đang đăng nhập với email: <strong>{currentUserEmail}</strong></span>
                ) : (
                  <span>Chưa đăng nhập tài khoản đám mây. Mọi dữ liệu đang được lưu trữ an toàn trên thiết bị của bạn.</span>
                )}
              </p>
            </div>
          </div>

          <div>
            {currentUserEmail ? (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<LogOut className="w-4 h-4" />}
                onClick={async () => {
                  await signOut();
                  setCurrentUserEmail(null);
                  setSyncStatusMsg('Đã đăng xuất khỏi Supabase.');
                }}
              >
                Đăng xuất
              </Button>
            ) : isSupabaseConfigured ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setAuthModalOpen(true)}
              >
                Đăng nhập
              </Button>
            ) : null}
          </div>
        </div>

        {syncStatusMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-brand-bg border border-brand-border text-xs font-bold text-surface-primary flex items-center gap-2">
            <Info className="w-4 h-4 text-brand-blue shrink-0" />
            <span>{syncStatusMsg}</span>
          </div>
        )}
      </Card>

      {/* Auth Modal for Supabase sign in/up */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          getCurrentUser().then((u) => {
            if (u) setCurrentUserEmail(u.email || 'Học viên');
          });
          setAuthModalOpen(false);
          refreshStats();
        }}
      />
    </div>
  );
};
