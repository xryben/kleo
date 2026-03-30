'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface SidebarLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

export interface SidebarSection {
  title?: string;
  links: SidebarLink[];
}

interface SidebarProps {
  brand?: React.ReactNode;
  sections: SidebarSection[];
  footer?: React.ReactNode;
  className?: string;
}

export function Sidebar({ brand, sections, footer, className }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-surface-raised border-r border-surface-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className,
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-surface-border-subtle shrink-0">
        {brand}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="ml-auto text-content-tertiary hover:text-content-primary transition-colors"
            aria-label="Colapsar sidebar"
          >
            ←
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mx-auto text-content-tertiary hover:text-content-primary transition-colors"
            aria-label="Expandir sidebar"
          >
            →
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-6">
        {sections.map((section, si) => (
          <div key={si}>
            {section.title && !collapsed && (
              <div className="px-2 mb-2 text-label uppercase text-content-tertiary tracking-wider">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(link.href + '/');
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-body-sm transition-all duration-150',
                      active
                        ? 'bg-primary-600/15 text-primary-400 font-medium'
                        : 'text-content-secondary hover:text-content-primary hover:bg-surface-overlay',
                      collapsed && 'justify-center px-0',
                    )}
                    title={collapsed ? link.label : undefined}
                  >
                    <span className="shrink-0 w-5 h-5 flex items-center justify-center">{link.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="truncate">{link.label}</span>
                        {link.badge !== undefined && (
                          <span className="ml-auto text-caption bg-primary-600/20 text-primary-400 px-1.5 py-0.5 rounded-full">
                            {link.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {footer && (
        <div className="border-t border-surface-border-subtle p-3 shrink-0">{footer}</div>
      )}
    </aside>
  );
}
