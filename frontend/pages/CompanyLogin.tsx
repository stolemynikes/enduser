import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useNavigate, Link } from 'react-router-dom';
import { PasswordInput } from '../src/components/PasswordInput.tsx';
import { useDocumentTitle } from '../src/lib/useDocumentTitle.ts';
import { Wordmark } from '../src/components/Mark.tsx';
import { Turnstile } from '../src/components/Turnstile.tsx';
import { TotpInput } from '../src/components/TotpInput.tsx';
import { mfaSignal } from '../src/lib/mfaError.ts';

const COMPANY_LOGIN = gql`
  mutation CompanyLogin($email: String!, $password: String!, $turnstileToken: String, $totp: String) {
    companyLogin(email: $email, password: $password, turnstileToken: $turnstileToken, totp: $totp) {
      token
      role
      company { id name slug }
    }
  }
`;

export default function CompanyLogin() {
  const navigate = useNavigate();
  useDocumentTitle('Sign in — EU Statement');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [botToken, setBotToken] = useState('');
  // Shown only once the server says the password was right and a code is due,
  // so the form never reveals which accounts have a second factor.
  const [totp, setTotp] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  // ?expired=1 is set when a lapsed token bounced the user out of the dashboard.
  const [error, setError] = useState(
    new URLSearchParams(window.location.search).has('expired')
      ? 'Your session expired — please sign in again.'
      : ''
  );
  const [login, { loading }] = useMutation<any>(COMPANY_LOGIN);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await login({
        variables: { email, password, turnstileToken: botToken || undefined, totp: totp || undefined },
      });
      localStorage.setItem('companyToken', data.companyLogin.token);
      localStorage.setItem('companyRole', data.companyLogin.role);
      localStorage.setItem('companyName', data.companyLogin.company.name);
      localStorage.setItem('companySlug', data.companyLogin.company.slug);
      navigate('/company/dashboard');
    } catch (err: any) {
      const signal = mfaSignal(err);
      if (signal) {
        // The password was accepted; only the code is outstanding. Keep the
        // form, reveal the field, and say which of the two happened.
        setNeedsTotp(true);
        setTotp('');
        setError(signal === 'required' ? '' : (err?.message ?? 'That code is not valid.'));
        return;
      }
      setNeedsTotp(false);
      setError(err?.message ?? 'Login failed');
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="cl-wrap">
        <div className="cl-card">
          <div className="cl-logo">
            <Wordmark size={20} textClassName="cl-brand" accentClassName="cl-brand-accent" />
            <span className="cl-logo-tag">COMPANY</span>
          </div>
          <h1 className="cl-title">Sign in</h1>
          <p className="cl-sub">Access your company dashboard</p>
          <form onSubmit={handleSubmit} className="cl-form">
            <div className="cl-field">
              <label className="cl-label" htmlFor="cl-email">Email</label>
              <input id="cl-email" className="cl-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)} required autoFocus autoComplete="username" />
            </div>
            <div className="cl-field">
              <label className="cl-label" htmlFor="cl-password">Password</label>
              <PasswordInput id="cl-password" className="cl-input" value={password}
                onChange={setPassword} required autoComplete="current-password" />
            </div>
            {needsTotp && (
              <div className="cl-field">
                <label className="cl-label" htmlFor="cl-totp">Authentication code</label>
                <TotpInput id="cl-totp" className="cl-input" value={totp} onChange={setTotp} autoFocus />
                <p className="cl-hint">
                  From your authenticator app. Lost your phone? Use one of your recovery codes.
                </p>
              </div>
            )}
            <Turnstile onToken={setBotToken} theme="dark" />
            {error && <div className="cl-error" role="alert">{error}</div>}
            <p className="cl-forgot"><a href="/forgot">Forgotten your password?</a></p>
            <button className="cl-btn" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : needsTotp ? 'Verify and sign in' : 'Sign in'}
            </button>
          </form>
          <p className="cl-footer-link">
            Don't have an account? <Link to="/register">Register your company</Link>
          </p>
        </div>
      </div>
    </>
  );
}

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #0b0d13; font-family: 'Inter', system-ui, sans-serif; }
  .cl-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #0b0d13; padding: 1.5rem;
  }
  .cl-card {
    background: linear-gradient(160deg, #151926, #10131c); border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px; padding: 2.5rem 2rem; width: 100%; max-width: 400px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  }
  .cl-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 1.5rem; }
  .cl-brand { font-size: 14px; font-weight: 800; letter-spacing: -0.02em; color: #f0f2f8; }
  .cl-brand-accent { color: #5b9cf6; }
  .cl-logo-tag {
    font-size: 9px; font-weight: 600; letter-spacing: 0.18em;
    color: #5b9cf6; background: rgba(91,156,246,0.1); border: 1px solid rgba(91,156,246,0.22);
    padding: 3px 10px; border-radius: 100px; text-transform: uppercase;
  }
  .cl-title { font-size: 22px; font-weight: 600; color: #f0f2f8; margin-bottom: 6px; }
  .cl-sub { font-size: 13px; color: #6b7485; margin-bottom: 2rem; }
  .cl-form { display: flex; flex-direction: column; gap: 1rem; }
  .cl-field { display: flex; flex-direction: column; gap: 6px; }
  .cl-hint { font-size: 11px; line-height: 1.5; color: #6b7485; }
  .cl-label { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #6b7485; }
  .cl-input {
    font-family: inherit; font-size: 13px; color: #f0f2f8;
    background: #0c0f16; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
    padding: 10px 14px; outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .cl-input:focus { border-color: #5b9cf6; box-shadow: 0 0 0 3px rgba(91,156,246,0.15); }
  .cl-forgot { font-size: 12px; text-align: right; margin-top: -4px; }
  .cl-forgot a { color: #6b7485; text-decoration: none; }
  .cl-forgot a:hover { color: #5b9cf6; }
  .cl-error {
    background: rgba(240,78,94,0.1); border: 1px solid rgba(240,78,94,0.25);
    border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #f04e5e;
  }
  .cl-btn {
    font-family: inherit; font-size: 13px; font-weight: 600; color: #fff;
    background: linear-gradient(135deg, #254a8f, #1a3160); border: none; border-radius: 10px; padding: 12px;
    cursor: pointer; transition: transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 8px 24px rgba(26,49,96,0.45), inset 0 1px 0 rgba(255,255,255,0.08);
    margin-top: 0.25rem;
  }
  .cl-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(37,74,143,0.55), inset 0 1px 0 rgba(255,255,255,0.1); }
  .cl-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .cl-footer-link { font-size: 12px; color: #6b7485; text-align: center; margin-top: 1.5rem; }
  .cl-footer-link a { color: #5b9cf6; text-decoration: none; }
  .cl-footer-link a:hover { text-decoration: underline; }
`;
