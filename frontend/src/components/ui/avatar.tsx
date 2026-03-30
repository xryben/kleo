import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'h-8 w-8 text-caption',
  md: 'h-10 w-10 text-body-sm',
  lg: 'h-12 w-12 text-body',
};

export function Avatar({ src, alt, fallback, size = 'md', className }: AvatarProps) {
  const initials = fallback || alt?.charAt(0)?.toUpperCase() || '?';

  if (src) {
    return (
      <img
        src={src}
        alt={alt || ''}
        className={cn('rounded-full object-cover bg-surface-overlay', sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full bg-primary-600/20 text-primary-400 font-semibold flex items-center justify-center',
        sizes[size],
        className,
      )}
      aria-label={alt}
    >
      {initials}
    </div>
  );
}
