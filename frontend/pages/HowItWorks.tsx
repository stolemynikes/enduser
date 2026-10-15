// "How this works" — for the person filling in a form, not the seller.
//
// Reached from the line under every form. It opens in the language and theme
// the buyer already chose there (both live in this browser's storage), and,
// when the form passed ?seller=, it names the seller — the party a buyer has to
// write to about their data, which a generic page would leave them to guess.
//
// UX rules this follows deliberately:
//   - a short summary first, the detail below (progressive disclosure)
//   - real headings in order (h1 → h2) and an "on this page" list of anchors,
//     so every answer can be linked to directly
//   - body text at 16px with a 68-character measure and 1.7 line height
//   - the same paper/navy identity as the form, so following the link does
//     not feel like leaving for somewhere else
//   - light and dark designed together; no colour carries meaning alone
import { useEffect, useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Link, useSearchParams } from 'react-router-dom';
import { I18nProvider } from '../src/i18n/I18nProvider.tsx';
import { useI18n } from '../src/i18n/index.ts';
import type { Lang } from '../src/i18n/languages.ts';
import { LanguagePicker } from '../src/components/LanguagePicker.tsx';
import { useDocumentTitle } from '../src/lib/useDocumentTitle.ts';
import { readPublicTheme, storePublicTheme } from '../src/lib/publicTheme.ts';
import { CONTACT_EMAIL, LAST_UPDATED } from '../src/lib/legal.ts';
import en, { type HowItWorks as Copy } from '../src/i18n/howItWorks/en.ts';

const FORM_INFO = gql`query HowItWorksSeller($slug: String!) { formInfo(slug: $slug) { companyName } }`;

const loaders = import.meta.glob<{ default: Copy }>(['../src/i18n/howItWorks/*.ts', '!../src/i18n/howItWorks/en.ts']);

// Loaded copies live here, so switching back to a language is instant and an
// effect never has to set state before anything has arrived.
const loaded = new Map<Lang, Copy>([['en', en]]);

function useCopy(lang: Lang): Copy {
  const [, rerender] = useState(0);
  useEffect(() => {
    if (loaded.has(lang)) return;
    const loader = loaders[`../src/i18n/howItWorks/${lang}.ts`];
    if (!loader) return;
    let current = true;
    loader().then(m => { loaded.set(lang, m.default); if (current) rerender(n => n + 1); }).catch(() => { /* English stays */ });
    return () => { current = false; };
  }, [lang]);
  return loaded.get(lang) ?? en;
}

export default function HowItWorksPage() {
  return (
    <I18nProvider>
      <HowItWorks />
    </I18nProvider>
  );
}

