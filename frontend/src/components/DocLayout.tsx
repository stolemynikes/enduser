// The frame for the documentation and legal pages: Docs, Privacy, Terms, DPA.
//
// Written to be read, start to finish, by someone deciding whether to trust
// the product with identity documents — so the craft goes into the reading:
// a 68-character measure, 16px body, numbered sections with anchors (a DPA
// clause gets cited by number), and a date at the top that is the same date on
// every page because it comes from one place (lib/legal.ts).
//
// UX rules this follows deliberately:
//   - one column, no sidebar: these are documents, not apps
//   - section headings are real h2s in order, each linkable by its anchor
//   - the current page is marked in the navigation (aria-current)
//   - light and dark designed together, sharing one choice with the form and
//     How it works (lib/publicTheme.ts); with none made yet, dark like the
//     landing page these pages are reached from
//   - links underlined in body text, so they are not told apart by colour alone
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDocumentTitle } from '../lib/useDocumentTitle.ts';
import { lastUpdatedLabel } from '../lib/legal.ts';
import { readPublicTheme, storePublicTheme } from '../lib/publicTheme.ts';

const NAV: { to: string; label: string }[] = [
  { to: '/docs', label: 'Docs' },
  { to: '/how-it-works', label: 'For buyers' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/dpa', label: 'DPA' },
];

export function DocLayout({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  useDocumentTitle(`${title} — eustatement`);
  const { pathname, hash } = useLocation();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => readPublicTheme() ?? 'dark');

  useEffect(() => {
    storePublicTheme(theme);
  }, [theme]);

  // Land on the anchor when one was linked; otherwise start at the top, since
  // moving between these pages keeps the scroll position by default.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div className={`doc-page doc-${theme}`}>
      <style>{styles}</style>
      <a className="doc-skip" href="#doc-main">Skip to content</a>
      <header className="doc-top">
        <div className="doc-top-inner">
          <Link to="/" className="doc-brand">eustatement</Link>
          <nav className="doc-nav" aria-label="Documentation and legal">
            {NAV.map(n => (
              <Link key={n.to} to={n.to} aria-current={pathname === n.to ? 'page' : undefined}>{n.label}</Link>
            ))}
          </nav>
          <button type="button" className="doc-theme" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}>
            {theme === 'dark' ? (
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <circle cx="10" cy="10" r="3.6" />
                <path d="M10 1.8v2.2M10 16v2.2M1.8 10h2.2M16 10h2.2M4.2 4.2l1.6 1.6M14.2 14.2l1.6 1.6M4.2 15.8l1.6-1.6M14.2 5.8l1.6-1.6" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M17.3 13.3A8 8 0 016.7 2.7a8 8 0 1010.6 10.6z" /></svg>
            )}
          </button>
        </div>
      </header>

      <main id="doc-main" className="doc-main">
        <h1 className="doc-title">{title}</h1>
        <p className="doc-updated">Last updated: {lastUpdatedLabel()}</p>
        {intro && <div className="doc-intro">{intro}</div>}
        {children}
      </main>

      <footer className="doc-foot">
        <span>© {new Date().getFullYear()} eustatement</span>
        <nav aria-label="Footer">
          {NAV.map(n => <Link key={n.to} to={n.to}>{n.label}</Link>)}
        </nav>
      </footer>
    </div>
  );
}

