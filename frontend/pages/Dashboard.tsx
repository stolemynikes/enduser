import { useState, useEffect, useRef } from 'react';
import { gql } from '@apollo/client';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../src/components/Toast.tsx';
import { AccessRequestsTab } from '../src/components/AccessRequests.tsx';
import { ACCESS_REQUESTS, type AccessRequest } from '../src/lib/accessRequests.ts';
import { AdminRevealDocument } from '../src/components/AdminRevealDocument.tsx';
import { formatDate, relativeTime } from '../src/lib/format.ts';
import { useDocumentTitle } from '../src/lib/useDocumentTitle.ts';
import { useModalDismiss } from '../src/lib/useModalDismiss.ts';
import { approvable, blockingCategories, categoryFailing, isExpired, isPending, CATEGORY_LABEL } from '../src/lib/approvalGate.ts';
import { Mark } from '../src/components/Mark.tsx';
import { StatementWithTranslation } from '../src/components/StatementTranslation.tsx';

const GET_SUBMISSIONS = gql`
  query GetSubmissions {
    submissions {
      id email orderNumber firstName lastName companyName vatNumber buyerType
      street zipCode place country substances casNumbers concentration statement statementLang statementTranslation
      viesStatus viesName viesAddress viesAddressMatch status adminNote createdAt isTest
      idDocumentName idDocumentType idMrzValid idLikelySynthetic idDocumentExpiry
      idVerificationStatus idLivenessPassed idFaceMatch idVerificationWarnings idVerificationCheckedAt idVerificationPurged
      substanceCheckStatus substanceCheckNote substanceCheckedAt
      reviewedByName reviewedAt
      overrides { category reason createdByName createdAt }
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

const RECHECK_SUBSTANCE = gql`
  mutation RecheckSubstance($id: ID!) {
    recheckSubmissionSubstance(id: $id) { id substanceCheckStatus }
  }
`;

const OVERRIDE_CHECK = gql`
  mutation OverrideCheck($id: ID!, $category: OverrideCategory!, $reason: String!) {
    overrideSubmissionCheck(id: $id, category: $category, reason: $reason) {
      id overrides { category reason createdByName createdAt }
    }
  }
`;

const CLEAR_OVERRIDE = gql`
  mutation ClearOverride($id: ID!, $category: OverrideCategory!) {
    clearSubmissionCheckOverride(id: $id, category: $category) {
      id overrides { category reason createdByName createdAt }
    }
  }
`;

const ADMIN_COMPANIES = gql`
  query AdminCompanies {
    adminCompanies {
      id name slug accessStatus membersCount submissionsCount pendingCount configured lastSubmissionAt createdAt
    }
  }
`;

const ADMIN_INSIGHTS = gql`
  query AdminInsights {
    adminInsights {
      totalCompanies totalSubmissions pendingReview approved denied avgReviewHours
      viesInvalid viesError mrzInvalid likelySynthetic
      weekly { weekStart submissions companies }
    }
  }
`;

const SUPPORT_LOGIN = gql`
  mutation AdminSupportLogin($companyId: ID!) {
    adminSupportLogin(companyId: $companyId) {
      token
      role
      company { id name slug }
    }
  }
`;

const TEST_VIES = gql`
  query TestVies($vat: String!, $street: String, $zipCode: String, $place: String) {
    testVies(vat: $vat, street: $street, zipCode: $zipCode, place: $place) {
      status name address addressMatch
    }
  }
`;
const TEST_SUBSTANCE = gql`
  query TestSubstance($substances: String!, $casNumbers: String!, $statement: String!, $buyerType: BuyerType!) {
    testSubstanceCheck(substances: $substances, casNumbers: $casNumbers, statement: $statement, buyerType: $buyerType) {
      status note
    }
  }
`;
const CREATE_TEST_SUBMISSION = gql`
  mutation CreateTestSubmission($input: TestSubmissionInput!) {
    createTestSubmission(input: $input) { id status viesStatus substanceCheckStatus }
  }
`;
const DELETE_TEST_SUBMISSIONS = gql`
  mutation DeleteTestSubmissions { deleteTestSubmissions }
