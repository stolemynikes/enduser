// Downloading the decision log for an auditor: every approval and denial in a
// period, with overrides and their reasons, as a CSV.
//
// It carries buyers' names, so — like opening a document number — it asks for
// a code from the authenticator app and is recorded.
import { useEffect, useRef, useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { TotpInput } from './TotpInput.tsx';
import { DatePicker } from './DatePicker.tsx';
import { needsMfaSetup, secondFactorMessage } from '../lib/mfaError.ts';

const EXPORT_DECISIONS = gql`
  mutation ExportDecisions($from: String!, $to: String!, $credential: String!) {
    exportDecisions(from: $from, to: $to, credential: $credential) { filename csv rows truncated }
  }
`;

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function DecisionExport({ defaultFrom, defaultTo }: { defaultFrom?: string; defaultTo?: string }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [credential, setCredential] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const [run, { loading }] = useMutation<any>(EXPORT_DECISIONS);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const start = () => {
    const today = new Date();
    const monthAgo = new Date(Date.now() - 30 * 86_400_000);
    setFrom(defaultFrom || isoDay(monthAgo));
    setTo(defaultTo || isoDay(today));
    setCredential(''); setError(''); setDone(''); setOpen(true);
  };
  const close = () => { setOpen(false); setCredential(''); setError(''); openerRef.current?.focus(); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await run({ variables: { from, to, credential } });
      const out = data.exportDecisions;
      const url = URL.createObjectURL(new Blob([out.csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = out.filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDone(`${out.rows} decision${out.rows === 1 ? '' : 's'} downloaded.${out.truncated ? ' The period held more than one file carries — choose a shorter one for the rest.' : ''}`);
      setOpen(false); setCredential('');
    } catch (err: any) {
      setError(needsMfaSetup(err)
        ? 'This needs two-factor authentication. Set it up under Account first.'
        : secondFactorMessage(err));
      setCredential('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="de-wrap">
      <style>{styles}</style>
      {!open ? (
        <button ref={openerRef} className="nb-chip" onClick={start}>Download for audit (CSV)</button>
      ) : (
        <form className="de-form" onSubmit={submit}>
          <p className="de-why">
            Every approval and denial in the period, with who decided, the reason given and any overridden checks.
            It contains buyers&rsquo; names, so it asks for a code and the download is recorded.
          </p>
          <div className="de-dates">
            <DatePicker value={from} max={to || undefined} label="From" onChange={setFrom} />
            <span aria-hidden="true">–</span>
            <DatePicker value={to} min={from || undefined} label="Until" onChange={setTo} />
          </div>
          <label className="de-label" htmlFor="de-code">Code from your authenticator app</label>
          <TotpInput ref={inputRef} id="de-code" className="de-input" value={credential} onChange={setCredential} disabled={loading} />
          {error && <p className="de-error" role="alert">{error}</p>}
          <div className="de-actions">
            <button type="button" className="nb-chip" disabled={loading} onClick={close}>Cancel</button>
            <button type="submit" className="nb-chip nb-chip-on" disabled={loading || !credential || !from || !to}>
              {loading ? 'Preparing…' : 'Download CSV'}
            </button>
          </div>
        </form>
      )}
      {done && <p className="de-done" role="status">{done}</p>}
    </div>
  );
}

const styles = `
  .de-wrap { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
  .de-form {
    display: flex; flex-direction: column; gap: 9px; width: min(420px, 100%);
    padding: 14px; border: 1px solid var(--cd-border, rgba(255,255,255,0.1)); border-radius: 12px;
    background: var(--cd-surface2, #1b1b1d);
  }
  .de-why, .de-done { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--cd-text-mid, #a3a3a6); }
  .de-dates { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .de-label { font-size: 11px; font-weight: 600; color: var(--cd-text-mid, #a3a3a6); }
  .de-input {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; letter-spacing: 0.12em;
    background: var(--cd-surface3, #232326); color: var(--cd-text, #f2f2f0);
    border: 1px solid var(--cd-border2, rgba(255,255,255,0.14)); border-radius: 8px; padding: 11px 12px; width: 100%;
  }
  .de-input:focus-visible { outline: 2px solid var(--cd-blue, #5b9cf6); outline-offset: 1px; }
  .de-error { margin: 0; font-size: 12px; color: var(--cd-accent, #f04e5e); }
  .de-actions { display: flex; gap: 8px; flex-wrap: wrap; }
`;
