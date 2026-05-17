'use client';

import { useState, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

const POSITION: Record<TooltipSide, string> = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full  left-1/2 -translate-x-1/2 mt-2',
  left:   'right-full top-1/2 -translate-y-1/2  mr-2',
  right:  'left-full  top-1/2 -translate-y-1/2  ml-2',
};

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: TooltipSide;
  delay?: number;
  className?: string;
}

function Tooltip({ content, children, side = 'top', delay = 400, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    timer.current = setTimeout(() => setVisible(true), delay);
  }
  function hide() {
    if (timer.current) clearTimeout(timer.current);
    setVisible(false);
  }

  return (
    <div
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 pointer-events-none whitespace-nowrap',
            'px-2.5 py-1.5 rounded-lg text-xs font-medium',
            'bg-[var(--text-primary)] text-[var(--bg-surface)]',
            POSITION[side],
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}

export { Tooltip };
