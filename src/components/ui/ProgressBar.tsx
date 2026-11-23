import React from 'react';

export type ProgressColor = 'blue' | 'yellow' | 'green' | 'red';
export type ProgressSize = 'sm' | 'md' | 'lg';

export interface ProgressBarProps {
  value: number; // 0 - 100
  max?: number;
  color?: ProgressColor;
  size?: ProgressSize;
  showLabel?: boolean;
  striped?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color = 'green',
  size = 'md',
  showLabel = false,
  striped = false,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const heightClasses = {
    sm: 'h-2.5',
    md: 'h-4',
    lg: 'h-5',
  }[size];

  const colorClasses = {
    blue: 'bg-brand-blue border-b-2 border-brand-blue-press',
    yellow: 'bg-brand-yellow border-b-2 border-brand-yellow-press',
    green: 'bg-brand-green border-b-2 border-brand-green-press',
    red: 'bg-brand-red border-b-2 border-brand-red-press',
  }[color];

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5 text-xs font-bold text-surface-secondary">
          <span>Tiến độ</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        className={`w-full bg-brand-border/60 dark:bg-brand-border rounded-full overflow-hidden p-0.5 shadow-inner ${heightClasses}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden ${colorClasses} ${
            striped ? 'bg-stripes' : ''
          }`}
          style={{ width: `${percentage}%` }}
        >
          {/* Subtle top glossy highlight (Duolingo style shine) */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/30 rounded-t-full pointer-events-none" />
        </div>
      </div>
    </div>
  );
};
