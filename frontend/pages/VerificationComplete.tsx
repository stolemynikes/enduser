import { useEffect } from 'react';
import { useDocumentTitle } from '../src/lib/useDocumentTitle.ts';

// Where Didit sends the buyer once the hosted flow ends. This page is purely
// cosmetic: it carries no outcome. The form window polls the server for the
// decision, so nothing here is trusted — a buyer who lands on this URL directly
// has verified nothing.
export default function VerificationComplete() {
  useDocumentTitle('Verification complete');

  useEffect(() => {
    // Opened as a popup by the form — closing it hands focus back. Browsers
    // only allow this for script-opened windows, so the message below stays as
    // the fallback when the flow ran in the same tab.
    const timer = setTimeout(() => window.close(), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style>{css}</style>
      <div className="vc-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="44" height="44">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h1>Verification finished</h1>
        <p>You can close this window and return to the form — it updates automatically.</p>
      </div>
    </>
  );
}

const css = `
  .vc-wrap {
    min-height: 100vh;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.875rem; padding: 2rem; text-align: center;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #faf9f6; color: #15803d;
  }
  .vc-wrap h1 {
    font-size: 17px; font-weight: 600; letter-spacing: -0.01em; margin: 0; color: #1a1a1a;
  }
  .vc-wrap p {
    font-size: 12.5px; line-height: 1.7; margin: 0; max-width: 320px; color: #6b6660;
  }
`;
