// Exporting the decision log for an auditor: every approval, denial,
// reopening and override in a period, with the reasons given, as a CSV.
//
// A quiet button in the Team decisions header opens a dialog: pick a period
// (the usual ones are one tap), enter a code, download. The file carries
// buyers' names, so — like opening a document number — it asks for a code
// from the authenticator app, and the download is recorded.
//
// UX rules this follows: one primary action in the dialog; common choices as
// presets, the custom range only when asked for; the period spelled out
// before downloading; Escape and the backdrop close it; focus goes in on open
// and back to the button on close.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { TotpInput } from './TotpInput.tsx';
import { DatePicker } from './DatePicker.tsx';
import { needsMfaSetup, secondFactorMessage } from '../lib/mfaError.ts';
import { RETENTION_MONTHS } from '../lib/legal.ts';
import { Z } from '../lib/zLayers.ts';

const EXPORT_DECISIONS = gql`
  mutation ExportDecisions($from: String!, $to: String!, $credential: String!) {
    exportDecisions(from: $from, to: $to, credential: $credential) { filename csv rows truncated }
  }
`;

type Preset = '30d' | '12m' | 'all' | 'custom';
const PRESETS: { key: Preset; label: string }[] = [
  { key: '30d', label: 'Last 30 days' },
  { key: '12m', label: 'Last 12 months' },
  { key: 'all', label: `Everything held (${RETENTION_MONTHS} months)` },
  { key: 'custom', label: 'Choose dates' },
];

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const label = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function rangeFor(p: Exclude<Preset, 'custom'>): [string, string] {
  const to = new Date();
  const from = new Date();
  if (p === '30d') from.setDate(from.getDate() - 30);
  else if (p === '12m') from.setMonth(from.getMonth() - 12);
  else from.setMonth(from.getMonth() - RETENTION_MONTHS);
  return [isoDay(from), isoDay(to)];
}

