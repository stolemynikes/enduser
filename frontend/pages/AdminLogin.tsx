import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { useFieldValidation } from '../src/lib/useFieldValidation.ts';
import { PasswordInput } from '../src/components/PasswordInput.tsx';
import { useDocumentTitle } from '../src/lib/useDocumentTitle.ts';
import { Wordmark } from '../src/components/Mark.tsx';
import { Turnstile } from '../src/components/Turnstile.tsx';
import { TotpInput } from '../src/components/TotpInput.tsx';
import { mfaSignal } from '../src/lib/mfaError.ts';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

const ADMIN_LOGIN = gql`
  mutation AdminLogin($username: String!, $password: String!, $turnstileToken: String, $totp: String) {
    adminLogin(username: $username, password: $password, turnstileToken: $turnstileToken, totp: $totp) {
      token
    }
  }
`;

export default function AdminLogin() {
  const { formProps } = useFieldValidation();
  useDocumentTitle('Admin sign in — eustatement');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [botToken, setBotToken] = useState('');
  // Shown only once the server says the password was right and a code is due,
  // so the form never reveals which accounts have a second factor.
  const [totp, setTotp] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState(
    new URLSearchParams(window.location.search).has('expired')
      ? 'Your session expired — please sign in again.'
      : ''
  );
  const navigate = useNavigate();
  const [login, { loading }] = useMutation<any>(ADMIN_LOGIN);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await login({
        variables: { username, password, turnstileToken: botToken || undefined, totp: totp || undefined },
      });
      localStorage.setItem('adminToken', data.adminLogin.token);
      navigate('/admin/dashboard');
    } catch (err: any) {
      const signal = mfaSignal(err);
      if (signal) {
        // The password was accepted; only the code is outstanding.
        setNeedsTotp(true);
        setTotp('');
        setError(signal === 'required' ? '' : 'That code is not valid. Try the next one your app shows.');
        return;
      }
      setNeedsTotp(false);
      // Everything that is not a code problem stays one message, so a wrong
      // username and a wrong password cannot be told apart from out here.
      setError('Invalid username or password.');
    }
  };

  return (
    <>
      <style>{loginStyles}</style>
      <div className="al-wrap">
        <div className="al-card">
          <Wordmark size={20} textClassName="al-brand" />
          <div className="al-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#5b9cf6" strokeWidth="1.8" width="22" height="22">
              <rect x="3" y="11" width="18" height="11" rx="2" strokeLinecap="round"/>
              <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="al-title">Welcome back</h1>
          <p className="al-sub">Sign in to the End-User Statement review dashboard</p>

          <form {...formProps} className="al-form" onSubmit={handleSubmit}>
            <div className="al-field">
              <label className="al-label" htmlFor="username">Username</label>
              <input className="al-input" id="username" type="text" value={username}
                onChange={e => setUsername(e.target.value)} required autoFocus autoComplete="username" />
            </div>
            <div className="al-field">
              <label className="al-label" htmlFor="password">Password</label>
              <PasswordInput className="al-input" id="password" value={password}
                onChange={setPassword} required autoComplete="current-password" />
            </div>
            {needsTotp && (
              <div className="al-field">
                <label className="al-label" htmlFor="al-totp">Authentication code</label>
                <TotpInput id="al-totp" className="al-input" value={totp} onChange={setTotp} autoFocus />
                <p className="al-hint">
                  From your authenticator app, or one of your recovery codes.
                </p>
              </div>
            )}
            <Turnstile onToken={setBotToken} theme="dark" />
            {error && <div className="al-error" role="alert">{error}</div>}
            <button className="al-btn" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : needsTotp ? 'Verify and sign in' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

const loginStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0f0f10; --surface: #1c1c1e; --surface2: #0d0d0e;
    --border: rgba(255,255,255,0.07); --border2: rgba(255,255,255,0.12);
    --text: #f0f2f8; --text-mid: #9a9a9f; --text-dim: #5e5e63;
    --accent: #f04e5e; --blue: #5b9cf6;
    --ease: cubic-bezier(0.4,0,0.2,1);
  }
  html, body { background: var(--bg); margin: 0; }
  .al-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', system-ui, sans-serif; background: var(--bg);
  }
  .al-card {
    background: linear-gradient(160deg, #1a1a1c, #141415); border: 1px solid rgba(255,255,255,0.09); border-radius: 20px;
    padding: 2.75rem 2.25rem; width: 400px; max-width: calc(100vw - 3rem); text-align: center;
    box-shadow: 0 24px 64px rgba(0,0,0,0.5); box-sizing: border-box;
  }
  .al-brand { display: block; font-size: 14px; font-weight: 800; letter-spacing: -0.02em; color: var(--text); margin-bottom: 1.25rem; }
  .al-brand-accent { color: var(--blue); }
  @media (max-width: 480px) {
    .al-card { padding: 2rem 1.5rem; border-radius: 16px; }
    .al-sub { font-size: 11px; }
  }
  .al-icon {
    width: 48px; height: 48px; border-radius: 14px;
    background: rgba(91,156,246,0.1); border: 1px solid rgba(91,156,246,0.22);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 1.5rem; font-size: 20px;
  }
  .al-title {
    font-size: 1.375rem; font-weight: 700; color: var(--text);
    margin-bottom: 0.35rem; letter-spacing: -0.02em;
  }
  .al-sub { font-size: 12px; color: var(--text-dim); margin-bottom: 2rem; line-height: 1.5; overflow-wrap: break-word; }
  .al-form { display: flex; flex-direction: column; gap: 1rem; text-align: left; }
  .al-field { display: flex; flex-direction: column; gap: 6px; }
  .al-hint { font-size: 11px; line-height: 1.5; color: var(--text-dim); }
  .al-label { font-size: 12px; font-weight: 500; color: var(--text-mid); }
  .al-input {
    font-family: 'Inter', sans-serif; font-size: 14px; color: var(--text);
    background: var(--surface2); border: 1px solid var(--border2); border-radius: 10px;
    padding: 11px 14px; outline: none; width: 100%;
    transition: border-color 0.2s var(--ease), box-shadow 0.2s var(--ease);
  }
  .al-input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(91,156,246,0.15); }
  .al-error {
    background: rgba(240,78,94,0.08); border: 1px solid rgba(240,78,94,0.25);
    border-radius: 10px; padding: 0.75rem 1rem; font-size: 12.5px; color: var(--accent);
    text-align: left;
  }
  .al-btn {
    font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
    color: #0f0f10; background: #5b9cf6; border: none; border-radius: 10px;
    padding: 13px; cursor: pointer; transition: transform 0.15s var(--ease), box-shadow 0.2s var(--ease);
    box-shadow: 0 8px 24px rgba(91,156,246,0.18);
    margin-top: 0.25rem;
  }
  .al-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(91,156,246,0.26); }
  .al-btn:active:not(:disabled) { transform: scale(0.99); }
  .al-btn:disabled { opacity: 0.35; cursor: not-allowed; }
`;
