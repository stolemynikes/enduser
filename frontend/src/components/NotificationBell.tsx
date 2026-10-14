// Activity: what happened in this company, newest first.
//
// Two parts. ActivityNavItem is the sidebar entry, with the unread count written
// out next to the dot so the colour is never the only signal. ActivityFeed is
// the page itself: every notice with an icon and a word for its severity,
// grouped by day, with "Mark all read", "Clear all" and a clear button per row.
//
// Clearing is per person: the server hides a cleared notice for whoever cleared
// it, and the rest of the team still sees it.
import { useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import { useConfirm } from './ConfirmDialog.tsx';

const NOTIFICATIONS = gql`
  query Notifications {
    notifications(limit: 100) { id kind title body submissionId read createdAt }
  }
`;

const UNREAD_COUNT = gql`
  query UnreadNotificationCount { unreadNotificationCount }
`;

const MARK_READ = gql`
  mutation MarkNotificationsRead($ids: [ID!]) { markNotificationsRead(ids: $ids) }
`;

const CLEAR = gql`
  mutation ClearNotifications($ids: [ID!]) { clearNotifications(ids: $ids) }
`;

type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  submissionId: string | null;
  read: boolean;
  createdAt: string;
};

/** How loud a kind is. Drives the icon colour and the word in the row's meta line. */
const SEVERITY: Record<string, { tone: 'danger' | 'warn' | 'info'; word: string }> = {
  SUBSTANCE_FLAGGED: { tone: 'danger', word: 'Needs review' },
  IDENTITY_DECLINED: { tone: 'danger', word: 'Failed check' },
  VIES_INVALID: { tone: 'danger', word: 'Failed check' },
  DOCUMENT_EXPIRING: { tone: 'warn', word: 'Expiring' },
  SUPPORT_ACCESS: { tone: 'warn', word: 'Account access' },
  DUPLICATE_SEEN: { tone: 'info', word: 'Seen before' },
  SUBMISSION_RECEIVED: { tone: 'info', word: 'New' },
  ROLE_CHANGED: { tone: 'info', word: 'Your account' },
  INVITE_ACCEPTED: { tone: 'info', word: 'Team' },
};

