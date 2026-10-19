// Passkeys on the account screen: enrol a device, name it, remove it.
//
// Presented above the authenticator-app panel on purpose. A passkey is the
// stronger of the two — it cannot be handed to a look-alike site, because the
// browser refuses to sign for a domain that is not the real one — so it is the
// one a person should be nudged towards, with the app as the fallback for a
// device that has no authenticator.
//
// UX rules this follows deliberately:
//   - the recommendation is stated in plain terms rather than left to a badge
//   - a browser that cannot do this says so before the button is pressed,
//     rather than failing after
//   - the name field is filled with a sensible guess, because "Passkey 2" is
//     what people end up with otherwise and it tells them nothing later
//   - a destructive remove is confirmed, and the last factor cannot be removed
//   - every async action has a pending, a success and a specific failure state
import { useState } from 'react';
import { gql } from '@apollo/client';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { passkeyProof, stepUpNeeded } from '../lib/stepUp.ts';
import { secondFactorMessage } from '../lib/mfaError.ts';
import { TotpInput } from './TotpInput.tsx';
import { startRegistration } from '@simplewebauthn/browser';
import { useConfirm } from './ConfirmDialog.tsx';

// The same steps for a company user and for a platform admin; only the
// operation names differ.
const OPS = {
  company: {
    LIST: gql`query MyPasskeys { myPasskeys { id name createdAt lastUsedAt } }`,
    START: gql`mutation StartPasskeyRegistration($proof: String) { startPasskeyRegistration(proof: $proof) { optionsJson ticket } }`,
    FINISH: gql`
      mutation FinishPasskeyRegistration($ticket: String!, $responseJson: String!, $name: String!) {
        finishPasskeyRegistration(ticket: $ticket, responseJson: $responseJson, name: $name) { id name token }
      }`,
    REMOVE: gql`mutation RemovePasskey($id: ID!, $proof: String) { removePasskey(id: $id, proof: $proof) }`,
    listed: 'myPasskeys', started: 'startPasskeyRegistration', finished: 'finishPasskeyRegistration',
    tokenKey: 'companyToken',
  },
  admin: {
    LIST: gql`query AdminPasskeys { adminPasskeys { id name createdAt lastUsedAt } }`,
    START: gql`mutation StartAdminPasskeyRegistration($proof: String) { startAdminPasskeyRegistration(proof: $proof) { optionsJson ticket } }`,
    FINISH: gql`
      mutation FinishAdminPasskeyRegistration($ticket: String!, $responseJson: String!, $name: String!) {
        finishAdminPasskeyRegistration(ticket: $ticket, responseJson: $responseJson, name: $name) { id name token }
      }`,
    REMOVE: gql`mutation RemoveAdminPasskey($id: ID!, $proof: String) { removeAdminPasskey(id: $id, proof: $proof) }`,
    listed: 'adminPasskeys', started: 'startAdminPasskeyRegistration', finished: 'finishAdminPasskeyRegistration',
    tokenKey: 'adminToken',
  },
} as const;

type Passkey = { id: string; name: string; createdAt: string; lastUsedAt: string | null };

/** A readable default so the list still makes sense in six months. */
function guessDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android phone';
  if (/Mac OS X/.test(ua)) return 'This Mac';
  if (/Windows/.test(ua)) return 'This PC';
  if (/Linux/.test(ua)) return 'This computer';
  return 'This device';
}

