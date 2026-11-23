import React from 'react';

export type ChipVariant = 'primary' | 'yellow' | 'success' | 'danger' | 'neutral' | 'ai' | 'verified';
export type ChipSize = 'sm' | 'md';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  size?: ChipSize;
  icon?: React.ReactNode;
  active?: boolean;
  clickable?: boolean;
}

export const Chip: React.FC<ChipProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  active = false,
  clickable = false,
  className = '',
  ...rest
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5 font-bold gap-1',
    md: 'text-xs sm:text-sm px-3.5 py-1 font-extrabold gap-1.5',
  }[size];

  const variantClasses = {
    primary: active
      ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
      : 'bg-brand-blue-light text-brand-blue border-brand-blue/30 dark:bg-brand-blue-light/50',
    yellow: active
      ? 'bg-brand-yellow text-slate-900 border-brand-yellow font-black shadow-sm'
      : 'bg-brand-yellow-light text-amber-700 dark:text-brand-yellow border-brand-yellow/40',
    success: 'bg-brand-green-soft text-emerald-700 dark:text-brand-green border-brand-green/30',
    danger: 'bg-brand-red-soft text-rose-700 dark:text-brand-red border-brand-red/30',
    neutral: active
      ? 'bg-surface-primary text-brand-card border-surface-primary'
      : 'bg-brand-card text-surface-secondary border-brand-border hover:border-brand-gray/40',
    ai: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    verified: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800',
  }[variant];

  const interactiveClasses = clickable
    ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-100 select-none'
    : '';

  return (
    <span
      className={`inline-flex items-center rounded-full border border-solid tracking-wide transition-colors ${sizeClasses} ${variantClasses} ${interactiveClasses} ${className}`}
      {...rest}
    >
      {icon && <span className="inline-flex shrink-0 items-center">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