function Icon({ kind }: { kind: string }) {
  const common = {
    width: 16, height: 16, viewBox: '0 0 20 20', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.8,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (kind) {
    case 'SUBSTANCE_FLAGGED':
      return <svg {...common}><path d="M8 3h4M9 3v4.5L5.5 14a2 2 0 001.8 3h5.4a2 2 0 001.8-3L11 7.5V3" /></svg>;
    case 'IDENTITY_DECLINED':
      return <svg {...common}><path d="M10 2.5l6 2.5v5c0 3.5-2.4 6.4-6 7.5-3.6-1.1-6-4-6-7.5V5l6-2.5z" /><path d="M8 8l4 4m0-4l-4 4" /></svg>;
    case 'VIES_INVALID':
      return <svg {...common}><rect x="3" y="5" width="14" height="11" rx="2" /><path d="M6 9h4M6 12h7" /></svg>;
    case 'DOCUMENT_EXPIRING':
      return <svg {...common}><circle cx="10" cy="10" r="7" /><path d="M10 6.5V10l2.5 2" /></svg>;
    case 'DUPLICATE_SEEN':
      return <svg {...common}><rect x="7" y="7" width="9" height="9" rx="2" /><path d="M13 7V5.5A1.5 1.5 0 0011.5 4H5.5A1.5 1.5 0 004 5.5v6A1.5 1.5 0 005.5 13H7" /></svg>;
    case 'ROLE_CHANGED':
      return <svg {...common}><circle cx="10" cy="7" r="3" /><path d="M4 17c0-2.8 2.7-5 6-5s6 2.2 6 5" /></svg>;
    case 'INVITE_ACCEPTED':
      return <svg {...common}><circle cx="8" cy="7" r="3" /><path d="M2.5 17c0-2.8 2.5-5 5.5-5" /><path d="M13 10h5m-2.5-2.5v5" /></svg>;
    case 'SUPPORT_ACCESS':
      return <svg {...common}><circle cx="10" cy="10" r="7" /><circle cx="10" cy="10" r="2.5" /><path d="M12 5.2l1.6-2.8M8 5.2L6.4 2.4M12 14.8l1.6 2.8M8 14.8l-1.6 2.8" /></svg>;
    default:
      return <svg {...common}><path d="M4 5h12M4 10h12M4 15h7" /></svg>;
  }
}

/** "4m ago", "3h ago" — scanned, not read, so the stamp stays short. */
function ago(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/** "Today", "Yesterday", or the date — the heading over each day's group. */
function dayLabel(iso: string, now: number): string {
  const d = new Date(iso);
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const diffDays = Math.round((start.getTime() - new Date(d).setHours(0, 0, 0, 0)) / 86_400_000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** The sidebar entry: opens the Activity page, with the unread count beside it. */
export function ActivityNavItem({ active, onOpen }: { active: boolean; onOpen: () => void }) {
  // The count is polled, so a dashboard left open overnight costs one small
  // query a minute.
  const { data } = useQuery<any>(UNREAD_COUNT, { pollInterval: 60_000, fetchPolicy: 'cache-and-network' });
  const unread: number = data?.unreadNotificationCount ?? 0;
  return (
    <>
    <style>{navStyles}</style>
    <button
      className={`cd-sb-item${active ? ' cd-sb-active' : ''}`}
      onClick={onOpen}
      aria-current={active ? 'page' : undefined}
      aria-label={unread > 0 ? `Activity, ${unread} unread` : 'Activity'}
    >
      <span className="nb-icon-wrap">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 3a4.5 4.5 0 00-4.5 4.5c0 2.6-.6 4.1-1.2 5A.7.7 0 005 13.6h10a.7.7 0 00.6-1.1c-.5-.9-1.1-2.4-1.1-5A4.5 4.5 0 0010 3z" />
          <path d="M8.2 16a1.9 1.9 0 003.6 0" />
        </svg>
        {unread > 0 && <span className="nb-dot" aria-hidden="true" />}
      </span>
      <span className="cd-sb-label">Activity</span>
      {unread > 0 && <span className="nb-count" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
    </button>
    </>
  );
}

/** The Activity page. */
export function ActivityFeed({ onOpenSubmission }: { onOpenSubmission?: (id: string) => void }) {
  const confirm = useConfirm();
  const { data, loading } = useQuery<any>(NOTIFICATIONS, { fetchPolicy: 'cache-and-network' });
  const refetchQueries = ['Notifications', 'UnreadNotificationCount'];
  const [markRead] = useMutation<any>(MARK_READ, { refetchQueries, awaitRefetchQueries: true });
  const [clear] = useMutation<any>(CLEAR, { refetchQueries, awaitRefetchQueries: true });
  // Rows on their way out, so they can fade before the list closes the gap.
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<'' | 'read' | 'clear'>('');
  const [now] = useState(Date.now);

  const items: Notification[] = (data?.notifications ?? []);
  const unread = items.filter(n => !n.read).length;

  const fadeOut = async (ids: string[]) => {
    setLeaving(new Set(ids));
    await new Promise(r => setTimeout(r, 180));
  };

  const markAll = async () => {
    setBusy('read');
    try { await markRead({ variables: { ids: null } }); } finally { setBusy(''); }
  };

  const clearAll = async () => {
    const ok = await confirm({
      title: 'Clear all activity?',
      message: 'This empties your own activity list. Your team keeps theirs, and nothing about the statements themselves changes.',
      confirmLabel: 'Clear all',
    });
    if (!ok) return;
    setBusy('clear');
    try {
      await fadeOut(items.map(n => n.id));
      await clear({ variables: { ids: null } });
    } finally {
      setBusy('');
      setLeaving(new Set());
    }
  };

  const clearOne = async (n: Notification) => {
    await fadeOut([n.id]);
    try { await clear({ variables: { ids: [n.id] } }); } finally { setLeaving(new Set()); }
  };

  const openRow = async (n: Notification) => {
    if (!n.read) void markRead({ variables: { ids: [n.id] } });
    if (n.submissionId && onOpenSubmission) onOpenSubmission(n.submissionId);
  };

  // Grouped by day, keeping the server's newest-first order.
  const groups: { label: string; items: Notification[] }[] = [];
  for (const n of items) {
    const label = dayLabel(n.createdAt, now);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }

  return (
    <div className="nb-page">
      <style>{pageStyles}</style>
      <div className="nb-page-head">
        <div>
          <h2 className="cd-members-title">Activity</h2>
          <p className="nb-page-sub">
            New statements, failed checks, expiring documents and changes to your team.
            {unread > 0 && <> <b>{unread} unread.</b></>}
          </p>
        </div>
        <div className="nb-page-actions">
          {unread > 0 && (
            <button className="nb-action" onClick={() => void markAll()} disabled={busy !== ''}>
              {busy === 'read' ? 'Marking…' : 'Mark all read'}
            </button>
          )}
          {items.length > 0 && (
            <button className="nb-action nb-action-quiet" onClick={() => void clearAll()} disabled={busy !== ''}>
              {busy === 'clear' ? 'Clearing…' : 'Clear all'}
            </button>
          )}
        </div>
      </div>

      {loading && items.length === 0 && (
        <div className="nb-card" aria-busy="true" aria-label="Loading activity">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="nb-skel-row">
              <span className="nb-skel nb-skel-icon" />
              <span className="nb-skel-lines">
                <span className="nb-skel" style={{ width: `${55 - i * 7}%` }} />
                <span className="nb-skel" style={{ width: `${80 - i * 9}%` }} />
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="nb-card nb-empty">
          <svg width="28" height="28" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 3a4.5 4.5 0 00-4.5 4.5c0 2.6-.6 4.1-1.2 5A.7.7 0 005 13.6h10a.7.7 0 00.6-1.1c-.5-.9-1.1-2.4-1.1-5A4.5 4.5 0 0010 3z" />
            <path d="M8.2 16a1.9 1.9 0 003.6 0" />
          </svg>
          <b>You&rsquo;re all caught up</b>
          <span>New statements, failed checks and expiring documents will appear here.</span>
        </div>
      )}

      {groups.map(g => (
        <section key={g.label} className="nb-group" aria-label={g.label}>
          <h3 className="nb-day">{g.label}</h3>
          <div className="nb-card">
            {g.items.map((n, i) => {
              const sev = SEVERITY[n.kind] ?? { tone: 'info' as const, word: 'Update' };
              const clickable = !!(n.submissionId && onOpenSubmission);
              return (
                <div
                  key={n.id}
                  className={`nb-row nb-${sev.tone}${n.read ? ' nb-read' : ''}${leaving.has(n.id) ? ' nb-leaving' : ''}`}
                  style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                >
                  <button className="nb-row-main" onClick={() => void openRow(n)} disabled={!clickable && n.read}
                    aria-label={clickable ? `${n.title} — open the statement` : n.title}>
                    <span className="nb-row-icon"><Icon kind={n.kind} /></span>
                    <span className="nb-row-text">
                      <span className="nb-row-title">{n.title}</span>
                      {n.body && <span className="nb-row-body">{n.body}</span>}
                      <span className="nb-row-meta">
                        <span className="nb-row-sev">{sev.word}</span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={n.createdAt}>{ago(n.createdAt, now)}</time>
                        {!n.read && <span className="nb-unread-word">· unread</span>}
                      </span>
                    </span>
                    {clickable && (
                      <svg className="nb-row-go" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <button className="nb-row-clear" onClick={() => void clearOne(n)} aria-label={`Clear “${n.title}”`} title="Clear">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

const navStyles = `
  .nb-icon-wrap { position: relative; display: inline-flex; flex: 0 0 auto; }
  /* The dot is a cue, never the message: the count sits beside it. */
  .nb-dot {
    position: absolute; top: -1px; right: -1px; width: 7px; height: 7px;
    border-radius: 50%; background: var(--cd-accent);
    box-shadow: 0 0 0 2px var(--cd-surface);
  }
  .nb-count {
    margin-left: auto; font-size: 10px; font-weight: 700; font-variant-numeric: tabular-nums;
    background: var(--cd-accent); color: #fff; border-radius: var(--cd-r-pill);
    padding: 1px 6px; min-width: 18px; text-align: center;
  }
`;

const pageStyles = `
  .nb-page { display: flex; flex-direction: column; gap: 18px; max-width: 860px; }
  .nb-page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  .nb-page-sub { margin: 4px 0 0; font-size: 12.5px; color: var(--cd-text-dim); }
  .nb-page-sub b { color: var(--cd-blue); font-weight: 600; }
  .nb-page-actions { display: flex; gap: 8px; }
  .nb-action {
    font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--cd-blue);
    background: rgba(91,156,246,0.1); border: 1px solid rgba(91,156,246,0.25);
    border-radius: var(--cd-r-pill); padding: 7px 14px; cursor: pointer;
    transition: background 150ms ease-out, transform 120ms ease-out, opacity 150ms;
  }
  .nb-action:hover:not(:disabled) { background: rgba(91,156,246,0.18); }
  .nb-action:active:not(:disabled) { transform: scale(0.97); }
  .nb-action:disabled { opacity: 0.55; cursor: default; }
  .nb-action-quiet { color: var(--cd-text-mid); background: var(--cd-surface); border-color: var(--cd-border2); }
  .nb-action-quiet:hover:not(:disabled) { background: var(--cd-surface2); color: var(--cd-text); }

  .nb-group { display: flex; flex-direction: column; gap: 8px; }
  .nb-day { margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--cd-text-dim); }
  .nb-card { background: var(--cd-surface); border: 1px solid var(--cd-border); border-radius: var(--cd-r); overflow: hidden; }

  .nb-row {
    display: flex; align-items: stretch; border-bottom: 1px solid var(--cd-border);
    border-left: 3px solid transparent;
    animation: nb-row-in 240ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    transition: opacity 180ms ease-in, transform 180ms ease-in, background 150ms ease-out;
  }
  .nb-row:last-child { border-bottom: none; }
  .nb-row:hover { background: var(--cd-surface2); }
  .nb-leaving { opacity: 0; transform: translateX(12px); }
  @keyframes nb-row-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

  .nb-row-main {
    flex: 1; min-width: 0; display: flex; gap: 12px; align-items: flex-start; text-align: left;
    font-family: inherit; background: none; border: none; padding: 13px 8px 13px 13px; cursor: pointer; color: inherit;
  }
  .nb-row-main:disabled { cursor: default; }
  .nb-row-main:focus-visible, .nb-row-clear:focus-visible { outline: 2px solid var(--cd-blue); outline-offset: -2px; }
  .nb-row-icon { flex: 0 0 auto; margin-top: 1px; }
  .nb-danger .nb-row-icon { color: var(--cd-accent); }
  .nb-warn .nb-row-icon { color: var(--cd-amber); }
  .nb-info .nb-row-icon { color: var(--cd-blue); }
  /* Unread carries the rail; read drops the emphasis, so the states differ by
     more than brightness alone. */
  .nb-danger:not(.nb-read) { border-left-color: var(--cd-accent); }
  .nb-warn:not(.nb-read) { border-left-color: var(--cd-amber); }
  .nb-info:not(.nb-read) { border-left-color: var(--cd-blue); }

  .nb-row-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
  .nb-row-title { font-size: 13px; font-weight: 600; color: var(--cd-text); line-height: 1.4; }
  .nb-read .nb-row-title { font-weight: 500; color: var(--cd-text-mid); }
  .nb-row-body { font-size: 12.5px; line-height: 1.5; color: var(--cd-text-mid); }
  .nb-read .nb-row-body { color: var(--cd-text-dim); }
  .nb-row-meta { font-size: 10.5px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--cd-text-dim); display: flex; gap: 5px; flex-wrap: wrap; margin-top: 2px; }
  .nb-danger .nb-row-sev { color: var(--cd-accent); }
  .nb-warn .nb-row-sev { color: var(--cd-amber); }
  .nb-read .nb-row-sev { color: var(--cd-text-dim); }
  .nb-unread-word { color: var(--cd-blue); }
  .nb-row-go { flex: 0 0 auto; align-self: center; color: var(--cd-text-dim); transition: transform 150ms ease-out, color 150ms; }
  .nb-row:hover .nb-row-go { transform: translateX(2px); color: var(--cd-text-mid); }

  .nb-row-clear {
    flex: 0 0 auto; width: 44px; display: flex; align-items: center; justify-content: center;
    background: none; border: none; border-left: 1px solid transparent; color: var(--cd-text-dim); cursor: pointer;
    opacity: 0.55; transition: opacity 150ms, color 150ms, background 150ms;
  }
  .nb-row:hover .nb-row-clear, .nb-row-clear:focus-visible { opacity: 1; }
  .nb-row-clear:hover { color: var(--cd-accent); background: rgba(240,78,94,0.07); }

  .nb-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 40px 20px; text-align: center; color: var(--cd-text-dim); font-size: 12.5px; }
  .nb-empty svg { color: var(--cd-text-dim); margin-bottom: 4px; }
  .nb-empty b { color: var(--cd-text); font-size: 14px; }

  .nb-skel-row { display: flex; gap: 12px; padding: 15px 14px; border-bottom: 1px solid var(--cd-border); }
  .nb-skel-row:last-child { border-bottom: none; }
  .nb-skel-lines { flex: 1; display: flex; flex-direction: column; gap: 8px; }
  .nb-skel {
    display: block; height: 10px; border-radius: 5px;
    background: linear-gradient(90deg, var(--cd-surface2) 25%, var(--cd-surface3, #2a2a2d) 50%, var(--cd-surface2) 75%);
    background-size: 200% 100%; animation: nb-shimmer 1.2s ease-in-out infinite;
  }
  .nb-skel-icon { width: 16px; height: 16px; border-radius: 50%; flex: none; }
  @keyframes nb-shimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }

  @media (prefers-reduced-motion: reduce) {
    .nb-row, .nb-skel { animation: none; }
    .nb-row, .nb-row-go, .nb-action { transition: none; }
  }
`;
