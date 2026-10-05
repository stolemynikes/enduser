// The identity document number: hidden, revealed deliberately, hidden again.
//
// Reviewers are allowed to see it. The point of the control is that a session
// on its own is not enough, so a stolen one — which is what a phishing proxy
// and malware both leave behind, with the second factor already passed — cannot
// read the tenant's numbers.
//
// UX rules this follows deliberately:
//   - progressive disclosure: the field is closed until asked for, and the
//     reason is written on the face of it rather than hidden in a tooltip
//   - submit feedback: the code field shows a pending state, then the value or
//     a specific error, never silence
//   - aria-live on both the revealed value and the countdown, so the reveal and
//     the re-hiding are announced rather than only visible
//   - the countdown is text as well as a bar, since colour and motion are not
//     available to every reader
//   - focus moves to the code field when it opens and back to the trigger when
//     it closes, so the keyboard path is not a dead end
import { useEffect, useRef, useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { TotpInput } from './TotpInput.tsx';
import { mfaSignal } from '../lib/mfaError.ts';

const REVEAL = gql`
  mutation RevealDocumentNumber($id: ID!, $credential: String!) {
    revealDocumentNumber(id: $id, credential: $credential) {
      submissionId
      documentNumber
    }
  }
`;

/** How long a revealed number stays on screen. */
const VISIBLE_MS = 120_000;

export function RevealDocumentNumber({
  submissionId,
  canReveal,
  mfaEnabled,
}: {
  submissionId: string;
  /** Owner and Employee+ only; a plain Employee is not offered the control. */
  canReveal: boolean;
  /** Decides whether the prompt asks for a code or a password. */
  mfaEnabled: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [credential, setCredential] = useState('');
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [reveal, { loading }] = useMutation<any>(REVEAL);

  // Opening the prompt moves focus into it; closing returns focus to the
  // button that opened it.
  useEffect(() => {
    if (asking) inputRef.current?.focus();
  }, [asking]);

  // The value is held in memory only and dropped on a timer. Nothing is cached
  // by Apollo — the mutation result is read once, here.
  useEffect(() => {
    if (value == null) return;
    setRemaining(VISIBLE_MS);
    const started = Date.now();
    const tick = setInterval(() => {
      const left = VISIBLE_MS - (Date.now() - started);
      if (left <= 0) {
        setValue(null);
        setRemaining(0);
        clearInterval(tick);
      } else {
        setRemaining(left);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [value]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await reveal({ variables: { id: submissionId, credential } });
      setValue(data.revealDocumentNumber.documentNumber ?? '—');
      setAsking(false);
      setCredential('');
    } catch (err: any) {
      const signal = mfaSignal(err);
      setError(
        signal === 'invalid' ? 'That code is not valid. Try the next one your app shows.'
        : signal === 'required' ? 'Enter the code from your authenticator app.'
        : mfaEnabled ? 'That code is not valid.'
        : 'That password is not correct.',
      );
      setCredential('');
      inputRef.current?.focus();
    }
  };

  const hideNow = () => {
    setValue(null);
    setRemaining(0);
    triggerRef.current?.focus();
  };

  if (!canReveal) {
    return (
      <div className="rv-block">
        <style>{styles}</style>
        <span className="rv-label">Identity document number</span>
        <span className="rv-withheld">
          <LockIcon />
          Not available to your role
        </span>
      </div>
    );
  }

  return (
    <div className="rv-block">
      <style>{styles}</style>
      <span className="rv-label">Identity document number</span>

      {value != null ? (
        <div className="rv-shown">
          <code className="rv-value" aria-live="polite">{value}</code>
          <div className="rv-timer">
            <div className="rv-timer-track" aria-hidden="true">
              <div className="rv-timer-fill" style={{ width: `${(remaining / VISIBLE_MS) * 100}%` }} />
            </div>
            {/* Text as well as the bar: a countdown nobody can read is not a
                countdown. role=timer keeps it from being announced every tick. */}
            <span className="rv-timer-text" role="timer">
              hides in {Math.ceil(remaining / 1000)}s
            </span>
            <button className="rv-link" onClick={hideNow}>Hide now</button>
          </div>
        </div>
      ) : asking ? (
        <form className="rv-form" onSubmit={submit}>
          <p className="rv-why">
            {mfaEnabled
              ? 'Enter the code from your authenticator app. This look-up is recorded.'
              : 'Enter your password. This look-up is recorded. Turn on two-factor authentication to use a code instead.'}
          </p>
          {mfaEnabled ? (
            <TotpInput
              ref={inputRef} id={`rv-code-${submissionId}`} className="rv-input"
              value={credential} onChange={setCredential} disabled={loading}
            />
          ) : (
            <input
              ref={inputRef} id={`rv-pw-${submissionId}`} className="rv-input"
              type="password" autoComplete="current-password" value={credential}
              onChange={e => setCredential(e.target.value)} disabled={loading} required
            />
          )}
          {error && <p className="rv-error" role="alert">{error}</p>}
          <div className="rv-actions">
            <button
              className="rv-btn" type="button" disabled={loading}
              onClick={() => { setAsking(false); setCredential(''); setError(''); triggerRef.current?.focus(); }}
            >
              Cancel
            </button>
            <button className="rv-btn rv-btn--primary" type="submit" disabled={loading || !credential}>
              {loading ? 'Checking…' : 'Show the number'}
            </button>
          </div>
        </form>
      ) : (
        <div className="rv-closed">
          <span className="rv-masked" aria-hidden="true">•••• •••• ••</span>
          <button ref={triggerRef} className="rv-btn" onClick={() => { setAsking(true); setError(''); }}>
            <LockIcon />
            Show
          </button>
          <span className="rv-note">
            Kept closed because no decision needs it. Opening it is recorded.
          </span>
        </div>
      )}
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="9" width="12" height="8" rx="2" />
      <path d="M7 9V6.5a3 3 0 016 0V9" />
    </svg>
  );
}

const styles = `
  .rv-block { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .rv-label {
    font-size: 10px; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--cd-text-dim);
  }

  .rv-closed { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .rv-masked {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px; letter-spacing: 0.1em; color: var(--cd-text-dim);
  }
  .rv-note { font-size: 11px; line-height: 1.5; color: var(--cd-text-dim); flex: 1 1 14ch; min-width: 14ch; }
  .rv-withheld {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 12px; color: var(--cd-text-dim);
  }

  .rv-shown { display: flex; flex-direction: column; gap: 7px; }
  .rv-value {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 15px; letter-spacing: 0.1em; color: var(--cd-text);
    background: var(--cd-surface3); border: 1px solid var(--cd-border2);
    border-radius: var(--cd-r-sm); padding: 8px 11px; align-self: flex-start;
    /* Selectable on purpose: copying it is the reason to open it. */
    user-select: all;
  }
  .rv-timer { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
  .rv-timer-track {
    width: 84px; height: 3px; border-radius: 2px;
    background: var(--cd-border2); overflow: hidden; flex: 0 0 auto;
  }
  .rv-timer-fill {
    height: 100%; background: var(--cd-amber);
    transition: width 1s linear;
  }
  .rv-timer-text {
    font-size: 10px; font-weight: 600; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--cd-amber);
    font-variant-numeric: tabular-nums;
  }

  .rv-form { display: flex; flex-direction: column; gap: 8px; max-width: 320px; }
  .rv-why { margin: 0; font-size: 11.5px; line-height: 1.55; color: var(--cd-text-mid); }
  .rv-input {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 14px; letter-spacing: 0.12em;
    background: var(--cd-surface3); color: var(--cd-text);
    border: 1px solid var(--cd-border2); border-radius: var(--cd-r-sm);
    /* ~44px tall with the padding, so it is a comfortable target on a phone. */
    padding: 11px 12px; width: 100%;
  }
  .rv-input:focus-visible { outline: 2px solid var(--cd-blue); outline-offset: 1px; }
  .rv-input::placeholder { letter-spacing: 0; font-size: 12px; color: var(--cd-text-dim); }
  .rv-error { margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--cd-accent); }
  .rv-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  .rv-btn {
    display: inline-flex; align-items: center; gap: 6px;
    font-family: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer;
    color: var(--cd-text-mid); background: var(--cd-surface);
    border: 1px solid var(--cd-border2); border-radius: var(--cd-r-pill);
    padding: 8px 14px; white-space: nowrap;
    transition: background 160ms ease-out, color 160ms ease-out, border-color 160ms ease-out;
  }
  .rv-btn:hover:not(:disabled) { color: var(--cd-text); background: var(--cd-surface3); }
  .rv-btn:focus-visible { outline: 2px solid var(--cd-blue); outline-offset: 1px; }
  /* Disabled has to differ by more than one cue: dimmer, and the cursor says so. */
  .rv-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .rv-btn--primary { color: #fff; background: var(--cd-blue); border-color: var(--cd-blue); }
  .rv-btn--primary:hover:not(:disabled) { color: #fff; background: #4a8ae6; border-color: #4a8ae6; }

  .rv-link {
    font-family: inherit; font-size: 10px; font-weight: 600; letter-spacing: 0.06em;
    text-transform: uppercase; color: var(--cd-blue); background: none;
    border: none; padding: 4px 6px; border-radius: var(--cd-r-sm); cursor: pointer;
  }
  .rv-link:hover { background: var(--cd-surface2); }
  .rv-link:focus-visible { outline: 2px solid var(--cd-blue); outline-offset: 1px; }

  @media (prefers-reduced-motion: reduce) {
    .rv-btn { transition: none; }
    .rv-timer-fill { transition: none; }
  }
`;
