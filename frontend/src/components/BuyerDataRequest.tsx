// Answering a buyer's data-protection request from the statement in front of
// you: export everything held about them (access), or erase it (erasure).
//
// Both act on the buyer, not on this one statement — every statement here with
// the same email address or identity document — and both ask for a fresh code
// from the authenticator app, so a stolen session cannot carry a buyer's
// history away or destroy it. Erasure is the owner's alone and asks for an
// explicit acknowledgement as well, since it cannot be undone.
//
// UX rules this follows deliberately:
//   - progressive disclosure: two quiet buttons; the form opens only when used
//   - the consequence is written next to the control, not in a tooltip
//   - destructive emphasis: erasure is red, separate, and needs a checkbox
//   - submit feedback: pending state, then a result or a specific error
//   - focus moves into the form when it opens and back when it closes
import { useEffect, useRef, useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { TotpInput } from './TotpInput.tsx';
import { needsMfaSetup, secondFactorMessage } from '../lib/mfaError.ts';

const EXPORT = gql`
  mutation ExportBuyerData($id: ID!, $credential: String!) {
    exportBuyerData(id: $id, credential: $credential) { filename pdfBase64 json statements }
  }
`;
const ERASE = gql`
  mutation EraseBuyerData($id: ID!, $credential: String!) {
    eraseBuyerData(id: $id, credential: $credential)
  }
`;

type Mode = null | 'export' | 'erase';

function download(name: string, type: string, data: BlobPart) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked after the click has been handled, so the file is not kept around.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function base64Bytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function BuyerDataRequest({
  submissionId, canExport, canErase, mfaEnabled, support = false, onSetUpMfa, onErased,
}: {
  submissionId: string;
  /** Owner and Reviewer. */
  canExport: boolean;
  /** Owner only. */
  canErase: boolean;
  mfaEnabled: boolean;
  /** Platform support acting as the owner: these requests are not available. */
  support?: boolean;
  onSetUpMfa?: () => void;
  /** Called with how many statements were erased. */
  onErased: (count: number) => void;
}) {
  const [mode, setMode] = useState<Mode>(null);
  const [credential, setCredential] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [done, setDone] = useState<{ statements: number; json: string; filename: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const [runExport, { loading: exporting }] = useMutation<any>(EXPORT);
  const [runErase, { loading: erasing }] = useMutation<any>(ERASE);
  const busy = exporting || erasing;

  useEffect(() => { if (mode) inputRef.current?.focus(); }, [mode]);

  if (!canExport && !canErase) return null;

  const open = (m: Mode, el: HTMLButtonElement) => {
    openerRef.current = el;
    setMode(m); setCredential(''); setError(''); setAcknowledged(false); setDone(null);
  };
  const close = () => {
    setMode(null); setCredential(''); setError(''); setAcknowledged(false);
    openerRef.current?.focus();
  };

  const fail = (err: any) => {
    if (needsMfaSetup(err)) { setMode(null); setSetupNeeded(true); setCredential(''); return; }
    setError(secondFactorMessage(err));
    setCredential('');
    inputRef.current?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'export') {
        const { data } = await runExport({ variables: { id: submissionId, credential } });
        const out = data.exportBuyerData;
        download(`${out.filename}.pdf`, 'application/pdf', base64Bytes(out.pdfBase64) as BlobPart);
        setDone({ statements: out.statements, json: out.json, filename: out.filename });
        setMode(null); setCredential('');
      } else if (mode === 'erase') {
        const { data } = await runErase({ variables: { id: submissionId, credential } });
        setMode(null); setCredential('');
        onErased(data.eraseBuyerData);
      }
    } catch (err) {
      fail(err);
    }
  };

  return (
    <section className="bd-block" aria-labelledby={`bd-h-${submissionId}`}>
      <style>{styles}</style>
      <h3 id={`bd-h-${submissionId}`} className="bd-title">Data protection request</h3>
      <p className="bd-lead">
        For when this buyer asks what you hold about them, or asks you to delete it. Both cover every
        statement from this buyer here — same email address or same identity document — not only this one.
      </p>

      {support ? (
        <p className="bd-note">Not available in a support session: a buyer's data is exported or erased by the seller.</p>
      ) : (!mfaEnabled || setupNeeded) ? (
        <div className="bd-setup" role="status">
          <b>Two-factor authentication is needed</b>
          <span>Exporting or erasing a buyer's data asks for a code from your authenticator app.</span>
          {onSetUpMfa && <button className="bd-btn bd-btn--primary" onClick={onSetUpMfa}>Set up two-factor</button>}
        </div>
      ) : mode ? (
        <form className="bd-form bd-enter" onSubmit={submit}>
          {mode === 'export' ? (
            <p className="bd-why">
              Downloads a PDF of everything held about this buyer, with an explanation of how it is used,
              ready to send to them. The document number is partly hidden. This export is recorded.
            </p>
          ) : (
            <>
              <p className="bd-why bd-why--danger">
                Permanently deletes every statement from this buyer, with their identity-check photos at the
                provider and the notifications that name them. This cannot be undone and is recorded.
                You may refuse an erasure when the law requires you to keep the records — check that first.
              </p>
              <label className="bd-check">
                <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />
                <span>I understand this deletes all of this buyer's statements for good.</span>
              </label>
            </>
          )}
          <label className="bd-code-label" htmlFor={`bd-code-${submissionId}`}>Code from your authenticator app</label>
          <TotpInput ref={inputRef} id={`bd-code-${submissionId}`} className="bd-input"
            value={credential} onChange={setCredential} disabled={busy} />
          {error && <p className="bd-error" role="alert">{error}</p>}
          <div className="bd-actions">
            <button type="button" className="bd-btn" disabled={busy} onClick={close}>Cancel</button>
            {mode === 'export' ? (
              <button type="submit" className="bd-btn bd-btn--primary" disabled={busy || !credential}>
                {exporting ? 'Preparing…' : 'Download PDF'}
              </button>
            ) : (
              <button type="submit" className="bd-btn bd-btn--danger" disabled={busy || !credential || !acknowledged}>
                {erasing ? 'Erasing…' : 'Erase permanently'}
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="bd-actions">
          {canExport && (
            <button className="bd-btn" onClick={e => open('export', e.currentTarget)}>Export this buyer's data</button>
          )}
          {canErase && (
            <button className="bd-btn bd-btn--danger-quiet" onClick={e => open('erase', e.currentTarget)}>Erase this buyer's data…</button>
          )}
        </div>
      )}

      {done && (
        <p className="bd-done" role="status">
          Exported {done.statements} statement{done.statements === 1 ? '' : 's'} as a PDF.{' '}
          <button className="bd-link" onClick={() => download(`${done.filename}.json`, 'application/json', done.json)}>
            Also download as JSON
          </button>
          {' '}— for a request for the data in a machine-readable form.
        </p>
      )}
    </section>
  );
}

const styles = `
  .bd-block {
    display: flex; flex-direction: column; gap: 10px; margin-top: 18px; padding: 14px 16px;
    border: 1px solid var(--cd-border); border-radius: var(--cd-r-sm); background: var(--cd-surface2);
  }
  .bd-title { margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--cd-text-mid); }
  .bd-lead, .bd-note, .bd-why, .bd-done { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--cd-text-mid); max-width: 68ch; }
  .bd-why--danger { color: var(--cd-text); }
  .bd-setup { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; font-size: 12.5px; color: var(--cd-text-mid); }
  .bd-setup b { color: var(--cd-text); }
  .bd-form { display: flex; flex-direction: column; gap: 9px; max-width: 420px; }
  .bd-check { display: flex; gap: 9px; align-items: flex-start; font-size: 12.5px; color: var(--cd-text); cursor: pointer; }
  .bd-check input { width: 18px; height: 18px; margin-top: 1px; flex: none; accent-color: var(--cd-accent); }
  .bd-code-label { font-size: 11px; font-weight: 600; color: var(--cd-text-mid); }
  .bd-input {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; letter-spacing: 0.12em;
    background: var(--cd-surface3); color: var(--cd-text); border: 1px solid var(--cd-border2);
    border-radius: var(--cd-r-sm); padding: 11px 12px; width: 100%;
  }
  .bd-input:focus-visible { outline: 2px solid var(--cd-blue); outline-offset: 1px; }
  .bd-error { margin: 0; font-size: 12px; color: var(--cd-accent); }
  .bd-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .bd-btn {
    font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer; min-height: 36px;
    color: var(--cd-text-mid); background: var(--cd-surface); border: 1px solid var(--cd-border2);
    border-radius: var(--cd-r-pill); padding: 8px 15px; white-space: nowrap;
    transition: background 160ms ease-out, color 160ms ease-out;
  }
  .bd-btn:hover:not(:disabled) { color: var(--cd-text); background: var(--cd-surface3); }
  .bd-btn:focus-visible, .bd-link:focus-visible { outline: 2px solid var(--cd-blue); outline-offset: 1px; }
  .bd-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .bd-btn--primary { color: #fff; background: var(--cd-blue); border-color: var(--cd-blue); }
  .bd-btn--primary:hover:not(:disabled) { color: #fff; background: #4a8ae6; }
  .bd-btn--danger { color: #fff; background: var(--cd-accent); border-color: var(--cd-accent); }
  .bd-btn--danger:hover:not(:disabled) { color: #fff; filter: brightness(1.08); background: var(--cd-accent); }
  .bd-btn--danger-quiet { color: var(--cd-accent); }
  .bd-link { font: inherit; color: var(--cd-blue); background: none; border: none; padding: 0; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
  .bd-enter { animation: bd-in 200ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
  @keyframes bd-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  @media (pointer: coarse) { .bd-btn { min-height: 44px; } }
  @media (prefers-reduced-motion: reduce) { .bd-enter { animation: none; } .bd-btn { transition: none; } }
`;