function HowItWorks() {
  const { lang, t } = useI18n();
  const c = useCopy(lang);
  useDocumentTitle(c.docTitle);
  const [params] = useSearchParams();
  const sellerSlug = params.get('seller')?.trim() || '';
  const { data } = useQuery<{ formInfo: { companyName: string } | null }>(FORM_INFO, {
    variables: { slug: sellerSlug }, skip: !sellerSlug,
  });
  const seller = data?.formInfo?.companyName;

  const [theme, setTheme] = useState<'light' | 'dark'>(() => readPublicTheme() ?? 'dark');
  useEffect(() => {
    storePublicTheme(theme);
    document.documentElement.classList.toggle('hw-dark-page', theme === 'dark');
    return () => document.documentElement.classList.remove('hw-dark-page');
  }, [theme]);

  const date = new Date(`${LAST_UPDATED}T12:00:00Z`).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' });
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  // Sentences with the address inside are split around it so it can be a link
  // while staying wherever the language puts it.
  const withMail = (sentence: string) => {
    const [before, after] = sentence.split(CONTACT_EMAIL);
    return <>{before}{mail}{after}</>;
  };

  const sections: { id: string; title: string; body: React.ReactNode }[] = [
    { id: 'why', title: c.whyTitle, body: c.why.map((p, i) => <p key={i}>{p}</p>) },
    { id: 'identity', title: c.idTitle, body: c.id.map((p, i) => <p key={i}>{p}</p>) },
    { id: 'stored', title: c.storedTitle, body: c.stored.map((p, i) => <p key={i}>{p}</p>) },
    { id: 'decision', title: c.decideTitle, body: c.decide.map((p, i) => <p key={i}>{p}</p>) },
    { id: 'retention', title: c.keptTitle, body: c.kept.map((p, i) => <p key={i}>{p}</p>) },
    {
      id: 'others', title: c.othersTitle, body: (
        <>
          <p>{c.othersIntro}</p>
          <dl className="hw-parties">
            {c.others.map(([who, what]) => (
              <div key={who}><dt>{who}</dt><dd>{what}</dd></div>
            ))}
          </dl>
          <p className="hw-more">{c.othersMore} <Link to="/privacy">{c.privacyPolicy} →</Link></p>
        </>
      ),
    },
    {
      id: 'rights', title: c.rightsTitle, body: (
        <>
          {c.rights.map((p, i) => <p key={i}>{p}</p>)}
          <p>{c.controller(seller)}</p>
          <p>{withMail(c.fallback(CONTACT_EMAIL))}</p>
          <p>{c.complaint}</p>
        </>
      ),
    },
    {
      id: 'questions', title: c.questionsTitle, body: (
        <>
          <p>{c.questionsOrder}</p>
          <p>{withMail(c.questionsData(CONTACT_EMAIL))}</p>
        </>
      ),
    },
  ];

  return (
    <div className={`hw-page${theme === 'dark' ? ' hw-dark' : ''}`}>
      <style>{styles}</style>
      <div className="hw-wrap">
        <div className="hw-toolbar">
          <LanguagePicker />
          <button type="button" className="hw-theme" onClick={() => setTheme(x => x === 'light' ? 'dark' : 'light')}
            aria-label={t.themeToggle} title={t.themeToggle}>
            {theme === 'light' ? (
              <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15" aria-hidden="true"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15" aria-hidden="true"><circle cx="10" cy="10" r="4" /><path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6L16 16M4 16l1.4-1.4M14.6 5.4L16 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            )}
          </button>
        </div>

        <header className="hw-header">
          <div className="hw-badge">{c.badge}</div>
          <h1 className="hw-title">{c.title}</h1>
          <p className="hw-lede">{c.lede}</p>
          {seller && (
            <p className="hw-sent">
              {c.sentBy(seller)}{' '}
              <Link to={`/${encodeURIComponent(sellerSlug)}`}>{c.backToForm}</Link>
            </p>
          )}
        </header>

        <section className="hw-short" aria-labelledby="hw-short-title">
          <h2 id="hw-short-title" className="hw-short-title">{c.shortTitle}</h2>
          <ul>
            {c.short.map((line, i) => (
              <li key={i}>
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        <nav className="hw-toc" aria-label={c.contents}>
          <span className="hw-toc-title">{c.contents}</span>
          <ol>
            {sections.map(s => <li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}
          </ol>
        </nav>

        <main>
          {sections.map(s => (
            <section key={s.id} id={s.id} className="hw-section" aria-labelledby={`${s.id}-h`}>
              <h2 id={`${s.id}-h`}>{s.title}</h2>
              {s.body}
            </section>
          ))}
        </main>

        <footer className="hw-footer">
          <span>{c.lastUpdated(date)}</span>
          <span className="hw-footer-links">
            <Link to="/privacy">{c.privacyPolicy}</Link>
            <Link to="/">eustatement</Link>
          </span>
        </footer>
      </div>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Inter:wght@400;500;600&display=swap');

  .hw-page {
    --paper: #faf9f6; --surface: #ffffff; --surface2: #f4f2ee;
    --text: #1a1814; --text-mid: #4a4540; --text-light: #6b665f;
    --navy: #0f1e3c; --navy-mid: #1a3160; --accent: #c8102e;
    --border: #d4d0c8; --border-dark: #b0a898; --focus: #1a3160; --section-bg: #f4f2ee; --white: #ffffff;
    --link: #1a3160;
    min-height: 100dvh; background: var(--paper); color: var(--text);
    font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  }
  .hw-page.hw-dark {
    --paper: #0f0f10; --surface: #19191b; --surface2: #1f1f22;
    --text: #e8eaf0; --text-mid: #b4bac6; --text-light: #8f97a6;
    --navy: #9dbcf0; --navy-mid: #7ba7e8; --accent: #f07070;
    --border: rgba(255,255,255,0.10); --border-dark: rgba(255,255,255,0.18); --focus: #7ba7e8;
    --section-bg: #1f1f22; --white: #19191b; --link: #9dbcf0;
  }
  html.hw-dark-page, html.hw-dark-page body { background: #0f0f10; }

  .hw-wrap { max-width: 760px; margin: 0 auto; padding: 1.5rem 1.25rem 3rem; }
  .hw-toolbar { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 1.5rem; }
  .hw-theme {
    width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    background: transparent; border: 1px solid var(--border-dark); color: var(--text-light); cursor: pointer;
    transition: background 150ms ease-out, color 150ms ease-out;
  }
  .hw-theme:hover { background: var(--section-bg); color: var(--text); }
  .hw-theme:focus-visible, .hw-page a:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }

  .hw-header { display: flex; flex-direction: column; gap: 0.9rem; margin-bottom: 2rem; }
  .hw-badge {
    align-self: flex-start; font-size: 10px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--accent); border: 1px solid var(--accent); padding: 3px 9px;
  }
  .hw-title {
    margin: 0; font-family: 'Libre Baskerville', Georgia, serif; font-weight: 700;
    font-size: clamp(1.9rem, 5vw, 2.6rem); line-height: 1.15; color: var(--navy); text-wrap: balance;
  }
  .hw-lede { margin: 0; font-size: 1.125rem; line-height: 1.65; color: var(--text-mid); max-width: 62ch; }
  .hw-sent { margin: 0; font-size: 0.95rem; color: var(--text-mid); }

  .hw-page a { color: var(--link); text-underline-offset: 3px; }
  .hw-page a:hover { text-decoration-thickness: 2px; }

  .hw-short {
    background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--navy-mid);
    border-radius: 4px; padding: 1.25rem 1.4rem; margin-bottom: 2rem;
  }
  .hw-short-title { margin: 0 0 0.75rem; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-mid); }
  .hw-short ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.7rem; }
  .hw-short li { display: flex; gap: 0.6rem; font-size: 1rem; line-height: 1.6; }
  .hw-short svg { flex-shrink: 0; margin-top: 0.3rem; color: var(--navy-mid); }

  .hw-toc { margin-bottom: 2.5rem; }
  .hw-toc-title { font-size: 0.8rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-mid); }
  .hw-toc ol { margin: 0.6rem 0 0; padding-left: 1.3rem; display: grid; gap: 0.15rem; }
  .hw-toc li { font-size: 0.95rem; line-height: 1.5; }
  .hw-toc a { display: inline-block; padding: 0.35rem 0; text-decoration: none; }
  .hw-toc a:hover { text-decoration: underline; }

  .hw-section { padding-top: 1.75rem; border-top: 1px solid var(--border); margin-top: 1.75rem; scroll-margin-top: 1rem; }
  .hw-section h2 {
    margin: 0 0 0.9rem; font-family: 'Libre Baskerville', Georgia, serif; font-weight: 700;
    font-size: 1.35rem; line-height: 1.3; color: var(--navy); text-wrap: balance;
  }
  .hw-section p { margin: 0 0 0.9rem; font-size: 1rem; line-height: 1.7; max-width: 68ch; }
  .hw-section p:last-child { margin-bottom: 0; }
  .hw-more { color: var(--text-mid); }

  .hw-parties { margin: 0 0 1rem; display: grid; gap: 0.7rem; }
  .hw-parties div { display: grid; grid-template-columns: minmax(0, 13rem) 1fr; gap: 0.25rem 1rem; }
  .hw-parties dt { font-weight: 600; font-size: 0.95rem; }
  .hw-parties dd { margin: 0; font-size: 0.95rem; line-height: 1.6; color: var(--text-mid); }
  @media (max-width: 560px) { .hw-parties div { grid-template-columns: 1fr; } }

  .hw-footer {
    margin-top: 3rem; padding-top: 1.25rem; border-top: 1px solid var(--border);
    display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;
    font-size: 0.85rem; color: var(--text-mid);
  }
  .hw-footer-links { display: flex; gap: 1rem; }

  @media (pointer: coarse) { .hw-theme { width: 44px; height: 44px; } }
  @media (prefers-reduced-motion: reduce) { .hw-theme { transition: none; } }
  @media print { .hw-toolbar, .hw-toc { display: none; } }
`;
