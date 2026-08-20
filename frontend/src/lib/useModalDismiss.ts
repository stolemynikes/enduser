import { useEffect, useRef } from 'react';

/** Shared modal behavior: Escape-to-close, body scroll-lock while open,
 *  move focus into the panel on open, and restore focus to the previously
 *  focused element on close. Returns a ref to attach to the modal panel. */
export function useModalDismiss(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', onKey);

    // Lock background scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the panel (or its first focusable child)
    const panel = panelRef.current;
    const focusable = panel?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (focusable ?? panel)?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return panelRef;
}
