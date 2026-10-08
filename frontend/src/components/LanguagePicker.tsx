// Language choice for the public form.
//
// Every language is named in itself — "Deutsch", "Polski", "Ελληνικά" — because
// a buyer who cannot read the current language can still recognise their own.
// No flags: a flag is a country, and French is not France for a Belgian buyer.
//
// Search matches a language by any name the buyer might type: its own name,
// its English name, its name in the language currently shown, its code. So
// "duits", "german" and "deutsch" all find Deutsch.
//
// UX rules this follows deliberately:
//   - the ARIA combobox pattern: the search box owns the list, arrow keys move
//     through it, Enter picks, Escape closes and returns focus to the button
//   - a 44px touch target on coarse pointers, a visible focus ring everywhere
//   - the search box takes focus only with a mouse or trackpad; on a phone that
//     would raise the keyboard over the list being opened
//   - the buyer's own browser languages are offered first, the rest follow
//   - motion only as a short fade, and none under prefers-reduced-motion
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { LANGUAGES, browserLangs, endonym, type Lang } from '../i18n/languages.ts';
import { useI18n } from '../i18n/index.ts';
import { Z } from '../lib/zLayers.ts';

const fold = (s: string) => s.normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase().trim();

function displayNames(locale: string): Intl.DisplayNames | null {
  try { return new Intl.DisplayNames([locale], { type: 'language' }); } catch { return null; }
}

