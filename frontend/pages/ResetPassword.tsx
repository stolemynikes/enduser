import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useParams } from 'react-router-dom';
import { PasswordInput } from '../src/components/PasswordInput.tsx';
import { useDocumentTitle } from '../src/lib/useDocumentTitle.ts';
import { authStyles } from '../src/lib/authStyles.ts';
import { Wordmark } from '../src/components/Mark.tsx';

const RESET = gql`
  mutation ResetPassword($token: String!, $password: String!) { resetPassword(token: $token, password: $password) }
`;

export default function ResetPassword() {
  useDocumentTitle('Set a new password');
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const [reset, { loading }] = useMutation<any>(RESET, {
    onCompleted: () => setDone(true),
    onError: (e: Error) => setError(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirm) { setError('The two passwords do not match.'); return; }
    setError('');
    reset({ variables: { token, password } });
  };

  return (
    <>
      <style>{authStyles}</style>
      <div className="au-wrap">
        <div className="au-card">
          <div className="au-logo">
            <Wordmark size={20} textClassName="au-brand" accentClassName="au-brand-accent" />
          </div>
          {done ? (
            <>
              <h1 className="au-title">Password changed</h1>
              <p className="au-sub">You can sign in with your new password now.</p>
              <a className="au-link-btn" href="/login">Sign in</a>
            </>
          ) : (
            <>
              <h1 className="au-title">Set a new password</h1>
              <p className="au-sub">At least 8 characters.</p>
              <form onSubmit={submit} className="au-form">
                <div className="au-field">
                  <label className="au-label" htmlFor="rp-pw">New password</label>
                  <PasswordInput id="rp-pw" className="au-input" value={password}
                    onChange={setPassword} required autoComplete="new-password" />
                </div>
                <div className="au-field">
                  <label className="au-label" htmlFor="rp-pw2">Confirm password</label>
                  <PasswordInput id="rp-pw2" className="au-input" value={confirm}
                    onChange={setConfirm} required autoComplete="new-password" />
                </div>
                {error && <div className="au-error" role="alert">{error}</div>}
                <button className="au-btn" type="submit" disabled={loading}>
                  {loading ? 'Saving…' : 'Save new password'}
                </button>
              </form>
              <p className="au-footer-link"><a href="/forgot">Request a new link</a></p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
