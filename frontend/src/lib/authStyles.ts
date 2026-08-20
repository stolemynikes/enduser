// Shared styling for the standalone account pages (forgot / reset / verify).
// Mirrors the sign-in card in CompanyLogin so the flow looks like one product.
export const authStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #0b0d13; font-family: 'Inter', system-ui, sans-serif; }
  .au-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #0b0d13; padding: 1.5rem;
  }
  .au-card {
    background: linear-gradient(160deg, #151926, #10131c); border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px; padding: 2.5rem 2rem; width: 100%; max-width: 400px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  }
  .au-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 1.5rem; }
  .au-brand { font-size: 14px; font-weight: 800; letter-spacing: -0.02em; color: #f0f2f8; }
  .au-brand-accent { color: #5b9cf6; }
  .au-title { font-size: 22px; font-weight: 600; color: #f0f2f8; margin-bottom: 6px; }
  .au-sub { font-size: 13px; color: #8b93a5; line-height: 1.65; margin-bottom: 1.75rem; }
  .au-sub b { color: #f0f2f8; font-weight: 600; }
  .au-form { display: flex; flex-direction: column; gap: 1rem; }
  .au-field { display: flex; flex-direction: column; gap: 6px; }
  .au-label { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #6b7485; }
  .au-input {
    font-family: inherit; font-size: 13px; color: #f0f2f8; width: 100%;
    background: #0c0f16; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
    padding: 10px 14px; outline: none; transition: border-color 0.2s, box-shadow 0.2s;
  }
  .au-input:focus { border-color: #5b9cf6; box-shadow: 0 0 0 3px rgba(91,156,246,0.15); }
  .au-error {
    background: rgba(240,78,94,0.1); border: 1px solid rgba(240,78,94,0.25);
    border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #f04e5e;
  }
  .au-btn {
    font-family: inherit; font-size: 13px; font-weight: 600; color: #fff;
    background: linear-gradient(135deg, #254a8f, #1a3160); border: none; border-radius: 10px; padding: 12px;
    cursor: pointer; transition: transform 0.15s, box-shadow 0.2s; margin-top: 0.25rem;
    box-shadow: 0 8px 24px rgba(26,49,96,0.45), inset 0 1px 0 rgba(255,255,255,0.08);
  }
  .au-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .au-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .au-link-btn {
    display: inline-block; font-size: 13px; font-weight: 600; color: #fff; text-decoration: none;
    background: linear-gradient(135deg, #254a8f, #1a3160); border-radius: 10px; padding: 12px 22px;
    box-shadow: 0 8px 24px rgba(26,49,96,0.45), inset 0 1px 0 rgba(255,255,255,0.08);
  }
  .au-footer-link { margin-top: 1.5rem; font-size: 12px; color: #6b7485; text-align: center; }
  .au-footer-link a { color: #5b9cf6; text-decoration: none; }
  .au-footer-link a:hover { text-decoration: underline; }
`;
