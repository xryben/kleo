import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  valueColor?: string;
  trend?: { value: string; positive?: boolean };
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, valueColor = 'text-content-primary', trend, icon, className }: StatCardProps) {
  return (
    <div className={cn('bg-surface-raised/80 border border-surface-border rounded-xl p-5 animate-fade-up', className)}>
      <div className="flex items-center justify-between">
        <span className="text-body-sm text-content-secondary">{label}</span>
        {icon && <span className="text-content-tertiary">{icon}</span>}
      </div>
      <div className={cn('text-heading-1 mt-2', valueColor)}>{value}</div>
      {trend && (
        <div className={cn('text-caption mt-1', trend.positive ? 'text-success-400' : 'text-error-400')}>
          {trend.positive ? '↑' : '↓'} {trend.value}
        </div>
      )}
    </div>
  );
}
