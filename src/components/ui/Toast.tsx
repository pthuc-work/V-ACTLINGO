import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: React.ReactNode;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: React.ReactNode, type?: ToastType, duration?: number) => void;
  showToast: (message: React.ReactNode, type?: ToastType, duration?: number) => void;
  success: (message: React.ReactNode, duration?: number) => void;
  error: (message: React.ReactNode, duration?: number) => void;
  warning: (message: React.ReactNode, duration?: number) => void;
  info: (message: React.ReactNode, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: React.ReactNode, type: ToastType = 'info', duration = 3000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((msg: React.ReactNode, dur?: number) => addToast(msg, 'success', dur), [addToast]);
  const error = useCallback((msg: React.ReactNode, dur?: number) => addToast(msg, 'error', dur), [addToast]);
  const warning = useCallback((msg: React.ReactNode, dur?: number) => addToast(msg, 'warning', dur), [addToast]);
  const info = useCallback((msg: React.ReactNode, dur?: number) => addToast(msg, 'info', dur), [addToast]);

  const value: ToastContextValue = useMemo(
    () => ({
      toast: addToast,
      showToast: addToast,
      success,
      error,
      warning,
      info,
    }),
    [addToast, success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container floating at bottom-right or top-center */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-3 p-4 rounded-2xl border-2 shadow-pop transition-all transform animate-in slide-in-from-bottom-5 duration-200 ${
              t.type === 'success'
                ? 'bg-brand-card border-brand-green text-surface-primary'
                : t.type === 'error'
                ? 'bg-brand-card border-brand-red text-surface-primary'
                : t.type === 'warning'
                ? 'bg-brand-card border-brand-yellow text-surface-primary'
                : 'bg-brand-card border-brand-blue text-surface-primary'
            }`}
          >
            <span className="shrink-0">
              {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-brand-green" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-brand-red" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5 text-brand-yellow" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-brand-blue" />}
            </span>
            <div className="flex-1 text-sm font-bold">{t.message}</div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-surface-secondary hover:text-surface-primary p-1 rounded-lg hover:bg-brand-border/40 transition-colors"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
