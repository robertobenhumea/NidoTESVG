/**
 * Accessibility: "Skip to main content" link — visible only on keyboard focus.
 * Place as the very first element inside <body>.
 */
function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999] focus:block focus:h-10 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-[var(--brand)] focus:text-white focus:text-sm focus:font-semibold focus:outline-none"
    >
      Saltar al contenido principal
    </a>
  );
}

export { SkipLink };
