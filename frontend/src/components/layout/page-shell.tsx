import { cn } from '@/lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  maxWidth?: 'form' | 'default' | 'wide' | 'full';
  className?: string;
}

const maxWidthMap = {
  form: 'max-w-4xl',
  default: 'max-w-5xl',
  wide: 'max-w-6xl',
  full: 'max-w-7xl',
};

export function PageShell({ children, maxWidth = 'default', className }: PageShellProps) {
  return (
    <main className={cn('mx-auto px-4 sm:px-6 py-6 sm:py-8', maxWidthMap[maxWidth], className)}>
      {children}
    </main>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6', className)}>
      <div>
        <h1 className="text-heading-1 text-content-primary">{title}</h1>
        {description && <p className="text-body text-content-secondary mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}
