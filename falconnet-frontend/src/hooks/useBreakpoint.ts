'use client';

import { useState, useEffect } from 'react';

const BP = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const;
type BP = keyof typeof BP;

export function useBreakpoint() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, []);

  return {
    width,
    isMobile:  width > 0 && width <  BP.md,
    isTablet:  width >= BP.md  && width < BP.lg,
    isDesktop: width >= BP.lg,
    isAbove:   (bp: BP) => width >= BP[bp],
    isBelow:   (bp: BP) => width > 0 && width < BP[bp],
  };
}
