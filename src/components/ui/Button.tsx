import React, { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'yellow' | 'success' | 'danger' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      className = '',
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    // Duolingo 3D bottom border thickness & typography size
    const sizeClasses = {
      sm: 'text-xs font-bold px-3 py-1.5 rounded-xl border-b-[3px] gap-1.5',
      md: 'text-sm font-extrabold px-5 py-2.5 rounded-2xl border-b-[4px] gap-2',
      lg: 'text-base font-black px-6 py-3.5 rounded-2xl border-b-[5px] gap-2.5',
    }[size];

    // Variants with Duolingo 3D press effects
    const variantClasses = {
      primary: `bg-brand-blue text-white hover:bg-brand-blue-hover border-brand-blue-press active:border-b-[1px] active:translate-y-[3px]`,
      secondary: `bg-brand-yellow text-slate-900 hover:bg-brand-yellow-hover border-brand-yellow-press active:border-b-[1px] active:translate-y-[3px]`,
      yellow: `bg-brand-yellow text-slate-900 hover:bg-brand-yellow-hover border-brand-yellow-press active:border-b-[1px] active:translate-y-[3px]`,
      success: `bg-brand-green text-white hover:bg-brand-green-hover border-brand-green-press active:border-b-[1px] active:translate-y-[3px]`,
      danger: `bg-brand-red text-white hover:bg-brand-red-hover border-brand-red-press active:border-b-[1px] active:translate-y-[3px]`,
      outline: `bg-brand-card text-surface-primary hover:bg-brand-card-hover border border-brand-border border-b-[4px] border-b-brand-border active:border-b-[1px] active:translate-y-[3px] shadow-sm`,
      ghost: `bg-transparent text-surface-secondary hover:text-surface-primary hover:bg-brand-border/30 border-b-0 active:translate-y-[1px]`,
    }[variant];

    const disabledClasses = isDisabled
      ? 'opacity-50 cursor-not-allowed active:translate-y-0 active:border-b-[4px] pointer-events-none filter grayscale-[30%]'
      : 'cursor-pointer';

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center select-none tracking-wide transition-all duration-75 outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50 ${sizeClasses} ${variantClasses} ${disabledClasses} ${
          fullWidth ? 'w-full' : ''
        } ${className}`}
        {...rest}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : (
          leftIcon && <span className="inline-flex shrink-0 items-center">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!loading && rightIcon && <span className="inline-flex shrink-0 items-center">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