/** A numbered section with an anchor, e.g. <Clause n={7} id="sub-processors" title="Sub-processors">. */
export function Clause({ n, id, title, children }: { n?: number; id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="doc-clause" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>
        {n != null && <span className="doc-num">{n}.</span>} {title}
        <a className="doc-anchor" href={`#${id}`} aria-label={`Link to “${title}”`}>#</a>
      </h2>
      {children}
    </section>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  .doc-page {
    --bg: #0f0f10; --surface: #171718; --text: #f2f2f0; --text-mid: #a3a3a6; --text-dim: #8a8a8f;
    --border: rgba(255,255,255,0.08); --accent: #5b9cf6; --accent-text: #8fbcff; --code-bg: rgba(255,255,255,0.06);
    min-height: 100dvh; background: var(--bg); color: var(--text);
    font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  }
  /* The page behind the document matches it, so no white shows below a short page or on overscroll. */
  html:has(.doc-page), body:has(.doc-page) { background: #0f0f10; }
  html:has(.doc-page.doc-light), body:has(.doc-page.doc-light) { background: #fbfbfd; }
  .doc-page.doc-light {
    --bg: #fbfbfd; --surface: #ffffff; --text: #18181a; --text-mid: #475069; --text-dim: #5f6880;
    --border: rgba(20,24,34,0.10); --accent: #1f5fd1; --accent-text: #1f5fd1; --code-bg: rgba(20,24,34,0.05);
  }

  .doc-skip { position: absolute; left: -9999px; }
  .doc-skip:focus { left: 16px; top: 12px; z-index: 30; background: var(--surface); color: var(--text); padding: 10px 14px; border-radius: 8px; }

  .doc-top { border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 20; background: var(--bg); }
  .doc-top-inner {
    max-width: 1040px; margin: 0 auto; padding: 0 20px; min-height: 60px;
    display: flex; align-items: center; gap: 20px;
  }
  .doc-brand { font-weight: 700; font-size: 16px; letter-spacing: -0.02em; color: var(--text); text-decoration: none; }
  .doc-brand span { color: var(--accent); }
  .doc-nav { display: flex; gap: 2px; margin-left: auto; overflow-x: auto; scrollbar-width: none; }
  .doc-nav a {
    font-size: 13.5px; color: var(--text-mid); text-decoration: none; white-space: nowrap;
    padding: 12px 10px; border-radius: 8px; transition: color 150ms ease-out;
  }
  .doc-nav a:hover { color: var(--text); }
  .doc-nav a[aria-current="page"] { color: var(--text); box-shadow: inset 0 -2px 0 var(--accent); border-radius: 0; }
  .doc-theme {
    flex-shrink: 0; width: 40px; height: 40px; border-radius: 10px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    background: transparent; color: var(--text-mid); border: 1px solid var(--border);
  }
  .doc-theme:hover { color: var(--text); }
  .doc-page a:focus-visible, .doc-theme:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .doc-main { max-width: 720px; margin: 0 auto; padding: 56px 20px 64px; }
  .doc-title { margin: 0; font-size: clamp(30px, 5vw, 40px); font-weight: 700; letter-spacing: -0.025em; line-height: 1.15; text-wrap: balance; }
  .doc-updated { margin: 10px 0 0; font-size: 13.5px; color: var(--text-dim); font-variant-numeric: tabular-nums; }
  .doc-intro { margin-top: 28px; }

  .doc-main p, .doc-main li { font-size: 16px; line-height: 1.75; color: var(--text); }
  .doc-main p { margin: 0 0 14px; max-width: 68ch; }
  .doc-main ul, .doc-main ol { margin: 0 0 14px; padding-left: 1.3rem; max-width: 68ch; }
  .doc-main li { margin-bottom: 6px; }
  .doc-main a { color: var(--accent-text); text-decoration: underline; text-underline-offset: 3px; }
  .doc-main strong { font-weight: 600; }
  .doc-main code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.88em;
    background: var(--code-bg); border-radius: 5px; padding: 2px 5px;
  }
  .doc-main pre {
    background: var(--code-bg); border: 1px solid var(--border); border-radius: 10px;
    padding: 14px 16px; overflow-x: auto; font-size: 13px; line-height: 1.6; margin: 0 0 16px;
  }
  .doc-main pre code { background: none; padding: 0; }

  .doc-clause { margin-top: 44px; scroll-margin-top: 80px; }
  .doc-clause h2 { margin: 0 0 14px; font-size: 21px; font-weight: 650; letter-spacing: -0.015em; line-height: 1.3; }
  .doc-clause h3 { margin: 22px 0 8px; font-size: 16.5px; font-weight: 600; }
  .doc-num { color: var(--text-dim); font-variant-numeric: tabular-nums; }
  .doc-main .doc-anchor { margin-left: 8px; color: var(--text-dim); text-decoration: none; opacity: 0; transition: opacity 150ms ease-out; }
  .doc-clause h2:hover .doc-anchor, .doc-anchor:focus-visible { opacity: 1; }

  .doc-table-wrap { overflow-x: auto; margin: 0 0 16px; border: 1px solid var(--border); border-radius: 10px; }
  .doc-table { width: 100%; border-collapse: collapse; font-size: 14px; }
  .doc-table th, .doc-table td { text-align: left; vertical-align: top; padding: 11px 14px; border-bottom: 1px solid var(--border); line-height: 1.55; }
  .doc-table th { font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-mid); }
  .doc-table tr:last-child td { border-bottom: 0; }
  .doc-table td:first-child { font-weight: 600; min-width: 150px; }
  .doc-note {
    border: 1px solid var(--border); border-left: 3px solid var(--accent); background: var(--surface);
    border-radius: 8px; padding: 12px 16px; margin: 0 0 16px;
  }
  .doc-note p:last-child { margin-bottom: 0; }

  .doc-foot {
    max-width: 1040px; margin: 0 auto; padding: 24px 20px 40px; border-top: 1px solid var(--border);
    display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px 20px; font-size: 13px; color: var(--text-dim);
  }
  .doc-foot nav { display: flex; flex-wrap: wrap; gap: 4px 14px; }
  .doc-foot a { color: var(--text-mid); text-decoration: none; padding: 6px 0; }
  .doc-foot a:hover { color: var(--text); }

  @media (max-width: 640px) {
    .doc-top-inner { gap: 10px; }
    .doc-nav a { padding: 12px 7px; font-size: 13px; }
    .doc-main { padding-top: 36px; }
  }
  @media (pointer: coarse) { .doc-theme { width: 44px; height: 44px; } }
  @media (prefers-reduced-motion: reduce) { .doc-nav a, .doc-anchor { transition: none; } }
  @media print { .doc-top, .doc-foot, .doc-skip { display: none; } .doc-page { background: #fff; color: #000; } }
`;
