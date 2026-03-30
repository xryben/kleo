import { cn } from '@/lib/utils';
import { statusStyles } from '@/lib/design-tokens';

interface StatusBadgeProps {
  status: string;
  className?: string;
  /** Override the default label from design tokens */
  label?: string;
}

export function StatusBadge({ status, className, label }: StatusBadgeProps) {
  const style = statusStyles[status] ?? {
    bg: 'bg-slate-500/15',
    text: 'text-slate-400',
  };
  const displayLabel = label ?? style.label ?? status;

  return (
    <span
      className={cn(
        'inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full',
        style.bg,
        style.text,
        className
      )}
    >
      {displayLabel}
    </span>
  );
}
