import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, hint, error, id, children, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-body-sm font-medium text-content-secondary mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'flex h-9 w-full rounded-lg border bg-surface-raised px-3 text-body text-content-primary',
            'transition-colors duration-150 appearance-none cursor-pointer',
            'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394A3B8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")] bg-[length:16px] bg-[right_8px_center] bg-no-repeat pr-8',
            'focus:outline-none focus:ring-2 focus:ring-primary-600/50 focus:border-primary-600',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-error-500 focus:ring-error-500/50' : 'border-surface-border hover:border-surface-border',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {hint && !error && <p className="mt-1.5 text-caption text-content-tertiary">{hint}</p>}
        {error && <p className="mt-1.5 text-caption text-error-400" role="alert">{error}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';

export { Select };
