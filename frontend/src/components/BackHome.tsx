// A way back to the landing page from the sign-in and sign-up screens, which
// otherwise have no navigation at all. It sits at the top of the card, above the logo.
import { Link } from 'react-router-dom';

const styles = `
  .back-home {
    display: inline-flex; align-items: center; gap: 6px; min-height: 36px;
    margin: -8px 0 14px -10px; padding: 0 10px;
    font-family: 'Inter', system-ui, sans-serif; font-size: 13.5px; font-weight: 500;
    color: #a3a3a6; text-decoration: none; border-radius: 8px;
    transition: color 150ms ease-out, background 150ms ease-out;
  }
  .back-home:hover { color: #f2f2f0; background: rgba(255,255,255,0.05); }
  .back-home:focus-visible { outline: 2px solid #5b9cf6; outline-offset: 2px; }
`;

export function BackHome() {
  return (
    <>
      <style>{styles}</style>
      <Link to="/" className="back-home">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to eustatement
      </Link>
    </>
  );
}
