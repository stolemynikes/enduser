// Checking a statement PDF.
//
// The buyer's copy prints a reference and a code with a link here. Whoever
// holds it — the buyer, or an authority they show it to — sees whether the
// platform holds that statement, when it was submitted, to which seller and
// its status now. Nothing about the buyer is shown: they have the PDF.
import { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { gql } from '@apollo/client';
import { useLazyQuery } from '@apollo/client/react';
import { DocLayout } from '../src/components/DocLayout.tsx';

const CHECK = gql`
  query CheckStatement($reference: String!, $code: String!) {
    checkStatement(reference: $reference, code: $code) { result submittedAt sellerName status }
  }
`;

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export default function StatementCheck() {
  const params = useParams();
  const [search] = useSearchParams();
  const [reference, setReference] = useState(params.reference ?? '');
  const [code, setCode] = useState(search.get('c') ?? '');
  const [run, { data, loading, error }] = useLazyQuery<any>(CHECK, { fetchPolicy: 'no-cache' });
  const r = data?.checkStatement;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void run({ variables: { reference: reference.trim(), code: code.trim() } });
  };

  return (
    <DocLayout title="Check a statement" intro={
      <p>
        Enter the reference and the code printed at the bottom of an end-user statement PDF to see whether it is a
        genuine statement held on eustatement. Only the date, the seller and the current status are shown — nothing
        about the buyer.
      </p>
    }>
      <form className="sc-form" onSubmit={submit}>
        <label className="sc-field">
          <span>Reference</span>
          <input value={reference} onChange={e => setReference(e.target.value)} spellCheck={false} autoComplete="off"
            placeholder="e.g. 6cc98c7a-2fd9-4ff1-aa24-af2a9ae72f32" required />
        </label>
        <label className="sc-field">
          <span>Code</span>
          <input value={code} onChange={e => setCode(e.target.value)} spellCheck={false} autoComplete="off"
            placeholder="e.g. 3F9A2-C81D0-77B4E-0A1C2" required />
        </label>
        <button className="sc-btn" type="submit" disabled={loading || !reference.trim() || !code.trim()}>
          {loading ? 'Checking…' : 'Check'}
        </button>
      </form>

      <div aria-live="polite">
        {error && <p className="sc-result sc-bad">The check could not be completed. Try again in a minute.</p>}
        {r?.result === 'GENUINE' && (
          <div className="sc-result sc-ok">
            <p><strong>Genuine.</strong> This statement is held on eustatement.</p>
            <ul>
              <li>Submitted on {dateLabel(r.submittedAt)}</li>
              {r.sellerName && <li>To {r.sellerName}</li>}
              <li>Status now: {r.status}</li>
            </ul>
            <p>Compare the other details with the PDF in front of you; for anything more, ask the seller.</p>
          </div>
        )}
        {r?.result === 'GENUINE_NOT_HELD' && (
          <div className="sc-result sc-ok">
            <p><strong>The reference and code are genuine,</strong> but the statement is no longer held — statements are deleted automatically after a fixed period. Ask the seller for their records.</p>
          </div>
        )}
        {r?.result === 'UNKNOWN' && (
          <div className="sc-result sc-bad">
            <p><strong>Not recognised.</strong> No statement matches this reference and code. Check both for typing errors; the code is printed at the bottom of the PDF. If they are right, the PDF may not be genuine — <Link to="/security">report a concern</Link>.</p>
          </div>
        )}
      </div>

      <style>{`
        .sc-form { display: grid; gap: 14px; max-width: 520px; margin-top: 8px; }
        .sc-field { display: grid; gap: 6px; font-size: 13px; font-weight: 600; color: var(--text-mid); }
        .sc-field input {
          font: 15px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0.02em;
          color: var(--text); background: var(--surface); border: 1px solid var(--border);
          border-radius: 10px; padding: 12px 14px; min-height: 46px;
        }
        .sc-field input:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
        .sc-btn {
          justify-self: start; min-height: 46px; padding: 0 22px; border-radius: 10px; border: 0; cursor: pointer;
          font-family: inherit; font-size: 15px; font-weight: 600; color: #fff; background: var(--accent);
        }
        .sc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .sc-btn:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
        .sc-result { margin-top: 24px; padding: 14px 18px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); }
        .sc-result p { margin: 0 0 8px; }
        .sc-result p:last-child { margin-bottom: 0; }
        .sc-ok { border-left: 3px solid #3ecf8e; }
        .sc-bad { border-left: 3px solid #f06a6a; }
      `}</style>
    </DocLayout>
  );
}
