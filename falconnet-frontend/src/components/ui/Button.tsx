import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] active:scale-[0.98]',
  secondary:
    'bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:scale-[0.98]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] active:scale-[0.98]',
  danger:
    'bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]',
  outline:
    'border border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] active:scale-[0.98]',
};

const sizeStyles: Record<Size, string> = {
  xs: 'h-7 px-3 text-xs rounded-lg',
  sm: 'h-8 px-4 text-sm rounded-xl',
  md: 'h-10 px-5 text-sm rounded-xl',
  lg: 'h-12 px-6 text-base rounded-2xl',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2',
          'font-medium transition-all duration-150 cursor-pointer',
          'disabled:opacity-50 disabled:pointer-events-none',
          'select-none focus-visible:outline-2 focus-visible:outline-[var(--brand)]',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? (
          <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
