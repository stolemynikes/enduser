import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useNavigate, Link } from 'react-router-dom';
import { useFieldValidation } from '../src/lib/useFieldValidation.ts';
import { PasswordInput } from '../src/components/PasswordInput.tsx';
import { useDocumentTitle } from '../src/lib/useDocumentTitle.ts';
import { Wordmark } from '../src/components/Mark.tsx';
import { BackHome } from '../src/components/BackHome.tsx';
import { Turnstile } from '../src/components/Turnstile.tsx';
import { TotpInput } from '../src/components/TotpInput.tsx';
import { mfaSignal } from '../src/lib/mfaError.ts';
import { startAuthentication } from '@simplewebauthn/browser';

const BEGIN_PASSKEY = gql`
  mutation BeginPasskeyLogin($email: String!, $password: String!, $turnstileToken: String) {
    beginPasskeyLogin(email: $email, password: $password, turnstileToken: $turnstileToken) {
      optionsJson
      ticket
    }
  }
`;

const FINISH_PASSKEY = gql`
  mutation FinishPasskeyLogin($ticket: String!, $responseJson: String!) {
    finishPasskeyLogin(ticket: $ticket, responseJson: $responseJson) {
      token
      role
      company { id name slug }
    }
  }
`;

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
  const { formProps } = useFieldValidation();
  const navigate = useNavigate();
  useDocumentTitle('Sign in — eustatement');
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
  const [beginPasskey] = useMutation<any>(BEGIN_PASSKEY);
  const [finishPasskey] = useMutation<any>(FINISH_PASSKEY);
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  const land = (payload: { token: string; role: string; company: { name: string; slug: string } }) => {
    localStorage.setItem('companyToken', payload.token);
    localStorage.setItem('companyRole', payload.role);
    localStorage.setItem('companyName', payload.company.name);
    localStorage.setItem('companySlug', payload.company.slug);
    // Back to an invitation after signing in to accept it. Only an invitation
    // path is followed, so the parameter cannot send anyone elsewhere.
    const next = new URLSearchParams(window.location.search).get('next') ?? '';
    navigate(/^\/invite\/[A-Za-z0-9_-]{16,200}$/.test(next) ? next : '/company/dashboard');
  };

  /**
   * The passkey path needs a server challenge before the browser can sign, so
   * it is two calls rather than one. The password still goes first: a passkey
   * replaces the code, not the password.
   */
  const signInWithPasskey = async () => {
    setError('');
    setPasskeyBusy(true);
    try {
      const { data: began } = await beginPasskey({
        variables: { email, password, turnstileToken: botToken || undefined },
      });
      const { optionsJson, ticket } = began.beginPasskeyLogin;
      const assertion = await startAuthentication({ optionsJSON: JSON.parse(optionsJson) });
      const { data } = await finishPasskey({
        variables: { ticket, responseJson: JSON.stringify(assertion) },
      });
      land(data.finishPasskeyLogin);
    } catch (err: any) {
      const name = err?.name ?? '';
      // Cancelling the system prompt is a choice, not a failure.
      if (name === 'NotAllowedError' || name === 'AbortError') setError('');
      else setError(err?.message ?? 'That passkey could not be used.');
    } finally {
      setPasskeyBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await login({
        variables: { email, password, turnstileToken: botToken || undefined, totp: totp || undefined },
      });
      land(data.companyLogin);
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
          <BackHome />
          <div className="cl-logo">
            <Wordmark size={20} textClassName="cl-brand" />
            <span className="cl-logo-tag">COMPANY</span>
          </div>
          <h1 className="cl-title">Sign in</h1>
          <p className="cl-sub">Access your company dashboard</p>
          <form {...formProps} onSubmit={handleSubmit} className="cl-form">
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
              <>
                <div className="cl-field">
                  <label className="cl-label" htmlFor="cl-totp">Authentication code</label>
                  <TotpInput id="cl-totp" className="cl-input" value={totp} onChange={setTotp} autoFocus />
                  <p className="cl-hint">
                    From your authenticator app. Lost your phone? Use one of your recovery codes.
                  </p>
                </div>
                {/* Offered alongside, not instead: an account may have either or
                    both, and the server decides which it will accept. */}
                <button
                  className="cl-passkey" type="button"
                  onClick={() => void signInWithPasskey()} disabled={passkeyBusy}
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="7.5" cy="8" r="3.5" /><path d="M11 8h6M14.5 8v3" />
                    <path d="M2.5 17c0-2.6 2.2-4.5 5-4.5s5 1.9 5 4.5" />
                  </svg>
                  {passkeyBusy ? 'Waiting for your device…' : 'Use a passkey instead'}
                </button>
              </>
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
  html, body { background: #0f0f10; font-family: 'Inter', system-ui, sans-serif; }
  .cl-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #0f0f10; padding: 1.5rem;
  }
  .cl-card {
    background: linear-gradient(160deg, #1a1a1c, #141415); border: 1px solid rgba(255,255,255,0.09);
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
  .cl-sub { font-size: 13px; color: #8a8a8f; margin-bottom: 2rem; }
  .cl-form { display: flex; flex-direction: column; gap: 1rem; }
  .cl-field { display: flex; flex-direction: column; gap: 6px; }
  .cl-hint { font-size: 11px; line-height: 1.5; color: #8a8a8f; }
  .cl-passkey {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
    color: #5b9cf6; background: rgba(91,156,246,0.08);
    border: 1px solid rgba(91,156,246,0.3); border-radius: 10px;
    /* 44px tall, so it is a comfortable target on a phone. */
    padding: 12px 16px; width: 100%;
    transition: background 160ms ease-out;
  }
  .cl-passkey:hover:not(:disabled) { background: rgba(91,156,246,0.16); }
  .cl-passkey:focus-visible { outline: 2px solid #5b9cf6; outline-offset: 2px; }
  .cl-passkey:disabled { opacity: 0.5; cursor: not-allowed; }
  @media (prefers-reduced-motion: reduce) { .cl-passkey { transition: none; } }
  .cl-label { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #8a8a8f; }
  .cl-input {
    font-family: inherit; font-size: 13px; color: #f0f2f8;
    background: #0d0d0e; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
    padding: 10px 14px; outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .cl-input:focus { border-color: #5b9cf6; box-shadow: 0 0 0 3px rgba(91,156,246,0.15); }
  .cl-forgot { font-size: 12px; text-align: right; margin-top: -4px; }
  .cl-forgot a { color: #8a8a8f; text-decoration: none; }
  .cl-forgot a:hover { color: #5b9cf6; }
  .cl-error {
    background: rgba(240,78,94,0.1); border: 1px solid rgba(240,78,94,0.25);
    border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #f04e5e;
  }
  .cl-btn {
    font-family: inherit; font-size: 13px; font-weight: 600; color: #0f0f10;
    background: #5b9cf6; border: none; border-radius: 10px; padding: 12px;
    cursor: pointer; transition: transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 8px 24px rgba(91,156,246,0.18);
    margin-top: 0.25rem;
  }
  .cl-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(91,156,246,0.26); }
  .cl-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .cl-footer-link { font-size: 12px; color: #8a8a8f; text-align: center; margin-top: 1.5rem; }
  .cl-footer-link a { color: #5b9cf6; text-decoration: none; }
  .cl-footer-link a:hover { text-decoration: underline; }
`;
