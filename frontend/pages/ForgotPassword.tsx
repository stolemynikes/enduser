import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useDocumentTitle } from '../src/lib/useDocumentTitle.ts';
import { authStyles } from '../src/lib/authStyles.ts';
import { Wordmark } from '../src/components/Mark.tsx';
import { Turnstile } from '../src/components/Turnstile.tsx';

const REQUEST_RESET = gql`
  mutation RequestPasswordReset($email: String!, $turnstileToken: String) { requestPasswordReset(email: $email, turnstileToken: $turnstileToken) }
`;

export default function ForgotPassword() {
  useDocumentTitle('Reset your password');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [botToken, setBotToken] = useState('');
  const [error, setError] = useState('');

  const [request, { loading }] = useMutation<any>(REQUEST_RESET, {
    onCompleted: () => setSent(true),
    onError: (e: Error) => setError(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    request({ variables: { email: email.trim(), turnstileToken: botToken || undefined } });
  };

  return (
    <>
      <style>{authStyles}</style>
      <div className="au-wrap">
        <div className="au-card">
          <div className="au-logo">
            <Wordmark size={20} textClassName="au-brand" accentClassName="au-brand-accent" />
          </div>
          {sent ? (
            <>
              <h1 className="au-title">Check your inbox</h1>
              {/* Deliberately the same answer whether or not an account exists —
                  this page must not reveal who has one. */}
              <p className="au-sub">
                If an account exists for <b>{email.trim()}</b>, a link to set a new password is on
                its way. It works once and expires in an hour.
              </p>
              <a className="au-link-btn" href="/login">Back to sign in</a>
            </>
          ) : (
            <>
              <h1 className="au-title">Reset your password</h1>
              <p className="au-sub">We'll email you a link to set a new one.</p>
              <form onSubmit={submit} className="au-form">
                <div className="au-field">
                  <label className="au-label" htmlFor="fp-email">Email</label>
                  <input id="fp-email" className="au-input" type="email" value={email}
                    onChange={e => setEmail(e.target.value)} required autoComplete="email" autoFocus />
                </div>
                <Turnstile onToken={setBotToken} theme="dark" />
                {error && <div className="au-error" role="alert">{error}</div>}
                <button className="au-btn" type="submit" disabled={loading || !email.trim()}>
                  {loading ? 'Sending…' : 'Send the link'}
                </button>
              </form>
              <p className="au-footer-link"><a href="/login">Back to sign in</a></p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
