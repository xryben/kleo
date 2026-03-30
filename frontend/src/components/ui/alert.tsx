import { cn } from '@/lib/utils';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<AlertVariant, string> = {
  info: 'bg-info-500/10 border-info-500/30 text-info-400',
  success: 'bg-success-500/10 border-success-500/30 text-success-400',
  warning: 'bg-warning-500/10 border-warning-500/30 text-warning-400',
  error: 'bg-error-500/10 border-error-500/30 text-error-400',
};

const icons: Record<AlertVariant, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
};

export function Alert({ variant = 'info', title, children, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn('flex gap-3 px-4 py-3 rounded-xl border text-body-sm', variantStyles[variant], className)}
    >
      <span className="shrink-0 mt-0.5">{icons[variant]}</span>
      <div>
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
