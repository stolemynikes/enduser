// Who looked at a document number, and when.
//
// The reveal control makes a sensitive read deliberate. This makes it
// accountable, which is the half that matters afterwards: before it existed,
// somebody reading four hundred submissions looked exactly like somebody
// reading one, and there was no way to show that an incident had stopped at
// twelve rows.
//
// UX rules this follows deliberately:
//   - an empty state that explains rather than showing a bare "no data"
//   - tabular numerals and a fixed column order, so a scan down the list works
//   - support access marked with a word and a shape, not only a colour
//   - the table scrolls inside its own container so the page never does
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

const REVEAL_LOG = gql`
  query RevealLog { revealLog(limit: 50) { id submissionId userName bySupport at } }
`;

type Entry = {
  id: string;
  submissionId: string;
  userName: string;
  bySupport: boolean;
  at: string;
};

export function RevealLog({ onOpenSubmission }: { onOpenSubmission?: (id: string) => void }) {
  const { data, loading, error } = useQuery<any>(REVEAL_LOG, { fetchPolicy: 'cache-and-network' });
  const entries: Entry[] = data?.revealLog ?? [];

  return (
    <div className="rl-block">
      <style>{styles}</style>
      <div className="rl-head">
        <span className="rl-title">Document number look-ups</span>
        <span className="rl-sub">
          Reading a buyer&rsquo;s identity document number needs a fresh code and is recorded here.
          Nothing else on a submission is logged this way — no review decision needs that number,
          so every entry is somebody choosing to look.
        </span>
      </div>

      {loading && entries.length === 0 && <p className="rl-state">Loading…</p>}
      {error && <p className="rl-state rl-state--err" role="alert">Could not load the log.</p>}

      {!loading && entries.length === 0 && !error && (
        <p className="rl-state">
          Nothing yet. Document numbers have not been opened in this company.
        </p>
      )}

      {entries.length > 0 && (
        <div className="rl-scroll">
          <table className="rl-table">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Who</th>
                <th scope="col">Submission</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id}>
                  <td className="rl-when">
                    {new Date(e.at).toLocaleString('en-GB', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td>
                    {e.userName}
                    {e.bySupport && (
                      // Marked with a word as well as a colour: a reader who
                      // cannot separate the amber needs to see "support".
                      <span className="rl-support">
                        <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <circle cx="10" cy="10" r="7" /><path d="M10 7v4M10 13.5v.5" />
                        </svg>
                        platform support
                      </span>
                    )}
                  </td>
                  <td>
                    {onOpenSubmission ? (
                      <button className="rl-open" onClick={() => onOpenSubmission(e.submissionId)}>
                        Open
                      </button>
                    ) : (
                      <code className="rl-id">{e.submissionId.slice(0, 8)}</code>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = `
  .rl-block {
    border: 1px solid var(--cd-border); background: var(--cd-surface2);
    border-radius: var(--cd-r); overflow: hidden;
    display: flex; flex-direction: column;
  }
  .rl-head {
    padding: 16px 18px; border-bottom: 1px solid var(--cd-border);
    display: flex; flex-direction: column; gap: 5px;
  }
  .rl-title { font-size: 13px; font-weight: 700; color: var(--cd-text); }
  .rl-sub { font-size: 11.5px; line-height: 1.6; color: var(--cd-text-mid); max-width: 70ch; }
  .rl-state { margin: 0; padding: 22px 18px; font-size: 12px; line-height: 1.6; color: var(--cd-text-dim); }
  .rl-state--err { color: var(--cd-accent); }

  /* The table scrolls inside here, so a long name never makes the page scroll. */
  .rl-scroll { overflow-x: auto; max-height: 340px; overflow-y: auto; }
  .rl-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .rl-table th {
    position: sticky; top: 0; z-index: 10; /* Z.STICKY */
    text-align: left; font-size: 10px; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--cd-text-dim);
    background: var(--cd-surface2); padding: 9px 18px;
    border-bottom: 1px solid var(--cd-border);
  }
  .rl-table td {
    padding: 10px 18px; color: var(--cd-text);
    border-bottom: 1px solid var(--cd-border); vertical-align: middle;
  }
  .rl-table tbody tr:last-child td { border-bottom: none; }
  .rl-when { color: var(--cd-text-mid); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .rl-id {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px; color: var(--cd-text-dim);
  }
  .rl-support {
    display: inline-flex; align-items: center; gap: 4px; margin-left: 8px;
    font-size: 9.5px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
    color: var(--cd-amber); background: rgba(245,166,35,0.1);
    border: 1px solid rgba(245,166,35,0.3); border-radius: var(--cd-r-pill);
    padding: 2px 7px; white-space: nowrap;
  }
  .rl-open {
    font-family: inherit; font-size: 11px; font-weight: 600; cursor: pointer;
    color: var(--cd-blue); background: none; border: 1px solid rgba(91,156,246,0.3);
    border-radius: var(--cd-r-pill); padding: 5px 12px;
    transition: background 160ms ease-out;
  }
  .rl-open:hover { background: rgba(91,156,246,0.12); }
  .rl-open:focus-visible { outline: 2px solid var(--cd-blue); outline-offset: 1px; }

  @media (prefers-reduced-motion: reduce) { .rl-open { transition: none; } }
`;
