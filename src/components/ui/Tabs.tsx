import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  size = 'md',
  fullWidth = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'text-xs py-1.5 px-3 gap-1.5',
    md: 'text-sm py-2 px-4 gap-2',
  }[size];

  return (
    <div
      className={`inline-flex items-center p-1 bg-brand-border/40 dark:bg-brand-border/30 rounded-2xl border border-brand-border/60 ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex items-center justify-center font-extrabold rounded-xl transition-all duration-150 outline-none select-none ${sizeClasses} ${
              fullWidth ? 'flex-1' : ''
            } ${
              isActive
                ? 'bg-brand-card text-brand-blue shadow-sm border border-brand-border/60 scale-[1.02]'
                : 'text-surface-secondary hover:text-surface-primary hover:bg-brand-card/40'
            }`}
          >
            {tab.icon && <span className="inline-flex shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isActive
                    ? 'bg-brand-blue text-white'
                    : 'bg-brand-border text-surface-secondary'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
