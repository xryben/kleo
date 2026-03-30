import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-surface-raised/80 border border-surface-border rounded-xl transition-colors',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

const CardInteractive = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-surface-raised/80 border border-surface-border rounded-xl transition-all duration-150',
        'hover:border-primary-600/50 hover:shadow-glow-sm cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
        className,
      )}
      {...props}
    />
  ),
);
CardInteractive.displayName = 'CardInteractive';

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-5 pt-5 pb-0', className)}
      {...props}
    />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-5 pb-5 pt-0 flex items-center gap-3', className)}
      {...props}
    />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardInteractive, CardHeader, CardContent, CardFooter };
