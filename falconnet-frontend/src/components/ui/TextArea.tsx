import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  autoResize?: boolean;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, hint, autoResize = false, className, id, onChange, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      if (autoResize) {
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
      }
      onChange?.(e);
    }

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={inputId}
          onChange={handleChange}
          className={cn(
            'w-full min-h-[88px] rounded-xl px-3 py-2.5 text-sm resize-none',
            'bg-[var(--bg-elevated)] text-[var(--text-primary)]',
            'border border-[var(--border)]',
            'placeholder:text-[var(--text-muted)]',
            'transition-colors duration-150',
            'focus:outline-none focus:border-[var(--border-focus)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-red-500 focus:border-red-500',
            className,
          )}
          {...props}
        />

        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
      </div>
    );
  },
);

TextArea.displayName = 'TextArea';

export { TextArea };
