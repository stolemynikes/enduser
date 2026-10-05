// The platform admin's gated look at an identity document number.
//
// The seller-side control lives in RevealDocumentNumber.tsx and styles itself
// from the dashboard's --cd-* tokens. The admin dashboard has its own palette,
// so this is a separate component rather than a shared one with a theme prop —
// one component serving two token sets ends up carrying both, and neither
// cleanly.
//
// Same discipline either way: the number never arrives with a query, the call
// that produces it needs a fresh credential, and every look is recorded in the
// seller's own log so they can see when platform staff read their buyers'
// documents.
import { useEffect, useRef, useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

const REVEAL = gql`
  mutation RevealSubmissionDocumentNumber($id: ID!, $credential: String!) {
    revealSubmissionDocumentNumber(id: $id, credential: $credential) {
      submissionId
      documentNumber
    }
  }
`;

/** How long a revealed number stays on screen. */
const VISIBLE_MS = 120_000;

export function AdminRevealDocument({ submissionId }: { submissionId: string }) {
  const [asking, setAsking] = useState(false);
  const [credential, setCredential] = useState('');
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [reveal, { loading }] = useMutation<any>(REVEAL);

  useEffect(() => { if (asking) inputRef.current?.focus(); }, [asking]);

  // Held in memory only, and dropped on a timer.
  useEffect(() => {
    if (value == null) return;
    setRemaining(VISIBLE_MS);
    const started = Date.now();
    const tick = setInterval(() => {
      const left = VISIBLE_MS - (Date.now() - started);
      if (left <= 0) { setValue(null); setRemaining(0); clearInterval(tick); }
      else setRemaining(left);
    }, 1000);
    return () => clearInterval(tick);
  }, [value]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await reveal({ variables: { id: submissionId, credential } });
      setValue(data.revealSubmissionDocumentNumber.documentNumber ?? '—');
      setAsking(false);
      setCredential('');
    } catch (err: any) {
      setError(err?.message ?? 'That could not be verified.');
      setCredential('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="ard-block">
      <style>{styles}</style>
      <span className="ard-label">Document Number</span>

      {value != null ? (
        <div className="ard-shown">
          <code className="ard-value" aria-live="polite">{value}</code>
          <span className="ard-timer" role="timer">hides in {Math.ceil(remaining / 1000)}s</span>
          <button
            className="ard-link"
            onClick={() => { setValue(null); setRemaining(0); triggerRef.current?.focus(); }}
          >
            Hide now
          </button>
        </div>
      ) : asking ? (
        <form className="ard-form" onSubmit={submit}>
          <p className="ard-why">
            Your authenticator code, or your password while you have no second factor. The seller
            sees this look-up in their own log.
          </p>
          <input
            ref={inputRef} className="ard-input" type="password"
            autoComplete="one-time-code" value={credential}
            onChange={e => setCredential(e.target.value)} disabled={loading} required
          />
          {error && <p className="ard-error" role="alert">{error}</p>}
          <div className="ard-actions">
            <button
              className="ard-btn" type="button" disabled={loading}
              onClick={() => { setAsking(false); setCredential(''); setError(''); triggerRef.current?.focus(); }}
            >
              Cancel
            </button>
            <button className="ard-btn ard-btn--primary" type="submit" disabled={loading || !credential}>
              {loading ? 'Checking…' : 'Show the number'}
            </button>
          </div>
        </form>
      ) : (
        <div className="ard-closed">
          <span className="ard-masked" aria-hidden="true">•••• •••• ••</span>
          <button ref={triggerRef} className="ard-btn" onClick={() => { setAsking(true); setError(''); }}>
            Show
          </button>
          <span className="ard-note">No decision needs it. Opening it is recorded.</span>
        </div>
      )}
    </div>
  );
}

const styles = `
  .ard-block { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
  .ard-label {
    font-size: 10px; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--text-dim, #6b7280);
  }
  .ard-closed { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
  .ard-masked {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px; letter-spacing: 0.1em; color: var(--text-dim, #6b7280);
  }
  .ard-note { font-size: 11px; line-height: 1.4; color: var(--text-dim, #6b7280); }

  .ard-shown { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
  .ard-value {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 14px; letter-spacing: 0.08em; color: var(--text, #111827);
    background: var(--surface2, #f3f4f6); border: 1px solid var(--border, rgba(0,0,0,0.1));
    border-radius: 6px; padding: 6px 10px; user-select: all;
  }
  .ard-timer {
    font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
    color: #b45309; font-variant-numeric: tabular-nums;
  }

  .ard-form { display: flex; flex-direction: column; gap: 7px; max-width: 300px; }
  .ard-why { margin: 0; font-size: 11px; line-height: 1.5; color: var(--text-mid, #4b5563); }
  .ard-input {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px;
    letter-spacing: 0.1em; background: var(--surface, #fff); color: var(--text, #111827);
    border: 1px solid var(--border2, rgba(0,0,0,0.16)); border-radius: 6px;
    /* ~44px with the padding, so it is a comfortable target on a phone. */
    padding: 11px 12px; width: 100%;
  }
  .ard-input:focus-visible { outline: 2px solid #2563eb; outline-offset: 1px; }
  .ard-error { margin: 0; font-size: 11px; line-height: 1.4; color: #dc2626; }
  .ard-actions { display: flex; gap: 7px; flex-wrap: wrap; }

  .ard-btn {
    font-family: inherit; font-size: 11.5px; font-weight: 600; cursor: pointer;
    color: var(--text-mid, #4b5563); background: var(--surface, #fff);
    border: 1px solid var(--border2, rgba(0,0,0,0.16)); border-radius: 100px;
    padding: 8px 14px; white-space: nowrap; transition: background 160ms ease-out;
  }
  .ard-btn:hover:not(:disabled) { background: var(--surface2, #f3f4f6); }
  .ard-btn:focus-visible { outline: 2px solid #2563eb; outline-offset: 1px; }
  .ard-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .ard-btn--primary { color: #fff; background: #2563eb; border-color: #2563eb; }
  .ard-btn--primary:hover:not(:disabled) { background: #1d4ed8; }

  .ard-link {
    font-family: inherit; font-size: 10px; font-weight: 600; letter-spacing: 0.06em;
    text-transform: uppercase; color: #2563eb; background: none; border: none;
    padding: 4px 6px; border-radius: 6px; cursor: pointer;
  }
  .ard-link:hover { background: var(--surface2, #f3f4f6); }
  .ard-link:focus-visible { outline: 2px solid #2563eb; outline-offset: 1px; }

  @media (prefers-reduced-motion: reduce) { .ard-btn { transition: none; } }
`;
