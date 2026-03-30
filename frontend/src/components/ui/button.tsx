import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium select-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm hover:shadow-glow-sm',
        secondary:
          'bg-surface-raised text-content-primary border border-surface-border hover:bg-surface-overlay hover:border-primary-600/50',
        ghost:
          'text-content-secondary hover:text-content-primary hover:bg-surface-raised active:bg-surface-overlay',
        danger:
          'bg-error-600 text-white hover:bg-error-500 active:bg-error-700 shadow-sm',
        outline:
          'border border-surface-border text-content-secondary hover:bg-surface-raised hover:text-content-primary hover:border-primary-600/40',
        accent:
          'bg-gradient-accent text-white hover:opacity-90 active:opacity-80 shadow-sm',
        link:
          'text-primary-400 underline-offset-4 hover:underline hover:text-primary-300 p-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-body-sm rounded-md',
        md: 'h-9 px-4 text-body rounded-lg',
        lg: 'h-11 px-6 text-body-lg rounded-lg',
        xl: 'h-12 px-8 text-body-lg rounded-xl font-semibold',
        icon: 'h-9 w-9 rounded-lg',
        'icon-sm': 'h-8 w-8 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
