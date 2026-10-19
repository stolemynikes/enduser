// Turning the second factor on, and off again.
//
// Three states in one panel: off, mid-enrolment, on. Enrolment is deliberately
// two steps — scan, then prove a code works — because switching the factor on
// the moment a secret is shown is how people lock themselves out of their own
// account. The recovery codes appear once, on the screen that created them, and
// the panel says so before it shows them.
import { useState } from 'react';
import { gql } from '@apollo/client';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { passkeyProof, stepUpNeeded } from '../lib/stepUp.ts';
import { TotpInput } from './TotpInput.tsx';
import { mfaSignal } from '../lib/mfaError.ts';

// The same four steps exist for a company user and for a platform admin; only
// the operations and where the renewed token is kept differ.
const OPS = {
  company: {
    START: gql`mutation StartMfa($proof: String) { startMfaEnrolment(proof: $proof) { secret otpauthUri qrSvg } }`,
    CONFIRM: gql`mutation ConfirmMfa($code: String!) { confirmMfaEnrolment(code: $code) { recoveryCodes token } }`,
    DISABLE: gql`mutation DisableMfa($password: String!, $code: String!) { disableMfa(password: $password, code: $code) }`,
    REGENERATE: gql`mutation RegenerateCodes($code: String!) { regenerateRecoveryCodes(code: $code) { recoveryCodes } }`,
    started: 'startMfaEnrolment', confirmed: 'confirmMfaEnrolment', regenerated: 'regenerateRecoveryCodes',
    tokenKey: 'companyToken', signIn: '/login',
    signOutKeys: ['companyToken', 'companyRole', 'companyName', 'companySlug', 'supportMode'],
  },
  admin: {
    START: gql`mutation StartAdminMfa($proof: String) { startAdminMfaEnrolment(proof: $proof) { secret otpauthUri qrSvg } }`,
    CONFIRM: gql`mutation ConfirmAdminMfa($code: String!) { confirmAdminMfaEnrolment(code: $code) { recoveryCodes token } }`,
    DISABLE: gql`mutation DisableAdminMfa($password: String!, $code: String!) { disableAdminMfa(password: $password, code: $code) }`,
    REGENERATE: gql`mutation RegenerateAdminCodes($code: String!) { regenerateAdminRecoveryCodes(code: $code) { recoveryCodes } }`,
    started: 'startAdminMfaEnrolment', confirmed: 'confirmAdminMfaEnrolment', regenerated: 'regenerateAdminRecoveryCodes',
    tokenKey: 'adminToken', signIn: '/admin',
    signOutKeys: ['adminToken'],
  },
} as const;

type Enrolment = { secret: string; otpauthUri: string; qrSvg: string };

