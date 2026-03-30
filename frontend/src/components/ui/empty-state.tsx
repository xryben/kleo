import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('text-center py-16 animate-fade-in', className)}>
      <div className="text-5xl mb-4" role="img" aria-label={title}>
        {icon}
      </div>
      <h2 className="text-heading-4 text-content-primary mb-2">{title}</h2>
      {description && (
        <p className="text-body text-content-secondary mb-6 max-w-md mx-auto">{description}</p>
      )}
      {action}
    </div>
  );
}
