'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

interface TopbarProps {
  brand?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  className?: string;
}

export function Topbar({ brand, breadcrumbs, actions, className }: TopbarProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between h-14 px-6 border-b border-surface-border bg-surface-base/80 backdrop-blur-md sticky top-0 z-20',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {brand}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-body-sm min-w-0">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && <span className="text-content-tertiary">/</span>}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-content-secondary hover:text-content-primary transition-colors truncate"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-content-primary font-medium truncate">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </header>
  );
}
