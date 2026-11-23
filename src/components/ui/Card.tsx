import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'elevated' | '3d';
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  interactive = false,
  padding = 'md',
  className = '',
  ...rest
}) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6 sm:p-8',
  }[padding];

  const variantClasses = {
    default: 'bg-brand-card border-2 border-brand-border shadow-card',
    flat: 'bg-brand-card border border-brand-border/80',
    elevated: 'bg-brand-card border border-brand-border shadow-pop',
    '3d': 'bg-brand-card border-2 border-brand-border border-b-4 border-b-brand-border/80 shadow-sm',
  }[variant];

  const interactiveClasses = interactive
    ? 'cursor-pointer hover:border-brand-blue/50 hover:shadow-pop transition-all duration-150 active:scale-[0.99]'
    : '';

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl transition-colors duration-150 ${variantClasses} ${paddingClasses} ${interactiveClasses} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};