export function PasskeySettings({ onChanged, account = 'company' }: {
  onChanged?: () => void;
  /** Whose passkeys: a company user's (default) or the platform admin's. */
  account?: 'company' | 'admin';
}) {
  const ops = OPS[account];
  const confirm = useConfirm();
  const { data, refetch } = useQuery<any>(ops.LIST, { fetchPolicy: 'cache-and-network' });
  const [start] = useMutation<any>(ops.START);
  const [finish] = useMutation<any>(ops.FINISH);
  const [remove] = useMutation<any>(ops.REMOVE);

  // Checked once, up front: a button that fails on press is worse than a
  // button that explains why it is not there.
  const [supported] = useState(
    () => typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState('');
  // Adding a factor to an account that has one asks for that one first. A
  // passkey is asked for by the browser; a code is typed here.
  const client = useApolloClient();
  const [codeProof, setCodeProof] = useState<string | null>(null);
  // What the typed code is for: adding a passkey, or removing this one.
  const [codeFor, setCodeFor] = useState<Passkey | null>(null);
  // An account with no factor yet proves itself with its password instead.
  const [proofKind, setProofKind] = useState<'code' | 'password'>('code');

  const passkeys: Passkey[] = data?.[ops.listed] ?? [];

  const enrol = async (proof?: string) => {
    setError('');
    setAdded('');
    setBusy(true);
    try {
      let began: any;
      try {
        ({ data: began } = await start({ variables: { proof: proof ?? null } }));
      } catch (err) {
        const need = stepUpNeeded(err);
        if (need === 'passkey' && !proof) {
          const p = await passkeyProof(client, account);
          ({ data: began } = await start({ variables: { proof: p } }));
        } else if ((need === 'code' || need === 'password') && !proof) {
          setCodeFor(null); setProofKind(need); setCodeProof('');
          return;
        } else {
          throw err;
        }
      }
      setCodeProof(null);
      const { optionsJson, ticket } = began[ops.started];
      // The browser does the ceremony; we never see a private key.
      const credential = await startRegistration({ optionsJSON: JSON.parse(optionsJson) });
      const { data: done } = await finish({
        variables: {
          ticket,
          responseJson: JSON.stringify(credential),
          name: guessDeviceName(),
        },
      });
      // A first sign-in method signs out every other session, this one too;
      // the server hands back a replacement for this tab.
      if (done[ops.finished].token) localStorage.setItem(ops.tokenKey, done[ops.finished].token);
      setAdded(done[ops.finished].name);
      await refetch();
      onChanged?.();
    } catch (err: any) {
      // A person cancelling the system prompt is not an error worth shouting
      // about; anything else is.
      const name = err?.name ?? '';
      if (name === 'NotAllowedError' || name === 'AbortError') {
        setError('');
      } else if (name === 'InvalidStateError') {
        setError('This device already has a passkey for your account.');
      } else if (proof !== undefined && proofKind === 'password') {
        setError(err?.message ?? 'That password is not correct.');
      } else if (proof !== undefined) {
        setError(secondFactorMessage(err));
      } else {
        setError(err?.message ?? 'The browser could not create a passkey.');
      }
    } finally {
      setBusy(false);
    }
  };

  const drop = async (key: Passkey, proof?: string) => {
    if (proof === undefined) {
      const ok = await confirm({
        title: 'Remove this passkey',
        message: `“${key.name}” will no longer sign you in. You can add it again from that device.`,
        confirmLabel: 'Remove', danger: true,
      });
      if (!ok) return;
    }
    setError('');
    setBusy(true);
    try {
      try {
        await remove({ variables: { id: key.id, proof: proof ?? null } });
      } catch (err) {
        // Removing a sign-in method needs the one you have, like adding one.
        const need = stepUpNeeded(err);
        if (need === 'passkey' && proof === undefined) {
          await remove({ variables: { id: key.id, proof: await passkeyProof(client, account) } });
        } else if (need === 'code' && proof === undefined) {
          setCodeFor(key); setProofKind('code'); setCodeProof('');
          return;
        } else {
          throw err;
        }
      }
      setCodeProof(null); setCodeFor(null);
      await refetch();
      onChanged?.();
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') return;
      setError(proof !== undefined ? secondFactorMessage(err) : (err?.message ?? 'Could not remove it.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pk-block">
      <style>{styles}</style>
      <div className="pk-head">
        <h3 className="pk-title">
          Passkeys
          <span className="pk-recommended">recommended</span>
        </h3>
        <p className="pk-lede">
          Your fingerprint, face or device PIN instead of typing a code. Stronger than an
          authenticator app for one specific reason: a passkey is tied to this website&rsquo;s
          address, so a convincing fake page cannot use it — even if you type everything it asks
          for. That is the attack a six-digit code does not stop.
        </p>
      </div>

      {passkeys.length > 0 && (
        <ul className="pk-list">
          {passkeys.map(k => (
            <li key={k.id} className="pk-item">
              <span className="pk-item-icon" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="7.5" cy="8" r="3.5" />
                  <path d="M11 8h6M14.5 8v3" />
                  <path d="M2.5 17c0-2.6 2.2-4.5 5-4.5s5 1.9 5 4.5" />
                </svg>
              </span>
              <span className="pk-item-text">
                <span className="pk-item-name">{k.name}</span>
                <span className="pk-item-meta">
                  added {new Date(k.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {k.lastUsedAt
                    ? ` · last used ${new Date(k.lastUsedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                    : ' · not used yet'}
                </span>
              </span>
              <button className="pk-btn pk-btn--danger" onClick={() => void drop(k)}>Remove</button>
            </li>
          ))}
        </ul>
      )}

      {added && (
        <p className="pk-ok" role="status">
          “{added}” is ready. You can sign in with it from now on.
        </p>
      )}
      {error && <p className="pk-error" role="alert">{error}</p>}

      {codeProof !== null && (
        <form className="pk-proof" onSubmit={e => { e.preventDefault(); const c = codeProof; void (codeFor ? drop(codeFor, c) : enrol(c)); }}>
          <label className="pk-lede" htmlFor="pk-proof-code">
            {proofKind === 'password'
              ? <>Enter your password first — the first sign-in method is only added by someone who knows it.</>
              : codeFor
                ? <>Enter a code from your authenticator app to remove “{codeFor.name}” — sign-in methods are only changed by someone who can use the existing one.</>
                : <>Enter a code from your authenticator app first — a new sign-in method is only added by someone who can use the existing one.</>}
          </label>
          {proofKind === 'password'
            ? <input id="pk-proof-code" className="pk-proof-input" type="password" value={codeProof}
                onChange={e => setCodeProof(e.target.value)} autoComplete="current-password" autoFocus disabled={busy} />
            : <TotpInput id="pk-proof-code" className="pk-proof-input" value={codeProof} onChange={setCodeProof} disabled={busy} />}
          <div className="pk-actions">
            <button type="button" className="pk-btn" onClick={() => { setCodeProof(null); setCodeFor(null); setError(''); }} disabled={busy}>Cancel</button>
            <button type="submit" className="pk-btn pk-btn--primary" disabled={busy || !codeProof}>Continue</button>
          </div>
        </form>
      )}

      {supported === false ? (
        <p className="pk-lede">
          This browser cannot create passkeys. Use an authenticator app below, or try a current
          version of Chrome, Safari, Edge or Firefox.
        </p>
      ) : (
        <div className="pk-actions">
          <button className="pk-btn pk-btn--primary" onClick={() => void enrol()} disabled={busy}>
            {busy ? 'Waiting for your device…' : passkeys.length > 0 ? 'Add another device' : 'Set up a passkey'}
          </button>
        </div>
      )}
    </div>
  );
}

const styles = `
  .pk-block {
    border: 1px solid rgba(91,156,246,0.28); background: rgba(91,156,246,0.05);
    border-radius: var(--cd-r); padding: 18px 20px;
    display: flex; flex-direction: column; gap: 13px;
  }
  .pk-head { display: flex; flex-direction: column; gap: 6px; }
  .pk-title {
    margin: 0; font-size: 13px; font-weight: 700; color: var(--cd-text);
    display: flex; align-items: center; gap: 9px; flex-wrap: wrap;
  }
  .pk-recommended {
    font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--cd-blue); background: rgba(91,156,246,0.14);
    border: 1px solid rgba(91,156,246,0.3); border-radius: var(--cd-r-pill);
    padding: 2px 8px;
  }
  .pk-lede { margin: 0; font-size: 12px; line-height: 1.6; color: var(--cd-text-mid); max-width: 66ch; }

  .pk-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
  .pk-item {
    display: flex; align-items: center; gap: 11px;
    background: var(--cd-surface); border: 1px solid var(--cd-border);
    border-radius: var(--cd-r-sm); padding: 10px 12px;
  }
  .pk-item-icon { color: var(--cd-blue); flex: 0 0 auto; display: inline-flex; }
  .pk-item-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1 1 auto; }
  .pk-item-name { font-size: 12.5px; font-weight: 600; color: var(--cd-text); }
  .pk-item-meta {
    font-size: 10px; font-weight: 600; letter-spacing: 0.05em;
    text-transform: uppercase; color: var(--cd-text-dim);
  }

  .pk-ok { margin: 0; font-size: 12px; line-height: 1.5; color: var(--cd-green); }
  .pk-error { margin: 0; font-size: 12px; line-height: 1.5; color: var(--cd-accent); }
  .pk-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  .pk-btn {
    font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
    color: var(--cd-text-mid); background: var(--cd-surface);
    border: 1px solid var(--cd-border2); border-radius: var(--cd-r-pill);
    padding: 9px 16px; white-space: nowrap;
    transition: background 160ms ease-out, color 160ms ease-out, border-color 160ms ease-out;
  }
  .pk-btn:hover:not(:disabled) { color: var(--cd-text); background: var(--cd-surface3); }
  .pk-btn:focus-visible { outline: 2px solid var(--cd-blue); outline-offset: 1px; }
  .pk-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .pk-btn--primary { color: #fff; background: var(--cd-blue); border-color: var(--cd-blue); }
  .pk-btn--primary:hover:not(:disabled) { color: #fff; background: #4a8ae6; border-color: #4a8ae6; }
  .pk-btn--danger { color: var(--cd-accent); border-color: rgba(240,78,94,0.3); flex: 0 0 auto; }
  .pk-btn--danger:hover:not(:disabled) { color: #fff; background: var(--cd-accent); border-color: var(--cd-accent); }

  .pk-proof { display: flex; flex-direction: column; gap: 9px; max-width: 420px; margin-top: 10px; }
  .pk-proof-input {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; letter-spacing: 0.12em;
    background: var(--cd-surface3, #232326); color: var(--cd-text, #f0f2f8);
    border: 1px solid var(--cd-border2, rgba(255,255,255,0.14)); border-radius: 8px; padding: 11px 12px; width: 100%;
  }
  .pk-proof-input:focus-visible { outline: 2px solid var(--cd-blue, #5b9cf6); outline-offset: 1px; }
  @media (prefers-reduced-motion: reduce) { .pk-btn { transition: none; } }
`;
