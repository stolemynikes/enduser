// The light/dark choice on the public pages: the buyer's form, How it works,
// and the docs and legal pages. One preference for all of them, so a reader
// who picks dark on one page does not land on a light one a click later.
//
// The dashboards keep their own (useAppTheme): signing in is a different
// context, and a seller's choice there should not repaint their buyers' form
// on the same machine.
//
// Storage throws in a third-party iframe when the host browser blocks it, so
// every read and write is guarded and the choice is per-visit there.
export type PublicTheme = 'light' | 'dark';

const KEY = 'theme-public';

/** The saved choice, or null when there is none. Earlier versions kept one per page; the first found wins. */
export function readPublicTheme(): PublicTheme | null {
  try {
    const saved = localStorage.getItem(KEY) ?? localStorage.getItem('theme-form') ?? localStorage.getItem('theme-docs');
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
}

export function storePublicTheme(theme: PublicTheme) {
  try { localStorage.setItem(KEY, theme); } catch { /* storage blocked: the choice lasts this visit */ }
}
