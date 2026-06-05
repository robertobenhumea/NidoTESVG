'use client';

import { useEffect } from 'react';

export function useChatViewport() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;

    function update() {
      const viewport = window.visualViewport;
      const height = viewport?.height ?? window.innerHeight;
      root.style.setProperty('--chat-vh', `${Math.round(height)}px`);
      root.style.setProperty('--chat-offset-top', `${Math.round(viewport?.offsetTop ?? 0)}px`);
    }

    update();
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    window.addEventListener('orientationchange', update);
    window.addEventListener('resize', update);

    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('resize', update);
      root.style.removeProperty('--chat-vh');
      root.style.removeProperty('--chat-offset-top');
    };
  }, []);
}
