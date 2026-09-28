import { useEffect, useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useParams } from 'react-router-dom';
import { useDocumentTitle } from '../src/lib/useDocumentTitle.ts';
import { authStyles } from '../src/lib/authStyles.ts';
import { Wordmark } from '../src/components/Mark.tsx';

const VERIFY = gql`mutation VerifyEmail($token: String!) { verifyEmail(token: $token) }`;

export default function VerifyEmail() {
  useDocumentTitle('Confirm your email');
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<'working' | 'done' | 'failed'>('working');
  const [error, setError] = useState('');

  const [verify] = useMutation<any>(VERIFY, {
    onCompleted: () => setState('done'),
    onError: (e: Error) => { setError(e.message); setState('failed'); },
  });

  useEffect(() => {
    if (token) verify({ variables: { token } });
  }, [token, verify]);

  return (
    <>
      <style>{authStyles}</style>
      <div className="au-wrap">
        <div className="au-card">
          <div className="au-logo">
            <Wordmark size={20} textClassName="au-brand" accentClassName="au-brand-accent" />
          </div>
          {state === 'working' && <><h1 className="au-title">Confirming…</h1><p className="au-sub">One moment.</p></>}
          {state === 'done' && (
            <>
              <h1 className="au-title">Email confirmed</h1>
              <p className="au-sub">Thanks — decisions, invitations and password resets will reach you.</p>
              <a className="au-link-btn" href="/company/dashboard">Go to the dashboard</a>
            </>
          )}
          {state === 'failed' && (
            <>
              <h1 className="au-title">That link didn't work</h1>
              <p className="au-sub">{error}</p>
              <a className="au-link-btn" href="/company/dashboard">Go to the dashboard</a>
            </>
          )}
        </div>
      </div>
    </>
  );
}
