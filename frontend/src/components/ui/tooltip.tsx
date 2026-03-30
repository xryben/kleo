'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            'absolute left-1/2 -translate-x-1/2 z-50 px-2.5 py-1.5 rounded-lg',
            'bg-surface-overlay border border-surface-border shadow-md',
            'text-caption text-content-primary whitespace-nowrap animate-fade-in',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
            className,
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
