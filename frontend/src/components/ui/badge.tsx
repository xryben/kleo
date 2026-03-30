import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center text-caption font-medium px-2.5 py-0.5 rounded-full transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-surface-overlay text-content-secondary border border-surface-border',
        primary: 'bg-primary-600/15 text-primary-400',
        success: 'bg-success-500/15 text-success-400',
        warning: 'bg-warning-500/15 text-warning-400',
        error: 'bg-error-500/15 text-error-400',
        info: 'bg-info-500/15 text-info-400',
        accent: 'bg-accent-500/15 text-accent-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
