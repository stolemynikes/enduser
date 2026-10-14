// The dashboards' light/dark choice: one personal preference, kept in this
// browser only, shared by the admin dashboard, the company dashboards and the
// setup wizard. It is never stored per company — switching into another
// company (or into a support session) keeps whatever this person chose.
import { useEffect, useState } from 'react';

export type AppTheme = 'dark' | 'light';
const KEY = 'theme-app';

/** Reads the saved choice. Earlier versions kept one per dashboard; the first found wins. */
export function readAppTheme(): AppTheme {
  try {
    const saved = localStorage.getItem(KEY) ?? localStorage.getItem('theme-dashboard') ?? localStorage.getItem('theme-company');
    return saved === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function useAppTheme(): [AppTheme, () => void] {
  const [theme, setTheme] = useState<AppTheme>(readAppTheme);
  useEffect(() => {
    try { localStorage.setItem(KEY, theme); } catch { /* storage blocked: the choice lasts this visit */ }
  }, [theme]);
  return [theme, () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))];
}
