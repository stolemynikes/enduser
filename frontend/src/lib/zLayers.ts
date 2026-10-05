// The one place that says what sits in front of what.
//
// Before this the app used 1, 10, 60, 100, 1000, 4000 and 4500 — seven
// magnitudes with no stated meaning, which is how a new panel ends up at 60
// because 10 felt too low and 100 felt too high. The ordering happened to be
// right; nothing recorded *why*, so the next addition was a guess.
//
// Steps of ten, in the order things actually stack. Each layer has a reason,
// and a new one belongs between two existing numbers rather than above all of
// them.
export const Z = {
  /** Sticky table headers inside a scrolling panel. */
  STICKY: 10,
  /** The app's own furniture: the dashboard sidebar. */
  CHROME: 20,
  /** Popovers anchored to the chrome, such as the activity panel. */
  POPOVER: 30,
  /** Modal overlays and the dialogs inside them. */
  MODAL: 40,
  /**
   * Pinned above modals on purpose: the support-session banner says platform
   * staff are acting as somebody else, and that must not be coverable by the
   * thing they opened.
   */
  PINNED: 50,
  /** Toasts. Above a modal, because a modal's action is what raises them. */
  TOAST: 60,
  /**
   * Confirmations. The only thing above a toast, because a destructive action
   * can be confirmed while a toast from the previous one is still showing, and
   * the question must be readable.
   */
  CONFIRM: 70,
} as const;
