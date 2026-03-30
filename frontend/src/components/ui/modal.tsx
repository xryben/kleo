'use client';

import { useEffect, useCallback, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export function Modal({ open, onOpenChange, title, description, children, footer, size = 'md', className }: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    },
    [onOpenChange],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, handleEscape]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)]',
            'bg-surface-overlay border border-surface-border rounded-2xl shadow-xl animate-scale-in',
            'focus:outline-none',
            sizeMap[size],
            className,
          )}
        >
          {title && (
            <div className="px-6 pt-6 pb-0">
              <Dialog.Title className="text-heading-3 text-content-primary">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="text-body text-content-secondary mt-1">
                  {description}
                </Dialog.Description>
              )}
            </div>
          )}
          <div className="px-6 py-5">{children}</div>
          {footer && (
            <div className="px-6 pb-6 pt-0 flex items-center justify-end gap-3">{footer}</div>
          )}
          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 text-content-tertiary hover:text-content-primary transition-colors rounded-md p-1 hover:bg-surface-raised"
              aria-label="Cerrar"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
