import React, { useState } from 'react';
import { Settings, Moon, Sun, Monitor, Database, Key, Volume2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { Button, Card, Chip, Toggle } from '../components/ui';
import { loadSeedData } from '../data/seed';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useThemeStore();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [geminiKey, setGeminiKey] = useState('');
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);

  const handleLoadSeed = async (force: boolean = false) => {
    try {
      setSeedLoading(true);
      setSeedStatus(null);
      const res = await loadSeedData(undefined, { force });
      if (res.success) {
        setSeedStatus(res.message || `Nạp thành công ${res.importedQuestions} câu hỏi thuộc ${res.importedSets} bài tập!`);
      } else {
        setSeedStatus(`Lỗi nạp dữ liệu: ${res.error || 'Vui lòng thử lại'}`);
      }
    } catch (err: any) {
      setSeedStatus(`Lỗi: ${err.message || String(err)}`);
    } finally {
      setSeedLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
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
          Tùy chỉnh giao diện hiển thị, âm thanh, dữ liệu mẫu và khóa API.
        </p>
      </div>

      {/* Theme Setting */}
      <Card variant="3d" padding="md">
        <h3 className="text-base font-black text-surface-primary mb-3">Giao diện (Theme)</h3>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 transition-all font-bold text-xs ${
              theme === 'light'
                ? 'border-brand-blue bg-brand-blue-light/40 text-brand-blue shadow-sm'
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
                ? 'border-brand-blue bg-brand-blue-light/40 text-brand-blue shadow-sm'
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
                ? 'border-brand-blue bg-brand-blue-light/40 text-brand-blue shadow-sm'
                : 'border-brand-border bg-brand-card text-surface-secondary hover:border-brand-gray/40'
            }`}
          >
            <Monitor className="w-5 h-5 text-brand-gray" />
            <span>Theo thiết bị</span>
          </button>
        </div>
      </Card>

      {/* Sound Settings */}
      <Card variant="default" padding="md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-500">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-surface-primary">Âm thanh & Hiệu ứng</h4>
              <p className="text-xs font-semibold text-surface-secondary">
                Phát âm thanh vui tai khi trả lời đúng / sai và thăng hạng.
              </p>
            </div>
          </div>
          <Toggle checked={soundEnabled} onChange={setSoundEnabled} size="md" />
        </div>
      </Card>

      {/* Seed Data Loader */}
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

      {/* Gemini API Key Mode */}
      <Card variant="flat" padding="md">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-surface-secondary shrink-0">
            <Key className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-black text-surface-primary">Gemini API Key (Tùy chọn)</h4>
            <p className="text-xs font-semibold text-surface-secondary mt-0.5">
              Dành cho tính năng tự động giải thích và tạo câu hỏi trực tiếp bằng Gemini cá nhân (lưu cục bộ trên trình duyệt).
            </p>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="mt-3 w-full p-2.5 rounded-xl bg-brand-bg border border-brand-border text-xs font-mono text-surface-primary outline-none focus:border-brand-blue"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};