`;

type IdDocumentType = 'PASSPORT' | 'ID_CARD';

const docTypeLabels: Record<IdDocumentType, string> = {
  PASSPORT: 'Passport',
  ID_CARD: 'Identity Card',
};

type Submission = {
  id: string; email: string; orderNumber: string; firstName: string; lastName: string;
  companyName: string; vatNumber: string; buyerType: 'INDIVIDUAL' | 'COMPANY';
  street?: string; zipCode?: string; place?: string; country: string; substances: string;
  casNumbers: string; concentration?: string | null; statement: string;
  statementLang?: string | null; statementTranslation?: string | null; viesStatus: 'VALID' | 'INVALID' | 'ERROR' | 'NOT_CHECKED';
  viesName?: string | null; viesAddress?: string | null; viesAddressMatch: ViesAddressMatch;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'DENIED'; adminNote?: string; createdAt: string; isTest: boolean;
  idDocumentName?: string; idDocumentType?: IdDocumentType;
  idMrzValid?: boolean | null; idLikelySynthetic?: boolean | null; idDocumentExpiry?: string | null;
  idVerificationStatus: IdVerificationStatus; idLivenessPassed?: boolean | null; idFaceMatch?: boolean | null;
  idVerificationWarnings?: string | null; idVerificationCheckedAt?: string | null; idVerificationPurged: boolean;
  substanceCheckStatus: SubstanceCheckStatus; substanceCheckNote?: string | null; substanceCheckedAt?: string | null;
  reviewedByName?: string | null; reviewedAt?: string | null;
  overrides: Override[];
};

type OverrideCategory = 'VIES' | 'IDENTITY' | 'SUBSTANCE';
type Override = { category: OverrideCategory; reason: string; createdByName: string; createdAt: string };

type SubstanceCheckStatus = 'NOT_CHECKED' | 'PENDING' | 'OK' | 'FLAGGED' | 'ERROR';
type IdVerificationStatus = 'NOT_CHECKED' | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'DECLINED' | 'EXPIRED' | 'ERROR';
type ViesAddressMatch = 'NOT_CHECKED' | 'UNAVAILABLE' | 'MATCH' | 'PARTIAL' | 'MISMATCH';

type Filter = 'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'DENIED';
type Tab = 'submissions' | 'access' | 'companies' | 'insights' | 'test';

type CompanyActivity = {
  id: string; name: string; slug: string; membersCount: number; submissionsCount: number;
  accessStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  pendingCount: number; configured: boolean; lastSubmissionAt?: string | null; createdAt: string;
};

type Insights = {
  totalCompanies: number; totalSubmissions: number; pendingReview: number; approved: number;
  denied: number; avgReviewHours?: number | null; viesInvalid: number; viesError: number;
  mrzInvalid: number; likelySynthetic: number;
  weekly: { weekStart: string; submissions: number; companies: number }[];
};

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  // The sidebar counts requests waiting for a decision, refreshed every minute
  // so a new one shows up without reloading the page.
  const { data: accessData } = useQuery<{ accessRequests: AccessRequest[] }>(ACCESS_REQUESTS, { pollInterval: 60_000 });
  const waitingAccess = (accessData?.accessRequests ?? []).filter(r => r.status === 'PENDING').length;
  useDocumentTitle('Admin — eustatement');
  const [tab, setTab] = useState<Tab>(() =>
    (localStorage.getItem('admin-tab') as Tab) ?? 'submissions'
  );
  useEffect(() => { localStorage.setItem('admin-tab', tab); }, [tab]);
  const [filter, setFilter] = useState<Filter>('PENDING_REVIEW');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [visibleCount, setVisibleCount] = useState(50);
  const sentinelRef = useRef<HTMLTableRowElement | null>(null);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [modalMode, setModalMode] = useState<'view' | 'deny'>('view');
  const [overrideCat, setOverrideCat] = useState<OverrideCategory | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    (localStorage.getItem('theme-dashboard') as 'dark' | 'light') ?? 'dark'
  );

  useEffect(() => { localStorage.setItem('theme-dashboard', theme); }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const { data, loading, error, refetch } = useQuery<any>(GET_SUBMISSIONS);
  const [approve, { loading: approving }] = useMutation<any>(APPROVE, {
    onCompleted: () => { refetch(); setSelected(null); toast.success('Submission approved'); },
    onError: e => toast.error(e.message),
  });
  const [deny, { loading: denying }] = useMutation<any>(DENY, {
    onCompleted: () => { refetch(); setSelected(null); setDenyReason(''); toast.success('Submission denied'); },
    onError: e => toast.error(e.message),
  });
  const [recheckSubstance, { loading: rechecking }] = useMutation<any>(RECHECK_SUBSTANCE, {
    onError: e => toast.error(e.message),
  });
  const [overrideCheck, { loading: overriding }] = useMutation<any>(OVERRIDE_CHECK, {
    onError: e => toast.error(e.message),
  });
  const [clearOverrideMut] = useMutation<any>(CLEAR_OVERRIDE, {
    onError: e => toast.error(e.message),
  });

  const syncOverrides = (id: string, overrides: Override[]) => {
    setSelected(s => (s && s.id === id ? { ...s, overrides } : s));
    refetch();
  };
  const handleOverride = async (id: string, category: OverrideCategory) => {
    if (!overrideReason.trim()) return;
    const { data: d } = await overrideCheck({ variables: { id, category, reason: overrideReason.trim() } });
    if (d?.overrideSubmissionCheck) {
      syncOverrides(id, d.overrideSubmissionCheck.overrides);
      setOverrideCat(null); setOverrideReason('');
      toast.success(`${CATEGORY_LABEL[category]} check overridden`);
    }
  };
  const handleClearOverride = async (id: string, category: OverrideCategory) => {
    const { data: d } = await clearOverrideMut({ variables: { id, category } });
    if (d?.clearSubmissionCheckOverride) {
      syncOverrides(id, d.clearSubmissionCheckOverride.overrides);
      toast.success('Override removed');
    }
  };

  // Per-check override control rendered inside each verification block. Admins may
  // always override; only shown for a pending submission whose check is failing.
  const renderOverride = (category: OverrideCategory) => {
    if (!selected || selected.status !== 'PENDING_REVIEW') return null;
    const ov = selected.overrides.find(o => o.category === category);
    if (ov) {
      return (
        <div className="db-override db-override--done">
          <span>✓ Overridden by {ov.createdByName} — “{ov.reason}”</span>
          <button className="db-override-undo" onClick={() => handleClearOverride(selected.id, category)}>Undo</button>
        </div>
      );
    }
    if (!categoryFailing(selected, category)) return null;
    if (overrideCat === category) {
      return (
        <div className="db-override">
          <textarea className="db-deny-textarea" rows={2} autoFocus
            placeholder="Reason for overriding this check (recorded for audit)…"
            value={overrideReason} onChange={e => setOverrideReason(e.target.value)} />
          <div className="db-override-actions">
            <button className="db-btn-cancel" onClick={() => { setOverrideCat(null); setOverrideReason(''); }}>Cancel</button>
            <button className="db-btn-deny" disabled={!overrideReason.trim() || overriding}
              onClick={() => handleOverride(selected.id, category)}>{overriding ? 'Saving…' : 'Confirm override'}</button>
          </div>
        </div>
      );
    }
    return (
      <div className="db-override">
        <button className="db-override-btn" onClick={() => { setOverrideCat(category); setOverrideReason(''); }}>
          Override this check…
        </button>
      </div>
    );
  };

  // Re-run the substance check with an instant UI response: flip the open modal to
  // "Checking…" immediately, then poll for the background result and sync it in
  // (and the list) without needing a reload.
  const handleRecheckSubstance = async (id: string) => {
    setSelected(s => (s && s.id === id
      ? { ...s, substanceCheckStatus: 'PENDING', substanceCheckNote: null, substanceCheckedAt: null }
      : s));
    toast.success('Re-checking substance…');
    try {
      await recheckSubstance({ variables: { id } });
    } catch { return; }
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 2500));
      const { data: d } = await refetch();
      const row = (d?.submissions as Submission[] | undefined)?.find(x => x.id === id);
      if (row && row.substanceCheckStatus !== 'PENDING') {
        setSelected(s => (s && s.id === id
          ? { ...s, substanceCheckStatus: row.substanceCheckStatus, substanceCheckNote: row.substanceCheckNote, substanceCheckedAt: row.substanceCheckedAt }
          : s));
        break;
      }
    }
  };

  const { data: companiesData, loading: companiesLoading, error: companiesError } =
    useQuery<any>(ADMIN_COMPANIES, { skip: tab === 'submissions' });
  const { data: insightsData, loading: insightsLoading, error: insightsError } =
    useQuery<any>(ADMIN_INSIGHTS, { skip: tab !== 'insights' });
  const [supportLogin, { loading: supportLoading }] = useMutation<any>(SUPPORT_LOGIN);

  // Open a company's own dashboard as its owner (support session). The
  // company token lives alongside the admin token; apollo picks by route.
  const openCompany = async (companyId: string) => {
    const { data: d } = await supportLogin({ variables: { companyId } });
    const auth = d.adminSupportLogin;
    localStorage.setItem('companyToken', auth.token);
    localStorage.setItem('companyRole', auth.role);
    localStorage.setItem('companyName', auth.company.name);
    localStorage.setItem('companySlug', auth.company.slug);
    localStorage.setItem('supportMode', '1');
    navigate('/company/dashboard');
  };

  const logout = () => { localStorage.removeItem('adminToken'); navigate('/admin'); };

  const submissions: Submission[] = data?.submissions ?? [];
  const q = search.toLowerCase().trim();
  const fromMs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
  const toMs = dateTo ? new Date(dateTo + 'T23:59:59.999').getTime() : null;
  const filtered = submissions
    .filter(s => filter === 'ALL' || s.status === filter)
    .filter(s => !q || [s.orderNumber, s.firstName, s.lastName, s.companyName, s.email]
      .some(v => v.toLowerCase().includes(q)))
    .filter(s => {
      if (fromMs === null && toMs === null) return true;
      const t = new Date(s.createdAt).getTime();
      if (fromMs !== null && t < fromMs) return false;
      if (toMs !== null && t > toMs) return false;
      return true;
    });
  const visible = filtered.slice(0, visibleCount);

  // Window the list and grow it as the sentinel row scrolls into view. The reset
  // happens during render rather than in an effect, which would render the old
  // window once before correcting it.
  const listKey = `${filter}|${search}|${dateFrom}|${dateTo}`;
  const [renderedListKey, setRenderedListKey] = useState(listKey);
  if (renderedListKey !== listKey) {
    setRenderedListKey(listKey);
    setVisibleCount(50);
  }
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount(c => c + 50); },
      { rootMargin: '300px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [visible.length, filtered.length]);

  // Quick date-range presets (local time, YYYY-MM-DD for <input type="date">).
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const setRangeDays = (days: number) => {
    const to = new Date();
    const from = new Date(); from.setDate(from.getDate() - (days - 1));
    setDateFrom(iso(from)); setDateTo(iso(to));
  };
  const setThisMonth = () => {
    const now = new Date();
    setDateFrom(iso(new Date(now.getFullYear(), now.getMonth(), 1))); setDateTo(iso(now));
  };
  const clearDates = () => { setDateFrom(''); setDateTo(''); };
  const dateActive = !!dateFrom || !!dateTo;

  const counts = {
    all: submissions.length,
    pending: submissions.filter(s => s.status === 'PENDING_REVIEW').length,
    approved: submissions.filter(s => s.status === 'APPROVED').length,
    denied: submissions.filter(s => s.status === 'DENIED').length,
  };

  const openModal = (s: Submission, mode: 'view' | 'deny' = 'view') => {
    setSelected(s); setModalMode(mode); setDenyReason(''); setOverrideCat(null); setOverrideReason('');
  };

  const handleApprove = () => {
    if (!selected) return;
    approve({ variables: { id: selected.id } });
  };

  const handleDeny = () => {
    if (!selected || !denyReason.trim()) return;
    deny({ variables: { id: selected.id, reason: denyReason.trim() } });
  };

  const modalRef = useModalDismiss(selected != null, () => setSelected(null));

  return (
    <>
      <style>{dashStyles}</style>
      <div className={`db-wrap${theme === 'light' ? ' db-light' : ''}`}>
        <nav className="db-sidebar">
          <div className="db-sb-top">
            <div className="db-sb-brand">
              <span className="db-nav-wordmark"><Mark size={17} /> eu<b>statement</b></span>
              <div className="db-sb-meta">
                <span className="db-nav-tag">ADMIN</span>
                <span className="db-nav-title">End-User Statements</span>
              </div>
            </div>
            <div className="db-sb-nav">
              <button className={`db-sb-item${tab === 'submissions' ? ' db-sb-active' : ''}`} onClick={() => setTab('submissions')}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 5h14M3 10h14M3 15h8" strokeLinecap="round" />
                </svg>
                <span className="db-sb-label">Submissions</span>
              </button>
              <button className={`db-sb-item${tab === 'access' ? ' db-sb-active' : ''}`} onClick={() => setTab('access')}
                aria-label={waitingAccess ? `Access requests, ${waitingAccess} waiting` : 'Access requests'}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M10 2.5l6 2.5v4.5c0 3.5-2.4 6.6-6 8-3.6-1.4-6-4.5-6-8V5l6-2.5z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7.5 10l1.8 1.8L13 8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="db-sb-label">Access requests</span>
                {waitingAccess > 0 && <span className="db-sb-count" aria-hidden="true">{waitingAccess}</span>}
              </button>
              <button className={`db-sb-item${tab === 'companies' ? ' db-sb-active' : ''}`} onClick={() => setTab('companies')}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 17V5a1 1 0 011-1h7a1 1 0 011 1v12M12 9h4a1 1 0 011 1v7M3 17h14M6 7h2M6 10h2M6 13h2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="db-sb-label">Companies</span>
              </button>
              <button className={`db-sb-item${tab === 'insights' ? ' db-sb-active' : ''}`} onClick={() => setTab('insights')}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 17h14M5 13v-3m4 3V7m4 6v-5m4 5V4" strokeLinecap="round" />
                </svg>
                <span className="db-sb-label">Insights</span>
              </button>
              <button className={`db-sb-item${tab === 'test' ? ' db-sb-active' : ''}`} onClick={() => setTab('test')}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M8 3v5L4 15a1.5 1.5 0 001.3 2.3h9.4A1.5 1.5 0 0016 15l-4-7V3M7 3h6M7 12h6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="db-sb-label">Test Tools</span>
              </button>
            </div>
          </div>
          <div className="db-sb-bottom">
            <button className="db-sb-theme" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
              {theme === 'dark' ? (
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"/>
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
                </svg>
              )}
              <span className="db-sb-label">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button className="db-sb-signout" onClick={logout}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M13 10H3m0 0l3-3m-3 3l3 3M10 3h5a2 2 0 012 2v10a2 2 0 01-2 2h-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="db-sb-label">Sign Out</span>
            </button>
          </div>
        </nav>

        <main className="db-main">
          {tab === 'submissions' && (<>
          <div className="db-filters">
            {([['ALL', 'All', counts.all], ['PENDING_REVIEW', 'Pending Review', counts.pending],
               ['APPROVED', 'Approved', counts.approved], ['DENIED', 'Denied', counts.denied]] as const).map(([val, label, count]) => (
              <button key={val} className={`db-filter-btn ${filter === val ? 'db-filter-active' : ''}`}
                onClick={() => setFilter(val)}>
                {label} <span className="db-filter-count">{count}</span>
              </button>
            ))}
            <button className="db-refresh" onClick={() => refetch()} title="Refresh" aria-label="Refresh submissions">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" aria-hidden="true">
                <path d="M4 4.5A7.5 7.5 0 0117 10m-1 5.5A7.5 7.5 0 013 10" strokeLinecap="round"/>
                <path d="M16 6V4l2 2-2 2V6zM4 14v2l-2-2 2-2v2z" fill="currentColor" stroke="none"/>
              </svg>
            </button>
          </div>

          <div className="db-search-wrap">
            <svg className="db-search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15" aria-hidden="true">
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
              <button className="db-search-clear" onClick={() => setSearch('')} title="Clear" aria-label="Clear search">✕</button>
            )}
          </div>
          <div className="db-daterange">
            <span className="db-daterange-label">Created</span>
            <input className="db-date" type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)} aria-label="From date" />
            <span className="db-daterange-sep">–</span>
            <input className="db-date" type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)} aria-label="To date" />
            <button className="db-date-preset" onClick={() => setRangeDays(1)}>Today</button>
            <button className="db-date-preset" onClick={() => setRangeDays(7)}>7d</button>
            <button className="db-date-preset" onClick={() => setRangeDays(30)}>30d</button>
            <button className="db-date-preset" onClick={setThisMonth}>This month</button>
            {dateActive && <button className="db-date-preset db-date-clear" onClick={clearDates}>Clear</button>}
          </div>
          {(q || dateActive) && <div className="db-result-count">{filtered.length} result{filtered.length === 1 ? '' : 's'}</div>}

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
                        <th>Substance</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map(s => (
                        <tr key={s.id} className={`db-row db-row--${rowColor(s)}`} onClick={() => openModal(s)}>
                          <td>{s.orderNumber || '—'}</td>
                          <td className="db-cell-mono" title={formatDate(s.createdAt)}>{relativeTime(s.createdAt)}</td>
                          <td>
                            {s.buyerType === 'INDIVIDUAL'
                              ? <div className="db-company" style={{ color: 'var(--text-dim)', fontWeight: 400 }}>Individual</div>
                              : <><div className="db-company">{s.companyName || '—'}</div><div className="db-vat">{s.vatNumber}</div></>}
                          </td>
                          <td>
                            <div>{s.firstName} {s.lastName}</div>
                            <div className="db-email">{s.email}</div>
                          </td>
                          <td>{s.country || '—'}</td>
                          <td>
                            <ViesBadge status={s.viesStatus} />
                            {s.viesAddressMatch === 'MISMATCH' && <span className="db-badge db-badge-red db-pending-badge" title="Submitted address doesn't match the VAT-registered address">✗ Address</span>}
                          </td>
                          <td><SubCheckTag status={s.substanceCheckStatus} /></td>
                          <td>
                            {s.status === 'PENDING_REVIEW' && needsReview(s)
                              ? <span className="db-badge db-badge-red" title="Needs manual review">⚠ Review</span>
                              : <StatusBadge status={s.status} />}
                            {s.isTest && <span className="db-badge db-badge-amber db-pending-badge">TEST</span>}
                          </td>
                          <td>
                            <div className="db-actions" onClick={e => e.stopPropagation()}>
                              <button className="db-btn-view" onClick={() => openModal(s)}>View</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {visible.length < filtered.length && (
                        <tr ref={sentinelRef} className="db-row-more">
                          <td colSpan={9}>Loading more… ({visible.length} of {filtered.length})</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {filtered.length > 50 && visible.length >= filtered.length && (
                    <div className="db-list-foot">Showing all {filtered.length}</div>
                  )}
                </div>
          )}
          </>)}

          {tab === 'access' && <AccessRequestsTab />}
          {tab === 'companies' && (
            <CompaniesTab
              companies={companiesData?.adminCompanies ?? []}
              loading={companiesLoading}
              error={companiesError?.message}
              busy={supportLoading}
              onOpen={openCompany}
            />
          )}

          {tab === 'insights' && (
            <InsightsTab
              insights={insightsData?.adminInsights}
              companies={companiesData?.adminCompanies ?? []}
              loading={insightsLoading || companiesLoading}
              error={insightsError?.message ?? companiesError?.message}
            />
          )}

          {tab === 'test' && <TestToolsTab toast={toast} onSubmissionCreated={() => refetch()} />}
        </main>

      {selected && (
        <div className="db-modal-bg" onClick={() => setSelected(null)}>
          <div className="db-modal" role="dialog" aria-modal="true" aria-label="Submission detail"
            ref={modalRef} tabIndex={-1} onClick={e => e.stopPropagation()}>
            <div className="db-modal-header">
              <div>
                <p className="db-modal-company">{selected.companyName || `${selected.firstName} ${selected.lastName}`}</p>
                <p className="db-modal-sub">{selected.firstName} {selected.lastName} — {selected.email}</p>
              </div>
              <button className="db-modal-close" onClick={() => setSelected(null)} aria-label="Close">✕</button>
            </div>

            {modalMode === 'view' ? (
              <div className="db-modal-body">
                <div className="db-detail-grid">
                  <Detail label="Buyer" value={selected.buyerType === 'INDIVIDUAL' ? 'Individual' : 'Company'} />
                  <Detail label="Order #" value={selected.orderNumber || <span style={{ color: 'var(--text-dim)' }}>—</span>} />
                  <Detail label="Country" value={selected.country || <span style={{ color: 'var(--text-dim)' }}>—</span>} />
                  <Detail label="Submitted" value={new Date(selected.createdAt).toLocaleString('en-GB')} />
                </div>
                  <div className={`db-id-block${selected.substanceCheckStatus === 'PENDING' ? ' db-id-block--checking' : selected.substanceCheckStatus === 'OK' ? ' db-id-block--ok' : selected.substanceCheckStatus === 'FLAGGED' ? ' db-id-block--suspicious' : ''}`}>
                    <div className="db-id-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                      <span>Substance Information</span>
                        <button className="db-btn-view" disabled={rechecking || selected.substanceCheckStatus === 'PENDING'}
                          onClick={() => handleRecheckSubstance(selected.id)}>
                          {rechecking || selected.substanceCheckStatus === 'PENDING' ? 'Checking…' : selected.substanceCheckStatus === 'NOT_CHECKED' ? 'Run check' : 'Re-run check'}
                        </button>
                    </div>
                    <div className="db-detail-grid" style={{ marginBottom: '1.25rem' }}>
                      <Detail label="Substance(s)" value={selected.substances} />
                      <Detail label="CAS Number" value={selected.casNumbers || <span style={{ color: 'var(--text-dim)' }}>—</span>} />
                      <Detail label="Concentration" value={selected.concentration || <span style={{ color: 'var(--text-dim)' }}>—</span>} />
                    </div>
                    <Detail label="Statement" value={
                      <StatementWithTranslation statement={selected.statement}
                        lang={selected.statementLang} translation={selected.statementTranslation} />
                    } />
                      <div className="db-detail-grid" style={{ marginTop: '1.25rem', marginBottom: selected.substanceCheckNote ? '1rem' : 0 }}>
                        <Detail label="Compliance" value={<SubCheckBadge status={selected.substanceCheckStatus} />} />
                        {selected.substanceCheckedAt && (
                          <Detail label="Checked" value={<span title={formatDate(selected.substanceCheckedAt)}>{relativeTime(selected.substanceCheckedAt)}</span>} />
                        )}
                      </div>
                    {selected.substanceCheckNote && <Detail label="Assessment" value={selected.substanceCheckNote} />}
                    {renderOverride('SUBSTANCE')}
                  </div>
                {selected.adminNote && (
                  <div className="db-detail-full">
                    <Detail label="Admin Note" value={selected.adminNote} />
                  </div>
                )}
                {(selected.idDocumentName || selected.idDocumentType
                  || selected.idVerificationStatus !== 'NOT_CHECKED') && (() => {
                  // Rows captured before the move to Didit carry MRZ signals and no
                  // verification status; newer rows carry the reverse. Render whichever
                  // pipeline actually produced this row rather than showing empty fields.
                  const verified = selected.idVerificationStatus !== 'NOT_CHECKED';
                  const suspicious = verified
                    ? selected.idVerificationStatus !== 'APPROVED'
                      || selected.idLivenessPassed === false || selected.idFaceMatch === false
                    : selected.idLikelySynthetic === true || selected.idMrzValid === false;
                  const clean = verified
                    ? selected.idVerificationStatus === 'APPROVED'
                    : selected.idLikelySynthetic === false;
                  const dimmed = <span style={{ color: 'var(--text-dim)' }}>—</span>;
                  const yesNo = (v: boolean | null | undefined, ok: string, bad: string) =>
                    v === true ? <span style={{ color: '#15803d', fontWeight: 600 }}>{ok}</span>
                    : v === false ? <span style={{ color: '#dc2626', fontWeight: 600 }}>{bad}</span>
                    : dimmed;
                  return (
                <div className={`db-id-block${suspicious ? ' db-id-block--suspicious' : clean ? ' db-id-block--ok' : ''}`}>
                  <div className="db-id-title">Identity Document</div>
                  <div className="db-detail-grid" style={{ marginBottom: 0 }}>
                    <Detail label="Name on Document" value={selected.idDocumentName ?? dimmed} />
                    <Detail label="Document Type"
                      value={selected.idDocumentType ? docTypeLabels[selected.idDocumentType] : dimmed} />
                    <AdminRevealDocument submissionId={selected.id} />
                    {verified ? (<>
                      <Detail label="Verification"
                        value={<IdVerificationBadge status={selected.idVerificationStatus} />} />
                      <Detail label="Liveness" value={yesNo(selected.idLivenessPassed, '✓ Passed', '✗ Failed')} />
                      <Detail label="Face Match" value={yesNo(selected.idFaceMatch, '✓ Match', '✗ No match')} />
                    </>) : (<>
                      <Detail label="MRZ Valid" value={yesNo(selected.idMrzValid, '✓ Yes', '✗ No')} />
                      <Detail label="Forgery Risk"
                        value={selected.idLikelySynthetic === true
                          ? <span style={{ color: '#dc2626', fontWeight: 600 }}>⚠ Suspicious</span>
                          : selected.idLikelySynthetic === false
                            ? <span style={{ color: '#15803d' }}>No flags</span>
                            : dimmed} />
                    </>)}
                    <Detail label="Expiry"
                      value={selected.idDocumentExpiry
                        ? <span style={{ color: isExpired(selected.idDocumentExpiry) ? '#dc2626' : 'inherit', fontWeight: isExpired(selected.idDocumentExpiry) ? 600 : 400 }}>
                            {new Date(selected.idDocumentExpiry).toLocaleDateString('en-GB')}{isExpired(selected.idDocumentExpiry) ? ' ✗ Expired' : ''}
                          </span>
                        : dimmed} />
                    {verified && selected.idVerificationCheckedAt && (
                      <Detail label="Checked" value={formatDate(selected.idVerificationCheckedAt)} />
                    )}
                  </div>
                  {selected.idVerificationWarnings && (
                    <div className="db-detail-full" style={{ marginTop: '0.9rem' }}>
                      <Detail label="Provider Warnings" value={selected.idVerificationWarnings} />
                    </div>
                  )}
                  {(suspicious || isExpired(selected.idDocumentExpiry)) && (
                    <div className="db-id-alert">
                      Please review this document manually before approving.
                    </div>
                  )}
                  {verified && !selected.idVerificationPurged && (
                    <div className="db-id-alert">
                      The document images are still held by the verification provider — the automatic
                      purge did not confirm. Delete the session in the Didit console.
                    </div>
                  )}
                  {renderOverride('IDENTITY')}
                </div>
                  );
                })()}
                {selected.buyerType === 'COMPANY' && (
                  <div className={`db-id-block${selected.viesAddressMatch === 'MISMATCH' || selected.viesStatus === 'INVALID' ? ' db-id-block--suspicious' : selected.viesAddressMatch === 'MATCH' ? ' db-id-block--ok' : ''}`}>
                    <div className="db-id-title">VAT / VIES</div>
                    <div className="db-detail-grid" style={{ marginBottom: selected.viesStatus === 'VALID' && (selected.viesName || selected.viesAddress) ? '1rem' : 0 }}>
                      <Detail label="VAT" value={selected.vatNumber || <span style={{ color: 'var(--text-dim)' }}>—</span>} />
                      <Detail label="VIES Status" value={<ViesBadge status={selected.viesStatus} />} />
                    </div>
                    {selected.viesStatus === 'VALID' && (selected.viesName || selected.viesAddress) && (<>
                      <div className="db-detail-grid" style={{ marginBottom: '1rem' }}>
                        <Detail label="Registered Name" value={selected.viesName || <span style={{ color: 'var(--text-dim)' }}>—</span>} />
                        <Detail label="Address Match" value={<ViesAddressBadge match={selected.viesAddressMatch} />} />
                      </div>
                      <div className="db-detail-grid" style={{ marginBottom: 0 }}>
                        <Detail label="Registered Address"
                          value={selected.viesAddress
                            ? <span style={{ whiteSpace: 'pre-line' }}>{selected.viesAddress}</span>
                            : <span style={{ color: 'var(--text-dim)' }}>No address on file</span>} />
                        <Detail label="Submitted Address"
                          value={<span style={{ whiteSpace: 'pre-line' }}>{[selected.street, [selected.zipCode, selected.place].filter(Boolean).join(' '), selected.country].filter(Boolean).join('\n') || '—'}</span>} />
                      </div>
                    </>)}
                    {selected.viesAddressMatch === 'MISMATCH' && (
                      <div className="db-id-alert">
                        The submitted address does not match the address registered for this VAT. Please review before approving.
                      </div>
                    )}
                    {renderOverride('VIES')}
                  </div>
                )}
                <div className="db-detail-grid" style={{ marginBottom: 0 }}>
                  <Detail label="Status" value={<>{<StatusBadge status={selected.status} />}{selected.isTest && <span className="db-badge db-badge-amber" style={{ marginLeft: 8 }}>TEST</span>}</>} />
                  {selected.reviewedByName && (
                    <Detail label="Reviewed by" value={<span title={selected.reviewedAt ? formatDate(selected.reviewedAt) : undefined}>{selected.reviewedByName}</span>} />
                  )}
                </div>

                {selected.status === 'PENDING_REVIEW' && (() => {
                  const blocking = blockingCategories(selected);
                  const pending = isPending(selected);
                  const canApprove = approvable(selected);
                  return (
                  <>
                    <div className="db-modal-actions">
                      <button className="db-btn-approve db-btn-lg" onClick={handleApprove} disabled={approving || !canApprove}>
                        {approving ? 'Approving…' : 'Approve'}
                      </button>
                      <button className="db-btn-deny db-btn-lg" onClick={() => setModalMode('deny')}>Deny…</button>
                    </div>
                    {!canApprove && (
                      <p className="db-gate-hint">
                        {pending
                          ? 'Substance check is still running — approval is locked until it finishes.'
                          : `Resolve or override to approve: ${blocking.map(c => CATEGORY_LABEL[c]).join(', ')}.`}
                      </p>
                    )}
                  </>
                  );
                })()}
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
                  <button className="db-btn-deny db-btn-lg" onClick={handleDeny} disabled={!denyReason.trim() || denying}>
                    {denying ? 'Denying…' : 'Confirm Denial'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </>
  );
}

// A pending submission warrants review while any check is failing and not yet
// overridden. Once every failing check is overridden, it becomes approvable and
// drops back to the normal pending color.
function needsReview(s: Submission): boolean {
  return blockingCategories(s).length > 0;
}

// Traffic-light row color: green=approved, red=denied/needs-attention, yellow=pending.
function rowColor(s: Submission): 'green' | 'red' | 'yellow' {
  if (s.status === 'APPROVED') return 'green';
  if (s.status === 'DENIED') return 'red';
  return needsReview(s) ? 'red' : 'yellow';
}

function ViesBadge({ status }: { status: 'VALID' | 'INVALID' | 'ERROR' | 'NOT_CHECKED' }) {
  const map = { VALID: 'db-badge-green', INVALID: 'db-badge-red', ERROR: 'db-badge-amber', NOT_CHECKED: 'db-badge-grey' };
  return <span className={`db-badge ${map[status]}`}>{status === 'NOT_CHECKED' ? 'NOT CHECKED' : status}</span>;
}

function ViesAddressBadge({ match }: { match: ViesAddressMatch }) {
  const map: Record<ViesAddressMatch, [string, string]> = {
    NOT_CHECKED: ['db-badge-grey', 'NOT CHECKED'],
    UNAVAILABLE: ['db-badge-grey', 'NO RECORD'],
    MATCH: ['db-badge-green', '✓ MATCH'],
    PARTIAL: ['db-badge-amber', '~ PARTIAL'],
    MISMATCH: ['db-badge-red', '✗ MISMATCH'],
  };
  const [cls, label] = map[match];
  return <span className={`db-badge ${cls}`}>{label}</span>;
}

function IdVerificationBadge({ status }: { status: IdVerificationStatus }) {
  const map: Record<IdVerificationStatus, [string, string]> = {
    NOT_CHECKED: ['db-badge-grey', 'NOT CHECKED'],
    PENDING: ['db-badge-blue', 'IN PROGRESS'],
    IN_REVIEW: ['db-badge-amber', 'MANUAL REVIEW'],
    APPROVED: ['db-badge-green', '✓ VERIFIED'],
    DECLINED: ['db-badge-red', '✗ DECLINED'],
    EXPIRED: ['db-badge-amber', 'EXPIRED'],
    ERROR: ['db-badge-amber', 'ERROR'],
  };
  const [cls, label] = map[status] ?? map.ERROR;
  return <span className={`db-badge ${cls}`}>{label}</span>;
}

function StatusBadge({ status }: { status: 'PENDING_REVIEW' | 'APPROVED' | 'DENIED' }) {
  const map = { PENDING_REVIEW: 'db-badge-amber', APPROVED: 'db-badge-green', DENIED: 'db-badge-red' };
  const label = { PENDING_REVIEW: 'Pending', APPROVED: 'Approved', DENIED: 'Denied' };
  return <span className={`db-badge ${map[status]}`}>{label[status]}</span>;
}

// Pill version for the submissions table column (consistent with VIES/Status).
function SubCheckTag({ status }: { status: SubstanceCheckStatus }) {
  const map: Record<SubstanceCheckStatus, [string, string]> = {
    NOT_CHECKED: ['db-badge-grey', 'Not checked'],
    PENDING: ['db-badge-blue', 'Checking…'],
    OK: ['db-badge-green', 'OK'],
    FLAGGED: ['db-badge-red', '⚠ Flagged'],
    ERROR: ['db-badge-amber', 'Error'],
  };
  const [cls, label] = map[status];
  return <span className={`db-badge ${cls}`}>{label}</span>;
}

function SubCheckBadge({ status }: { status: SubstanceCheckStatus }) {
  const map: Record<SubstanceCheckStatus, [string, string]> = {
    NOT_CHECKED: ['var(--text-dim)', 'Not checked'],
    PENDING: ['var(--blue)', 'Checking…'],
    // Not "No concerns" — the check screens for known indicators, it does not
    // read the statement. Claiming more than it did is how reviewers stop reading.
    OK: ['#15803d', '✓ Nothing flagged'],
    FLAGGED: ['#dc2626', '⚠ Needs review'],
    ERROR: ['var(--amber)', 'Check failed'],
  };
  const [color, label] = map[status];
  return <span style={{ color, fontWeight: 600 }}>{label}</span>;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="db-detail">
      <span className="db-detail-label">{label}</span>
      <span className="db-detail-value">{value}</span>
    </div>
  );
}

function CompaniesTab({ companies, loading, error, busy, onOpen }: {
  companies: CompanyActivity[]; loading: boolean; error?: string;
  busy: boolean; onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState('');

  if (loading) return <div className="db-state">Loading companies…</div>;
  if (error) return <div className="db-state db-state-err">Failed to load: {error}</div>;
  if (companies.length === 0) return <div className="db-state">No companies registered yet.</div>;

  // Name and slug are the two things anyone searches by, and both are already
  // loaded — so this filters what is on screen rather than asking the server.
  // Worth revisiting past a couple of hundred tenants, which is where the
  // resolver's own page size stops.
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? companies.filter(c =>
        c.name.toLowerCase().includes(needle) || c.slug.toLowerCase().includes(needle))
    : companies;

  return (
    <>
      <div className="db-search-wrap">
        <svg className="db-search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor"
          strokeWidth="1.8" width="15" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.5" /><path d="M13.5 13.5l3 3" strokeLinecap="round" />
        </svg>
        <input
          className="db-search"
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search companies by name or address…"
          aria-label="Search companies"
        />
        {needle && (
          <button className="db-search-clear" onClick={() => setQuery('')} aria-label="Clear search">✕</button>
        )}
      </div>
      {needle && (
        <p className="db-result-count" role="status">
          {shown.length === 0
            ? `No company matches “${query.trim()}”.`
            : `${shown.length} of ${companies.length} companies`}
        </p>
      )}
    <div className="db-table-wrap">
      <table className="db-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Members</th>
            <th>Submissions</th>
            <th>Setup</th>
            <th>Last activity</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {shown.map(c => (
            <tr key={c.id} className="db-row" onClick={() => !busy && onOpen(c.id)}>
              <td>
                <div className="db-company">{c.name}</div>
                <div className="db-vat">/{c.slug}</div>
              </td>
              <td>{c.membersCount}</td>
              <td>
                {c.submissionsCount}
                {c.pendingCount > 0 && <span className="db-badge db-badge-amber db-pending-badge">{c.pendingCount} pending</span>}
              </td>
              <td>
                {c.accessStatus === 'PENDING' ? <span className="db-badge db-badge-amber">Awaiting approval</span>
                  : c.accessStatus === 'REJECTED' ? <span className="db-badge db-badge-red">Declined</span>
                  : c.configured
                  ? <span className="db-badge db-badge-green">Live</span>
                  : <span className="db-badge db-badge-grey">Not set up</span>}
              </td>
              <td className="db-cell-mono" title={formatDate(c.lastSubmissionAt)}>{relativeTime(c.lastSubmissionAt)}</td>
              <td className="db-cell-mono">{formatDate(c.createdAt)}</td>
              <td>
                <div className="db-actions" onClick={e => e.stopPropagation()}>
                  <button className="db-btn-view" disabled={busy} onClick={() => onOpen(c.id)}>
                    Open dashboard →
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}

function WeeklyChart({ weekly, field, barClass, unit }: {
  weekly: Insights['weekly'];
  field: 'submissions' | 'companies';
  barClass: string;
  unit: (n: number) => string;
}) {
  const W = 360, H = 180, pad = 24, gap = 6;
  const max = Math.max(1, ...weekly.map(w => w[field]));
  const slot = (W - pad * 2) / weekly.length;
  const barW = slot - gap;
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  const hgt = (v: number) => (v / max) * (H - pad * 2);
  return (
    <svg className="db-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Weekly ${field}`}>
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1={pad} x2={W - pad} y1={y(max * f)} y2={y(max * f)} className="db-chart-grid" />
      ))}
      {weekly.map((w, i) => (
        <g key={w.weekStart}>
          <rect x={pad + i * slot + gap / 2} y={y(w[field])} width={barW} height={hgt(w[field])} rx="2" className={barClass}>
            <title>{`Week of ${w.weekStart}: ${unit(w[field])}`}</title>
          </rect>
          {i % 2 === 0 && (
            <text x={pad + i * slot + slot / 2} y={H - 6} className="db-chart-label" textAnchor="middle">
              {w.weekStart.slice(5)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function InsightsTab({ insights, companies, loading, error }: {
  insights?: Insights; companies: CompanyActivity[]; loading: boolean; error?: string;
}) {
  if (loading || !insights) {
    return error
      ? <div className="db-state db-state-err">Failed to load: {error}</div>
      : <div className="db-state">Loading insights…</div>;
  }
  const reviewed = insights.approved + insights.denied;
  const approvalRate = reviewed ? Math.round((insights.approved / reviewed) * 100) : null;
  const statusTotal = Math.max(1, insights.totalSubmissions);
  const ranking = [...companies].sort((a, b) => b.submissionsCount - a.submissionsCount);
  return (
    <div className="db-insights">
      <div className="db-stat-row">
        <div className="db-stat-card"><span className="db-stat-num">{insights.totalCompanies}</span><span className="db-stat-label">Companies</span></div>
        <div className="db-stat-card"><span className="db-stat-num">{insights.totalSubmissions}</span><span className="db-stat-label">Submissions</span></div>
        <div className="db-stat-card"><span className="db-stat-num db-stat-amber">{insights.pendingReview}</span><span className="db-stat-label">Pending review</span></div>
        <div className="db-stat-card">
          <span className="db-stat-num">{insights.avgReviewHours == null ? '—' : insights.avgReviewHours < 1 ? `${Math.round(insights.avgReviewHours * 60)}m` : `${insights.avgReviewHours.toFixed(1)}h`}</span>
          <span className="db-stat-label">Avg time to review</span>
        </div>
      </div>

      <div className="db-panel-duo">
        <div className="db-panel">
          <div className="db-panel-head">
            <h3 className="db-panel-title">Submissions — last 12 weeks</h3>
            <span className="db-legend-item"><span className="db-dot db-dot-blue" /></span>
          </div>
          <WeeklyChart
            weekly={insights.weekly}
            field="submissions"
            barClass="db-chart-bar-subs"
            unit={n => `${n} submission${n === 1 ? '' : 's'}`}
          />
        </div>
        <div className="db-panel">
          <div className="db-panel-head">
            <h3 className="db-panel-title">New companies — last 12 weeks</h3>
            <span className="db-legend-item"><span className="db-dot db-dot-green" /></span>
          </div>
          <WeeklyChart
            weekly={insights.weekly}
            field="companies"
            barClass="db-chart-bar-cos"
            unit={n => `${n} new compan${n === 1 ? 'y' : 'ies'}`}
          />
        </div>
      </div>

      <div className="db-panel">
        <div className="db-panel-head">
          <h3 className="db-panel-title">Submission status</h3>
          {approvalRate != null && <span className="db-panel-side">{approvalRate}% approval rate</span>}
        </div>
        <div className="db-status-bar">
          <div className="db-status-seg db-seg-green" style={{ width: `${(insights.approved / statusTotal) * 100}%` }} />
          <div className="db-status-seg db-seg-amber" style={{ width: `${(insights.pendingReview / statusTotal) * 100}%` }} />
          <div className="db-status-seg db-seg-red" style={{ width: `${(insights.denied / statusTotal) * 100}%` }} />
        </div>
        <div className="db-legend db-legend-row">
          <span className="db-legend-item"><span className="db-dot db-dot-green" /> Approved {insights.approved}</span>
          <span className="db-legend-item"><span className="db-dot db-dot-amber" /> Pending {insights.pendingReview}</span>
          <span className="db-legend-item"><span className="db-dot db-dot-red" /> Denied {insights.denied}</span>
        </div>
      </div>

      <div className="db-panel">
        <div className="db-panel-head"><h3 className="db-panel-title">Verification quality</h3></div>
        <div className="db-stat-row db-stat-row-sub">
          <div className={`db-stat-card${insights.viesInvalid ? ' db-stat-card-bad' : ''}`}><span className="db-stat-num">{insights.viesInvalid}</span><span className="db-stat-label">VIES invalid</span></div>
          <div className={`db-stat-card${insights.viesError ? ' db-stat-card-warn' : ''}`}><span className="db-stat-num">{insights.viesError}</span><span className="db-stat-label">VIES errors</span></div>
          <div className={`db-stat-card${insights.mrzInvalid ? ' db-stat-card-bad' : ''}`}><span className="db-stat-num">{insights.mrzInvalid}</span><span className="db-stat-label">Identity not verified</span></div>
          <div className={`db-stat-card${insights.likelySynthetic ? ' db-stat-card-bad' : ''}`}><span className="db-stat-num">{insights.likelySynthetic}</span><span className="db-stat-label">Fraud signals on ID</span></div>
        </div>
      </div>

      <div className="db-panel">
        <div className="db-panel-head"><h3 className="db-panel-title">Company activity</h3></div>
        {ranking.length === 0 ? <div className="db-state">No companies yet.</div> : (
          <div className="db-table-wrap">
          <table className="db-table db-table-flat">
            <thead>
              <tr><th>#</th><th>Company</th><th>Submissions</th><th>Pending</th><th>Last activity</th><th>Setup</th></tr>
            </thead>
            <tbody>
              {ranking.map((c, i) => (
                <tr key={c.id}>
                  <td className="db-cell-mono">{i + 1}</td>
                  <td><div className="db-company">{c.name}</div><div className="db-vat">/{c.slug}</div></td>
                  <td>{c.submissionsCount}</td>
                  <td>{c.pendingCount > 0 ? <span className="db-badge db-badge-amber">{c.pendingCount}</span> : '—'}</td>
                  <td className="db-cell-mono" title={formatDate(c.lastSubmissionAt)}>{relativeTime(c.lastSubmissionAt)}</td>
                  <td>{c.configured ? <span className="db-badge db-badge-green">Live</span> : <span className="db-badge db-badge-grey">Not set up</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Identity outcomes a test submission can be created with. These write the same
// fields a real Didit decision writes, so the dashboard renders identically —
// but they cost no verification quota, and several of these states cannot be
// produced on demand against a live account at all (ERROR, a failed purge, or a
// document that has already expired).
function isoOffsetYears(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

const ID_PRESETS: { key: string; label: string; fields: Record<string, unknown> }[] = [
  { key: 'NONE', label: 'No identity check (default)', fields: { idVerificationStatus: 'NOT_CHECKED' } },
  {
    key: 'CLEAN', label: 'Approved — clean passport',
    fields: {
      idVerificationStatus: 'APPROVED', idDocumentType: 'PASSPORT', idDocumentName: 'TEST USER',
      idDocumentNumber: 'NX1234567', idDocumentExpiry: isoOffsetYears(5),
      idLivenessPassed: true, idFaceMatch: true, idVerificationPurged: true,
    },
  },
  {
    key: 'ID_CARD', label: 'Approved — identity card',
    fields: {
      idVerificationStatus: 'APPROVED', idDocumentType: 'ID_CARD', idDocumentName: 'TEST USER',
      idDocumentNumber: 'IDNL00042', idDocumentExpiry: isoOffsetYears(3),
      idLivenessPassed: true, idFaceMatch: true, idVerificationPurged: true,
    },
  },
  {
    key: 'EXPIRED_DOC', label: 'Approved — but the document has expired',
    fields: {
      idVerificationStatus: 'APPROVED', idDocumentType: 'PASSPORT', idDocumentName: 'TEST USER',
      idDocumentNumber: 'NX7654321', idDocumentExpiry: isoOffsetYears(-1),
      idLivenessPassed: true, idFaceMatch: true, idVerificationPurged: true,
    },
  },
  {
    key: 'FACE_FAIL', label: 'Approved — face match failed',
    fields: {
      idVerificationStatus: 'APPROVED', idDocumentType: 'PASSPORT', idDocumentName: 'TEST USER',
      idDocumentNumber: 'NX2222222', idDocumentExpiry: isoOffsetYears(4),
      idLivenessPassed: true, idFaceMatch: false, idVerificationPurged: true,
      idVerificationWarnings: 'Face match similarity below threshold (61%). The portrait on the document and the selfie may not be the same person.',
    },
  },
  {
    key: 'IN_REVIEW', label: 'In manual review',
    fields: {
      idVerificationStatus: 'IN_REVIEW', idDocumentType: 'PASSPORT', idDocumentName: 'TEST USER',
      idDocumentNumber: 'NX3333333', idDocumentExpiry: isoOffsetYears(6),
      idLivenessPassed: true, idVerificationPurged: false,
      idVerificationWarnings: 'Document image quality borderline; sent for human review.',
    },
  },
  {
    key: 'DECLINED', label: 'Declined — liveness failed',
    fields: {
      idVerificationStatus: 'DECLINED', idDocumentType: 'PASSPORT', idDocumentName: 'TEST USER',
      idDocumentNumber: 'NX4444444', idDocumentExpiry: isoOffsetYears(2),
      idLivenessPassed: false, idFaceMatch: false, idVerificationPurged: true,
      idVerificationWarnings: 'Liveness check failed — presentation attack suspected (screen replay).',
    },
  },
  {
    key: 'EXPIRED', label: 'Session expired / abandoned',
    fields: { idVerificationStatus: 'EXPIRED', idVerificationPurged: true },
  },
  {
    key: 'ERROR', label: 'Provider error',
    fields: {
      idVerificationStatus: 'ERROR', idVerificationPurged: false,
      idVerificationWarnings: 'The verification provider returned an unrecognised status.',
    },
  },
  {
    key: 'NOT_PURGED', label: 'Approved — but images NOT purged',
    fields: {
      idVerificationStatus: 'APPROVED', idDocumentType: 'PASSPORT', idDocumentName: 'TEST USER',
      idDocumentNumber: 'NX5555555', idDocumentExpiry: isoOffsetYears(7),
      idLivenessPassed: true, idFaceMatch: true, idVerificationPurged: false,
    },
  },
  {
    key: 'UNSUPPORTED', label: 'Unsupported document type (no doc type mapped)',
    fields: {
      idVerificationStatus: 'APPROVED', idDocumentName: 'TEST USER', idDocumentNumber: 'DL9999999',
      idLivenessPassed: true, idFaceMatch: true, idVerificationPurged: true,
      idVerificationWarnings: "Unsupported document type: Driver's License",
    },
  },
];

function TestToolsTab({ toast, onSubmissionCreated }: {
  toast: ReturnType<typeof useToast>;
  onSubmissionCreated: () => void;
}) {
  // Substance check
  const [sub, setSub] = useState({ substances: 'Acetone', casNumbers: '67-64-1', statement: 'For cleaning glassware in our laboratory.', buyerType: 'COMPANY' });
  const [subRes, setSubRes] = useState<{ status: SubstanceCheckStatus; note: string } | null>(null);
  const [runSub, { loading: subLoading }] = useLazyQuery<any>(TEST_SUBSTANCE, { fetchPolicy: 'no-cache' });
  // VIES
  const [vies, setVies] = useState({ vat: 'IE6388047V', street: '', zipCode: '', place: '' });
  const [viesRes, setViesRes] = useState<{ status: string; name: string | null; address: string | null; addressMatch: ViesAddressMatch } | null>(null);
  const [runViesQ, { loading: viesLoading }] = useLazyQuery<any>(TEST_VIES, { fetchPolicy: 'no-cache' });
  // Identity verification (Didit hosted flow)
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const verifyPoll = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (verifyPoll.current) clearInterval(verifyPoll.current); }, []);
  // Create test submission
  const [ts, setTs] = useState({ buyerType: 'COMPANY', companyName: 'Test Company BV', vatNumber: 'IE6388047V', firstName: 'Test', lastName: 'User', email: 'test@example.com', street: '', zipCode: '', place: '', country: 'Netherlands', substances: 'Acetone', casNumbers: '67-64-1', statement: 'Laboratory use.', companySlug: '' });
  const [idPreset, setIdPreset] = useState('NONE');
  const [createSub, { loading: creating }] = useMutation<any>(CREATE_TEST_SUBMISSION, {
    onCompleted: () => { toast.success('Test submission created'); onSubmissionCreated(); },
    onError: e => toast.error(e.message),
  });
  const [clearSubs, { loading: clearing }] = useMutation<any>(DELETE_TEST_SUBMISSIONS, {
    onCompleted: d => { toast.success(`Cleared ${d.deleteTestSubmissions} test submission(s)`); onSubmissionCreated(); },
    onError: e => toast.error(e.message),
  });

  const onSubstance = async () => {
    setSubRes(null);
    try {
      const { data } = await runSub({ variables: sub });
      if (data?.testSubstanceCheck) setSubRes(data.testSubstanceCheck);
    } catch (e: any) { toast.error(e.message); }
  };
  const onVies = async () => {
    setViesRes(null);
    try {
      const { data } = await runViesQ({ variables: vies });
      if (data?.testVies) setViesRes(data.testVies);
    } catch (e: any) { toast.error(e.message); }
  };
  const onVerify = async () => {
    if (verifyPoll.current) clearInterval(verifyPoll.current);
    setVerifyId(null); setVerifyStatus(null); setVerifyLoading(true);
    try {
      const res = await fetch('/verification-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Could not start verification');
      setVerifyId(data.sessionId);
      setVerifyStatus('PENDING');
      window.open(data.url, 'didit-verification-test', 'width=520,height=760');
      // The status endpoint returns the state only — the decision fields are
      // never exposed to the browser, so this shows progress, not identity data.
      verifyPoll.current = setInterval(async () => {
        const s = await fetch(`/verification-status/${data.sessionId}`);
        if (!s.ok) { if (verifyPoll.current) clearInterval(verifyPoll.current); return; }
        const { status } = await s.json();
        setVerifyStatus(status);
        if (status !== 'PENDING' && verifyPoll.current) clearInterval(verifyPoll.current);
      }, 4000);
    } catch (e: any) { toast.error(e.message); } finally { setVerifyLoading(false); }
  };

  const dim = { color: 'var(--text-dim)' };
  return (
    <div className="db-insights">
      {/* Substance check */}
      <div className="db-panel">
        <div className="db-panel-head"><h3 className="db-panel-title">Substance / use compliance check</h3></div>
        <p className="db-test-sub">Verifies the CAS against PubChem and checks Annexes I / II of Reg. (EU) 2019/1148. Nothing is saved.</p>
        <div className="db-test-grid">
          <label className="db-test-field"><span className="db-test-label">Substance(s)</span>
            <input className="db-test-input" value={sub.substances} onChange={e => setSub({ ...sub, substances: e.target.value })} /></label>
          <label className="db-test-field"><span className="db-test-label">CAS number</span>
            <input className="db-test-input" value={sub.casNumbers} onChange={e => setSub({ ...sub, casNumbers: e.target.value })} /></label>
          <label className="db-test-field"><span className="db-test-label">Buyer type</span>
            <select className="db-test-input db-test-select" value={sub.buyerType} onChange={e => setSub({ ...sub, buyerType: e.target.value })}>
              <option value="COMPANY">Company</option><option value="INDIVIDUAL">Individual</option></select></label>
        </div>
        <label className="db-test-field" style={{ marginTop: '0.85rem' }}><span className="db-test-label">Statement</span>
          <textarea className="db-test-input db-test-textarea" rows={2} value={sub.statement} onChange={e => setSub({ ...sub, statement: e.target.value })} /></label>
        <div className="db-test-actions">
          <button className="db-btn-view" disabled={subLoading} onClick={onSubstance}>{subLoading ? 'Running…' : 'Run check'}</button>
          {subRes && <SubCheckBadge status={subRes.status} />}
        </div>
        {subRes && <div className="db-test-result">{subRes.note}</div>}
      </div>

      {/* VIES */}
      <div className="db-panel">
        <div className="db-panel-head"><h3 className="db-panel-title">VIES VAT check</h3></div>
        <p className="db-test-sub">Validate any EU VAT number against the live VIES service. Add an address to test the address match against the registered company record.</p>
        <div className="db-test-grid">
          <label className="db-test-field"><span className="db-test-label">VAT number</span>
            <input className="db-test-input" value={vies.vat} onChange={e => setVies({ ...vies, vat: e.target.value })} placeholder="e.g. NL123456789B01" /></label>
          <label className="db-test-field"><span className="db-test-label">Street (optional)</span>
            <input className="db-test-input" value={vies.street} onChange={e => setVies({ ...vies, street: e.target.value })} placeholder="e.g. Weena 664" /></label>
          <label className="db-test-field"><span className="db-test-label">Postal code (optional)</span>
            <input className="db-test-input" value={vies.zipCode} onChange={e => setVies({ ...vies, zipCode: e.target.value })} placeholder="e.g. 3012 CN" /></label>
          <label className="db-test-field"><span className="db-test-label">City (optional)</span>
            <input className="db-test-input" value={vies.place} onChange={e => setVies({ ...vies, place: e.target.value })} placeholder="e.g. Rotterdam" /></label>
        </div>
        <div className="db-test-actions">
          <button className="db-btn-view" disabled={viesLoading} onClick={onVies}>{viesLoading ? 'Checking…' : 'Check'}</button>
          {viesRes && <ViesBadge status={viesRes.status as any} />}
          {viesRes && viesRes.addressMatch !== 'NOT_CHECKED' && <ViesAddressBadge match={viesRes.addressMatch} />}
        </div>
        {viesRes && (viesRes.name || viesRes.address) && (
          <div className="db-test-result-block">
            <div className="db-detail-grid" style={{ marginBottom: 0 }}>
              <Detail label="Registered name" value={viesRes.name ?? <span style={dim}>—</span>} />
              <Detail label="Registered address" value={viesRes.address ?? <span style={dim}>No address on file</span>} />
            </div>
          </div>
        )}
      </div>

      {/* Identity verification */}
      <div className="db-panel">
        <div className="db-panel-head"><h3 className="db-panel-title">Identity verification</h3></div>
        <p className="db-test-sub">Opens a live Didit session so you can walk the buyer's flow end to end. The document never touches this server, and this test consumes one verification from the monthly quota.</p>
        <div className="db-test-actions">
          <button className="db-btn-view" disabled={verifyLoading} onClick={onVerify}>
            {verifyLoading ? 'Starting…' : 'Start verification'}
          </button>
          {verifyStatus && <IdVerificationBadge status={verifyStatus as IdVerificationStatus} />}
        </div>
        {verifyId && (
          <div className="db-test-result-block">
            <div className="db-detail-grid" style={{ marginBottom: 0 }}>
              <Detail label="Session" value={<code style={{ fontSize: '0.78rem' }}>{verifyId}</code>} />
              <Detail label="Status" value={verifyStatus === 'PENDING'
                ? <span style={dim}>Waiting for you to finish in the Didit window…</span>
                : <span>{verifyStatus}</span>} />
            </div>
            <p className="db-test-sub" style={{ marginTop: '0.6rem', marginBottom: 0 }}>
              Only the state is shown here — the name, document number and fraud signals are
              fetched server-side and stored on the submission, never returned to the browser.
            </p>
          </div>
        )}
      </div>

      {/* Create test submission */}
      <div className="db-panel">
        <div className="db-panel-head"><h3 className="db-panel-title">Create test submission</h3>
          <button className="db-btn-cancel" disabled={clearing} onClick={() => clearSubs()}>{clearing ? 'Clearing…' : 'Clear test submissions'}</button>
        </div>
        <p className="db-test-sub">Creates a submission marked <b>TEST</b> (runs VIES + substance check, sends no emails, excluded from insights) so you can drive the review flow.</p>
        <div className="db-test-grid">
          <label className="db-test-field"><span className="db-test-label">Buyer type</span>
            <select className="db-test-input db-test-select" value={ts.buyerType} onChange={e => setTs({ ...ts, buyerType: e.target.value })}>
              <option value="COMPANY">Company</option><option value="INDIVIDUAL">Individual</option></select></label>
          <label className="db-test-field"><span className="db-test-label">Company name</span>
            <input className="db-test-input" value={ts.companyName} onChange={e => setTs({ ...ts, companyName: e.target.value })} disabled={ts.buyerType === 'INDIVIDUAL'} /></label>
          <label className="db-test-field"><span className="db-test-label">VAT number</span>
            <input className="db-test-input" value={ts.vatNumber} onChange={e => setTs({ ...ts, vatNumber: e.target.value })} disabled={ts.buyerType === 'INDIVIDUAL'} /></label>
          <label className="db-test-field"><span className="db-test-label">Substance(s)</span>
            <input className="db-test-input" value={ts.substances} onChange={e => setTs({ ...ts, substances: e.target.value })} /></label>
          <label className="db-test-field"><span className="db-test-label">CAS number</span>
            <input className="db-test-input" value={ts.casNumbers} onChange={e => setTs({ ...ts, casNumbers: e.target.value })} /></label>
          <label className="db-test-field"><span className="db-test-label">Street</span>
            <input className="db-test-input" value={ts.street} onChange={e => setTs({ ...ts, street: e.target.value })} placeholder="e.g. Weena 664" /></label>
          <label className="db-test-field"><span className="db-test-label">Postal code</span>
            <input className="db-test-input" value={ts.zipCode} onChange={e => setTs({ ...ts, zipCode: e.target.value })} placeholder="e.g. 3012 CN" /></label>
          <label className="db-test-field"><span className="db-test-label">City</span>
            <input className="db-test-input" value={ts.place} onChange={e => setTs({ ...ts, place: e.target.value })} placeholder="e.g. Rotterdam" /></label>
          <label className="db-test-field"><span className="db-test-label">Attach to company slug (optional)</span>
            <input className="db-test-input" value={ts.companySlug} onChange={e => setTs({ ...ts, companySlug: e.target.value })} placeholder="e.g. acme-test" /></label>
        </div>
        <label className="db-test-field" style={{ marginTop: '0.85rem' }}><span className="db-test-label">Statement</span>
          <textarea className="db-test-input db-test-textarea" rows={2} value={ts.statement} onChange={e => setTs({ ...ts, statement: e.target.value })} /></label>
        <label className="db-test-field" style={{ marginTop: '0.85rem' }}><span className="db-test-label">Identity check outcome (simulated — uses no verification quota)</span>
          <select className="db-test-input db-test-select" value={idPreset} onChange={e => setIdPreset(e.target.value)}>
            {ID_PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select></label>
        <div className="db-test-actions">
          <button className="db-btn-approve" disabled={creating} onClick={() => createSub({
            variables: { input: { ...ts, ...(ID_PRESETS.find(p => p.key === idPreset)?.fields ?? {}) } },
          })}>{creating ? 'Creating…' : 'Create test submission'}</button>
        </div>
      </div>
    </div>
  );
}

const dashStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #0f0f10;
    --surface:  #1a1a1c;
    --surface2: #1f1f21;
    --surface3: #2a2a2d;
    --border:   rgba(255,255,255,0.07);
    --border2:  rgba(255,255,255,0.12);
    --text:     #f0f2f8;
    --text-mid: #9a9a9f;
    --text-dim: #5e5e63;
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
    height: 100vh; height: 100dvh; overflow: hidden;
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    display: flex; flex-direction: row;
  }

  /* SIDEBAR — full viewport height; the main pane scrolls on its own */
  .db-sidebar {
    width: 220px; min-width: 220px; flex-shrink: 0;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    height: 100%; overflow-y: auto; z-index: 10;
  }
  .db-sb-top { flex: 1; display: flex; flex-direction: column; padding: 1.25rem 0.75rem 0; }
  .db-sb-bottom { padding: 0.75rem; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 2px; }
  .db-sb-brand { padding: 0 0.5rem 1.25rem; }
  .db-nav-wordmark { font-size: 14px; font-weight: 800; letter-spacing: -0.02em; color: var(--text); display: flex; align-items: center; gap: 8px; margin-bottom: 0.625rem; }
  .db-nav-wordmark b { color: var(--blue); font-weight: 800; }
  .db-sb-meta { display: flex; flex-direction: column; gap: 5px; align-items: flex-start; }
  .db-nav-tag {
    font-size: 9px; font-weight: 600; letter-spacing: 0.16em;
    color: var(--blue); background: rgba(91,156,246,0.1);
    border: 1px solid rgba(91,156,246,0.22);
    padding: 3px 9px; text-transform: uppercase; border-radius: var(--r-pill);
  }
  .db-nav-title { font-size: 12px; font-weight: 500; color: var(--text-mid); letter-spacing: 0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .db-sb-nav { display: flex; flex-direction: column; gap: 2px; margin-top: 0.25rem; }
  .db-sb-count {
    margin-left: auto; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums;
    background: var(--amber); color: #0f0f10;
  }
  .db-sb-item {
    font-family: inherit; font-size: 13px; font-weight: 500; color: var(--text-mid);
    background: transparent; border: none; border-radius: var(--r-sm);
    padding: 9px 12px; cursor: pointer; display: flex; align-items: center; gap: 10px;
    text-align: left; width: 100%; transition: all 0.15s;
  }
  .db-sb-item:hover { color: var(--text); background: var(--surface2); }
  .db-sb-active { color: var(--text) !important; background: var(--surface3) !important; }
  .db-sb-item svg { flex-shrink: 0; opacity: 0.7; }
  .db-sb-active svg { opacity: 1; }
  .db-sb-theme, .db-sb-signout {
    font-family: inherit; font-size: 12px; font-weight: 500; color: var(--text-dim);
    background: transparent; border: none; border-radius: var(--r-sm);
    padding: 9px 12px; cursor: pointer; display: flex; align-items: center; gap: 10px;
    width: 100%; text-align: left; transition: all 0.15s;
  }
  .db-sb-theme:hover, .db-sb-signout:hover { color: var(--text); background: var(--surface2); }
  .db-sb-theme svg, .db-sb-signout svg { flex-shrink: 0; }

  /* MAIN */
  .db-main { padding: 1.5rem 1.75rem; flex: 1; min-width: 0; overflow-y: auto; overflow-x: hidden; }

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
  /* Traffic-light row coloring — faint tint + colored left edge */
  .db-row--green { background: rgba(62,207,142,0.06); }
  .db-row--green:hover { background: rgba(62,207,142,0.12); }
  .db-row--green td:first-child { box-shadow: inset 3px 0 0 var(--green); }
  .db-row--yellow { background: rgba(245,166,35,0.06); }
  .db-row--yellow:hover { background: rgba(245,166,35,0.12); }
  .db-row--yellow td:first-child { box-shadow: inset 3px 0 0 var(--amber); }
  .db-row--red { background: rgba(240,78,94,0.06); }
  .db-row--red:hover { background: rgba(240,78,94,0.12); }
  .db-row--red td:first-child { box-shadow: inset 3px 0 0 var(--accent); }
  .db-table td { padding: 14px 18px; vertical-align: middle; }
  .db-cell-mono { font-size: 12px; color: var(--text-dim); font-variant-numeric: tabular-nums; }
  .db-company { font-weight: 600; color: var(--text); font-size: 13px; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
  .db-badge-grey   { color: var(--text-dim); background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); }
  .db-badge-blue   { color: var(--blue);   background: rgba(91,156,246,0.12); border-color: rgba(91,156,246,0.3); }

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
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 13px;
    color: #f0f2f8;
    background: linear-gradient(160deg, #1a1a1c, #141415); border: 1px solid var(--border2); border-radius: 16px;
    width: 100%; max-width: 620px; max-height: 88vh; overflow-y: auto;
    box-shadow: var(--shadow-lg);
    animation: slideUp 0.2s var(--ease);
  }
  @keyframes slideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
  .db-modal-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding: 1.5rem 1.75rem 1.25rem; border-bottom: 1px solid var(--border);
  }
  .db-modal-company { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; color: #f0f2f8; }
  .db-modal-sub { font-size: 12px; color: #9a9a9f; margin-top: 4px; }
  .db-modal-close {
    background: rgba(255,255,255,0.06); border: none; width: 28px; height: 28px;
    border-radius: 50%; font-size: 13px; color: #9a9a9f;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-left: 1rem; transition: all 0.2s var(--ease);
  }
  .db-modal-close:hover { background: rgba(255,255,255,0.12); color: #f0f2f8; }
  .db-modal-body { padding: 1.5rem 1.75rem; }
  .db-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem 2rem; margin-bottom: 1.5rem; }
  .db-detail-full { margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.875rem; }
  .db-detail { display: flex; flex-direction: column; gap: 5px; }
  .db-detail-label {
    font-size: 9px; font-weight: 600; letter-spacing: 0.13em; text-transform: uppercase;
    color: #77777c;
  }
  .db-detail-value {
    font-size: 13px; color: #d0d5e8; white-space: pre-wrap;
    word-break: break-word; line-height: 1.65;
  }
  .db-modal-actions {
    display: flex; gap: 0.75rem; justify-content: flex-end;
    margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border);
  }

  /* ID BLOCK */
  .db-id-block {
    background: #0d0d0e;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px;
    padding: 1rem 1.25rem 1.25rem;
    margin-bottom: 1.5rem;
    transition: background 0.2s, border-color 0.2s;
  }
  .db-id-block--suspicious {
    background: rgba(240,78,94,0.07);
    border-color: rgba(240,78,94,0.35);
  }
  .db-id-block--suspicious .db-id-title { color: rgba(240,78,94,0.75); }
  .db-id-block--ok {
    background: rgba(62,207,142,0.06);
    border-color: rgba(62,207,142,0.3);
  }
  .db-id-block--ok .db-id-title { color: rgba(62,207,142,0.8); }
  .db-id-block--checking {
    background: rgba(91,156,246,0.07);
    border-color: rgba(91,156,246,0.35);
  }
  .db-id-block--checking .db-id-title { color: rgba(91,156,246,0.85); }
  .db-id-title {
    font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
    color: #8a8a8f; margin-bottom: 0.875rem;
  }
  .db-id-alert {
    margin-top: 0.875rem;
    background: #fff7ed;
    border: 1px solid #fed7aa;
    border-left: 3px solid #f97316;
    border-radius: var(--r-sm);
    padding: 0.6rem 0.875rem;
    font-size: 11.5px;
    color: #9a3412;
    font-weight: 500;
  }

  /* OVERRIDE CONTROLS */
  .db-override { margin-top: 0.875rem; }
  .db-override-btn {
    font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500; cursor: pointer;
    background: transparent; color: var(--amber); border: 1px dashed rgba(245,166,35,0.5);
    border-radius: var(--r-sm); padding: 7px 13px; transition: all 0.2s var(--ease);
  }
  .db-override-btn:hover { background: rgba(245,166,35,0.1); border-color: var(--amber); }
  .db-override-actions { display: flex; gap: 0.5rem; margin-top: 0.6rem; }
  .db-override--done {
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    background: rgba(245,166,35,0.08); border: 1px solid rgba(245,166,35,0.3);
    border-radius: var(--r-sm); padding: 0.6rem 0.875rem; font-size: 11.5px; color: var(--amber); font-weight: 500;
  }
  .db-override-undo {
    background: none; border: none; color: var(--text-dim); font-size: 11px; cursor: pointer;
    text-decoration: underline; flex-shrink: 0;
  }
  .db-override-undo:hover { color: var(--text); }
  .db-gate-hint { font-size: 12px; color: var(--amber); margin: 0.75rem 0 0; text-align: right; }

  /* DENY FORM */
  .db-deny-heading { font-size: 15px; font-weight: 600; color: #f0f2f8; margin-bottom: 0.4rem; }
  .db-deny-sub { font-size: 12px; color: #9a9a9f; margin-bottom: 1.25rem; line-height: 1.6; }
  .db-deny-textarea {
    font-family: 'Inter', sans-serif; font-size: 13px; color: #f0f2f8;
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
  .db-result-count {
    font-size: 12px; color: var(--text-dim); margin: -0.5rem 0 1rem 2px;
  }
  .db-daterange {
    display: flex; align-items: center; flex-wrap: wrap; gap: 7px; margin-bottom: 1rem;
  }
  .db-daterange-label {
    font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--text-dim); margin-right: 2px;
  }
  .db-daterange-sep { color: var(--text-dim); }
  .db-date {
    font-family: 'Inter', sans-serif; font-size: 12px; color: var(--text);
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-sm);
    padding: 6px 10px; outline: none; color-scheme: dark;
    transition: border-color 0.2s var(--ease);
  }
  .db-date:focus { border-color: var(--border2); }
  .db-date-preset {
    font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 500;
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-pill);
    padding: 6px 13px; cursor: pointer; color: var(--text-mid);
    transition: all 0.2s var(--ease);
  }
  .db-date-preset:hover { border-color: var(--border2); color: var(--text); background: var(--surface2); }
  .db-date-clear { color: var(--accent); }
  .db-row-more td {
    text-align: center; color: var(--text-dim); font-size: 12px; padding: 14px; cursor: default;
  }
  .db-list-foot {
    text-align: center; color: var(--text-dim); font-size: 12px; padding: 12px;
  }
  .db-search-icon {
    position: absolute; left: 13px; color: var(--text-dim); pointer-events: none; flex-shrink: 0;
  }
  .db-search {
    font-family: 'Inter', sans-serif; font-size: 13px; color: var(--text);
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-sm);
    padding: 10px 36px 10px 38px; width: 100%; min-width: 0; outline: none;
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
    .db-sidebar { width: 60px; min-width: 60px; }
    .db-sb-top { padding: 1rem 0.5rem 0; align-items: center; }
    .db-sb-brand { padding: 0 0 1rem; display: flex; justify-content: center; }
    .db-nav-wordmark { font-size: 12px; margin-bottom: 0; }
    .db-nav-wordmark b { display: none; }
    .db-sb-meta { display: none; }
    .db-sb-label { display: none; }
    .db-sb-nav { width: 100%; align-items: center; }
    .db-sb-item { justify-content: center; padding: 10px; width: auto; }
    .db-sb-bottom { padding: 0.5rem; align-items: center; }
    .db-sb-theme, .db-sb-signout { justify-content: center; padding: 10px; width: auto; }
    .db-main { padding: 1rem; }
    .db-filters { gap: 0.375rem; }
    .db-filter-btn { padding: 9px 14px; font-size: 11px; }
    .db-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .db-table { min-width: 560px; }
    .db-table th, .db-table td { padding: 10px 12px; }
    .db-company { font-size: 12px; }
    .db-actions { flex-direction: column; gap: 0.4rem; }
    .db-btn-approve, .db-btn-deny, .db-btn-view, .db-btn-cancel { padding: 9px 16px; }
    .db-refresh { width: 38px; height: 38px; }
    .db-detail-grid { grid-template-columns: 1fr; gap: 1rem; }
    .db-modal { border-radius: 12px; max-height: 92vh; }
    .db-modal-header { padding: 1.25rem; }
    .db-modal-body { padding: 1.25rem; }
    .db-id-block { padding: 0.875rem 1rem 1rem; }
  }

  /* COMPANIES TAB */
  .db-pending-badge { margin-left: 8px; }

  /* INSIGHTS TAB */
  .db-insights { display: flex; flex-direction: column; gap: 1rem; }
  .db-stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
  .db-stat-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--r);
    box-shadow: var(--shadow-sm); padding: 1.1rem 1.25rem;
    display: flex; flex-direction: column; gap: 4px;
  }
  .db-stat-num { font-size: 24px; font-weight: 600; color: var(--text); font-variant-numeric: tabular-nums; }
  .db-stat-amber { color: var(--amber); }
  .db-stat-label { font-size: 10.5px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--text-dim); }
  .db-stat-row-sub .db-stat-card { padding: 0.9rem 1.1rem; }
  .db-stat-row-sub { gap: 0.75rem; }
  .db-stat-card-bad { border-color: rgba(240,78,94,0.35); }
  .db-stat-card-bad .db-stat-num { color: var(--accent); }
  .db-stat-card-warn { border-color: rgba(245,166,35,0.35); }
  .db-stat-card-warn .db-stat-num { color: var(--amber); }

  .db-panel {
    background: var(--surface); border: 1px solid var(--border); border-radius: var(--r);
    box-shadow: var(--shadow-sm); padding: 1.25rem 1.25rem 1rem;
  }
  .db-panel-duo { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  @media (max-width: 900px) { .db-panel-duo { grid-template-columns: 1fr; } }
  .db-test-sub { font-size: 12px; color: var(--text-mid); line-height: 1.6; margin: -0.4rem 0 1.1rem; }
  .db-test-sub b { color: var(--text); font-weight: 600; }
  .db-test-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.85rem 1rem; }
  @media (max-width: 760px) { .db-test-grid { grid-template-columns: 1fr; } }
  .db-test-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .db-test-label { font-size: 10px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--text-dim); }
  .db-test-input {
    font-family: 'Inter', sans-serif; font-size: 13px; color: var(--text);
    background: var(--surface2); border: 1px solid var(--border2); border-radius: var(--r-sm);
    padding: 9px 12px; width: 100%; outline: none;
    transition: border-color 0.2s var(--ease), box-shadow 0.2s var(--ease);
  }
  .db-test-input::placeholder { color: var(--text-dim); }
  .db-test-input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(91,156,246,0.15); }
  .db-test-input:disabled { opacity: 0.5; cursor: not-allowed; }
  .db-test-textarea { resize: vertical; min-height: 58px; line-height: 1.6; }
  .db-test-select {
    appearance: none; cursor: pointer; padding-right: 30px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%238b93ad' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 11px center;
  }
  .db-test-actions { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.95rem; flex-wrap: wrap; }
  .db-test-file { cursor: pointer; }
  .db-test-result {
    margin-top: 0.95rem; font-size: 12.5px; color: var(--text-mid); line-height: 1.65; white-space: pre-wrap;
    background: var(--surface2); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 0.8rem 0.95rem;
  }
  .db-test-result-block {
    margin-top: 0.95rem; background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--r-sm); padding: 1rem 1.1rem;
  }
  .db-panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: 0.9rem; }
  .db-panel-title { font-size: 13px; font-weight: 600; color: var(--text); }
  .db-panel-side { font-size: 12px; color: var(--text-mid); }
  .db-legend { display: flex; gap: 1rem; }
  .db-legend-row { margin-top: 0.7rem; }
  .db-legend-item { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--text-mid); }
  .db-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
  .db-dot-blue { background: var(--blue); }
  .db-dot-green { background: var(--green); }
  .db-dot-amber { background: var(--amber); }
  .db-dot-red { background: var(--accent); }

  .db-chart { width: 100%; height: auto; display: block; }
  .db-chart-grid { stroke: var(--border); stroke-width: 1; }
  .db-chart-bar-subs { fill: var(--blue); opacity: 0.9; }
  .db-chart-bar-cos { fill: var(--green); opacity: 0.9; }
  .db-chart-label { fill: var(--text-dim); font-size: 9px; font-family: 'Inter', sans-serif; }

  .db-status-bar {
    display: flex; height: 12px; border-radius: var(--r-pill); overflow: hidden;
    background: var(--surface2); border: 1px solid var(--border);
  }
  .db-status-seg { height: 100%; transition: width 0.5s var(--ease); }
  .db-seg-green { background: var(--green); }
  .db-seg-amber { background: var(--amber); }
  .db-seg-red { background: var(--accent); }

  .db-table-flat { border: 1px solid var(--border); border-radius: var(--r-sm); overflow: hidden; }
  .db-table-flat thead tr { background: var(--surface2); }

  @media (max-width: 900px) {
    .db-stat-row { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 480px) {
    .db-filter-btn span:not(.db-filter-count) { display: none; }
    .db-filter-btn { padding: 6px 10px; }
    .db-modal { margin: 0; border-radius: 16px 16px 0 0; align-self: flex-end; max-height: 90vh; }
    .db-modal-bg { align-items: flex-end; padding: 0; }
    .db-search { font-size: 12px; }
  }

  /* ── LIGHT THEME ─────────────────────────────────── */
  .db-light {
    --bg:       #f4f6fb;
    --surface:  #ffffff;
    --surface2: #f0f2f8;
    --surface3: #e8ebf4;
    --border:   rgba(0,0,0,0.08);
    --border2:  rgba(0,0,0,0.13);
    --text:     #111827;
    --text-mid: #4b5568;
    --text-dim: #94a3b8;
    --shadow-sm: 0 2px 8px rgba(0,0,0,0.07);
    --shadow-md: 0 8px 32px rgba(0,0,0,0.1);
    --shadow-lg: 0 24px 64px rgba(0,0,0,0.16);
  }
  .db-light .db-sidebar {
    background: #ffffff;
    border-right-color: rgba(0,0,0,0.08);
  }
  .db-light .db-nav-title { color: #6b7280; }
  .db-light .db-sb-item { color: #6b7280; }
  .db-light .db-sb-item:hover { color: #111827; background: var(--surface2); }
  .db-light .db-sb-active { color: #111827 !important; background: var(--surface3) !important; }
  .db-light .db-sb-theme, .db-light .db-sb-signout { color: #6b7280; }
  .db-light .db-sb-theme:hover, .db-light .db-sb-signout:hover { color: #111827; background: rgba(0,0,0,0.05); }
  .db-light .db-filter-btn { background: var(--surface2); border-color: var(--border2); color: var(--text-mid); }
  .db-light .db-filter-active { background: #111827; border-color: #111827; color: #fff; }
  .db-light .db-filter-active .db-filter-count { background: rgba(255,255,255,0.2); color: #fff; }
  .db-light .db-date, .db-light .db-date-preset { background: #fff; color: #111827; border-color: rgba(0,0,0,0.13); }
  .db-light .db-date { color-scheme: light; }
  .db-light .db-date-preset { color: var(--text-mid); }
  .db-light .db-search { background: #fff; color: #111827; border-color: rgba(0,0,0,0.13); }
  .db-light .db-search::placeholder { color: #94a3b8; }
  .db-light .db-search-clear { color: #9ca3af; }
  .db-light .db-search-clear:hover { color: #374151; }
  .db-light .db-table th { background: var(--surface2); color: #6b7280; }
  .db-light .db-row:hover { background: var(--surface2); }
  .db-light .db-row--green { background: rgba(62,207,142,0.09); }
  .db-light .db-row--green:hover { background: rgba(62,207,142,0.15); }
  .db-light .db-row--yellow { background: rgba(245,166,35,0.1); }
  .db-light .db-row--yellow:hover { background: rgba(245,166,35,0.16); }
  .db-light .db-row--red { background: rgba(240,78,94,0.08); }
  .db-light .db-row--red:hover { background: rgba(240,78,94,0.14); }
  .db-light .db-cell-mono { color: #4b5568; }
  .db-light .db-company { color: #111827; }
  .db-light .db-vat, .db-light .db-email { color: #94a3b8; }
  /* Modal in light mode */
  .db-light .db-modal { color: #111827; background: #ffffff; border-color: #e2e6f0; box-shadow: 0 24px 64px rgba(0,0,0,0.16); }
  .db-light .db-modal-header { border-bottom-color: #e2e6f0; }
  .db-light .db-modal-company { color: #111827; }
  .db-light .db-modal-sub { color: #6b7280; }
  .db-light .db-modal-close { background: #f3f4f6; color: #6b7280; }
  .db-light .db-modal-close:hover { background: #e5e7eb; color: #111827; }
  .db-light .db-detail-label { color: #9ca3af; }
  .db-light .db-detail-value { color: #374151; }
  .db-light .db-modal-actions { border-top-color: #e2e6f0; }
  .db-light .db-id-block { background: #f9fafb; border-color: #e2e6f0; }
  .db-light .db-id-block--suspicious { background: rgba(240,78,94,0.05); border-color: rgba(240,78,94,0.3); }
  .db-light .db-id-block--ok { background: rgba(62,207,142,0.05); border-color: rgba(62,207,142,0.3); }
  .db-light .db-id-block--checking { background: rgba(91,156,246,0.06); border-color: rgba(91,156,246,0.3); }
  .db-light .db-id-title { color: #9ca3af; }
  .db-light .db-deny-heading { color: #111827; }
  .db-light .db-deny-sub { color: #6b7280; }
  .db-light .db-deny-textarea { color: #111827; background: #f9fafb; border-color: #d1d5db; }
  .db-light .db-test-input { color: #111827; background-color: #fff; border-color: #d1d5db; }
  .db-light .db-test-label { color: #6b7280; }
  .db-light .db-test-result, .db-light .db-test-result-block { background: #f9fafb; border-color: #e2e6f0; }
  .db-light .db-test-select {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  }
`;
