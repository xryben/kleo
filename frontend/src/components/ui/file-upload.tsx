'use client';

import { useCallback, useRef, useState, type DragEvent } from 'react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  label?: string;
  accept?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  onChange?: (file: File) => void;
  className?: string;
}

export function FileUpload({ label, accept, hint, error, disabled, onChange, className }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      onChange?.(file);
    },
    [onChange],
  );

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-body-sm font-medium text-content-secondary mb-1.5">{label}</label>
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer',
          'transition-all duration-150',
          dragActive
            ? 'border-primary-500 bg-primary-600/10'
            : 'border-surface-border hover:border-primary-600/50 hover:bg-surface-raised/50',
          error && 'border-error-500',
          disabled && 'opacity-50 pointer-events-none',
          className,
        )}
      >
        <div className="text-3xl mb-2 text-content-tertiary">
          {fileName ? '✓' : '↑'}
        </div>
        <p className="text-body-sm text-content-secondary">
          {fileName || 'Arrastra un archivo o haz clic para seleccionar'}
        </p>
        {hint && <p className="text-caption text-content-tertiary mt-1">{hint}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
      {error && <p className="mt-1.5 text-caption text-error-400" role="alert">{error}</p>}
    </div>
  );
}
