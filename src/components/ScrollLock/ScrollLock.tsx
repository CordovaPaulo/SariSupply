'use client'
import { useEffect } from 'react';

interface ScrollLockProps {
  active?: boolean;
}

declare global {
  interface Window {
    __sarisupply_scroll_lock_count?: number;
    __sarisupply_scroll_lock_prev?: {
      bodyOverflow?: string;
      htmlOverflow?: string;
      bodyPaddingRight?: string;
      bodyTouchAction?: string;
      htmlTouchAction?: string;
    };
  }
}

export default function ScrollLock({ active = false }: ScrollLockProps) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    if (typeof window.__sarisupply_scroll_lock_count === 'undefined') {
      window.__sarisupply_scroll_lock_count = 0;
    }

    const acquire = () => {
      window.__sarisupply_scroll_lock_count = (window.__sarisupply_scroll_lock_count || 0) + 1;

      if (window.__sarisupply_scroll_lock_count === 1) {
        const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

        window.__sarisupply_scroll_lock_prev = {
          bodyOverflow: document.body.style.overflow,
          htmlOverflow: document.documentElement.style.overflow,
          bodyPaddingRight: document.body.style.paddingRight,
          bodyTouchAction: document.body.style.touchAction,
          htmlTouchAction: document.documentElement.style.touchAction,
        };

        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        document.body.style.touchAction = 'none';
        document.documentElement.style.touchAction = 'none';
        document.documentElement.style.overscrollBehavior = 'none';
        document.body.style.overscrollBehavior = 'none';

        if (scrollBarWidth > 0) {
          document.body.style.paddingRight = `${scrollBarWidth}px`;
        }
      }
    };

    const release = () => {
      window.__sarisupply_scroll_lock_count = Math.max(0, (window.__sarisupply_scroll_lock_count || 0) - 1);

      if (window.__sarisupply_scroll_lock_count === 0) {
        const prev = window.__sarisupply_scroll_lock_prev || {};
        document.body.style.overflow = prev.bodyOverflow ?? '';
        document.documentElement.style.overflow = prev.htmlOverflow ?? '';
        document.body.style.paddingRight = prev.bodyPaddingRight ?? '';
        document.body.style.touchAction = prev.bodyTouchAction ?? '';
        document.documentElement.style.touchAction = prev.htmlTouchAction ?? '';
        document.documentElement.style.overscrollBehavior = '';
        document.body.style.overscrollBehavior = '';
        window.__sarisupply_scroll_lock_prev = undefined;
      }
    };

    if (active) acquire();

    return () => {
      if (active) release();
    };
  }, [active]);

  return null;
}