// The platform admin's queue of companies asking for access.
//
// A company's public form collects identity documents on this domain, so who
// gets one is decided here, by a person, before the first buyer arrives.
//
// UX rules this follows deliberately:
//   - cards rather than a table: each request is read, not scanned, and the
//     applicant's own note is the most useful thing on it
//   - approving asks for confirmation, because it puts a form live
//   - declining opens a reason field in place — the applicant is sent the
//     reason, so the button stays disabled until there is one
//   - state is said in words as well as colour (Waiting / Approved / Declined)
//   - secondary text uses the mid tone: the dim tone fails 4.5:1 on cards
import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { useConfirm } from './ConfirmDialog.tsx';
import { useToast } from './Toast.tsx';
import { ACCESS_REQUESTS, type AccessRequest } from '../lib/accessRequests.ts';

const APPROVE = gql`mutation ApproveAccess($id: ID!) { approveCompanyAccess(id: $id) { id status decidedAt } }`;
const REJECT = gql`mutation RejectAccess($id: ID!, $reason: String!) { rejectCompanyAccess(id: $id, reason: $reason) { id status rejectionReason decidedAt } }`;


const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

export function AccessRequestsTab() {
  const confirm = useConfirm();
  const toast = useToast();
  const { data, loading, error, refetch } = useQuery<{ accessRequests: AccessRequest[] }>(ACCESS_REQUESTS, { fetchPolicy: 'cache-and-network' });
  const [approve, { loading: approving }] = useMutation(APPROVE);
  const [reject, { loading: rejecting }] = useMutation(REJECT);
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const all = data?.accessRequests ?? [];
  const waiting = all.filter(r => r.status === 'PENDING');
  const decided = all.filter(r => r.status !== 'PENDING');

  const onApprove = async (r: AccessRequest) => {
    const ok = await confirm({
      title: `Approve ${r.name}?`,
      message: `Their form at /${r.slug} goes live and starts collecting identity documents. ${r.ownerName ?? 'The owner'} is emailed.`,
      confirmLabel: 'Approve and open form',
    });
    if (!ok) return;
    try {
      await approve({ variables: { id: r.id } });
      toast.success(`${r.name} approved`);
      refetch();
    } catch (e) { toast.error((e as Error).message); }
  };

  const onReject = async (r: AccessRequest) => {
    try {
      await reject({ variables: { id: r.id, reason: reason.trim() } });
      toast.success(`${r.name} declined`);
      setDeclining(null); setReason('');
      refetch();
    } catch (e) { toast.error((e as Error).message); }
  };

  if (loading && all.length === 0) return <div className="db-state">Loading requests…</div>;
  if (error) return <div className="db-state db-state-err">Failed to load: {error.message}</div>;

  return (
    <div className="ar-wrap">
      <style>{styles}</style>
      <header className="ar-head">
        <h2 className="ar-title">Access requests</h2>
        <p className="ar-sub">
          A company can sign in and set up straight away, but its form stays closed until it is approved here.
        </p>
      </header>

      {waiting.length === 0 ? (
        <div className="ar-empty">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Nothing waiting. New requests appear here and are emailed to the admin address.
        </div>
      ) : (
        <ul className="ar-list" aria-label="Waiting for a decision">
          {waiting.map(r => (
            <li key={r.id} className="ar-card">
              <div className="ar-card-top">
                <div>
                  <div className="ar-name">{r.name}</div>
                  <div className="ar-meta">/{r.slug} · requested {when(r.createdAt)}</div>
                </div>
                <span className="db-badge db-badge-amber">Waiting</span>
              </div>

              <dl className="ar-facts">
                <div><dt>Applicant</dt><dd>{r.ownerName} &lt;{r.ownerEmail}&gt;</dd></div>
                <div>
                  <dt>Email</dt>
                  <dd>{r.ownerEmailVerified
                    ? <span className="ar-ok">Confirmed</span>
                    : <span className="ar-warn">Not confirmed yet — the form stays closed until it is, even if approved</span>}</dd>
                </div>
                <div><dt>Form</dt><dd>{r.formConfigured ? 'Set up' : 'Not set up yet'}</dd></div>
              </dl>

              <div className="ar-note">
                <span className="ar-note-label">What they told us</span>
                {r.requestNote
                  ? <p className="ar-note-text">{r.requestNote}</p>
                  : <p className="ar-note-text ar-note-empty">No note. Look the company up before approving.</p>}
              </div>

              {declining === r.id ? (
                <div className="ar-decline">
                  <label className="ar-decline-label" htmlFor={`ar-reason-${r.id}`}>Reason — sent to the applicant</label>
                  <textarea id={`ar-reason-${r.id}`} className="ar-textarea" rows={3} maxLength={1000} autoFocus
                    value={reason} onChange={e => setReason(e.target.value)}
                    placeholder="e.g. We could not confirm the business behind this request." />
                  <div className="ar-actions">
                    <button className="ar-btn ar-btn-ghost" onClick={() => { setDeclining(null); setReason(''); }}>Cancel</button>
                    <button className="ar-btn ar-btn-danger" disabled={rejecting || reason.trim().length < 3} onClick={() => onReject(r)}>
                      {rejecting ? 'Declining…' : 'Decline request'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="ar-actions">
                  <button className="ar-btn ar-btn-ghost" onClick={() => { setDeclining(r.id); setReason(''); }}>Decline…</button>
                  <button className="ar-btn ar-btn-primary" disabled={approving} onClick={() => onApprove(r)}>Approve</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {decided.length > 0 && (
        <section className="ar-decided" aria-labelledby="ar-decided-title">
          <h3 className="ar-decided-title" id="ar-decided-title">Recently decided</h3>
          <ul className="ar-decided-list">
            {decided.map(r => (
              <li key={r.id} className="ar-decided-row">
                <span className="ar-decided-name">{r.name}</span>
                {r.status === 'APPROVED'
                  ? <span className="db-badge db-badge-green">Approved</span>
                  : <span className="db-badge db-badge-red">Declined</span>}
                <span className="ar-decided-when">{when(r.decidedAt)}</span>
                {r.status === 'REJECTED' && r.rejectionReason && <span className="ar-decided-reason">{r.rejectionReason}</span>}
                {r.status === 'REJECTED' && (
                  <button className="ar-link" disabled={approving} onClick={() => onApprove(r)}>Approve after all</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

const styles = `
  .ar-wrap { display: flex; flex-direction: column; gap: 20px; max-width: 860px; }
  .ar-head { display: flex; flex-direction: column; gap: 6px; }
  .ar-title { margin: 0; font-size: 17px; font-weight: 600; color: var(--text); letter-spacing: -0.01em; }
  .ar-sub { margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-mid); max-width: 68ch; }

  .ar-empty {
    display: flex; align-items: center; gap: 10px;
    padding: 18px 20px; border: 1px dashed var(--border2); border-radius: var(--r);
    font-size: 13px; color: var(--text-mid);
  }
  .ar-empty svg { color: var(--green); flex-shrink: 0; }

  .ar-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
  .ar-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--r);
    padding: 18px 20px; display: flex; flex-direction: column; gap: 14px;
  }
  .ar-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .ar-name { font-size: 15px; font-weight: 600; color: var(--text); }
  .ar-meta { font-size: 12px; color: var(--text-mid); margin-top: 3px; font-variant-numeric: tabular-nums; }

  .ar-facts { margin: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px 20px; }
  .ar-facts dt { font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-mid); margin-bottom: 3px; }
  .ar-facts dd { margin: 0; font-size: 13px; color: var(--text); overflow-wrap: anywhere; }
  .ar-ok { color: var(--green); }
  .ar-warn { color: var(--amber); }

  .ar-note { background: var(--surface2); border-radius: var(--r-sm); padding: 12px 14px; }
  .ar-note-label { font-size: 10.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-mid); }
  .ar-note-text { margin: 6px 0 0; font-size: 13.5px; line-height: 1.6; color: var(--text); white-space: pre-wrap; overflow-wrap: anywhere; }
  .ar-note-empty { color: var(--text-mid); font-style: italic; }

  .ar-actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
  .ar-btn {
    font: inherit; font-size: 13px; font-weight: 600; min-height: 40px; padding: 0 18px;
    border-radius: var(--r-sm); cursor: pointer; border: 1px solid transparent;
    transition: background 150ms ease-out, border-color 150ms ease-out, opacity 150ms ease-out;
  }
  .ar-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .ar-btn:focus-visible, .ar-link:focus-visible, .ar-textarea:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
  .ar-btn-primary { background: var(--blue); color: #0f0f10; }
  .ar-btn-primary:hover:not(:disabled) { background: #74acf8; }
  .ar-btn-ghost { background: transparent; color: var(--text); border-color: var(--border2); }
  .ar-btn-ghost:hover:not(:disabled) { border-color: var(--text-mid); }
  .ar-btn-danger { background: var(--accent); color: #fff; }
  .ar-btn-danger:hover:not(:disabled) { background: #ff6473; }

  .ar-decline { display: flex; flex-direction: column; gap: 8px; }
  .ar-decline-label { font-size: 12px; font-weight: 600; color: var(--text); }
  .ar-textarea {
    font: inherit; font-size: 13.5px; line-height: 1.5; color: var(--text);
    background: var(--bg); border: 1px solid var(--border2); border-radius: var(--r-sm);
    padding: 10px 12px; resize: vertical;
  }

  .ar-decided { display: flex; flex-direction: column; gap: 10px; }
  .ar-decided-title { margin: 0; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-mid); }
  .ar-decided-list { list-style: none; margin: 0; padding: 0; border: 1px solid var(--border); border-radius: var(--r); }
  .ar-decided-row {
    display: flex; align-items: center; flex-wrap: wrap; gap: 6px 12px;
    padding: 12px 16px; border-bottom: 1px solid var(--border); font-size: 13px;
  }
  .ar-decided-row:last-child { border-bottom: 0; }
  .ar-decided-name { color: var(--text); font-weight: 500; }
  .ar-decided-when { color: var(--text-mid); font-size: 12px; font-variant-numeric: tabular-nums; }
  .ar-decided-reason { flex-basis: 100%; color: var(--text-mid); font-size: 12.5px; }
  .ar-link {
    margin-left: auto; font: inherit; font-size: 12px; color: var(--blue); background: none; border: 0;
    cursor: pointer; padding: 10px 4px; text-decoration: underline; text-underline-offset: 2px;
  }

  @media (pointer: coarse) { .ar-btn { min-height: 44px; } }
  @media (prefers-reduced-motion: reduce) { .ar-btn { transition: none; } }
`;
