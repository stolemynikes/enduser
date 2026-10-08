// The provider half of ./index.ts, in a file of its own so the component can
// hot-reload during development.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import en, { type Messages } from './messages/en.ts';
import type { Lang } from './languages.ts';
import { I18nContext, initialLang, loadMessages, loadedMessages, storeLang } from './index.ts';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [t, setT] = useState<Messages>(() => loadedMessages(lang) ?? en);

  useEffect(() => {
    let current = true;
    // The previous language stays on screen until the next has arrived, so a
    // switch never flashes English in between.
    loadMessages(lang).then(m => { if (current) setT(m); }).catch(() => { if (current) setT(en); });
    document.documentElement.lang = lang;
    return () => { current = false; };
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    storeLang(next);
    setLangState(next);
  }, []);

  const value = useMemo(() => ({ lang, t, setLang }), [lang, t, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
