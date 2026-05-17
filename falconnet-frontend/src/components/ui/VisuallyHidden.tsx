import { type ReactNode } from 'react';

/**
 * Renders children visually hidden but available to screen readers.
 * Use for icon-only buttons, decorative text, etc.
 */
function VisuallyHidden({ children }: { children: ReactNode }) {
  return (
    <span className="sr-only">
      {children}
    </span>
  );
}

export { VisuallyHidden };
