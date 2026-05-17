'use client';

import { useState, useRef, useCallback } from 'react';

/**
 * Observe when an element enters/leaves the viewport.
 * Returns a [ref callback, isVisible] tuple.
 * Useful for infinite scroll and lazy loading.
 *
 * @example
 * const [sentinelRef, isVisible] = useIntersection({ rootMargin: '200px' });
 * useEffect(() => { if (isVisible) loadMore(); }, [isVisible]);
 * <div ref={sentinelRef} />
 */
export function useIntersection<T extends Element = HTMLDivElement>(
  options?: IntersectionObserverInit,
): [React.RefCallback<T>, boolean] {
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref: React.RefCallback<T> = useCallback(
    (node) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!node) return;

      observerRef.current = new IntersectionObserver(([entry]) => {
        setIsVisible(entry.isIntersecting);
      }, options);
      observerRef.current.observe(node);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return [ref, isVisible];
}
