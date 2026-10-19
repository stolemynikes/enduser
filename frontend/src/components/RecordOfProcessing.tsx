// A ready entry for the seller's own record of processing activities
// (GDPR Art. 30). Every controller keeps one; this is the line for "end-user
// statements", written from the same facts as the Privacy Policy and the DPA
// (lib/legal.ts), so the three cannot disagree. The legal basis is left for
// the seller to confirm: it is theirs to state, not ours.
import { useState } from 'react';
import { RETENTION_MONTHS, SUB_PROCESSORS } from '../lib/legal.ts';

function entryText(companyName: string, origin: string): string {
  const outsideEu = SUB_PROCESSORS.filter(s => /United States/.test(s.location));
  return [
    `Processing activity: Collecting and verifying end-user statements for restricted chemical substances`,
    `Controller: ${companyName}`,
    `Processor: eustatement (statement form, checks and dashboard), under the Data Processing Agreement at ${origin}/dpa`,
    `Purposes: Verifying that buyers of substances listed in Regulation (EU) 2019/1148 are who they say they are and state a legitimate use; deciding whether to supply; reporting suspicious transactions where required.`,
    `Legal basis: [confirm — usually legal obligation, Art. 6(1)(c), and legitimate interest, Art. 6(1)(f)]`,
    `Data subjects: Buyers and the people acting for buyer companies; our own staff who review statements.`,
    `Categories of personal data: Name, email address, postal address, order number, company name and VAT number, the substances ordered and the stated use; where identity verification is on: identity document type, number, name and expiry, and the outcome of a liveness and face-match check; for staff: name, email and their decisions.`,
    `Special categories: The face match compares a selfie with the document photo (biometric data, Art. 9). The photos are processed by the identity-verification provider and deleted after the check; only the outcome is kept. [Assess in your DPIA.]`,
    `Recipients: Our reviewers; the processor; its sub-processors: ${SUB_PROCESSORS.map(s => `${s.name} (${s.purpose.toLowerCase()})`).join('; ')}.`,
    `Transfers outside the EU: ${outsideEu.length ? outsideEu.map(s => `${s.name} — ${s.location}`).join('; ') : 'none'}.`,
    `Retention: Each statement is deleted automatically ${RETENTION_MONTHS} months after it was submitted; identity-check photos are deleted at the provider after the check.`,
    `Security measures: As described in the processor's security overview at ${origin}/security and in the DPA.`,
  ].join('\n');
}

export function RecordOfProcessing({ companyName }: { companyName: string }) {
  const [copied, setCopied] = useState(false);
  const text = entryText(companyName, window.location.origin);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard refused: the text is selectable below */ }
  };
  return (
    <div className="cd-embed">
      <div className="cd-formcfg-info">
        <span className="cd-formcfg-label">Record of processing (GDPR Art. 30)</span>
        <span className="cd-formcfg-desc">
          The entry for your own register, filled in from our Privacy Policy and DPA. Check the two parts in
          [brackets] — the legal basis and the biometric assessment are yours to confirm.
        </span>
      </div>
      <textarea className="cd-ropa" readOnly value={text} rows={10} aria-label="Record of processing entry" />
      <div className="cd-embed-row">
        <button className="cd-embed-btn" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy the entry'}</button>
        <span className="cd-ropa-status" role="status">{copied ? 'Copied to the clipboard.' : ''}</span>
      </div>
      <style>{`
        .cd-ropa {
          width: 100%; font: 12.5px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--cd-text);
          background: var(--cd-surface3); border: 1px solid var(--cd-border2); border-radius: var(--cd-r-sm);
          padding: 10px 12px; resize: vertical; margin: 8px 0;
        }
        .cd-ropa:focus-visible { outline: 2px solid var(--cd-blue); outline-offset: 1px; }
        .cd-ropa-status { font-size: 12px; color: var(--cd-text-mid); }
      `}</style>
    </div>
  );
}
