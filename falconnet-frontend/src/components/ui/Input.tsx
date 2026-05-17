import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--text-secondary)]"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-[var(--text-muted)] pointer-events-none">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full h-11 rounded-xl px-3 text-sm',
              'bg-[var(--bg-elevated)] text-[var(--text-primary)]',
              'border border-[var(--border)]',
              'placeholder:text-[var(--text-muted)]',
              'transition-colors duration-150',
              'focus:outline-none focus:border-[var(--border-focus)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon != null && 'pl-10',
              rightIcon != null && 'pr-10',
              error && 'border-red-500 focus:border-red-500',
              className,
            )}
            {...props}
          />

          {rightIcon && (
            <span className="absolute right-3 text-[var(--text-muted)]">
              {rightIcon}
            </span>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-[var(--text-muted)]">{hint}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input };
