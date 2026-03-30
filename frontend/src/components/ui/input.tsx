import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// ─── Input ───────���───────────────────────────────────────────────

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-body-sm font-medium text-content-secondary mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full h-9 bg-surface-raised border rounded-lg px-3 text-body text-content-primary',
            'placeholder:text-content-tertiary',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary-600/50 focus:border-primary-600',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-error-500 focus:ring-error-500/50' : 'border-surface-border hover:border-surface-border',
            className,
          )}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        {hint && !error && <p className="mt-1.5 text-caption text-content-tertiary">{hint}</p>}
        {error && <p className="mt-1.5 text-caption text-error-400" role="alert">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

// ─── Textarea ────────────��───────────────────────────────────────

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-body-sm font-medium text-content-secondary mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'w-full bg-surface-raised border rounded-lg px-3 py-2 text-body text-content-primary',
            'placeholder:text-content-tertiary',
            'transition-colors duration-150 min-h-[80px] resize-y',
            'focus:outline-none focus:ring-2 focus:ring-primary-600/50 focus:border-primary-600',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-error-500 focus:ring-error-500/50' : 'border-surface-border hover:border-surface-border',
            className,
          )}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        {hint && !error && <p className="mt-1.5 text-caption text-content-tertiary">{hint}</p>}
        {error && <p className="mt-1.5 text-caption text-error-400" role="alert">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

// ─── Label ───────────────────────────────────────────────────────

const Label = forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('block text-body-sm font-medium text-content-secondary mb-1.5', className)}
      {...props}
    />
  ),
);
Label.displayName = 'Label';

export { Input, Textarea, Label };