export function LanguagePicker() {
  const { lang, t, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();
  const listId = `${baseId}-list`;

  // Every name a buyer might search by, per language.
  const searchIndex = useMemo(() => {
    const namers = [displayNames(lang), displayNames('en'), ...browserLangs().map(displayNames)]
      .filter((n): n is Intl.DisplayNames => !!n);
    return new Map(LANGUAGES.map(l => [
      l.code,
      [l.name, l.code, ...namers.map(n => n.of(l.code) ?? '')].map(fold).join(' '),
    ]));
  }, [lang]);

  const localName = useMemo(() => {
    const namer = displayNames(lang);
    return (code: Lang) => namer?.of(code) ?? '';
  }, [lang]);

  // Without a query: the browser's languages and English first, then all.
  const { suggested, rest } = useMemo(() => {
    const first: Lang[] = [];
    for (const code of [lang, ...browserLangs(), 'en' as Lang]) if (!first.includes(code)) first.push(code);
    return { suggested: first, rest: LANGUAGES.map(l => l.code).filter(c => !first.includes(c)) };
  }, [lang]);

  const q = fold(query);
  const results: Lang[] = q
    ? LANGUAGES.map(l => l.code).filter(c => searchIndex.get(c)!.includes(q))
    : [...suggested, ...rest];

  const onQuery = (value: string) => {
    setQuery(value);
    setActive(0);
  };

  useEffect(() => {
    if (!open) return;
    if (window.matchMedia?.('(pointer: fine)').matches) inputRef.current?.focus();
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // Keep the highlighted option in view while arrowing through the list.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  // Reset in the click itself, not in an effect after render: an effect runs a
  // frame later and would wipe whatever was typed in that frame.
  const toggle = () => {
    if (!open) {
      setQuery('');
      setActive(Math.max(0, suggested.indexOf(lang)));
    }
    setOpen(o => !o);
  };

  const choose = (code: Lang) => {
    setLang(code);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(results.length - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) choose(results[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); buttonRef.current?.focus(); }
    else if (e.key === 'Tab') setOpen(false);
  };

  const option = (code: Lang, index: number) => {
    const secondary = localName(code);
    const showSecondary = secondary && fold(secondary) !== fold(endonym(code));
    return (
      <li
        key={code}
        id={`${baseId}-${code}`}
        data-index={index}
        role="option"
        aria-selected={code === lang}
        className={`lp-option${index === active ? ' lp-option--active' : ''}`}
        onPointerMove={() => setActive(index)}
        onClick={() => choose(code)}
      >
        <span className="lp-option-text">
          <span className="lp-endonym" lang={code}>{endonym(code)}</span>
          {showSecondary && <span className="lp-local">{secondary}</span>}
        </span>
        {code === lang && (
          <svg className="lp-check" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 10.5l4 4 8-9" />
          </svg>
        )}
      </li>
    );
  };

  return (
    <div className="lp-root" ref={rootRef}>
      <style>{styles}</style>
      <button
        ref={buttonRef}
        type="button"
        className="lp-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t.language}: ${endonym(lang)}`}
        onClick={toggle}
      >
        <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="10" cy="10" r="7.25" />
          <path d="M2.75 10h14.5M10 2.75c2 2.1 3 4.5 3 7.25s-1 5.15-3 7.25M10 2.75C8 4.85 7 7.25 7 10s1 5.15 3 7.25" />
        </svg>
        <span className="lp-current" lang={lang}>{endonym(lang)}</span>
        <svg className="lp-chevron" viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M2 4l4 4 4-4" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="lp-panel" style={{ zIndex: Z.POPOVER }}>
          <input
            ref={inputRef}
            className="lp-search"
            type="search"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={results[active] ? `${baseId}-${results[active]}` : undefined}
            aria-label={t.languageSearch}
            placeholder={t.languageSearch}
            value={query}
            onChange={e => onQuery(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          <ul className="lp-list" id={listId} role="listbox" aria-label={t.language} ref={listRef} onKeyDown={onKeyDown}>
            {results.length === 0 && <li className="lp-empty" role="presentation">{t.languageNone}</li>}
            {!q && <li className="lp-group" role="presentation">{t.languageSuggested}</li>}
            {!q && suggested.map((code, i) => option(code, i))}
            {!q && <li className="lp-group" role="presentation">{t.languageAll}</li>}
            {!q && rest.map((code, i) => option(code, suggested.length + i))}
            {q && results.map((code, i) => option(code, i))}
          </ul>
        </div>
      )}
    </div>
  );
}

const styles = `
  .lp-root { position: relative; }
  .lp-button {
    display: inline-flex; align-items: center; gap: 7px;
    height: 32px; padding: 0 11px;
    font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.04em;
    color: var(--text-mid); background: transparent;
    border: 1px solid var(--border-dark); border-radius: 16px; cursor: pointer;
    transition: background 150ms ease-out, color 150ms ease-out, border-color 150ms ease-out;
  }
  .lp-button:hover { background: var(--section-bg); color: var(--text); border-color: var(--navy-mid); }
  .lp-button:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
  /* Inside the panel an outline would be clipped by its edge; a bar under the
     field says the same thing and stays visible. */
  .lp-search:focus-visible { outline: none; box-shadow: inset 0 -2px 0 var(--focus); }
  .lp-button[aria-expanded="true"] .lp-chevron { transform: rotate(180deg); }
  .lp-chevron { transition: transform 150ms ease-out; opacity: 0.7; }

  .lp-panel {
    position: absolute; top: calc(100% + 6px); right: 0;
    width: min(290px, calc(100vw - 32px));
    background: var(--white); border: 1px solid var(--border-dark); border-radius: 6px;
    box-shadow: 0 10px 30px rgba(15, 30, 60, 0.14);
    text-align: left; overflow: hidden;
    animation: lp-in 150ms ease-out;
  }
  @keyframes lp-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

  .lp-search {
    display: block; width: 100%; height: 40px; padding: 0 12px;
    font-family: 'JetBrains Mono', monospace; font-size: 16px; /* 16px: no zoom-on-focus on iOS */
    color: var(--text); background: var(--paper);
    border: none; border-bottom: 1px solid var(--border);
  }
  .lp-search::placeholder { color: var(--text-light); font-size: 12px; }

  .lp-list { list-style: none; max-height: 290px; overflow-y: auto; padding: 4px 0; overscroll-behavior: contain; }
  .lp-group {
    padding: 10px 12px 4px; font-size: 9.5px; font-weight: 500;
    letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-light);
  }
  .lp-empty { padding: 14px 12px; font-size: 12px; color: var(--text-light); }
  .lp-option {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    min-height: 40px; padding: 6px 12px; cursor: pointer; color: var(--text);
  }
  .lp-option--active { background: var(--section-bg); }
  .lp-option[aria-selected="true"] .lp-endonym { font-weight: 500; color: var(--navy); }
  .lp-option-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .lp-endonym { font-size: 13px; }
  .lp-local { font-size: 10.5px; color: var(--text-light); }
  .lp-check { color: var(--navy); flex-shrink: 0; }

  @media (pointer: coarse) {
    .lp-button { height: 44px; padding: 0 14px; border-radius: 22px; }
    .lp-option { min-height: 48px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .lp-panel { animation: none; }
    .lp-button, .lp-chevron { transition: none; }
  }
`;
