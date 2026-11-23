import React from 'react';
import { Star } from 'lucide-react';

export interface StarRatingProps {
  stars?: number; // 0, 1, 2, 3
  percentage?: number; // auto-computes: >=50% => 1, >=70% => 2, >=90% => 3
  size?: 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  onSelect?: (stars: number) => void;
  className?: string;
}

export function computeStarsFromPercentage(percent: number): number {
  if (percent >= 90) return 3;
  if (percent >= 70) return 2;
  if (percent >= 50) return 1;
  return 0;
}

export const StarRating: React.FC<StarRatingProps> = ({
  stars: explicitStars,
  percentage,
  size = 'md',
  interactive = false,
  onSelect,
  className = '',
}) => {
  const activeStars =
    explicitStars !== undefined
      ? explicitStars
      : percentage !== undefined
      ? computeStarsFromPercentage(percentage)
      : 0;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
  }[size];

  const gapClasses = {
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-1.5',
    xl: 'gap-2',
  }[size];

  return (
    <div className={`inline-flex items-center ${gapClasses} ${className}`}>
      {[1, 2, 3].map((starIndex) => {
        const isFilled = starIndex <= activeStars;
        return (
          <button
            key={starIndex}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onSelect?.(starIndex)}
            className={`transition-transform duration-150 outline-none ${
              interactive
                ? 'cursor-pointer hover:scale-110 active:scale-95'
                : 'cursor-default pointer-events-none'
            }`}
            aria-label={`${starIndex} sao`}
          >
            <Star
              className={`${sizeClasses} ${
                isFilled
                  ? 'text-brand-yellow fill-brand-yellow drop-shadow-[0_2px_4px_rgba(255,201,60,0.4)]'
                  : 'text-brand-border fill-brand-border/30 dark:text-slate-700 dark:fill-slate-800'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};