export function DecisionExport() {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<Preset>('30d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [credential, setCredential] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const codeRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [run, { loading }] = useMutation<any>(EXPORT_DECISIONS);

  const [rangeFrom, rangeTo] = preset === 'custom' ? [from, to] : rangeFor(preset);

  useEffect(() => {
    if (!open) return;
    codeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading]);

  const start = () => {
    const [f, t] = rangeFor('30d');
    setPreset('30d'); setFrom(f); setTo(t);
    setCredential(''); setError(''); setDone(''); setOpen(true);
  };
  const close = () => {
    setOpen(false); setCredential(''); setError('');
    triggerRef.current?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await run({ variables: { from: rangeFrom, to: rangeTo, credential } });
      const out = data.exportDecisions;
      const url = URL.createObjectURL(new Blob([out.csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = out.filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDone(`Downloaded ${out.rows} decision${out.rows === 1 ? '' : 's'}.${out.truncated ? ' The period held more than one file carries — export the rest with a shorter period.' : ''}`);
      close();
    } catch (err: any) {
      setError(needsMfaSetup(err)
        ? 'This needs two-factor authentication. Set it up under Account first.'
        : secondFactorMessage(err));
      setCredential('');
      codeRef.current?.focus();
    }
  };

  const rangeOk = !!rangeFrom && !!rangeTo && rangeFrom <= rangeTo;

  return (
    <>
      <style>{styles}</style>
      <div className="de-trigger-wrap">
        <button ref={triggerRef} className="de-trigger" onClick={start}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 3v10m0 0l-4-4m4 4l4-4M4 16h12" />
          </svg>
          Export for audit
        </button>
        {done && <span className="de-done" role="status">{done}</span>}
      </div>

      {/* In a portal: inside the activity column, an animated ancestor would
          become the containing block and push the dialog off screen. */}
      {open && createPortal(
        <div className="de-backdrop" onClick={() => { if (!loading) close(); }}>
          <form className="de-dialog" role="dialog" aria-modal="true" aria-labelledby="de-title"
            onClick={e => e.stopPropagation()} onSubmit={submit}>
            <h2 id="de-title" className="de-title">Export decisions for an audit</h2>
            <p className="de-text">
              A CSV of everything decided in the period — approvals, denials, reopened statements and
              overridden checks — with who did it, when and the reason given.
            </p>

            <fieldset className="de-fieldset">
              <legend className="de-label">Period</legend>
              <div className="de-presets">
                {PRESETS.map(p => (
                  <button key={p.key} type="button" className={`de-preset${preset === p.key ? ' de-preset-on' : ''}`}
                    aria-pressed={preset === p.key} onClick={() => setPreset(p.key)}>
                    {p.label}
                  </button>
                ))}
              </div>
              {preset === 'custom' && (
                <div className="de-dates">
                  <DatePicker value={from} max={to || undefined} label="From" onChange={setFrom} />
                  <span aria-hidden="true">–</span>
                  <DatePicker value={to} min={from || undefined} label="Until" onChange={setTo} />
                </div>
              )}
              <p className="de-range" aria-live="polite">
                {rangeOk ? <>From <b>{label(rangeFrom)}</b> until <b>{label(rangeTo)}</b></> : 'Choose a start and an end date.'}
              </p>
            </fieldset>

            <label className="de-label" htmlFor="de-code">Code from your authenticator app</label>
            <TotpInput ref={codeRef} id="de-code" className="de-input" value={credential} onChange={setCredential} disabled={loading} />
            <p className="de-hint">Asked for because the file contains buyers&rsquo; names. The download is recorded.</p>
            {error && <p className="de-error" role="alert">{error}</p>}

            <div className="de-actions">
              <button type="button" className="de-btn" disabled={loading} onClick={close}>Cancel</button>
              <button type="submit" className="de-btn de-btn-primary" disabled={loading || !credential || !rangeOk}>
                {loading ? 'Preparing…' : 'Download CSV'}
              </button>
            </div>
          </form>
        </div>,
        document.body,
      )}
    </>
  );
}

const styles = `
  .de-trigger-wrap { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex: none; }
  .de-trigger {
    display: inline-flex; align-items: center; gap: 7px; min-height: 36px; padding: 0 14px;
    font: 600 12.5px/1 'Inter', system-ui, sans-serif; cursor: pointer; white-space: nowrap;
    color: var(--cd-text-mid, #c2c8da); background: transparent;
    border: 1px solid var(--cd-border2, rgba(255,255,255,0.14)); border-radius: 999px;
    transition: background 150ms ease-out, color 150ms ease-out;
  }
  .de-trigger:hover { color: var(--cd-text, #f0f2f8); background: rgba(255,255,255,0.05); }
  .de-trigger:focus-visible { outline: 2px solid var(--cd-blue, #5b9cf6); outline-offset: 2px; }
  .de-done { font-size: 12px; color: var(--cd-text-mid, #a3a3a6); max-width: 32ch; text-align: right; }

  .de-backdrop {
    position: fixed; inset: 0; z-index: ${Z.MODAL};
    background: rgba(0,0,0,0.55); backdrop-filter: blur(2px);
    display: flex; align-items: center; justify-content: center; padding: 16px;
    animation: de-fade 150ms ease-out;
  }
  .de-dialog {
    /* No overflow clipping: the date picker's calendar opens below its field
       and must be able to reach past the dialog's edge. */
    width: 100%; max-width: 460px;
    background: #1a1a1c; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;
    padding: 22px; color: #f0f2f8; font-family: 'Inter', system-ui, sans-serif;
    box-shadow: 0 24px 64px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 10px;
    animation: de-up 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .cd-light .de-dialog { background: #fff; color: #111827; border-color: #e5e7eb; box-shadow: 0 24px 64px rgba(0,0,0,0.16); }
  .de-title { margin: 0; font-size: 16px; font-weight: 650; letter-spacing: -0.01em; }
  .de-text, .de-hint, .de-range { margin: 0; font-size: 13px; line-height: 1.55; color: #a3a8b8; }
  .de-hint { font-size: 12px; }
  .de-range b { color: inherit; font-weight: 600; filter: brightness(1.25); }
  .de-fieldset { border: 0; padding: 0; margin: 4px 0 2px; display: flex; flex-direction: column; gap: 9px; min-width: 0; }
  .de-label { padding: 0; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #8a8f9e; }
  .de-presets { display: flex; flex-wrap: wrap; gap: 6px; }
  .de-preset {
    min-height: 34px; padding: 0 12px; border-radius: 999px; cursor: pointer;
    font: 500 12.5px/1 'Inter', system-ui, sans-serif; color: #c2c8da;
    background: transparent; border: 1px solid rgba(255,255,255,0.14);
  }
  .de-preset:hover { background: rgba(255,255,255,0.05); }
  .de-preset-on { color: #fff; background: rgba(91,156,246,0.18); border-color: rgba(91,156,246,0.55); }
  .cd-light .de-preset { color: #374151; border-color: #d1d5db; }
  .cd-light .de-preset-on { color: #1f4fbf; background: rgba(91,156,246,0.12); border-color: #5b9cf6; }
  .de-preset:focus-visible, .de-btn:focus-visible { outline: 2px solid #5b9cf6; outline-offset: 2px; }
  .de-dates { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .de-input {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 15px; letter-spacing: 0.14em;
    background: rgba(255,255,255,0.04); color: inherit; border: 1px solid rgba(255,255,255,0.14);
    border-radius: 10px; padding: 12px 13px; width: 100%; min-height: 46px;
  }
  .cd-light .de-input { background: #f9fafb; border-color: #d1d5db; }
  .de-input:focus-visible { outline: 2px solid #5b9cf6; outline-offset: 1px; }
  .de-error { margin: 0; font-size: 12.5px; color: #f06a6a; }
  .de-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
  .de-btn {
    min-height: 40px; padding: 0 16px; border-radius: 10px; cursor: pointer;
    font: 600 13px/1 'Inter', system-ui, sans-serif;
    color: #c2c8da; background: transparent; border: 1px solid rgba(255,255,255,0.14);
  }
  .de-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .de-btn-primary { color: #fff; background: #5b9cf6; border-color: #5b9cf6; }
  .de-btn-primary:hover:not(:disabled) { background: #4a8ae6; }
  .cd-light .de-btn { color: #374151; border-color: #d1d5db; }
  .cd-light .de-btn-primary { color: #fff; }
  @keyframes de-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes de-up { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
  @media (pointer: coarse) { .de-trigger, .de-preset { min-height: 44px; } }
  @media (prefers-reduced-motion: reduce) { .de-backdrop, .de-dialog { animation: none; } .de-trigger { transition: none; } }
`;
