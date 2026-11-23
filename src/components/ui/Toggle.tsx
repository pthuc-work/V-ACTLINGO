import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
  leftIcon,
  rightIcon,
  className = '',
}) => {
  const switchDimensions = {
    sm: 'w-10 h-6',
    md: 'w-12 h-7',
  }[size];

  const knobDimensions = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  }[size];

  const knobTranslate = {
    sm: checked ? 'translate-x-4' : 'translate-x-1',
    md: checked ? 'translate-x-5' : 'translate-x-1',
  }[size];

  return (
    <label
      className={`inline-flex items-center gap-3 select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
    >
      <div
        className={`relative inline-flex items-center rounded-full transition-colors duration-200 border-2 ${
          checked
            ? 'bg-brand-blue border-brand-blue-press'
            : 'bg-brand-border border-brand-border/80 dark:bg-slate-700 dark:border-slate-600'
        } ${switchDimensions}`}
        onClick={(e) => {
          if (!disabled) {
            e.preventDefault();
            onChange(!checked);
          }
        }}
      >
        <span
          className={`inline-flex items-center justify-center transform rounded-full bg-white shadow-md transition-transform duration-200 ease-out text-slate-800 ${knobDimensions} ${knobTranslate}`}
        >
          {checked ? rightIcon : leftIcon}
        </span>
      </div>
      {label && <span className="text-sm font-bold text-surface-primary">{label}</span>}
    </label>
  );
};
