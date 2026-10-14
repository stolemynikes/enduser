// Shared styling for the standalone account pages (forgot / reset / verify).
// Mirrors the sign-in card in CompanyLogin so the flow looks like one product.
export const authStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #0f0f10; font-family: 'Inter', system-ui, sans-serif; }
  .au-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #0f0f10; padding: 1.5rem;
  }
  .au-card {
    background: linear-gradient(160deg, #1a1a1c, #141415); border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px; padding: 2.5rem 2rem; width: 100%; max-width: 400px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  }
  .au-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 1.5rem; }
  .au-brand { font-size: 14px; font-weight: 800; letter-spacing: -0.02em; color: #f0f2f8; }
  .au-brand-accent { color: #5b9cf6; }
  .au-title { font-size: 22px; font-weight: 600; color: #f0f2f8; margin-bottom: 6px; }
  .au-sub { font-size: 13px; color: #a3a3a6; line-height: 1.65; margin-bottom: 1.75rem; }
  .au-sub b { color: #f0f2f8; font-weight: 600; }
  .au-form { display: flex; flex-direction: column; gap: 1rem; }
  .au-field { display: flex; flex-direction: column; gap: 6px; }
  .au-label { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #8a8a8f; }
  .au-input {
    font-family: inherit; font-size: 13px; color: #f0f2f8; width: 100%;
    background: #0d0d0e; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
    padding: 10px 14px; outline: none; transition: border-color 0.2s, box-shadow 0.2s;
  }
  .au-input:focus { border-color: #5b9cf6; box-shadow: 0 0 0 3px rgba(91,156,246,0.15); }
  .au-error {
    background: rgba(240,78,94,0.1); border: 1px solid rgba(240,78,94,0.25);
    border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #f04e5e;
  }
  .au-btn {
    font-family: inherit; font-size: 13px; font-weight: 600; color: #0f0f10;
    background: #5b9cf6; border: none; border-radius: 10px; padding: 12px;
    cursor: pointer; transition: transform 0.15s, box-shadow 0.2s; margin-top: 0.25rem;
    box-shadow: 0 8px 24px rgba(91,156,246,0.18);
  }
  .au-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .au-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .au-link-btn {
    display: inline-block; font-size: 13px; font-weight: 600; color: #0f0f10; text-decoration: none;
    background: #5b9cf6; border-radius: 10px; padding: 12px 22px;
    box-shadow: 0 8px 24px rgba(91,156,246,0.18);
  }
  .au-footer-link { margin-top: 1.5rem; font-size: 12px; color: #8a8a8f; text-align: center; }
  .au-footer-link a { color: #5b9cf6; text-decoration: none; }
  .au-footer-link a:hover { text-decoration: underline; }
`;
