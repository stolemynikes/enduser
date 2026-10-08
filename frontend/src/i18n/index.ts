// The buyer's language on the public form.
//
// Text is translated once, ahead of time, and shipped as files in ./messages.
// Choosing a language loads that file and nothing else: no request leaves for
// a translation service, and a buyer never waits on one.
//
// English is bundled with the form; each other language is its own small chunk,
// fetched when chosen, so a Dutch buyer does not download twenty-three
// languages they will not read.
//
// Which language a buyer sees, first match wins:
//   1. what they picked before on this browser
//   2. ?lang= on the URL — a seller's embed passes the shop's language here
//   3. the browser's own preference, if it is one of the 24
//   4. English
import { createContext, useContext } from 'react';
import en, { type Messages } from './messages/en.ts';
import { browserLangs, toLang, type Lang } from './languages.ts';

const STORAGE_KEY = 'lang-form';

// Storage throws in a third-party iframe when the host browser blocks it, so
// the choice is per-visit there. Same treatment as the theme.
function readStored(): Lang | null {
  try { return toLang(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}
export function storeLang(lang: Lang) {
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* blocked — per visit */ }
}

export function initialLang(): Lang {
  const fromUrl = toLang(new URLSearchParams(window.location.search).get('lang'));
  return readStored() ?? fromUrl ?? browserLangs()[0] ?? 'en';
}

const loaders = import.meta.glob<{ default: Messages }>(['./messages/*.ts', '!./messages/en.ts']);
const loaded = new Map<Lang, Messages>([['en', en]]);

export function loadedMessages(lang: Lang): Messages | undefined {
  return loaded.get(lang);
}

export async function loadMessages(lang: Lang): Promise<Messages> {
  const hit = loaded.get(lang);
  if (hit) return hit;
  const loader = loaders[`./messages/${lang}.ts`];
  if (!loader) return en;
  const messages = (await loader()).default;
  loaded.set(lang, messages);
  return messages;
}

export type I18n = {
  /** The language the buyer chose — may be ahead of `t` for a moment while it loads. */
  lang: Lang;
  t: Messages;
  setLang: (lang: Lang) => void;
};

export const I18nContext = createContext<I18n>({ lang: 'en', t: en, setLang: () => {} });

export function useI18n(): I18n {
  return useContext(I18nContext);
}

/** "a, b and c" in the buyer's language. */
export function listOf(lang: Lang, items: string[]): string {
  try {
    return new Intl.ListFormat(lang, { style: 'long', type: 'conjunction' }).format(items);
  } catch {
    return items.join(', ');
  }
}
