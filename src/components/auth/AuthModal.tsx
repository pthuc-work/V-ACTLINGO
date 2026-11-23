// ==============================================================================
// V-ACT HUB: AuthModal Component
// ==============================================================================

import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  Sparkles,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import {
  isSupabaseConfigured,
  signInWithEmail,
  signUpWithEmail,
  signInWithMagicLink,
} from '../../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type AuthTab = 'signin' | 'signup' | 'magic_link';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleTabChange = (tab: AuthTab) => {
    setActiveTab(tab);
    resetForm();
  };

  const mapSupabaseError = (err: any): string => {
    const msg = err?.message || String(err);
    if (msg.includes('Invalid login credentials')) {
      return 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
    }
    if (msg.includes('User already registered')) {
      return 'Email này đã được đăng ký tài khoản. Bạn có thể chọn Đăng nhập.';
    }
    if (msg.includes('Password should be at least')) {
      return 'Mật khẩu phải chứa ít nhất 6 ký tự.';
    }
    if (msg.includes('rate limit')) {
      return 'Yêu cầu quá nhanh, vui lòng đợi ít phút trước khi thử lại.';
    }
    return msg || 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    if (activeTab === 'signup' && password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (activeTab !== 'magic_link' && password.length < 6) {
      setErrorMsg('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }

    setLoading(true);

    try {
      if (activeTab === 'signin') {
        await signInWithEmail(email.trim(), password);
        setSuccessMsg('Đăng nhập thành công!');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 800);
      } else if (activeTab === 'signup') {
        await signUpWithEmail(email.trim(), password);
        setSuccessMsg('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản (nếu có yêu cầu).');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else if (activeTab === 'magic_link') {
        await signInWithMagicLink(email.trim());
        setSuccessMsg('Đã gửi liên kết đăng nhập Magic Link vào hộp thư của bạn! Vui lòng kiểm tra email.');
      }
    } catch (err: any) {
      setErrorMsg(mapSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md rounded-2xl bg-[var(--brand-card)] border border-[var(--brand-border)] shadow-2xl p-6 overflow-hidden transition-all text-[var(--text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--brand-bg-alt)] transition-colors"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-navy-banner)] flex items-center justify-center text-white shadow-md font-black text-xl">
            V
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">V-ACT HUB</h2>
            <p className="text-xs text-[var(--text-secondary)] font-medium">
              Luyện thi ĐGNL ĐHQG TP.HCM
            </p>
          </div>
        </div>

        {/* Offline Mode Alert */}
        {!isSupabaseConfigured && (
          <div className="mb-5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Chế độ Ngoại tuyến (Offline Mode):</strong> Supabase chưa được kết nối. Dữ liệu luyện thi hiện được lưu hoàn toàn cục bộ trên máy của bạn (IndexedDB).
              </span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex rounded-xl bg-[var(--brand-bg)] p-1 mb-5 border border-[var(--brand-border-subtle)]">
          <button
            type="button"
            onClick={() => handleTabChange('signin')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'signin'
                ? 'bg-[var(--brand-card)] text-[var(--brand-blue)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('signup')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'signup'
                ? 'bg-[var(--brand-card)] text-[var(--brand-blue)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Đăng ký
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('magic_link')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'magic_link'
                ? 'bg-[var(--brand-card)] text-[var(--brand-blue)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Magic Link
          </button>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-[var(--text-secondary)]">
              Địa chỉ Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tenhocsinh@gmail.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg-alt)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] transition-all"
              />
            </div>
          </div>

          {activeTab !== 'magic_link' && (
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[var(--text-secondary)]">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg-alt)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] transition-all"
                />
              </div>
            </div>
          )}

          {activeTab === 'signup' && (
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-[var(--text-secondary)]">
                Xác nhận Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-bg-alt)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] transition-all"
                />
              </div>
            </div>
          )}

          {activeTab === 'magic_link' && (
            <p className="text-xs text-[var(--text-secondary)] italic">
              Chúng tôi sẽ gửi một liên kết đăng nhập an toàn trực tiếp vào hộp thư của bạn. Bạn chỉ cần bấm vào liên kết để vào tài khoản mà không cần mật khẩu.
            </p>
          )}

          {/* Submit Button (Duolingo 3D style) */}
          <button
            type="submit"
            disabled={loading || !isSupabaseConfigured}
            className={`w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 btn-3d btn-3d-blue ${
              loading || !isSupabaseConfigured
                ? 'bg-slate-400 cursor-not-allowed opacity-60'
                : 'bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hover)] active:bg-[var(--brand-blue-press)] shadow-[0_4px_0_var(--brand-blue-press)] cursor-pointer'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xử lý...
              </>
            ) : activeTab === 'signin' ? (
              <>
                <LogIn className="w-4 h-4" />
                Đăng nhập
              </>
            ) : activeTab === 'signup' ? (
              <>
                <UserPlus className="w-4 h-4" />
                Tạo tài khoản mới
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Gửi liên kết Magic Link
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-5 pt-4 border-t border-[var(--brand-border-subtle)] text-center">
          <p className="text-xs text-[var(--text-muted)] flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Bảo mật với Supabase Row Level Security (RLS)
          </p>
        </div>
      </div>
    </div>
  );
};
