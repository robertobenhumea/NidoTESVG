'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TabDef {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: TabDef[];
  defaultTab?: string;
  onChange?: (id: string) => void;
  /** Render function receives the active tab id */
  children?: (activeId: string) => ReactNode;
  className?: string;
}

function Tabs({ tabs, defaultTab, onChange, children, className }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? '');

  function select(id: string) {
    setActive(id);
    onChange?.(id);
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Tab bar */}
      <div
        role="tablist"
        className="flex overflow-x-auto scrollbar-hide border-b border-[var(--border)]"
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => select(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap',
                'border-b-2 -mb-px transition-colors duration-150',
                isActive
                  ? 'border-[var(--brand)] text-[var(--brand)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count != null && (
                <span
                  className={cn(
                    'ml-1 px-1.5 py-0.5 rounded-full text-[11px] leading-none font-semibold',
                    isActive
                      ? 'bg-[var(--brand-muted)] text-[var(--brand-text)]'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      {children && (
        <div role="tabpanel" aria-live="polite">
          {children(active)}
        </div>
      )}
    </div>
  );
}

export { Tabs, type TabDef };
