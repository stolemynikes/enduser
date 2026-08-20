import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useDocumentTitle } from '../src/lib/useDocumentTitle.ts';
import { authStyles } from '../src/lib/authStyles.ts';

const REQUEST_RESET = gql`
  mutation RequestPasswordReset($email: String!) { requestPasswordReset(email: $email) }
`;

export default function ForgotPassword() {
  useDocumentTitle('Reset your password');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const [request, { loading }] = useMutation<any>(REQUEST_RESET, {
    onCompleted: () => setSent(true),
    onError: (e: Error) => setError(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    request({ variables: { email: email.trim() } });
  };

  return (
    <>
      <style>{authStyles}</style>
      <div className="au-wrap">
        <div className="au-card">
          <div className="au-logo">
            <span className="au-brand">eu<span className="au-brand-accent">statement</span></span>
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
