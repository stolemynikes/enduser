import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../src/lib/useDocumentTitle.ts';
import { Wordmark } from '../src/components/Mark.tsx';
import { SceneDefs, LostScene } from '../src/components/landing/Scenes.tsx';
import { sceneStyles } from '../src/components/landing/sceneStyles.ts';
import { carbonTokens } from '../src/components/landing/carbon.ts';
import { useSceneMotion } from '../src/components/landing/useSceneMotion.ts';
import { useI18n } from '../src/i18n/index.ts';
import { I18nProvider } from '../src/i18n/I18nProvider.tsx';

/**
 * The 404 page, in the landing page's carbon style.
 *
 * Shown for a form address no company owns, and for any other path nothing
 * matches. The first case is almost always a buyer with a mistyped or outdated
 * link from a supplier, so the words come from the form's own messages and
 * appear in the buyer's language.
 *
 * Split out of the form bundle: an unknown slug is rare, and the scene and its
 * motion are not worth sending to every buyer who lands on a real form.
 */
export default function NotFound() {
  return (
    <I18nProvider>
      <NotFoundPage />
    </I18nProvider>
  );
}

function NotFoundPage() {
  const { t } = useI18n();
  useDocumentTitle(`${t.notFoundTitle} — eustatement`);
  const root = useRef<HTMLDivElement>(null);
  useSceneMotion(root);

  return (
    <>
      <style>{styles + sceneStyles}</style>
      <div className="nf-root" ref={root}>
        <SceneDefs />
        <div className="nf-grid-bg" aria-hidden="true" />
        <div className="nf-orb" aria-hidden="true" />

        <nav className="nf-nav">
          <Link to="/" className="nf-home" aria-label="eustatement home">
            <Wordmark size={20} textClassName="nf-brand" />
          </Link>
        </nav>

        <main className="nf-main">
          <div className="nf-copy">
            <span className="nf-eyebrow">404</span>
            <h1 className="nf-title">{t.notFoundTitle}</h1>
            <p className="nf-body">{t.notFoundBody}</p>
            <p className="nf-note">{t.contactSupplier}</p>
            <Link to="/" className="nf-btn">{t.notFoundHome}</Link>
          </div>
          <div className="nf-art">
            <LostScene />
          </div>
        </main>
      </div>
    </>
  );
}

const styles = `
  html, body { background: #0f0f10; margin: 0; }
  .nf-root {
    ${carbonTokens}
    position: relative; min-height: 100vh; min-height: 100dvh; overflow: hidden;
    display: flex; flex-direction: column;
    background: var(--bg); color: var(--text); font-family: var(--sans);
  }
  .nf-root *, .nf-root *::before, .nf-root *::after { box-sizing: border-box; }
  .nf-grid-bg {
    position: absolute; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse 80% 60% at 50% 45%, black 30%, transparent 75%);
    -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 45%, black 30%, transparent 75%);
  }
  .nf-orb {
    position: absolute; width: 480px; height: 480px; top: -12%; left: -10%;
    border-radius: 50%; filter: blur(90px); pointer-events: none;
    background: rgba(91,156,246,0.10);
  }

  .nf-nav { position: relative; z-index: 1; padding: 1rem 2rem; }
  .nf-home { display: inline-flex; align-items: center; min-height: 44px; text-decoration: none; border-radius: 8px; }
  .nf-home:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; }
  .nf-brand { font-size: 16px; font-weight: 800; letter-spacing: -0.02em; color: var(--text); }

  .nf-main {
    position: relative; z-index: 1; flex: 1;
    display: grid; grid-template-columns: 1fr 1.1fr; gap: 3rem; align-items: center;
    max-width: 1120px; width: 100%; margin: 0 auto; padding: 2rem 2rem 4rem;
  }
  .nf-copy, .nf-art { min-width: 0; }
  .nf-eyebrow {
    display: inline-block; margin-bottom: 1.25rem;
    font-size: 12px; font-weight: 700; letter-spacing: 0.2em; font-variant-numeric: tabular-nums;
    color: var(--accent); background: rgba(91,156,246,0.1); border: 1px solid rgba(91,156,246,0.22);
    padding: 4px 14px; border-radius: 100px;
  }
  .nf-title {
    margin: 0 0 1rem; font-size: clamp(34px, 5vw, 56px); font-weight: 800;
    line-height: 1.08; letter-spacing: -0.03em; text-wrap: balance;
  }
  .nf-body { margin: 0 0 0.75rem; font-size: 18px; line-height: 1.7; color: var(--mid); max-width: 460px; }
  .nf-note { margin: 0 0 2rem; font-size: 15px; line-height: 1.6; color: #8a8a8f; max-width: 460px; }
  .nf-btn {
    display: inline-flex; align-items: center; min-height: 48px;
    font-size: 15px; font-weight: 700; color: #fff; text-decoration: none;
    background: var(--accent); border-radius: 10px; padding: 0 26px;
    box-shadow: 0 8px 24px rgba(91,156,246,0.18);
    transition: transform 0.15s, box-shadow 0.2s, background 0.2s;
  }
  .nf-btn:hover { transform: translateY(-1px); background: #74abf8; box-shadow: 0 12px 32px rgba(91,156,246,0.26); }
  .nf-btn:focus-visible { outline: 2px solid var(--text); outline-offset: 3px; }
  .nf-art { background: var(--surface); border: 1px solid var(--line); border-radius: 20px; overflow: hidden; }

  /* Entrance: copy first, then the scene. */
  @keyframes nf-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
  .nf-copy { animation: nf-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
  .nf-art { animation: nf-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both; }

  @media (max-width: 880px) {
    .nf-nav { padding: 0.9rem 1.25rem; }
    .nf-main { grid-template-columns: 1fr; gap: 2rem; padding: 1rem 1.25rem 3rem; align-content: start; }
    .nf-body, .nf-note { max-width: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .nf-copy, .nf-art { animation: none; }
  }
`;
