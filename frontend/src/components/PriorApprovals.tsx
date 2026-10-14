// "You have approved this before."
//
// A repeat customer orders the same solvent every quarter and writes the same
// declaration every time. This tells the reviewer that, with a link to the
// decision they already made, so the second review is a confirmation rather
// than a fresh read.
//
// It is context, never a verdict: the approval gate is untouched, so a repeat
// buyer whose identity check just failed is still blocked. The notice says what
// matched — the same person, the same company, the same substances — because
// "we have seen this before" is only useful if you can see on what grounds.
import { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

const PRIOR_APPROVALS = gql`
  query PriorApprovals($id: ID!) {
    priorApprovals(id: $id) {
      total
      oldestAt
      matches { id buyerName approvedAt approvedByName statementMatch matchedOn }
    }
  }
`;

type Match = {
  id: string;
  buyerName: string;
  approvedAt: string | null;
  approvedByName: string | null;
  statementMatch: number;
  matchedOn: string[];
};

const GROUND: Record<string, string> = {
  DOCUMENT: 'same identity document',
  VAT: 'same company',
  SUBSTANCE: 'same substances',
};

export function PriorApprovals({
  submissionId,
  onOpen,
}: {
  submissionId: string;
  onOpen?: (id: string) => void;
}) {
  const { data } = useQuery<any>(PRIOR_APPROVALS, {
    variables: { id: submissionId },
    fetchPolicy: 'cache-and-network',
  });
  // Read once when the panel opens; "months ago" does not need to tick.
  const [now] = useState(Date.now);

  const prior = data?.priorApprovals;
  const matches: Match[] = prior?.matches ?? [];
  const total: number = prior?.total ?? 0;
  const oldestAt: string | null = prior?.oldestAt ?? null;
  if (total === 0) return null;

  const months = oldestAt
    ? Math.floor((now - new Date(oldestAt).getTime()) / (30 * 24 * 60 * 60 * 1000))
    : 0;
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="pa-block">
      <style>{styles}</style>
      <p className="pa-title">
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3.5 10a6.5 6.5 0 1111.3 4.4" /><path d="M14.5 17v-3h3" />
          <path d="M10 6.5V10l2.5 1.5" />
        </svg>
        {total === 1 ? 'Approved before' : `Approved ${total} times before`}
      </p>
      {oldestAt && (
        <p className="pa-span">
          {/* Said in these words on purpose. "Since March 2025" would read as
              first contact, and it is not — it is the oldest record we still
              hold, because nothing outlives the eighteen-month retention. A
              buyer who has been coming back for three years looks eighteen
              months old here, and a reviewer has to know that to judge it. */}
          Oldest on record {date(oldestAt)}
          {months >= 1 && ` · ${months} month${months === 1 ? '' : 's'} of history`}
          . Older statements have been deleted, so this is not necessarily the
          first time.
          {months >= 12 && (
            <strong className="pa-stale">
              {' '}This buyer has been approved on the strength of earlier decisions for a
              while — worth a fresh look rather than another nod.
            </strong>
          )}
        </p>
      )}
      <ul className="pa-list">
        {matches.map(m => (
          <li key={m.id} className="pa-item">
            <span className="pa-item-main">
              <b>{m.buyerName}</b>
              {m.approvedAt && <> on {date(m.approvedAt)}</>}
              {m.approvedByName && <> by {m.approvedByName}</>}
            </span>
            <span className="pa-item-meta">
              {m.matchedOn.map(g => GROUND[g] ?? g.toLowerCase()).join(' · ')}
              {' · '}
              {/* The percentage is deliberately plain: it is a word-overlap
                  score over the stated use, not a judgement about it. */}
              stated use {m.statementMatch}% alike
            </span>
            {onOpen && (
              <button className="pa-open" onClick={() => onOpen(m.id)}>
                Open that one
              </button>
            )}
          </li>
        ))}
      </ul>
      {total > matches.length && (
        <p className="pa-more">
          {total - matches.length} older match{total - matches.length === 1 ? '' : 'es'} not listed.
        </p>
      )}
      <p className="pa-note">
        Shown for context. The automated checks on this statement still have to pass on their own.
      </p>
    </div>
  );
}

const styles = `
  .pa-block {
    border: 1px solid rgba(91,156,246,0.3); background: rgba(91,156,246,0.07);
    border-radius: var(--cd-r); padding: 13px 15px; margin-bottom: 1.25rem;
  }
  .pa-title {
    display: flex; align-items: center; gap: 7px; margin: 0 0 9px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--cd-blue);
  }
  .pa-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }
  .pa-item { display: grid; grid-template-columns: 1fr auto; gap: 2px 12px; align-items: baseline; }
  .pa-item-main { grid-column: 1; font-size: 12.5px; color: var(--cd-text); line-height: 1.5; }
  .pa-item-meta {
    grid-column: 1; font-size: 10px; font-weight: 600; letter-spacing: 0.05em;
    text-transform: uppercase; color: var(--cd-text-dim);
  }
  .pa-open {
    grid-column: 2; grid-row: 1 / span 2; align-self: center;
    font-family: inherit; font-size: 11px; font-weight: 600; white-space: nowrap;
    color: var(--cd-blue); background: none; border: 1px solid rgba(91,156,246,0.35);
    border-radius: var(--cd-r-pill); padding: 6px 12px; cursor: pointer;
    transition: background 160ms ease-out, border-color 160ms ease-out;
  }
  .pa-open:hover { background: rgba(91,156,246,0.14); border-color: rgba(91,156,246,0.6); }
  .pa-open:focus-visible { outline: 2px solid var(--cd-blue); outline-offset: 1px; }
  .pa-note { margin: 10px 0 0; font-size: 11px; line-height: 1.5; color: var(--cd-text-dim); }
  .pa-span {
    margin: 0 0 10px; font-size: 11.5px; line-height: 1.55; color: var(--cd-text-mid);
  }
  /* A nudge, not a verdict: amber because it asks for attention, and worded as
     a suggestion because the decision stays the reviewer's. */
  .pa-stale { color: var(--cd-amber); font-weight: 600; }
  .pa-more { margin: 8px 0 0; font-size: 11px; color: var(--cd-text-dim); }

  @media (max-width: 620px) {
    .pa-item { grid-template-columns: 1fr; }
    .pa-open { grid-column: 1; grid-row: auto; justify-self: start; margin-top: 4px; }
  }
  @media (prefers-reduced-motion: reduce) { .pa-open { transition: none; } }
`;
