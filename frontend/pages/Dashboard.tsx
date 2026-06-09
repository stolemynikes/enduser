import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useNavigate } from 'react-router-dom';

const GET_SUBMISSIONS = gql`
  query GetSubmissions {
    submissions {
      id email orderNumber firstName lastName companyName vatNumber
      country substances casNumbers statement viesStatus status adminNote createdAt
      idDocumentName idDocumentType idDocumentNumber
    }
  }
`;

const APPROVE = gql`
  mutation Approve($id: ID!) {
    approveSubmission(id: $id) { id status }
  }
`;

const DENY = gql`
  mutation Deny($id: ID!, $reason: String!) {
    denySubmission(id: $id, reason: $reason) { id status adminNote }
  }
`;

type IdDocumentType = 'PASSPORT' | 'ID_CARD' | 'DRIVERS_LICENSE';

const docTypeLabels: Record<IdDocumentType, string> = {
  PASSPORT: 'Paspoort',
  ID_CARD: 'Identiteitskaart',
  DRIVERS_LICENSE: 'Rijbewijs',
};

type Submission = {
  id: string; email: string; orderNumber: string; firstName: string; lastName: string;
  companyName: string; vatNumber: string; country: string; substances: string;
  casNumbers: string; statement: string; viesStatus: 'VALID' | 'INVALID' | 'ERROR';
  status: 'PENDING_REVIEW' | 'APPROVED' | 'DENIED'; adminNote?: string; createdAt: string;
  idDocumentName?: string; idDocumentType?: IdDocumentType; idDocumentNumber?: string;
};

type Filter = 'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'DENIED';

