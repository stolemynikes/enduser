import { useEffect, useRef } from 'react';

// Open modals, innermost last. A confirm prompt opened from inside a detail
// panel is a second modal on top of the first; Escape should close only the top
// one. Every instance listens on `document`, and stopPropagation does not stop
// other listeners on the same target, so each handler checks it is on top.
const openStack: symbol[] = [];

/** Shared modal behavior: Escape-to-close, body scroll-lock while open,
 *  move focus into the panel on open, and restore focus to the previously
 *  focused element on close. Returns a ref to attach to the modal panel. */
export function useModalDismiss(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Read through a ref so the effect runs once per opening. With onClose as a
  // dependency, a parent passing an inline function re-ran it on every render:
  // focus jumped back into the panel, and the modal re-entered the stack on
  // top of a prompt it had opened.
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const id = Symbol('modal');
    openStack.push(id);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || openStack[openStack.length - 1] !== id) return;
      e.stopPropagation();
      closeRef.current();
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
      openStack.splice(openStack.indexOf(id), 1);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return panelRef;
}
