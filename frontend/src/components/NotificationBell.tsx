// The dashboard's bell: unread count, fold-out panel, one line per event.
//
// It sits in the sidebar next to the other destinations and keeps its label,
// because an icon on its own is the kind of control people never find. The dot
// is never the only signal — the count is written out, and each row carries an
// icon and a word for its severity, so the panel still reads for anyone who
// cannot separate the red from the grey.
import { useCallback, useEffect, useRef, useState } from 'react';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';

const NOTIFICATIONS = gql`
  query Notifications {
    notifications(limit: 30) { id kind title body submissionId read createdAt }
  }
`;

const UNREAD_COUNT = gql`
  query UnreadNotificationCount { unreadNotificationCount }
`;

const MARK_READ = gql`
  mutation MarkNotificationsRead($ids: [ID!]) { markNotificationsRead(ids: $ids) }
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
    width: 15, height: 15, viewBox: '0 0 20 20', fill: 'none',
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

/** "4m", "3h", "2d" — the panel is scanned, not read, so the stamp stays short. */
function ago(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function NotificationBell({ onOpenSubmission }: { onOpenSubmission?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  /**
   * Where to put the panel, in viewport coordinates.
   *
   * It cannot be positioned against the trigger, which is the obvious way to
   * do this: the sidebar sets `overflow-y: auto`, and CSS has no way to scroll
   * one axis while letting the other overflow — the browser promotes the whole
   * box to `auto`. An absolutely positioned panel hanging off the right edge
   * was therefore clipped to nothing. It rendered, it was simply invisible,
   * which is the worst kind of broken because the button still toggled.
   *
   * So the panel is fixed to the viewport and told where to go by measuring the
   * trigger when it opens.
   */
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);

  // The count is polled; the list is only fetched when the panel is opened, so
  // a dashboard left open overnight costs one small query a minute.
  const { data: countData, refetch: refetchCount } =
    useQuery<any>(UNREAD_COUNT, { pollInterval: 60_000, fetchPolicy: 'cache-and-network' });
  const { data, loading, refetch } = useQuery<any>(NOTIFICATIONS, { skip: !open, fetchPolicy: 'cache-and-network' });
  const [markRead] = useMutation<any>(MARK_READ);

  const unread: number = countData?.unreadNotificationCount ?? 0;
  const items: Notification[] = data?.notifications ?? [];

  const close = useCallback(() => setOpen(false), []);

  // Measured on open, and again if the window changes shape underneath it.
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = buttonRef.current?.getBoundingClientRect();
      if (!r) return;
      const PANEL = 364;
      const MAX_HEIGHT = Math.min(520, window.innerHeight * 0.7);
      setAt({
        // Clamped so a bell near the bottom of a short window does not push the
        // panel off the screen.
        top: Math.max(12, Math.min(r.top - 4, window.innerHeight - MAX_HEIGHT - 12)),
        left: Math.min(r.right + 10, window.innerWidth - PANEL - 12),
      });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);

  // A popover, not a modal: Escape and a click elsewhere dismiss it, the page
  // keeps scrolling, and focus returns to the bell so the keyboard path is not
  // a dead end.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); buttonRef.current?.focus(); }
    };
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open, close]);

  const markAll = async () => {
    await markRead({ variables: { ids: null } });
    await Promise.all([refetch(), refetchCount()]);
  };

  const openRow = async (n: Notification) => {
    if (!n.read) {
      await markRead({ variables: { ids: [n.id] } });
      await Promise.all([refetch(), refetchCount()]);
    }
    if (n.submissionId && onOpenSubmission) {
      onOpenSubmission(n.submissionId);
      close();
    }
  };

  return (
    <div className="nb-root">
      <style>{styles}</style>
      <button
        ref={buttonRef}
        className={`cd-sb-item nb-trigger${open ? ' cd-sb-active' : ''}`}
        onClick={() => { setOpen(o => !o); if (!open) void refetch(); }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unread > 0 ? `Activity, ${unread} unread` : 'Activity, nothing unread'}
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
        {unread > 0 && <span className="nb-count">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div
          className="nb-panel" role="dialog" aria-label="Activity"
          ref={panelRef} tabIndex={-1}
          style={at ? { top: at.top, left: at.left } : { visibility: 'hidden' }}
        >
          <div className="nb-head">
            <h2 className="nb-title">Activity</h2>
            {unread > 0 && (
              <button className="nb-markall" onClick={markAll}>Mark all read</button>
            )}
          </div>

          <div className="nb-list">
            {loading && items.length === 0 && <p className="nb-empty">Loading…</p>}
            {!loading && items.length === 0 && (
              <p className="nb-empty">
                Nothing yet. New statements, failed checks and expiring documents appear here.
              </p>
            )}
            {items.map(n => {
              const sev = SEVERITY[n.kind] ?? { tone: 'info' as const, word: 'Update' };
              const clickable = !!(n.submissionId && onOpenSubmission);
              return (
                <button
                  key={n.id}
                  className={`nb-item nb-${sev.tone}${n.read ? ' nb-read' : ''}${clickable ? '' : ' nb-static'}`}
                  onClick={() => void openRow(n)}
                >
                  <span className="nb-item-icon"><Icon kind={n.kind} /></span>
                  <span className="nb-item-text">
                    <span className="nb-item-title">{n.title}</span>
                    {n.body && <span className="nb-item-body">{n.body}</span>}
                    <span className="nb-item-meta">
                      <span className="nb-item-sev">{sev.word}</span>
                      <span className="nb-item-sep">·</span>
                      <time dateTime={n.createdAt}>{ago(n.createdAt)}</time>
                      {!n.read && <span className="nb-unread-word">· unread</span>}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = `
  .nb-root { position: relative; }
  .nb-trigger { width: 100%; }
  .nb-icon-wrap { position: relative; display: inline-flex; flex: 0 0 auto; }
  /* The dot is a cue, never the message: the count sits beside it and each row
     spells its severity out in words. */
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

  .nb-panel {
    /* Fixed, not absolute: the sidebar scrolls, which clips anything absolutely
       positioned outside its box. Coordinates come from the component. */
    position: fixed; z-index: 30; /* Z.POPOVER */
    width: 364px; max-height: min(520px, 70vh); display: flex; flex-direction: column;
    background: var(--cd-surface); border: 1px solid var(--cd-border2);
    border-radius: var(--cd-r); overflow: hidden;
    box-shadow: 0 18px 48px rgba(0,0,0,0.42);
    animation: nb-in 160ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .nb-panel:focus { outline: none; }
  @keyframes nb-in {
    from { opacity: 0; transform: translateX(-6px) scale(0.985); }
    to   { opacity: 1; transform: none; }
  }

  .nb-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px; border-bottom: 1px solid var(--cd-border); flex: 0 0 auto;
  }
  .nb-title { margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--cd-text-mid); }
  .nb-markall {
    font-family: inherit; font-size: 11px; font-weight: 600; color: var(--cd-blue);
    background: none; border: none; padding: 3px 6px; border-radius: var(--cd-r-sm); cursor: pointer;
  }
  .nb-markall:hover { background: var(--cd-surface2); }

  .nb-list { overflow-y: auto; flex: 1 1 auto; }
  .nb-empty { margin: 0; padding: 28px 18px; font-size: 12px; line-height: 1.6; color: var(--cd-text-dim); text-align: center; }

  .nb-item {
    width: 100%; display: flex; gap: 10px; align-items: flex-start; text-align: left;
    font-family: inherit; background: none; border: none;
    border-bottom: 1px solid var(--cd-border);
    /* 44px minimum touch height comes from the padding plus two lines of text. */
    padding: 11px 14px 11px 11px; cursor: pointer;
    border-left: 3px solid transparent;
    transition: background 160ms ease-out, border-color 160ms ease-out;
  }
  .nb-item:last-child { border-bottom: none; }
  .nb-item:hover { background: var(--cd-surface2); }
  .nb-item:focus-visible { outline: 2px solid var(--cd-blue); outline-offset: -2px; }
  .nb-static { cursor: default; }

  .nb-item-icon { flex: 0 0 auto; margin-top: 1px; }
  .nb-danger .nb-item-icon { color: var(--cd-accent); }
  .nb-warn   .nb-item-icon { color: var(--cd-amber); }
  .nb-info   .nb-item-icon { color: var(--cd-blue); }

  /* Unread carries the rail; read keeps the icon colour but drops the emphasis,
     so the two states differ by more than brightness alone. */
  .nb-danger:not(.nb-read) { border-left-color: var(--cd-accent); }
  .nb-warn:not(.nb-read)   { border-left-color: var(--cd-amber); }
  .nb-info:not(.nb-read)   { border-left-color: var(--cd-blue); }

  .nb-item-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .nb-item-title { font-size: 12.5px; font-weight: 600; color: var(--cd-text); line-height: 1.4; }
  .nb-read .nb-item-title { font-weight: 500; color: var(--cd-text-mid); }
  .nb-item-body { font-size: 11.5px; line-height: 1.5; color: var(--cd-text-mid); }
  .nb-read .nb-item-body { color: var(--cd-text-dim); }
  .nb-item-meta { font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--cd-text-dim); display: flex; gap: 4px; flex-wrap: wrap; }
  .nb-danger .nb-item-sev { color: var(--cd-accent); }
  .nb-warn .nb-item-sev { color: var(--cd-amber); }
  .nb-read .nb-item-sev { color: var(--cd-text-dim); }
  .nb-unread-word { color: var(--cd-blue); }

  @media (max-width: 860px) {
    /* The sidebar collapses to icons on narrow screens, so the panel becomes a
       sheet along the bottom instead of hanging off a 60px rail. The !important
       is there to beat the inline coordinates, which are the right answer on a
       wide screen and the wrong one here. */
    .nb-panel {
      top: auto !important; left: 12px !important; right: 12px;
      /* The home indicator on a modern phone sits where a 12px offset would
         put the last row, so the inset is added rather than assumed to be 0. */
      bottom: calc(12px + env(safe-area-inset-bottom, 0px));
      width: auto; max-height: 60vh;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .nb-panel { animation: none; }
    .nb-item { transition: none; }
  }
`;