export function MfaSettings({
  account = 'company',
  enabled,
  recoveryCodesLeft,
  onChanged,
}: {
  /** Whose second factor: a company user's (default) or the platform admin's. */
  account?: 'company' | 'admin';
  enabled: boolean;
  recoveryCodesLeft: number;
  onChanged: () => void;
}) {
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [mode, setMode] = useState<'idle' | 'disabling' | 'regenerating'>('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const ops = OPS[account];
  const client = useApolloClient();
  const [start, { loading: starting }] = useMutation<any>(ops.START);
  const [confirm, { loading: confirming }] = useMutation<any>(ops.CONFIRM);
  const [disable, { loading: disabling }] = useMutation<any>(ops.DISABLE);
  const [regenerate, { loading: regenerating }] = useMutation<any>(ops.REGENERATE);

  const busy = starting || confirming || disabling || regenerating;

  const reset = () => {
    setEnrolment(null); setCode(''); setPassword('');
    setMode('idle'); setError('');
  };

  const describe = (err: unknown, fallback: string) =>
    mfaSignal(err) === 'invalid'
      ? 'That code is not valid. Try the next one your app shows.'
      : ((err as { message?: string })?.message ?? fallback);

  const begin = async () => {
    setError('');
    try {
      let data: any;
      try {
        ({ data } = await start({ variables: { proof: null } }));
      } catch (err) {
        // An account that already signs in with a passkey proves it with that
        // passkey before an app is added (lib/stepUp.ts).
        if (stepUpNeeded(err) !== 'passkey') throw err;
        const proof = await passkeyProof(client, account);
        ({ data } = await start({ variables: { proof } }));
      }
      setEnrolment(data[ops.started]);
      setCode('');
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') return;
      setError(describe(err, 'Could not start the set-up.'));
    }
  };

  const finish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await confirm({ variables: { code } });
      // Enabling ended every session, this one included. The server hands back
      // a replacement; without storing it the next request would be refused
      // and the person would be signed out by the act of securing the account.
      if (data[ops.confirmed].token) {
        localStorage.setItem(ops.tokenKey, data[ops.confirmed].token);
      }
      setCodes(data[ops.confirmed].recoveryCodes);
      setEnrolment(null);
      setCode('');
      onChanged();
    } catch (err) { setError(describe(err, 'Could not complete the set-up.')); }
  };

  const turnOff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await disable({ variables: { password, code } });
      // Turning it off signs the account out everywhere, this tab included —
      // removing the factor is the first thing an intruder with a stolen
      // session would do, so the password is needed to come back.
      ops.signOutKeys.forEach(k => localStorage.removeItem(k));
      window.location.href = ops.signIn;
    } catch (err) { setError(describe(err, 'Could not turn it off.')); }
  };

  const newCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await regenerate({ variables: { code } });
      setCodes(data[ops.regenerated].recoveryCodes);
      reset();
      onChanged();
    } catch (err) { setError(describe(err, 'Could not replace the codes.')); }
  };

  // --- Recovery codes, shown once -------------------------------------------
  if (codes) {
    return (
      <div className="mfa-block mfa-block--codes">
        <style>{styles}</style>
        <h3 className="mfa-title">Save your recovery codes</h3>
        <p className="mfa-lede">
          Each one works once, in place of a code from your app. This is the only time they are
          shown — store them somewhere other than the phone with the app on it.
        </p>
        <p className="mfa-lede">
          Anyone signed in to this account elsewhere has been signed out.
        </p>
        <ul className="mfa-codes">
          {codes.map(c => <li key={c}>{c}</li>)}
        </ul>
        <div className="mfa-actions">
          <button
            className="mfa-btn"
            onClick={() => {
              void navigator.clipboard?.writeText(codes.join('\n'));
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? 'Copied' : 'Copy all'}
          </button>
          <button className="mfa-btn mfa-btn--primary" onClick={() => { setCodes(null); setCopied(false); }}>
            I have saved them
          </button>
        </div>
      </div>
    );
  }

  // --- Mid-enrolment --------------------------------------------------------
  if (enrolment) {
    return (
      <div className="mfa-block">
        <style>{styles}</style>
        <h3 className="mfa-title">Scan this with your authenticator app</h3>
        <p className="mfa-lede">
          Google Authenticator, 1Password, Bitwarden — any of them. Then type the code it shows,
          so we know it worked before this becomes the thing standing between you and your account.
        </p>
        <div className="mfa-enrol">
          <img className="mfa-qr" src={enrolment.qrSvg} alt="QR code for the authenticator app" width={180} height={180} />
          <div className="mfa-manual">
            <p className="mfa-manual-label">Can&rsquo;t scan? Type this key instead</p>
            <code className="mfa-secret">{enrolment.secret}</code>
          </div>
        </div>
        <form className="mfa-form" onSubmit={finish}>
          <label className="mfa-label" htmlFor="mfa-confirm">Code from the app</label>
          <TotpInput
            id="mfa-confirm" className="mfa-input" value={code} onChange={setCode}
            allowRecoveryCode={false} autoFocus disabled={busy}
          />
          {error && <p className="mfa-error" role="alert">{error}</p>}
          <div className="mfa-actions">
            <button className="mfa-btn" type="button" onClick={reset} disabled={busy}>Cancel</button>
            <button className="mfa-btn mfa-btn--primary" type="submit" disabled={busy || code.length < 6}>
              {confirming ? 'Checking…' : 'Turn on two-factor'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- On -------------------------------------------------------------------
  if (enabled) {
    return (
      <div className="mfa-block">
        <style>{styles}</style>
        <div className="mfa-head">
          <h3 className="mfa-title">
            <span className="mfa-on" aria-hidden="true" />
            Two-factor authentication is on
          </h3>
          <p className="mfa-lede">
            Signing in needs a code from your app as well as your password.
          </p>
        </div>

        <p className={`mfa-count${recoveryCodesLeft <= 2 ? ' mfa-count--low' : ''}`}>
          {recoveryCodesLeft === 0
            ? 'No recovery codes left — generate a new set before you lose access to your app.'
            : `${recoveryCodesLeft} recovery code${recoveryCodesLeft === 1 ? '' : 's'} left.`}
        </p>

        {mode === 'idle' && (
          <div className="mfa-actions">
            <button className="mfa-btn" onClick={() => { setMode('regenerating'); setCode(''); setError(''); }}>
              New recovery codes
            </button>
            <button className="mfa-btn mfa-btn--danger" onClick={() => { setMode('disabling'); setCode(''); setPassword(''); setError(''); }}>
              Turn off
            </button>
          </div>
        )}

        {mode === 'regenerating' && (
          <form className="mfa-form" onSubmit={newCodes}>
            <p className="mfa-lede">
              A new set replaces every code you have left. The old ones stop working.
            </p>
            <label className="mfa-label" htmlFor="mfa-regen">Code from the app</label>
            <TotpInput id="mfa-regen" className="mfa-input" value={code} onChange={setCode}
              allowRecoveryCode={false} autoFocus disabled={busy} />
            {error && <p className="mfa-error" role="alert">{error}</p>}
            <div className="mfa-actions">
              <button className="mfa-btn" type="button" onClick={reset} disabled={busy}>Cancel</button>
              <button className="mfa-btn mfa-btn--primary" type="submit" disabled={busy || code.length < 6}>
                {regenerating ? 'Replacing…' : 'Replace the codes'}
              </button>
            </div>
          </form>
        )}

        {mode === 'disabling' && (
          <form className="mfa-form" onSubmit={turnOff}>
            <p className="mfa-lede">
              Your password and a current code, both — otherwise a stolen session would be enough
              to remove the thing protecting it.
            </p>
            <label className="mfa-label" htmlFor="mfa-pw">Your password</label>
            <input id="mfa-pw" className="mfa-input" type="password" value={password}
              onChange={e => setPassword(e.target.value)} autoComplete="current-password"
              required disabled={busy} />
            <label className="mfa-label" htmlFor="mfa-off-code">Code from the app</label>
            <TotpInput id="mfa-off-code" className="mfa-input" value={code} onChange={setCode}
              allowRecoveryCode={false} disabled={busy} />
            {error && <p className="mfa-error" role="alert">{error}</p>}
            <div className="mfa-actions">
              <button className="mfa-btn" type="button" onClick={reset} disabled={busy}>Keep it on</button>
              <button className="mfa-btn mfa-btn--danger" type="submit" disabled={busy || !password || code.length < 6}>
                {disabling ? 'Turning off…' : 'Turn off two-factor'}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  // --- Off ------------------------------------------------------------------
  return (
    <div className="mfa-block">
      <style>{styles}</style>
      <h3 className="mfa-title">Two-factor authentication</h3>
      <p className="mfa-lede">
        A code from your phone on top of your password. Worth the thirty seconds: your account can
        read every buyer&rsquo;s details {account === 'admin' ? 'on the whole platform' : 'in this company'}, so a
        password on its own is the one thing between a phishing email and all of it.
      </p>
      {error && <p className="mfa-error" role="alert">{error}</p>}
      <div className="mfa-actions">
        <button className="mfa-btn mfa-btn--primary" onClick={() => void begin()} disabled={busy}>
          {starting ? 'Preparing…' : 'Set it up'}
        </button>
      </div>
    </div>
  );
}

const styles = `
  .mfa-block {
    border: 1px solid var(--cd-border); background: var(--cd-surface2);
    border-radius: var(--cd-r); padding: 18px 20px;
    display: flex; flex-direction: column; gap: 12px;
  }
  .mfa-block--codes { border-color: rgba(245,166,35,0.35); background: rgba(245,166,35,0.06); }
  .mfa-head { display: flex; flex-direction: column; gap: 6px; }
  .mfa-title {
    margin: 0; font-size: 13px; font-weight: 700; color: var(--cd-text);
    display: flex; align-items: center; gap: 8px;
  }
  .mfa-on {
    width: 7px; height: 7px; border-radius: 50%; background: var(--cd-green);
    box-shadow: 0 0 0 3px rgba(62,207,142,0.18);
  }
  .mfa-lede { margin: 0; font-size: 12px; line-height: 1.6; color: var(--cd-text-mid); max-width: 62ch; }
  .mfa-count { margin: 0; font-size: 12px; color: var(--cd-text-mid); }
  .mfa-count--low { color: var(--cd-amber); font-weight: 600; }

  .mfa-enrol { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
  .mfa-qr { border-radius: var(--cd-r-sm); background: #fff; padding: 8px; flex: 0 0 auto; }
  .mfa-manual { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .mfa-manual-label {
    margin: 0; font-size: 10px; font-weight: 600; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--cd-text-dim);
  }
  .mfa-secret {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px;
    letter-spacing: 0.08em; color: var(--cd-text); word-break: break-all;
    background: var(--cd-surface3); border: 1px solid var(--cd-border);
    border-radius: var(--cd-r-sm); padding: 8px 10px;
  }

  .mfa-form { display: flex; flex-direction: column; gap: 8px; }
  .mfa-label {
    font-size: 10px; font-weight: 600; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--cd-text-dim);
  }
  .mfa-input {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 15px; letter-spacing: 0.14em;
    background: var(--cd-surface3); color: var(--cd-text);
    border: 1px solid var(--cd-border2); border-radius: var(--cd-r-sm);
    /* 44px, so this is a comfortable target on a phone. */
    padding: 11px 12px; max-width: 260px;
  }
  .mfa-input:focus-visible { outline: 2px solid var(--cd-blue); outline-offset: 1px; }
  .mfa-input::placeholder { letter-spacing: 0; font-size: 12px; color: var(--cd-text-dim); }
  .mfa-error { margin: 0; font-size: 12px; line-height: 1.5; color: var(--cd-accent); }

  .mfa-codes {
    list-style: none; margin: 0; padding: 0;
    display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 6px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px; letter-spacing: 0.06em; color: var(--cd-text);
  }
  .mfa-codes li {
    background: var(--cd-surface3); border: 1px solid var(--cd-border);
    border-radius: var(--cd-r-sm); padding: 7px 9px; text-align: center;
  }

  .mfa-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .mfa-btn {
    font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
    color: var(--cd-text-mid); background: var(--cd-surface);
    border: 1px solid var(--cd-border2); border-radius: var(--cd-r-pill);
    /* Keeps the control at a comfortable height without a fixed size. */
    padding: 9px 16px;
    transition: background 160ms ease-out, color 160ms ease-out, border-color 160ms ease-out;
  }
  .mfa-btn:hover:not(:disabled) { color: var(--cd-text); background: var(--cd-surface3); }
  .mfa-btn:focus-visible { outline: 2px solid var(--cd-blue); outline-offset: 1px; }
  .mfa-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .mfa-btn--primary { color: #fff; background: var(--cd-blue); border-color: var(--cd-blue); }
  .mfa-btn--primary:hover:not(:disabled) { color: #fff; background: #4a8ae6; border-color: #4a8ae6; }
  .mfa-btn--danger { color: var(--cd-accent); border-color: rgba(240,78,94,0.35); }
  .mfa-btn--danger:hover:not(:disabled) { color: #fff; background: var(--cd-accent); border-color: var(--cd-accent); }

  @media (prefers-reduced-motion: reduce) { .mfa-btn { transition: none; } }
`;
