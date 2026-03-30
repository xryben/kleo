import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded bg-gradient-to-r from-surface-raised via-surface-overlay to-surface-raised bg-[length:200%_100%] animate-shimmer',
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('bg-surface-raised/80 border border-surface-border rounded-xl p-5', className)}>
      <Skeleton className="h-4 w-3/4 mb-3" />
      <Skeleton className="h-3 w-1/2 mb-2" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

export function SkeletonGrid({ count = 6, cols = 3 }: { count?: number; cols?: number }) {
  const gridCols =
    cols === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : cols === 3
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <div className={`grid ${gridCols} gap-5`} aria-busy="true" aria-label="Cargando...">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
