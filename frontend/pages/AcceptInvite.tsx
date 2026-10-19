import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFieldValidation } from '../src/lib/useFieldValidation.ts';
import { PasswordInput } from '../src/components/PasswordInput.tsx';
import { useDocumentTitle } from '../src/lib/useDocumentTitle.ts';
import { Wordmark } from '../src/components/Mark.tsx';
import { BackHome } from '../src/components/BackHome.tsx';

const ACCEPT_INVITE = gql`
  mutation AcceptInvite($token: String!, $name: String!, $password: String!) {
    acceptInvite(token: $token, name: $name, password: $password) {
      token
      role
      company { id name slug }
    }
  }
`;

const ACCEPT_SIGNED_IN = gql`
  mutation AcceptInviteSignedIn($token: String!) {
    acceptInviteSignedIn(token: $token) { token role company { id name slug } }
  }
`;

export default function AcceptInvite() {
  const { formProps } = useFieldValidation();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  useDocumentTitle('Accept invitation — eustatement');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [accept, { loading }] = useMutation<any>(ACCEPT_INVITE);
  // An existing account joins from its own session, after a normal sign-in.
  const [ignoreSession, setIgnoreSession] = useState(false);
  const stored = typeof window !== 'undefined' ? localStorage.getItem('companyToken') : null;
  const signedIn = ignoreSession ? null : stored;
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [acceptSignedIn, { loading: joining }] = useMutation<any>(ACCEPT_SIGNED_IN, {
    context: { headers: { authorization: signedIn ? `Bearer ${signedIn}` : '' } },
  });

  const land = (payload: { token: string; role: string; company: { name: string; slug: string } }) => {
    localStorage.setItem('companyToken', payload.token);
    localStorage.setItem('companyRole', payload.role);
    localStorage.setItem('companyName', payload.company.name);
    localStorage.setItem('companySlug', payload.company.slug);
    navigate('/company/dashboard');
  };

  const joinSignedIn = async () => {
    setError('');
    try {
      const { data } = await acceptSignedIn({ variables: { token } });
      land(data.acceptInviteSignedIn);
    } catch (err: any) {
      setError(err?.message ?? 'Could not accept the invitation.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    try {
      const { data } = await accept({ variables: { token, name, password } });
      land(data.acceptInvite);
    } catch (err: any) {
      const code = err?.errors?.[0]?.extensions?.code;
      if (code === 'SIGN_IN_TO_ACCEPT') { setNeedsSignIn(true); setPassword(''); return; }
      setError(err?.message ?? 'Could not accept invite');
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="ai-wrap">
        <div className="ai-card">
          <BackHome />
          <div className="ai-logo">
            <Wordmark size={20} textClassName="ai-brand" />
            <span className="ai-logo-tag">INVITATION</span>
          </div>
          <h1 className="ai-title">Accept invitation</h1>
          {(needsSignIn || signedIn) ? (
            <div className="ai-form">
              <p className="ai-sub" style={{ marginBottom: 0 }}>
                {signedIn
                  ? 'Join with the account you are signed in to. The invitation must be for that account’s email address.'
                  : 'You already have an account with this email address. Sign in with it — including your second factor — and you will come back here to join.'}
              </p>
              {error && <div className="ai-error" role="alert">{error}</div>}
              {signedIn ? (
                <>
                  <button className="ai-btn" type="button" disabled={joining} onClick={() => void joinSignedIn()}>
                    {joining ? 'Joining…' : 'Join team'}
                  </button>
                  <button className="ai-link" type="button" onClick={() => { setIgnoreSession(true); setError(''); }}>
                    The invitation is for another address — create an account for it instead
                  </button>
                </>
              ) : (
                <button className="ai-btn" type="button" onClick={() => navigate(`/login?next=${encodeURIComponent(`/invite/${token}`)}`)}>
                  Sign in to accept
                </button>
              )}
            </div>
          ) : (<>
          <p className="ai-sub">Set up your account to join your team's dashboard.</p>
          <form {...formProps} onSubmit={handleSubmit} className="ai-form">
            <div className="ai-field">
              <label className="ai-label">Your Name</label>
              <input className="ai-input" type="text" value={name}
                onChange={e => setName(e.target.value)} required autoFocus autoComplete="name" />
            </div>
            <div className="ai-field">
              <label className="ai-label">Choose a Password</label>
              <PasswordInput className="ai-input" value={password}
                onChange={setPassword} required minLength={8} autoComplete="new-password" />
              <span className="ai-hint">Minimum 8 characters</span>
            </div>
            {error && <div className="ai-error" role="alert">{error}</div>}
            <button className="ai-btn" type="submit" disabled={loading}>
              {loading ? 'Joining…' : 'Join team'}
            </button>
          </form>
          </>)}
        </div>
      </div>
    </>
  );
}

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #0f0f10; font-family: 'Inter', system-ui, sans-serif; }
  .ai-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #0f0f10; padding: 1.5rem;
  }
  .ai-card {
    background: linear-gradient(160deg, #1a1a1c, #141415); border: 1px solid rgba(255,255,255,0.09);
    border-radius: 16px; padding: 2.5rem 2rem; width: 100%; max-width: 400px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  }
  .ai-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 1.5rem; }
  .ai-brand { font-size: 14px; font-weight: 800; letter-spacing: -0.02em; color: #f0f2f8; }
  .ai-brand-accent { color: #5b9cf6; }
  .ai-logo-tag {
    font-size: 9px; font-weight: 600; letter-spacing: 0.18em;
    color: #3ecf8e; background: rgba(62,207,142,0.1); border: 1px solid rgba(62,207,142,0.25);
    padding: 3px 10px; border-radius: 100px; text-transform: uppercase;
  }
  .ai-title { font-size: 22px; font-weight: 600; color: #f0f2f8; margin-bottom: 6px; }
  .ai-sub { font-size: 13px; color: #8a8a8f; margin-bottom: 2rem; }
  .ai-form { display: flex; flex-direction: column; gap: 1rem; }
  .ai-field { display: flex; flex-direction: column; gap: 6px; }
  .ai-label { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #8a8a8f; }
  .ai-link { background: none; border: 0; padding: 6px 0; color: #8fbcff; font: inherit; font-size: 12.5px; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; text-align: left; }
  .ai-link:focus-visible { outline: 2px solid #5b9cf6; outline-offset: 2px; }
  .ai-hint { font-size: 11px; color: #5e5e63; font-style: italic; }
  .ai-input {
    font-family: inherit; font-size: 13px; color: #f0f2f8;
    background: #0d0d0e; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
    padding: 10px 14px; outline: none; transition: border-color 0.2s, box-shadow 0.2s;
  }
  .ai-input:focus { border-color: #5b9cf6; box-shadow: 0 0 0 3px rgba(91,156,246,0.15); }
  .ai-error {
    background: rgba(240,78,94,0.1); border: 1px solid rgba(240,78,94,0.25);
    border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #f04e5e;
  }
  .ai-btn {
    font-family: inherit; font-size: 13px; font-weight: 600; color: #0f0f10;
    background: #5b9cf6; border: none; border-radius: 10px; padding: 12px;
    cursor: pointer; transition: transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 8px 24px rgba(91,156,246,0.18);
    margin-top: 0.25rem;
  }
  .ai-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(91,156,246,0.26); }
  .ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }
`;