export default function Dashboard() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('PENDING_REVIEW');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Submission | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [modalMode, setModalMode] = useState<'view' | 'deny'>('view');

  const { data, loading, error, refetch } = useQuery(GET_SUBMISSIONS);
  const [approve] = useMutation(APPROVE, { onCompleted: () => { refetch(); setSelected(null); } });
  const [deny] = useMutation(DENY, { onCompleted: () => { refetch(); setSelected(null); setDenyReason(''); } });

  const logout = () => { localStorage.removeItem('adminToken'); navigate('/admin'); };

  const submissions: Submission[] = data?.submissions ?? [];
  const q = search.toLowerCase().trim();
  const filtered = submissions
    .filter(s => filter === 'ALL' || s.status === filter)
    .filter(s => !q || [s.orderNumber, s.firstName, s.lastName, s.companyName, s.email]
      .some(v => v.toLowerCase().includes(q)));

  const counts = {
    all: submissions.length,
    pending: submissions.filter(s => s.status === 'PENDING_REVIEW').length,
    approved: submissions.filter(s => s.status === 'APPROVED').length,
    denied: submissions.filter(s => s.status === 'DENIED').length,
  };

  const openModal = (s: Submission, mode: 'view' | 'deny' = 'view') => {
    setSelected(s); setModalMode(mode); setDenyReason('');
  };

  const handleApprove = () => {
    if (!selected) return;
    approve({ variables: { id: selected.id } });
  };

  const handleDeny = () => {
    if (!selected || !denyReason.trim()) return;
    deny({ variables: { id: selected.id, reason: denyReason.trim() } });
  };

  return (
    <>
      <style>{dashStyles}</style>
      <div className="db-wrap">
        <nav className="db-nav">
          <div className="db-nav-brand">
            <span className="db-nav-tag">ADMIN</span>
            <span className="db-nav-title">End-User Statements</span>
          </div>
          <button className="db-logout" onClick={logout}>Sign Out</button>
        </nav>

        <main className="db-main">
          <div className="db-filters">
            {([['ALL', 'All', counts.all], ['PENDING_REVIEW', 'Pending Review', counts.pending],
               ['APPROVED', 'Approved', counts.approved], ['DENIED', 'Denied', counts.denied]] as const).map(([val, label, count]) => (
              <button key={val} className={`db-filter-btn ${filter === val ? 'db-filter-active' : ''}`}
                onClick={() => setFilter(val)}>
                {label} <span className="db-filter-count">{count}</span>
              </button>
            ))}
            <button className="db-refresh" onClick={() => refetch()} title="Refresh">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="14">
                <path d="M4 4.5A7.5 7.5 0 0117 10m-1 5.5A7.5 7.5 0 013 10" strokeLinecap="round"/>
                <path d="M16 6V4l2 2-2 2V6zM4 14v2l-2-2 2-2v2z" fill="currentColor" stroke="none"/>
              </svg>
            </button>
          </div>

          <div className="db-search-wrap">
            <svg className="db-search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15">
              <circle cx="8.5" cy="8.5" r="5.5"/><path d="M13.5 13.5l3 3" strokeLinecap="round"/>
            </svg>
            <input
              className="db-search"
              type="text"
              placeholder="Search by name, order number or company…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="db-search-clear" onClick={() => setSearch('')} title="Clear">✕</button>
            )}
          </div>

          {loading && <div className="db-state">Loading submissions…</div>}
          {error && <div className="db-state db-state-err">Failed to load: {error.message}</div>}

          {!loading && !error && (
            filtered.length === 0
              ? <div className="db-state">No submissions in this category.</div>
              : <div className="db-table-wrap">
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th>Order #</th>
                        <th>Date</th>
                        <th>Company</th>
                        <th>Contact</th>
                        <th>Country</th>
                        <th>VIES</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(s => (
                        <tr key={s.id} className="db-row" onClick={() => openModal(s)}>
                          <td>{s.orderNumber}</td>
                          <td className="db-cell-mono">{new Date(s.createdAt).toLocaleDateString('nl-NL')}</td>
                          <td>
                            <div className="db-company">{s.companyName}</div>
                            <div className="db-vat">{s.vatNumber}</div>
                          </td>
                          <td>
                            <div>{s.firstName} {s.lastName}</div>
                            <div className="db-email">{s.email}</div>
                          </td>
                          <td>{s.country}</td>
                          <td><ViesBadge status={s.viesStatus} /></td>
                          <td><StatusBadge status={s.status} /></td>
                          <td>
                            <div className="db-actions" onClick={e => e.stopPropagation()}>
                              {s.status === 'PENDING_REVIEW' && (
                                <>
                                  <button className="db-btn-approve" onClick={() => { setSelected(s); handleApprove(); }}>
                                    Approve
                                  </button>
                                  <button className="db-btn-deny" onClick={() => openModal(s, 'deny')}>
                                    Deny
                                  </button>
                                </>
                              )}
                              {s.status !== 'PENDING_REVIEW' && (
                                <button className="db-btn-view" onClick={() => openModal(s)}>View</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
          )}
        </main>
      </div>

      {selected && (
        <div className="db-modal-bg" onClick={() => setSelected(null)}>
          <div className="db-modal" onClick={e => e.stopPropagation()}>
            <div className="db-modal-header">
              <div>
                <p className="db-modal-company">{selected.companyName}</p>
                <p className="db-modal-sub">{selected.firstName} {selected.lastName} — {selected.email}</p>
              </div>
              <button className="db-modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>

            {modalMode === 'view' ? (
              <div className="db-modal-body">
                <div className="db-detail-grid">
                  <Detail label="Order #" value={selected.orderNumber} />
                  <Detail label="VAT" value={selected.vatNumber} />
                  <Detail label="Country" value={selected.country} />
                  <Detail label="Submitted" value={new Date(selected.createdAt).toLocaleString('nl-NL')} />
                  <Detail label="Substance(s)" value={selected.substances} />
                  <Detail label="CAS Number" value={selected.casNumbers} />
                  <Detail label="VIES Status" value={<ViesBadge status={selected.viesStatus} />} />
                  <Detail label="Status" value={<StatusBadge status={selected.status} />} />
                </div>
                <div className="db-detail-full">
                  <Detail label="Statement" value={selected.statement} />
                  {selected.adminNote && <Detail label="Admin Note" value={selected.adminNote} />}
                </div>
                <div className="db-id-block">
                  <div className="db-id-title">Identiteitsdocument</div>
                  <div className="db-detail-grid" style={{ marginBottom: 0 }}>
                    <Detail label="Naam op document"
                      value={selected.idDocumentName ?? <span style={{ color: 'var(--text-dim)' }}>—</span>} />
                    <Detail label="Documenttype"
                      value={selected.idDocumentType
                        ? docTypeLabels[selected.idDocumentType]
                        : <span style={{ color: 'var(--text-dim)' }}>—</span>} />
                    <Detail label="Documentnummer"
                      value={selected.idDocumentNumber ?? <span style={{ color: 'var(--text-dim)' }}>—</span>} />
                  </div>
                </div>
                <div className="db-detail-grid" style={{marginBottom: 0, gap: 0}}>
                </div>

                {selected.status === 'PENDING_REVIEW' && (
                  <div className="db-modal-actions">
                    <button className="db-btn-approve db-btn-lg" onClick={handleApprove}>Approve</button>
                    <button className="db-btn-deny db-btn-lg" onClick={() => setModalMode('deny')}>Deny…</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="db-modal-body">
                <p className="db-deny-heading">Provide a reason for denial</p>
                <p className="db-deny-sub">This will be included in the email sent to {selected.firstName}.</p>
                <textarea className="db-deny-textarea" value={denyReason}
                  onChange={e => setDenyReason(e.target.value)}
                  placeholder="e.g. VAT number could not be verified through VIES."
                  rows={4} autoFocus />
                <div className="db-modal-actions">
                  <button className="db-btn-cancel" onClick={() => setModalMode('view')}>Cancel</button>
                  <button className="db-btn-deny db-btn-lg" onClick={handleDeny} disabled={!denyReason.trim()}>
                    Confirm Denial
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ViesBadge({ status }: { status: 'VALID' | 'INVALID' | 'ERROR' }) {
  const map = { VALID: 'db-badge-green', INVALID: 'db-badge-red', ERROR: 'db-badge-amber' };
  return <span className={`db-badge ${map[status]}`}>{status}</span>;
}

function StatusBadge({ status }: { status: 'PENDING_REVIEW' | 'APPROVED' | 'DENIED' }) {
  const map = { PENDING_REVIEW: 'db-badge-amber', APPROVED: 'db-badge-green', DENIED: 'db-badge-red' };
  const label = { PENDING_REVIEW: 'Pending', APPROVED: 'Approved', DENIED: 'Denied' };
  return <span className={`db-badge ${map[status]}`}>{label[status]}</span>;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="db-detail">
      <span className="db-detail-label">{label}</span>
      <span className="db-detail-value">{value}</span>
    </div>
  );
}

const dashStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #0f1117;
    --surface:  #1a1d27;
    --surface2: #212533;
    --surface3: #272b3b;
    --border:   rgba(255,255,255,0.07);
    --border2:  rgba(255,255,255,0.12);
    --text:     #f0f2f8;
    --text-mid: #8b93ad;
    --text-dim: #4e566e;
    --accent:   #f04e5e;
    --green:    #3ecf8e;
    --amber:    #f5a623;
    --blue:     #5b9cf6;
    --r:        12px;
    --r-sm:     8px;
    --r-pill:   100px;
    --shadow-sm: 0 2px 8px rgba(0,0,0,0.3);
    --shadow-md: 0 8px 32px rgba(0,0,0,0.4);
    --shadow-lg: 0 24px 64px rgba(0,0,0,0.6);
    --ease: cubic-bezier(0.4,0,0.2,1);
  }

  html, body { background: var(--bg); margin: 0; overflow-x: hidden; }

  .db-wrap {
    font-family: 'Inter', system-ui, sans-serif;
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
  }

  /* NAV */
  .db-nav {
    background: rgba(26,29,39,0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 1.75rem; height: 56px;
    position: sticky; top: 0; z-index: 10;
  }
  .db-nav-brand { display: flex; align-items: center; gap: 0.875rem; }
  .db-nav-tag {
    font-size: 9px; font-weight: 600; letter-spacing: 0.16em;
    color: var(--accent); background: rgba(240,78,94,0.12);
    border: 1px solid rgba(240,78,94,0.25);
    padding: 3px 9px; text-transform: uppercase; border-radius: var(--r-pill);
  }
  .db-nav-title { font-size: 13px; font-weight: 500; color: var(--text-mid); letter-spacing: 0.01em; }
  .db-logout {
    font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500;
    color: var(--text-dim); background: transparent;
    border: 1px solid var(--border2); border-radius: var(--r-pill);
    padding: 6px 16px; cursor: pointer;
    transition: color 0.2s var(--ease), border-color 0.2s var(--ease), background 0.2s var(--ease);
  }
  .db-logout:hover { color: var(--text); border-color: rgba(255,255,255,0.25); background: rgba(255,255,255,0.05); }

  /* MAIN */
  .db-main { padding: 1.5rem 1.75rem; }

  /* FILTERS */
  .db-filters {
    display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;
  }
  .db-filter-btn {
    font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500;
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-pill);
    padding: 7px 16px; cursor: pointer; color: var(--text-mid);
    display: flex; align-items: center; gap: 7px;
    transition: all 0.2s var(--ease);
  }
  .db-filter-btn:hover { border-color: var(--border2); color: var(--text); background: var(--surface2); }
  .db-filter-active {
    background: var(--surface3) !important; color: var(--text) !important;
    border-color: var(--border2) !important; box-shadow: var(--shadow-sm);
  }
  .db-filter-count {
    font-size: 10px; font-weight: 600; border-radius: var(--r-pill);
    padding: 1px 7px; min-width: 20px; text-align: center;
    background: rgba(255,255,255,0.07); color: var(--text-mid);
    transition: all 0.2s var(--ease);
  }
  .db-filter-active .db-filter-count { background: rgba(255,255,255,0.14); color: var(--text); }
  .db-refresh {
    margin-left: auto; background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r-sm); padding: 8px 11px; cursor: pointer; color: var(--text-dim);
    transition: all 0.2s var(--ease); display: flex; align-items: center;
  }
  .db-refresh:hover { border-color: var(--border2); color: var(--text-mid); background: var(--surface2); }

  /* STATE */
  .db-state {
    text-align: center; padding: 3.5rem; font-size: 13px; color: var(--text-dim);
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--r);
    box-shadow: var(--shadow-sm);
  }
  .db-state-err { color: var(--accent); }

  /* TABLE */
  .db-table-wrap {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--r); overflow: hidden; box-shadow: var(--shadow-sm);
  }
  .db-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .db-table thead tr { background: var(--surface2); border-bottom: 1px solid var(--border); }
  .db-table th {
    font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--text-dim); padding: 12px 18px; text-align: left; white-space: nowrap;
  }
  .db-table tbody tr { border-bottom: 1px solid var(--border); transition: background 0.15s var(--ease); }
  .db-table tbody tr:last-child { border-bottom: none; }
  .db-row { cursor: pointer; }
  .db-row:hover { background: var(--surface2); }
  .db-table td { padding: 14px 18px; vertical-align: middle; }
  .db-cell-mono { font-size: 12px; color: var(--text-dim); font-variant-numeric: tabular-nums; }
  .db-company { font-weight: 600; color: var(--text); font-size: 13px; }
  .db-vat { font-size: 11px; color: var(--text-dim); margin-top: 3px; }
  .db-email { font-size: 11px; color: var(--text-dim); margin-top: 3px; }

  /* BADGES */
  .db-badge {
    display: inline-flex; align-items: center; font-size: 10px; font-weight: 600;
    letter-spacing: 0.04em; text-transform: uppercase;
    padding: 3px 10px; border-radius: var(--r-pill); border: 1px solid;
  }
  .db-badge-green  { color: var(--green);  background: rgba(62,207,142,0.1);  border-color: rgba(62,207,142,0.25);  }
  .db-badge-red    { color: var(--accent); background: rgba(240,78,94,0.1);   border-color: rgba(240,78,94,0.25);   }
  .db-badge-amber  { color: var(--amber);  background: rgba(245,166,35,0.1);  border-color: rgba(245,166,35,0.25);  }

  /* ACTION BUTTONS */
  .db-actions { display: flex; gap: 0.4rem; }
  .db-btn-approve, .db-btn-deny, .db-btn-view, .db-btn-cancel {
    font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600;
    letter-spacing: 0.02em; border-radius: var(--r-pill);
    padding: 5px 14px; cursor: pointer; border: 1px solid;
    transition: all 0.2s var(--ease); white-space: nowrap;
  }
  .db-btn-approve { color: var(--green);  background: rgba(62,207,142,0.1);  border-color: rgba(62,207,142,0.2); }
  .db-btn-approve:hover { background: rgba(62,207,142,0.2); border-color: rgba(62,207,142,0.4); }
  .db-btn-deny    { color: var(--accent); background: rgba(240,78,94,0.1);   border-color: rgba(240,78,94,0.2);  }
  .db-btn-deny:hover:not(:disabled) { background: rgba(240,78,94,0.2); border-color: rgba(240,78,94,0.4); }
  .db-btn-deny:disabled { opacity: 0.35; cursor: not-allowed; }
  .db-btn-view    { color: var(--text-mid); background: transparent; border-color: var(--border2); }
  .db-btn-view:hover { color: var(--text); background: var(--surface2); }
  .db-btn-cancel  { color: var(--text-mid); background: transparent; border-color: var(--border2); }
  .db-btn-cancel:hover { color: var(--text); background: var(--surface2); }
  .db-btn-lg { padding: 10px 24px; font-size: 12px; }

  /* MODAL */
  .db-modal-bg {
    position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100;
    display: flex; align-items: center; justify-content: center; padding: 1.5rem;
    backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
    animation: fadeIn 0.15s var(--ease);
  }
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  .db-modal {
    background: var(--surface); border: 1px solid var(--border2); border-radius: 16px;
    width: 100%; max-width: 620px; max-height: 88vh; overflow-y: auto;
    box-shadow: var(--shadow-lg);
    animation: slideUp 0.2s var(--ease);
  }
  @keyframes slideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
  .db-modal-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding: 1.5rem 1.75rem 1.25rem; border-bottom: 1px solid var(--border);
  }
  .db-modal-company { font-size: 16px; font-weight: 600; color: var(--text); }
  .db-modal-sub { font-size: 12px; color: var(--text-dim); margin-top: 4px; }
  .db-modal-close {
    background: rgba(255,255,255,0.06); border: none; width: 28px; height: 28px;
    border-radius: 50%; font-size: 13px; color: var(--text-mid);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-left: 1rem; transition: all 0.2s var(--ease);
  }
  .db-modal-close:hover { background: rgba(255,255,255,0.12); color: var(--text); }
  .db-modal-body { padding: 1.5rem 1.75rem; }
  .db-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem 2rem; margin-bottom: 1.5rem; }
  .db-detail-full { margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.875rem; }
  .db-detail { display: flex; flex-direction: column; gap: 5px; }
  .db-detail-label {
    font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--text-dim);
  }
  .db-detail-value {
    font-size: 13px; color: var(--text-mid); white-space: pre-wrap;
    word-break: break-word; line-height: 1.65;
  }
  .db-modal-actions {
    display: flex; gap: 0.75rem; justify-content: flex-end;
    margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border);
  }

  /* ID BLOCK */
  .db-id-block {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    padding: 1rem 1.25rem 1.25rem;
    margin-bottom: 1.5rem;
  }
  .db-id-title {
    font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--text-dim); margin-bottom: 0.875rem;
  }

  /* DENY FORM */
  .db-deny-heading { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 0.4rem; }
  .db-deny-sub { font-size: 12px; color: var(--text-dim); margin-bottom: 1.25rem; line-height: 1.6; }
  .db-deny-textarea {
    font-family: 'Inter', sans-serif; font-size: 13px; color: var(--text);
    background: var(--surface2); border: 1px solid var(--border2); border-radius: var(--r-sm);
    padding: 12px 14px; width: 100%; resize: vertical; min-height: 110px; outline: none;
    transition: border-color 0.2s var(--ease), box-shadow 0.2s var(--ease);
    line-height: 1.6;
  }
  .db-deny-textarea:focus {
    border-color: var(--blue); box-shadow: 0 0 0 3px rgba(91,156,246,0.15);
  }

  /* SEARCH */
  .db-search-wrap {
    position: relative; display: flex; align-items: center;
    margin-bottom: 1rem;
  }
  .db-search-icon {
    position: absolute; left: 13px; color: var(--text-dim); pointer-events: none; flex-shrink: 0;
  }
  .db-search {
    font-family: 'Inter', sans-serif; font-size: 13px; color: var(--text);
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-sm);
    padding: 10px 36px 10px 38px; width: 100%; outline: none;
    transition: border-color 0.2s var(--ease), box-shadow 0.2s var(--ease);
  }
  .db-search::placeholder { color: var(--text-dim); }
  .db-search:focus { border-color: var(--border2); box-shadow: 0 0 0 3px rgba(91,156,246,0.1); }
  .db-search-clear {
    position: absolute; right: 10px; background: rgba(255,255,255,0.08); border: none;
    border-radius: 50%; width: 20px; height: 20px; font-size: 10px; color: var(--text-dim);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all 0.15s var(--ease);
  }
  .db-search-clear:hover { background: rgba(255,255,255,0.15); color: var(--text); }

  /* MOBILE */
  @media (max-width: 768px) {
    .db-nav { padding: 0 1rem; }
    .db-nav-title { display: none; }
    .db-main { padding: 1rem; }
    .db-filters { gap: 0.375rem; }
    .db-filter-btn { padding: 6px 12px; font-size: 11px; }
    .db-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .db-table { min-width: 560px; }
    .db-table th, .db-table td { padding: 10px 12px; }
    .db-company { font-size: 12px; }
    .db-actions { flex-direction: column; gap: 0.3rem; }
    .db-detail-grid { grid-template-columns: 1fr; gap: 1rem; }
    .db-modal { border-radius: 12px; max-height: 92vh; }
    .db-modal-header { padding: 1.25rem; }
    .db-modal-body { padding: 1.25rem; }
    .db-id-block { padding: 0.875rem 1rem 1rem; }
  }

  @media (max-width: 480px) {
    .db-filter-btn span:not(.db-filter-count) { display: none; }
    .db-filter-btn { padding: 6px 10px; }
    .db-modal { margin: 0; border-radius: 16px 16px 0 0; align-self: flex-end; max-height: 90vh; }
    .db-modal-bg { align-items: flex-end; padding: 0; }
    .db-search { font-size: 12px; }
  }
`;
