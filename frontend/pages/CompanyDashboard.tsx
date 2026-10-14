import { useState, useEffect, useRef } from 'react';
import { gql } from '@apollo/client';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../src/components/Toast.tsx';
import { useConfirm } from '../src/components/ConfirmDialog.tsx';
import { formatDate, relativeTime } from '../src/lib/format.ts';
import { useDocumentTitle } from '../src/lib/useDocumentTitle.ts';
import { useModalDismiss } from '../src/lib/useModalDismiss.ts';
import { approvable, blockingCategories, categoryFailing, isExpired, isPending, CATEGORY_LABEL } from '../src/lib/approvalGate.ts';
import SetupWizard from './SetupWizard';
import { Mark } from '../src/components/Mark.tsx';
import { ActivityNavItem, ActivityFeed } from '../src/components/NotificationBell.tsx';
import { PriorApprovals } from '../src/components/PriorApprovals.tsx';
import { MfaSettings } from '../src/components/MfaSettings.tsx';
import { RevealDocumentNumber } from '../src/components/RevealDocumentNumber.tsx';
import { RevealLog } from '../src/components/RevealLog.tsx';
import { PasskeySettings } from '../src/components/PasskeySettings.tsx';
import { EnrolmentRequired } from '../src/components/EnrolmentRequired.tsx';
import { mfaEnrolmentRequired } from '../src/lib/mfaError.ts';
import {
  type FormConfigT, CONFIG_KEYS, CONFIG_ROWS, TERMS_MODES, modeLabels,
  BUYER_TYPE_OPTIONS, BUYER_TYPE_LABEL, BUYER_TYPE_DESC,
  MY_FORM_CONFIG, UPDATE_FORM_CONFIG,
  IDENTITY_AVAILABILITY, ID_UNAVAILABLE_WARNING, embedSnippet,
  draftFromConfig,
} from '../src/lib/formConfigShared';
import { StatementWithTranslation } from '../src/components/StatementTranslation.tsx';
import { Select, type SelectOption } from '../src/components/Select.tsx';
import { DatePicker } from '../src/components/DatePicker.tsx';

const PAGE_SIZE = 100;

// Every field the queue and the detail view read, shared by the list query and
// the single-statement query that opens one from Activity.
const SUBMISSION_FIELDS = `
      id email orderNumber firstName lastName companyName vatNumber buyerType
      street zipCode place country substances casNumbers concentration statement statementLang statementTranslation
      viesStatus viesName viesAddress viesAddressMatch status adminNote createdAt isTest
      idDocumentName idDocumentType idMrzValid idLikelySynthetic idDocumentExpiry
      idVerificationStatus idLivenessPassed idFaceMatch idVerificationWarnings idVerificationCheckedAt idVerificationPurged
      substanceCheckStatus substanceCheckNote substanceCheckedAt
      reviewedByName reviewedAt
      overrides { category reason createdByName createdAt }
`;

const GET_ONE_SUBMISSION = gql`
  query CompanySubmission($id: ID!) {
    companySubmission(id: $id) { ${SUBMISSION_FIELDS} }
  }
`;

const GET_SUBMISSIONS = gql`
  query CompanySubmissions($status: SubmissionStatus, $includeTest: Boolean, $limit: Int, $offset: Int) {
    companySubmissions(status: $status, includeTest: $includeTest, limit: $limit, offset: $offset) {
      ${SUBMISSION_FIELDS}
    }
  }
`;

const GET_COUNTS = gql`
  query CompanySubmissionCounts($includeTest: Boolean) {
    companySubmissionCounts(includeTest: $includeTest) { all pending approved denied tests }
  }
`;

const REFRESH_SESSION = gql`
  mutation RefreshSession { refreshSession { token role } }
`;

const MY_ACCOUNT = gql`
  query MyAccount { myAccount { id email name emailVerified mfaEnabled recoveryCodesLeft } }
`;

const MY_COMPANIES = gql`
  query MyCompanies { myCompanies { id name slug role current } }
`;

const RESEND_VERIFICATION = gql`mutation ResendEmailVerification { resendEmailVerification }`;

const SWITCH_COMPANY = gql`
  mutation SwitchCompany($companyId: ID!) {
    switchCompany(companyId: $companyId) { token role company { id name slug } }
  }
`;

const REQUEST_DELETION = gql`
  mutation RequestCompanyDeletion($confirmSlug: String!) { requestCompanyDeletion(confirmSlug: $confirmSlug) }
`;

const CANCEL_DELETION = gql`mutation CancelCompanyDeletion { cancelCompanyDeletion }`;

const GET_MEMBERS = gql`
  query CompanyMembers {
    companyMembers { id userId email name role joinedAt }
  }
`;

const APPROVE = gql`
  mutation ApproveCompany($id: ID!) { approveCompanySubmission(id: $id) { id status } }
`;
const DENY = gql`
  mutation DenyCompany($id: ID!, $reason: String!) { denyCompanySubmission(id: $id, reason: $reason) { id status adminNote } }
`;
const DELETE_SUB = gql`
  mutation DeleteCompanySub($id: ID!) { deleteCompanySubmission(id: $id) }
`;
const REOPEN_SUB = gql`
  mutation ReopenCompanySub($id: ID!) { reopenCompanySubmission(id: $id) { id status adminNote } }
`;
const INVITE = gql`
  mutation Invite($email: String!, $role: CompanyRole!) { inviteMember(email: $email, role: $role) { ok inviteUrl } }
`;
const REMOVE_MEMBER = gql`
  mutation RemoveMember($userId: ID!) { removeMember(userId: $userId) }
`;
const CHANGE_ROLE = gql`
  mutation ChangeRole($userId: ID!, $role: CompanyRole!) { changeMemberRole(userId: $userId, role: $role) { id role } }
`;
const RECHECK_SUBSTANCE = gql`
  mutation RecheckCompanySubstance($id: ID!) {
    recheckCompanySubmissionSubstance(id: $id) { id substanceCheckStatus }
  }
`;
const OVERRIDE_CHECK = gql`
  mutation OverrideCompanyCheck($id: ID!, $category: OverrideCategory!, $reason: String!) {
    overrideCompanySubmissionCheck(id: $id, category: $category, reason: $reason) {
      id overrides { category reason createdByName createdAt }
    }
  }
`;
const CLEAR_OVERRIDE = gql`
  mutation ClearCompanyOverride($id: ID!, $category: OverrideCategory!) {
    clearCompanySubmissionCheckOverride(id: $id, category: $category) {
      id overrides { category reason createdByName createdAt }
    }
  }
`;
const MY_COMPANY = gql`
  query MyCompany { myCompany { id formConfigured accessStatus rejectionReason deletionRequestedAt deletionScheduledFor } myRole }
`;

type IdDocumentType = 'PASSPORT' | 'ID_CARD';
type CompanyRole = 'OWNER' | 'EMPLOYEE_PLUS' | 'EMPLOYEE';

const roleLabels: Record<CompanyRole, string> = {
  OWNER: 'Owner', EMPLOYEE_PLUS: 'Employee+', EMPLOYEE: 'Employee',
};

// What each role may do, shown in the role menus so the choice is informed.
const ROLE_OPTIONS: SelectOption<CompanyRole>[] = [
  { value: 'OWNER', label: 'Owner', description: 'Everything, including form settings, the team and closing the account.' },
  { value: 'EMPLOYEE_PLUS', label: 'Employee+', description: 'Approves and denies statements, overrides a failed check with a reason.' },
  { value: 'EMPLOYEE', label: 'Employee', description: 'Reads statements and their check results.' },
];
const docTypeLabels: Record<IdDocumentType, string> = {
  PASSPORT: 'Passport', ID_CARD: 'Identity Card',
};

type Submission = {
  id: string; email: string; orderNumber: string; firstName: string; lastName: string;
  companyName: string; vatNumber: string; buyerType: 'INDIVIDUAL' | 'COMPANY';
  street?: string; zipCode?: string; place?: string; country: string; substances: string;
  casNumbers: string; concentration?: string | null; statement: string;
  statementLang?: string | null; statementTranslation?: string | null; viesStatus: 'VALID' | 'INVALID' | 'ERROR' | 'NOT_CHECKED';
  viesName?: string | null; viesAddress?: string | null; viesAddressMatch: ViesAddressMatch;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'DENIED'; adminNote?: string; createdAt: string; isTest?: boolean;
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
type Member = { id: string; userId: string; email: string; name: string; role: CompanyRole; joinedAt: string };
type Tab = 'submissions' | 'activity' | 'members' | 'form' | 'account';
type Filter = 'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'DENIED';

export default function CompanyDashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  useDocumentTitle(`${localStorage.getItem('companyName') ?? 'Company'} — eustatement`);
  // The stored role is only a first paint — the authoritative one comes back
  // with MyCompany below, so editing localStorage no longer changes what the
  // dashboard offers.
  const storedRole = (localStorage.getItem('companyRole') ?? 'EMPLOYEE') as CompanyRole;
  const companyName = localStorage.getItem('companyName') ?? 'Your Company';
  const companySlug = localStorage.getItem('companySlug') ?? '';

  const { data: myCompanyData, refetch: refetchMyCompany } = useQuery<any>(MY_COMPANY);
  const role: CompanyRole = (myCompanyData?.myRole as CompanyRole) ?? storedRole;
  useEffect(() => {
    if (myCompanyData?.myRole) localStorage.setItem('companyRole', myCompanyData.myRole);
  }, [myCompanyData]);
  const isOwner = role === 'OWNER';
  const canManage = role === 'OWNER' || role === 'EMPLOYEE_PLUS';

  const [tab, setTab] = useState<Tab>(() =>
    (localStorage.getItem('company-tab') as Tab) ?? 'submissions'
  );
  useEffect(() => { localStorage.setItem('company-tab', tab); }, [tab]);
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    (localStorage.getItem('theme-company') as 'dark' | 'light') ?? 'dark'
  );
  useEffect(() => { localStorage.setItem('theme-company', theme); }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const [filter, setFilter] = useState<Filter>(canManage ? 'PENDING_REVIEW' : 'APPROVED');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [visibleCount, setVisibleCount] = useState(50);
  const sentinelRef = useRef<HTMLTableRowElement | null>(null);
  const [selected, setSelected] = useState<Submission | null>(null);
  // The list's own refresh, kept apart from Apollo's loading flag so the table
  // stays on screen while it reloads instead of flashing to a placeholder.
  const [refreshing, setRefreshing] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'deny'>('view');
  const [denyReason, setDenyReason] = useState('');
  const [overrideCat, setOverrideCat] = useState<OverrideCategory | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CompanyRole>('EMPLOYEE');
  const [inviteResult, setInviteResult] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Test submissions are a rehearsal tool, so they live behind their own switch
  // instead of sitting in the real queue.
  const [testMode, setTestMode] = useState(false);
  const listVariables = {
    status: filter === 'ALL' ? null : filter,
    includeTest: testMode,
    limit: PAGE_SIZE,
    offset: 0,
  };
  const { data: subData, loading, error: subError, refetch, fetchMore } = useQuery<any>(GET_SUBMISSIONS, {
    variables: listVariables,
    notifyOnNetworkStatusChange: true,
  });
  // The queue is refused outright while a second factor is required and this
  // account has none, so that refusal — not a flag on the account — is what
  // tells us to show the enrolment screen. One source of truth, and it is the
  // server's. Read straight off the query's own error: it clears once a
  // refetch succeeds, which is how the block lifting is noticed.
  const enrolmentRequired = !!subError && mfaEnrolmentRequired(subError);
  const { data: countData, refetch: refetchCounts } = useQuery<any>(GET_COUNTS, {
    variables: { includeTest: testMode },
    // Polled so the badge on the Submissions tab picks up new statements.
    pollInterval: 60_000,
  });
  const counts = countData?.companySubmissionCounts;
  const refreshList = async () => {
    setRefreshing(true);
    try { await Promise.all([refetch(), refetchCounts()]); } finally { setRefreshing(false); }
  };
  const [pageExhausted, setPageExhausted] = useState(false);
  const loadingMore = useRef(false);
  const { data: memberData, refetch: refetchMembers } = useQuery<any>(GET_MEMBERS, { skip: !isOwner });
  const { data: accountData, refetch: refetchAccount } = useQuery<any>(MY_ACCOUNT);
  const [refreshSession] = useMutation<any>(REFRESH_SESSION);
  const { data: companiesData } = useQuery<any>(MY_COMPANIES);
  const account = accountData?.myAccount;
  const myCompanies: { id: string; name: string; slug: string; role: CompanyRole; current: boolean }[] =
    companiesData?.myCompanies ?? [];
  const [verificationDismissed, setVerificationDismissed] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const [resendVerification, { loading: resending }] = useMutation<any>(RESEND_VERIFICATION, {
    onCompleted: () => { refetchAccount(); toast.success('Confirmation email sent'); },
    onError: (e: Error) => toast.error(e.message),
  });
  const [switchCompany] = useMutation<any>(SWITCH_COMPANY, {
    onCompleted: (data: any) => {
      const next = data.switchCompany;
      localStorage.setItem('companyToken', next.token);
      localStorage.setItem('companyRole', next.role);
      localStorage.setItem('companyName', next.company.name);
      localStorage.setItem('companySlug', next.company.slug);
      // A different tenant means a different cache — reload rather than try to
      // reconcile what is already on screen.
      window.location.reload();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const [requestDeletion, { loading: requestingDeletion }] = useMutation<any>(REQUEST_DELETION, {
    onCompleted: () => { setDeleteConfirm(''); refetchMyCompany(); toast.success('Account scheduled for deletion'); },
    onError: (e: Error) => toast.error(e.message),
  });
  const [cancelDeletion] = useMutation<any>(CANCEL_DELETION, {
    onCompleted: () => { refetchMyCompany(); toast.success('Deletion cancelled'); },
    onError: (e: Error) => toast.error(e.message),
  });
  const { data: cfgData } = useQuery<any>(MY_FORM_CONFIG, { skip: !isOwner });
  const { data: idAvailData } = useQuery<any>(IDENTITY_AVAILABILITY, { skip: !isOwner });
  // Assume available while the query is in flight — the warning is for a real
  // outage, not for the first render.
  const identityAvailable: boolean = idAvailData?.identityVerificationAvailable ?? true;

  // formConfigured stays false until the owner saves form settings for the
  // first time — until then owners see the full-screen SetupWizard instead
  // of the dashboard (early return below, after all hooks).
  const formConfigured: boolean | undefined = myCompanyData?.myCompany?.formConfigured;
  const needsSetup = isOwner && formConfigured === false;

  // Seeded from the server the first time the config arrives, then owned by the
  // user. Adjusted during render rather than in an effect — the effect version
  // rendered once with an empty form and again with the real values.
  const [cfgDraft, setCfgDraft] = useState<FormConfigT | null>(null);
  const [cfgSeeded, setCfgSeeded] = useState(false);
  if (!cfgSeeded && cfgData?.myFormConfig) {
    setCfgSeeded(true);
    setCfgDraft(draftFromConfig(cfgData.myFormConfig));
  }
  const [cfgError, setCfgError] = useState('');
  const [saveConfig, { loading: savingCfg }] = useMutation<any>(UPDATE_FORM_CONFIG, {
    onCompleted: () => {
      toast.success('Form settings saved');
      refetchMyCompany(); // first save completes setup and unlocks the other tabs
    },
    onError: err => { setCfgError(err.message); toast.error(err.message); },
  });
  const handleSaveConfig = () => {
    if (!cfgDraft) return;
    setCfgError('');
    const config = Object.fromEntries(CONFIG_KEYS.map(k => [k, cfgDraft[k]]));
    saveConfig({ variables: { config } });
  };

  const [approve, { loading: approving }] = useMutation<any>(APPROVE, {
    refetchQueries: ['TeamDecisions'],
    onCompleted: () => { refetch(); setSelected(null); toast.success('Submission approved'); },
    onError: e => toast.error(e.message),
  });
  const [deny, { loading: denying }] = useMutation<any>(DENY, {
    refetchQueries: ['TeamDecisions'],
    onCompleted: () => { refetch(); setSelected(null); setDenyReason(''); toast.success('Submission denied'); },
    onError: e => toast.error(e.message),
  });
  const [deleteSub, { loading: deleting }] = useMutation<any>(DELETE_SUB, {
    onCompleted: () => { refetch(); setSelected(null); toast.success('Submission deleted'); },
    onError: e => toast.error(e.message),
  });
  const [reopenSub, { loading: reopening }] = useMutation<any>(REOPEN_SUB, {
    onCompleted: () => {
      refetch();
      setSelected(s => (s ? { ...s, status: 'PENDING_REVIEW', adminNote: undefined, overrides: [], reviewedByName: null, reviewedAt: null } : s));
      toast.success('Submission reopened for review');
    },
    onError: e => toast.error(e.message),
  });
  const [invite, { loading: inviting }] = useMutation<any>(INVITE);
  const [removeMember] = useMutation<any>(REMOVE_MEMBER, {
    onCompleted: () => { refetchMembers(); toast.success('Member removed'); },
    onError: e => toast.error(e.message),
  });
  const [changeRole] = useMutation<any>(CHANGE_ROLE, {
    onCompleted: () => { refetchMembers(); toast.success('Role updated'); },
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
    if (d?.overrideCompanySubmissionCheck) {
      syncOverrides(id, d.overrideCompanySubmissionCheck.overrides);
      setOverrideCat(null); setOverrideReason('');
      toast.success(`${CATEGORY_LABEL[category]} check overridden`);
    }
  };
  const handleClearOverride = async (id: string, category: OverrideCategory) => {
    const { data: d } = await clearOverrideMut({ variables: { id, category } });
    if (d?.clearCompanySubmissionCheckOverride) {
      syncOverrides(id, d.clearCompanySubmissionCheckOverride.overrides);
      toast.success('Override removed');
    }
  };
  // Reset the inline override form whenever a different submission is opened.
  const [overrideFor, setOverrideFor] = useState<string | null>(null);
  if (overrideFor !== (selected?.id ?? null)) {
    setOverrideFor(selected?.id ?? null);
    setOverrideCat(null);
    setOverrideReason('');
  }

  // Per-check override control. Owners & Employee+ may override; only shown for a
  // pending submission whose check is currently failing.
  const renderOverride = (category: OverrideCategory) => {
    if (!selected || selected.status !== 'PENDING_REVIEW') return null;
    const ov = selected.overrides.find(o => o.category === category);
    if (ov) {
      return (
        <div className="cd-override cd-override--done">
          <span>✓ Overridden by {ov.createdByName} — “{ov.reason}”</span>
          {canManage && <button className="cd-override-undo" onClick={() => handleClearOverride(selected.id, category)}>Undo</button>}
        </div>
      );
    }
    if (!canManage || !categoryFailing(selected, category)) return null;
    if (overrideCat === category) {
      return (
        <div className="cd-override">
          <textarea className="cd-deny-textarea" rows={2} autoFocus
            placeholder="Reason for overriding this check (recorded for audit)…"
            value={overrideReason} onChange={e => setOverrideReason(e.target.value)} />
          <div className="cd-override-actions">
            <button className="cd-btn-view" onClick={() => { setOverrideCat(null); setOverrideReason(''); }}>Cancel</button>
            <button className="cd-btn-deny" disabled={!overrideReason.trim() || overriding}
              onClick={() => handleOverride(selected.id, category)}>{overriding ? 'Saving…' : 'Confirm override'}</button>
          </div>
        </div>
      );
    }
    return (
      <div className="cd-override">
        <button className="cd-override-btn" onClick={() => { setOverrideCat(category); setOverrideReason(''); }}>
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
      const row = (d?.companySubmissions as Submission[] | undefined)?.find(x => x.id === id);
      if (row && row.substanceCheckStatus !== 'PENDING') {
        setSelected(s => (s && s.id === id
          ? { ...s, substanceCheckStatus: row.substanceCheckStatus, substanceCheckNote: row.substanceCheckNote, substanceCheckedAt: row.substanceCheckedAt }
          : s));
        break;
      }
    }
  };

  const handleRemoveMember = async (m: Member) => {
    const ok = await confirm({
      title: 'Remove member',
      message: `Remove ${m.name || m.email} from the team? They'll lose access immediately.`,
      confirmLabel: 'Remove', danger: true,
    });
    if (ok) removeMember({ variables: { userId: m.userId } });
  };

  const handleChangeRole = async (m: Member, newRole: string) => {
    const ok = await confirm({
      title: 'Change role',
      message: `Change ${m.name || m.email}'s role to ${roleLabels[newRole as CompanyRole]}?`,
      confirmLabel: 'Change role',
    });
    if (ok) changeRole({ variables: { userId: m.userId, role: newRole } });
  };

  const handleDeleteSub = async () => {
    if (!selected) return;
    const ok = await confirm({
      title: 'Delete submission',
      message: 'Permanently delete this submission? This cannot be undone.',
      confirmLabel: 'Delete', danger: true,
    });
    if (ok) deleteSub({ variables: { id: selected.id } });
  };

  const handleReopen = async () => {
    if (!selected) return;
    const ok = await confirm({
      title: 'Reopen for review',
      message: 'Move this submission back into the pending review queue?',
      confirmLabel: 'Reopen',
    });
    if (ok) reopenSub({ variables: { id: selected.id } });
  };

  // Opens the user's email client with the full submission details pre-filled so
  // they can forward a suspicious submission. No recipient is set on purpose.
  // mailto bodies are plain text only, so readability comes from a clean
  // sectioned layout rather than HTML/CSS; flagged items are marked with ⚠.
  const handleReport = () => {
    if (!selected) return;
    const s = selected;
    const submittedAddress = [s.street, [s.zipCode, s.place].filter(Boolean).join(' '), s.country]
      .filter(Boolean).join(', ');
    const RULE = '────────────────────────────────────';
    const out: string[] = [];
    const section = (title: string, rows: [string, string][]) => {
      out.push(`${RULE}`, `  ${title.toUpperCase()}`, `${RULE}`);
      for (const [label, value] of rows) out.push(`${label}: ${value}`);
      out.push('');
    };
    const flag = (cond: boolean, text: string) => (cond ? `⚠ ${text}` : text);

    out.push(
      'SUSPICIOUS SUBMISSION REPORT',
      `${s.firstName} ${s.lastName} · ${s.orderNumber || s.id}`,
      '',
      'WHY THIS IS BEING REPORTED',
      '(describe your concern here)',
      '',
      '',
    );

    section('Submission', [
      ['Submission ID', s.id],
      ['Submitted', formatDate(s.createdAt)],
      ['Order #', s.orderNumber || '—'],
      ['Status', s.status],
    ]);

    section('Buyer', [
      ['Type', s.buyerType === 'INDIVIDUAL' ? 'Individual' : 'Company'],
      ['Name', `${s.firstName} ${s.lastName}`],
      ['Email', s.email],
      ...(s.buyerType === 'COMPANY'
        ? ([['Company', s.companyName || '—'], ['VAT', s.vatNumber || '—']] as [string, string][])
        : []),
      ['Address', submittedAddress || '—'],
    ]);

    if (s.buyerType === 'COMPANY') {
      section('VAT / VIES verification', [
        ['Status', flag(s.viesStatus === 'INVALID', s.viesStatus)],
        ['Registered name', s.viesName || '—'],
        ['Registered address', s.viesAddress || '—'],
        ['Address match', flag(s.viesAddressMatch === 'MISMATCH', s.viesAddressMatch)],
      ]);
    }

    section('Substance & intended use', [
      ['Substance(s)', s.substances],
      ['CAS number', s.casNumbers || '—'],
      ['Concentration', s.concentration || '—'],
      ['Statement', s.statement],
      ...(s.statementTranslation
        ? [[`Machine translation${s.statementLang ? ` (from ${s.statementLang.toUpperCase()})` : ''}`, s.statementTranslation] as [string, string]]
        : []),
      ['Compliance check', flag(s.substanceCheckStatus === 'FLAGGED',
        `${s.substanceCheckStatus}${s.substanceCheckNote ? ` — ${s.substanceCheckNote}` : ''}`)],
    ]);

    if (s.idDocumentName || s.idDocumentType || s.idVerificationStatus !== 'NOT_CHECKED') {
      const rows: [string, string][] = [
        ['Document', `${s.idDocumentName ?? '—'} (${s.idDocumentType ?? '—'})`],
        // Deliberately not in the copied summary: the number is the field this
        // whole control exists to keep out of places it can be pasted into.
        ['Document number', 'withheld — open it on the submission if you need it'],
      ];
      if (s.idVerificationStatus !== 'NOT_CHECKED') {
        rows.push(['Verification', flag(s.idVerificationStatus !== 'APPROVED', s.idVerificationStatus)]);
        rows.push(['Liveness', s.idLivenessPassed == null ? '—' : flag(s.idLivenessPassed === false, s.idLivenessPassed ? 'Passed' : 'Failed')]);
        rows.push(['Face match', s.idFaceMatch == null ? '—' : flag(s.idFaceMatch === false, s.idFaceMatch ? 'Match' : 'No match')]);
        if (s.idVerificationWarnings) rows.push(['Provider warnings', s.idVerificationWarnings]);
      } else {
        rows.push(['MRZ valid', s.idMrzValid == null ? '—' : flag(s.idMrzValid === false, s.idMrzValid ? 'Yes' : 'No')]);
        rows.push(['Forgery risk', s.idLikelySynthetic == null ? '—' : flag(s.idLikelySynthetic === true, s.idLikelySynthetic ? 'Suspicious' : 'No flags')]);
      }
      section('Identity document', rows);
    }

    out.push('Sent from the EU End-User Statement dashboard.');

    const subject = `Suspicious submission report — ${s.firstName} ${s.lastName} (${s.orderNumber || s.id})`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(out.join('\n'))}`;
  };

  const formUrl = companySlug ? `${window.location.origin}/${companySlug}` : '';
  const snippet = companySlug ? embedSnippet(companySlug) : '';
  const copyText = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copied`); }
    catch { toast.error(`Could not copy ${label.toLowerCase()}`); }
  };

  const copyInviteLink = async () => {
    try { await navigator.clipboard.writeText(inviteResult); toast.success('Link copied'); }
    catch { toast.error('Could not copy link'); }
  };

  const detailModalRef = useModalDismiss(selected != null, () => setSelected(null));
  const inviteModalRef = useModalDismiss(inviteOpen, () => setInviteOpen(false));

  const logout = () => {
    ['companyToken', 'companyRole', 'companyName', 'companySlug', 'supportMode'].forEach(k => localStorage.removeItem(k));
    navigate('/login');
  };

  // Signing out sits one slip away from the theme toggle, and on a shared
  // machine it costs whoever is reviewing their place in the queue. It asks
  // first, and the control reads as the one destructive thing in the sidebar.
  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Sign out?',
      message: 'Are you sure you want to sign out?',
      confirmLabel: 'Sign out', danger: true,
    });
    if (ok) logout();
  };

  // Admin support session (opened from the admin Companies tab): show a
  // floating pill over both the wizard and the dashboard, with a way back.
  const supportMode = localStorage.getItem('supportMode') === '1';
  const exitSupport = () => {
    ['companyToken', 'companyRole', 'companyName', 'companySlug', 'supportMode'].forEach(k => localStorage.removeItem(k));
    navigate('/admin/dashboard');
  };
  const supportBanner = supportMode ? (
    <>
      <style>{supportStyles}</style>
      <div className={`cd-support-banner${theme === 'light' ? ' cd-support-banner--light' : ''}`}>
        <span>Support view — acting as <b>{companyName}</b></span>
        <button className="cd-support-return" onClick={exitSupport}>Return to admin</button>
      </div>
    </>
  ) : null;

  // Seller tokens last an hour of idleness rather than the thirty days they
  // used to, which is what makes a token captured by a phishing proxy worth
  // very little. Renewed while somebody is working, so an uninterrupted
  // afternoon never meets a sign-in form; the renewal runs through the same
  // checks as any request, so a removed member or a password reset still ends
  // it.
  //
  // Two triggers, because a timer alone is not enough: an interval does not
  // fire while a laptop is asleep, so a lid closed for twenty minutes used to
  // come back to a session that had quietly expired. Waking the tab renews
  // immediately; the interval covers a tab left open and visible.
  //
  // A support session is the exception: the server will not extend it (it is
  // kept short on purpose), and asking anyway reads as a dead session.
  useEffect(() => {
    if (localStorage.getItem('supportMode') === '1') return;
    const renew = async () => {
      try {
        const { data } = await refreshSession();
        if (data?.refreshSession?.token) {
          localStorage.setItem('companyToken', data.refreshSession.token);
        }
      } catch {
        // A refusal means the session is genuinely over; the error link already
        // routes to the sign-in page, so there is nothing to do here.
      }
    };
    void renew();
    // Comfortably inside the hour, so one missed tick is not a sign-out.
    const timer = setInterval(() => void renew(), 15 * 60 * 1000);
    const onWake = () => { if (document.visibilityState === 'visible') void renew(); };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submissions: Submission[] = subData?.companySubmissions ?? [];

  // Opening a notification jumps to the submission it is about. That row may
  // not be in the page currently loaded — a filter is on, or it sits further
  // down the queue — so the id is parked and claimed once the list holds it.
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);
  // Opens a statement on top of whatever tab is showing — used from Activity,
  // so reading a decision does not throw you out of the page you were on.
  const [loadOne] = useLazyQuery<any>(GET_ONE_SUBMISSION, { fetchPolicy: 'network-only' });
  const openSubmissionInPlace = async (id: string) => {
    const { data } = await loadOne({ variables: { id } });
    if (data?.companySubmission) {
      setSelected(data.companySubmission);
      setModalMode('view');
    } else {
      toast.error('That statement is no longer available.');
    }
  };
  const openSubmissionById = (id: string) => {
    setTab('submissions');
    setFilter('ALL');
    setPendingOpenId(id);
  };
  // Claimed during render (React's "adjust state when inputs change" pattern):
  // the update applies before paint, without an extra effect pass.
  const pendingRow = pendingOpenId ? submissions.find(r => r.id === pendingOpenId) : undefined;
  if (pendingRow) {
    setSelected(pendingRow);
    setModalMode('view');
    setPendingOpenId(null);
  }
  const members: Member[] = memberData?.companyMembers ?? [];

  const availableFilters: Filter[] = canManage ? ['ALL', 'PENDING_REVIEW', 'APPROVED', 'DENIED'] : ['APPROVED', 'DENIED'];
  const q = search.toLowerCase().trim();
  const fromMs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
  const toMs = dateTo ? new Date(dateTo + 'T23:59:59.999').getTime() : null;
  const filtered = submissions
    .filter(s => filter === 'ALL' || s.status === filter)
    .filter(s => !q || [s.orderNumber, s.firstName, s.lastName, s.companyName, s.email].some(v => v.toLowerCase().includes(q)))
    .filter(s => {
      if (fromMs === null && toMs === null) return true;
      const t = new Date(s.createdAt).getTime();
      if (fromMs !== null && t < fromMs) return false;
      if (toMs !== null && t > toMs) return false;
      return true;
    });
  const visible = filtered.slice(0, visibleCount);

  // Two layers: the browser renders a window over the rows it has, and when it
  // runs out, the next page is fetched. Search and the date range still filter
  // client-side — email, name and address are encrypted at rest, so the database
  // cannot match on them.
  const listKey = `${filter}|${search}|${dateFrom}|${dateTo}|${testMode}`;
  const [renderedListKey, setRenderedListKey] = useState(listKey);
  if (renderedListKey !== listKey) {
    setRenderedListKey(listKey);
    setVisibleCount(50);
    setPageExhausted(false);
  }

  const loadMore = async () => {
    if (loadingMore.current || pageExhausted) return;
    loadingMore.current = true;
    try {
      const more = await fetchMore({
        variables: { ...listVariables, offset: submissions.length },
        updateQuery: (prev: any, { fetchMoreResult }: any) => {
          const next = fetchMoreResult?.companySubmissions ?? [];
          if (next.length < PAGE_SIZE) setPageExhausted(true);
          if (next.length === 0) return prev;
          return { ...prev, companySubmissions: [...(prev.companySubmissions ?? []), ...next] };
        },
      });
      if ((more?.data?.companySubmissions ?? []).length < PAGE_SIZE) setPageExhausted(true);
    } finally {
      loadingMore.current = false;
    }
  };

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisibleCount(c => c + 50);
        // Near the end of what has been fetched — pull the next page.
        if (visibleCount + 50 >= submissions.length) void loadMore();
      },
      { rootMargin: '300px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [visible.length, filtered.length, submissions.length, visibleCount]);

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

  // Counted by the server: the client now holds one page, not the whole table.
  const tabCounts: Record<Filter, number> = {
    ALL: counts?.all ?? 0,
    PENDING_REVIEW: counts?.pending ?? 0,
    APPROVED: counts?.approved ?? 0,
    DENIED: counts?.denied ?? 0,
  };
  const filterLabels: Record<Filter, string> = { ALL: 'All', PENDING_REVIEW: 'Pending', APPROVED: 'Approved', DENIED: 'Denied' };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(''); setInviteResult('');
    try {
      const { data } = await invite({ variables: { email: inviteEmail, role: inviteRole } });
      setInviteResult(data.inviteMember.inviteUrl);
      setInviteEmail('');
    } catch (err: any) {
      setInviteError(err?.message ?? 'Invite failed');
    }
  };

  // Checked before the setup wizard: an account that cannot read anything is
  // in no position to configure a form, and the wizard's own queries would be
  // refused too.
  if (enrolmentRequired) {
    return (
      <EnrolmentRequired
        email={account?.email}
        mfaEnabled={account?.mfaEnabled ?? false}
        recoveryCodesLeft={account?.recoveryCodesLeft ?? 0}
        onEnrolled={async () => {
          await refetchAccount();
          // The server is the authority on whether the block has lifted, so ask
          // it again rather than assuming the enrolment was enough.
          try {
            await refetch();
          } catch {
            // Still refused — stay on this screen.
          }
        }}
        onSignOut={logout}
      />
    );
  }

  if (needsSetup) {
    return (
      <>
        {supportBanner}
        <SetupWizard companyName={companyName} companySlug={companySlug} onDone={() => refetchMyCompany()} />
      </>
    );
  }

  return (
    <>
      {supportBanner}
      <style>{styles}</style>
      <div className={`cd-wrap${theme === 'light' ? ' cd-light' : ''}`}>
        <nav className="cd-sidebar">
          <div className="cd-sb-top">
            <div className="cd-sb-brand">
              <span className="cd-nav-wordmark"><Mark size={17} tone={theme === 'light' ? 'light' : 'dark'} /> <span className="wordmark-text">eustatement</span></span>
              <div className="cd-sb-meta">
                <span className="cd-nav-tag">{roleLabels[role]}</span>
                <span className="cd-nav-title">{companyName}</span>
              </div>
            </div>
            <div className="cd-sb-nav">
              <button className={`cd-sb-item${tab === 'submissions' ? ' cd-sb-active' : ''}`}
                onClick={() => setTab('submissions')}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 5h14M3 10h14M3 15h8" strokeLinecap="round" />
                </svg>
                <span className="cd-sb-label">Submissions</span>
                {canManage && (counts?.pending ?? 0) > 0 && (
                  <span className="cd-sb-count" aria-label={`${counts.pending} waiting for a decision`}>
                    {counts.pending > 99 ? '99+' : counts.pending}
                  </span>
                )}
              </button>
              <ActivityNavItem active={tab === 'activity'} onOpen={() => setTab('activity')} />
              {isOwner && (
                <>
                  <button className={`cd-sb-item${tab === 'members' ? ' cd-sb-active' : ''}`}
                    onClick={() => setTab('members')}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M13 16c0-2.21-2.24-4-5-4s-5 1.79-5 4" strokeLinecap="round" />
                      <circle cx="8" cy="7" r="3" />
                      <path d="M17 16c0-1.66-1.34-3-3-3" strokeLinecap="round" />
                      <circle cx="14" cy="7" r="2.5" />
                    </svg>
                    <span className="cd-sb-label">Team</span>
                  </button>
                  <button className={`cd-sb-item${tab === 'account' ? ' cd-sb-active' : ''}`} onClick={() => setTab('account')}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="10" cy="7" r="3" />
                      <path d="M4 17c0-2.8 2.7-5 6-5s6 2.2 6 5" strokeLinecap="round" />
                    </svg>
                    <span className="cd-sb-label">Account</span>
                  </button>
                  <button className={`cd-sb-item${tab === 'form' ? ' cd-sb-active' : ''}`} onClick={() => setTab('form')}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 6h12M4 10h12M4 14h12" strokeLinecap="round" />
                      <circle cx="7" cy="6" r="2" fill="currentColor" stroke="none" />
                      <circle cx="13" cy="10" r="2" fill="currentColor" stroke="none" />
                      <circle cx="7" cy="14" r="2" fill="currentColor" stroke="none" />
                    </svg>
                    <span className="cd-sb-label">Form</span>
                  </button>
                </>
              )}
              {companySlug && (
                <a className="cd-sb-item cd-sb-link" href={`/${companySlug}`} target="_blank" rel="noreferrer">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M8 5H5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3M12 3h5m0 0v5m0-5l-8 8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="cd-sb-label">View Form</span>
                </a>
              )}
            </div>
          </div>
          <div className="cd-sb-bottom">
            <button className="cd-sb-theme" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
              {theme === 'dark' ? (
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"/>
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
                </svg>
              )}
              <span className="cd-sb-label">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button className="cd-sb-signout" onClick={() => void handleLogout()}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M13 10H3m0 0l3-3m-3 3l3 3M10 3h5a2 2 0 012 2v10a2 2 0 01-2 2h-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="cd-sb-label">Sign Out</span>
            </button>
          </div>
        </nav>

        <main className="cd-main">
          {account && !account.emailVerified && !verificationDismissed && (
            <div className="cd-banner">
              <span>
                <b>Confirm your email address to put your form live.</b> Until {account.email} is
                confirmed, your public form turns visitors away — and decisions, invitations and
                password resets cannot be relied on to reach you.
              </span>
              <span className="cd-banner-actions">
                <button className="cd-banner-btn" disabled={resending} onClick={() => resendVerification()}>
                  {resending ? 'Sending…' : 'Send the link again'}
                </button>
                <button className="cd-banner-x" aria-label="Dismiss" onClick={() => setVerificationDismissed(true)}>×</button>
              </span>
            </div>
          )}
          {/* Not dismissible: it states why the form is closed, and the reason
              stays true until someone decides. Words carry the state, not only the colour. */}
          {myCompanyData?.myCompany?.accessStatus === 'PENDING' && (
            <div className="cd-banner cd-banner--info" role="status">
              <span>
                <b>Your access request is being reviewed.</b> You can set up your form and invite your
                team now; the form goes live once it is approved. You&rsquo;ll get an email either way.
              </span>
            </div>
          )}
          {myCompanyData?.myCompany?.accessStatus === 'REJECTED' && (
            <div className="cd-banner cd-banner--danger" role="status">
              <span>
                <b>Your access request was not approved.</b>
                {myCompanyData.myCompany.rejectionReason && <> Reason: {myCompanyData.myCompany.rejectionReason}</>}
                {' '}Reply to the email you received if you think this is a mistake.
              </span>
            </div>
          )}
          {myCompanyData?.myCompany?.deletionRequestedAt && (
            <div className="cd-banner cd-banner--danger">
              <span>
                <b>This account is scheduled for deletion.</b> Everything is erased on{' '}
                {new Date(myCompanyData.myCompany.deletionScheduledFor).toLocaleDateString()} —
                until then it can still be undone.
              </span>
              {isOwner && (
                <span className="cd-banner-actions">
                  <button className="cd-banner-btn" onClick={() => cancelDeletion()}>Keep the account</button>
                </span>
              )}
            </div>
          )}
          <div key={tab} className="cd-tab-pane">
          {tab === 'activity' && <ActivityFeed onOpenSubmission={id => void openSubmissionInPlace(id)} showTeam={isOwner} />}
          {tab === 'submissions' && (
            <>
              {!isOwner && formConfigured === false && (
                <div className="cd-setup-notice">
                  The owner hasn&rsquo;t set up the form yet — submissions will appear here once it&rsquo;s live.
                </div>
              )}
              <div className="cd-filters">
                {availableFilters.map(f => (
                  <button key={f} className={`cd-filter-btn${filter === f ? ' cd-filter-active' : ''}`} onClick={() => setFilter(f)}>
                    {filterLabels[f]} <span className="cd-filter-count">{tabCounts[f]}</span>
                  </button>
                ))}
                {canManage && (counts?.tests ?? 0) > 0 && (
                  <button
                    className={`cd-testmode${testMode ? ' cd-testmode-on' : ''}`}
                    onClick={() => { setTestMode(t => !t); refetchCounts(); }}
                    title="Test submissions are kept out of the real queue">
                    {testMode ? 'Viewing test data' : `Test data (${counts?.tests ?? 0})`}
                  </button>
                )}
                <button className={`cd-refresh${refreshing ? ' cd-refreshing' : ''}`} disabled={refreshing}
                  onClick={() => void refreshList()} title="Load the newest statements">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" aria-hidden="true">
                    <path d="M4 4.5A7.5 7.5 0 0117 10m-1 5.5A7.5 7.5 0 013 10" strokeLinecap="round"/>
                    <path d="M16 6V4l2 2-2 2V6zM4 14v2l-2-2 2-2v2z" fill="currentColor" stroke="none"/>
                  </svg>
                  <span>{refreshing ? 'Refreshing…' : 'Refresh list'}</span>
                </button>
              </div>
              <div className="cd-search-wrap">
                <svg className="cd-search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" aria-hidden="true">
                  <circle cx="8.5" cy="8.5" r="5.5"/><path d="M13.5 13.5l3 3" strokeLinecap="round"/>
                </svg>
                <input className="cd-search" type="text" placeholder="Search by name, order or company…"
                  value={search} onChange={e => setSearch(e.target.value)} />
                {search && <button className="cd-search-clear" onClick={() => setSearch('')} aria-label="Clear search">✕</button>}
              </div>
              <div className="cd-daterange">
                <span className="cd-daterange-label">Created</span>
                <DatePicker value={dateFrom} max={dateTo || undefined} onChange={setDateFrom} label="From date" />
                <span className="cd-daterange-sep">–</span>
                <DatePicker value={dateTo} min={dateFrom || undefined} onChange={setDateTo} label="To date" />
                <button className="cd-date-preset" onClick={() => setRangeDays(1)}>Today</button>
                <button className="cd-date-preset" onClick={() => setRangeDays(7)}>7d</button>
                <button className="cd-date-preset" onClick={() => setRangeDays(30)}>30d</button>
                <button className="cd-date-preset" onClick={setThisMonth}>This month</button>
                {dateActive && <button className="cd-date-preset cd-date-clear" onClick={clearDates}>Clear</button>}
              </div>
              {(q || dateActive) && <div className="cd-result-count">{filtered.length} result{filtered.length === 1 ? '' : 's'}</div>}

              {loading && !refreshing && (
                <div className="cd-skel-table" aria-busy="true" aria-label="Loading submissions">
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="cd-skel-row">
                      <span className="cd-skel" style={{ width: '12%' }} />
                      <span className="cd-skel" style={{ width: '22%' }} />
                      <span className="cd-skel" style={{ width: '18%' }} />
                      <span className="cd-skel" style={{ width: '10%' }} />
                      <span className="cd-skel" style={{ width: '9%', marginLeft: 'auto' }} />
                    </div>
                  ))}
                </div>
              )}
              {(!loading || refreshing) && filtered.length === 0 && <div className="cd-state">No submissions here.</div>}
              {(!loading || refreshing) && filtered.length > 0 && (
                <div className="cd-table-wrap">
                  <table className="cd-table">
                    <thead>
                      <tr><th>Order #</th><th>Date</th><th>Company</th><th>Contact</th><th>Country</th><th>VIES</th><th>Substance</th><th>Status</th><th></th></tr>
                    </thead>
                    <tbody>
                      {visible.map(s => (
                        <tr key={s.id} className={`cd-row cd-row--${rowColor(s)}`} onClick={() => { setSelected(s); setModalMode('view'); }}>
                          <td>{s.orderNumber || '—'}</td>
                          <td className="cd-cell-mono" title={formatDate(s.createdAt)}>{relativeTime(s.createdAt)}</td>
                          <td>{s.buyerType === 'INDIVIDUAL'
                            ? <div className="cd-company cd-dim" style={{ fontWeight: 400 }}>Individual</div>
                            : <><div className="cd-company">{s.companyName || '—'}</div><div className="cd-dim">{s.vatNumber}</div></>}</td>
                          <td><div>{s.firstName} {s.lastName}</div><div className="cd-dim">{s.email}</div></td>
                          <td>{s.country || '—'}</td>
                          <td>
                            <ViesBadge status={s.viesStatus} />
                            {s.viesAddressMatch === 'MISMATCH' && <span className="cd-badge cd-badge-red cd-pending-badge" title="Submitted address doesn't match the VAT-registered address">✗ Address</span>}
                          </td>
                          <td><SubCheckTag status={s.substanceCheckStatus} /></td>
                          <td>
                            {s.status === 'PENDING_REVIEW' && needsReview(s)
                              ? <span className="cd-badge cd-badge-red" title="Needs manual review">⚠ Review</span>
                              : <StatusBadge status={s.status} />}
                            {s.isTest && <span className="cd-badge cd-badge-amber cd-pending-badge">TEST</span>}
                          </td>
                          <td>
                            <div className="cd-actions" onClick={e => e.stopPropagation()}>
                              <button className="cd-btn-view" onClick={() => { setSelected(s); setModalMode('view'); }}>View</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {visible.length < filtered.length && (
                        <tr ref={sentinelRef} className="cd-row-more">
                          <td colSpan={9}>Loading more… ({visible.length} of {filtered.length})</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {filtered.length > 50 && visible.length >= filtered.length && (
                    <div className="cd-list-foot">Showing all {filtered.length}</div>
                  )}
                </div>
              )}
            </>
          )}

          {tab === 'form' && isOwner && (
            <div className="cd-formcfg">
              <div className="cd-formcfg-header">
                <div>
                  <h2 className="cd-members-title">Form Settings</h2>
                  <p className="cd-formcfg-sub">
                    Choose which fields your customers fill in at{' '}
                    <a className="cd-formcfg-link" href={`/${companySlug}`} target="_blank" rel="noreferrer">
                      /{companySlug || '…'} ↗
                    </a>
                  </p>
                </div>
                <div className="cd-formcfg-save-wrap">
                  {cfgError && <span className="cd-formcfg-error">{cfgError}</span>}
                  <button className="cd-invite-btn" onClick={handleSaveConfig} disabled={savingCfg || !cfgDraft}>
                    {savingCfg ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>

              <div className="cd-formcfg-locked">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="14" height="14">
                  <rect x="4" y="9" width="12" height="8" rx="1.5"/>
                  <path d="M7 9V6.5a3 3 0 016 0V9" strokeLinecap="round"/>
                </svg>
                <span>Always collected: email, first &amp; last name, substance(s), statement, terms agreement</span>
              </div>

              <div className="cd-formcfg-list">
                <div className="cd-formcfg-row">
                  <div className="cd-formcfg-info">
                    <span className="cd-formcfg-label">{BUYER_TYPE_LABEL}</span>
                    <span className="cd-formcfg-desc">{BUYER_TYPE_DESC}</span>
                  </div>
                  <div className="cd-formcfg-seg">
                    {BUYER_TYPE_OPTIONS.map(opt => (
                      <button key={opt.value}
                        className={`cd-seg-btn${cfgDraft?.buyerTypes === opt.value ? ' cd-seg-active' : ''}`}
                        onClick={() => cfgDraft && setCfgDraft({ ...cfgDraft, buyerTypes: opt.value })}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {CONFIG_ROWS.map(row => (
                  <div key={row.key} className="cd-formcfg-row">
                    <div className="cd-formcfg-info">
                      <span className="cd-formcfg-label">{row.label}</span>
                      <span className="cd-formcfg-desc">{row.desc}</span>
                      {row.key === 'idVerification' && cfgDraft?.idVerification === 'REQUIRED' && !identityAvailable && (
                        <span className="cd-formcfg-warning">{ID_UNAVAILABLE_WARNING}</span>
                      )}
                      {row.key === 'idVerification' && cfgDraft?.idVerification === 'HIDDEN' && (
                        <span className="cd-formcfg-warning">
                          ⚠ Identity verification is legally required when selling restricted explosives
                          precursors (EU Reg. 2019/1148). Disable only if you don't sell restricted substances.
                        </span>
                      )}
                    </div>
                    <div className="cd-formcfg-seg">
                      {row.modes.map(mode => (
                        <button key={mode}
                          className={`cd-seg-btn${cfgDraft?.[row.key] === mode ? ' cd-seg-active' : ''}`}
                          onClick={() => cfgDraft && setCfgDraft({ ...cfgDraft, [row.key]: mode })}>
                          {modeLabels[mode]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="cd-formcfg-terms">
                <div className="cd-formcfg-terms-head">
                  <div className="cd-formcfg-info">
                    <span className="cd-formcfg-label">Your terms &amp; conditions</span>
                    <span className="cd-formcfg-desc">
                      The terms &amp; conditions your customers must confirm on the form — as text or
                      as a link to your own terms page. Prefilled with the standard end-user
                      statement terms.
                    </span>
                  </div>
                  <div className="cd-formcfg-seg">
                    {TERMS_MODES.map(m => (
                      <button key={m.value}
                        className={`cd-seg-btn${cfgDraft?.customTermsMode === m.value ? ' cd-seg-active' : ''}`}
                        onClick={() => cfgDraft && setCfgDraft({ ...cfgDraft, customTermsMode: m.value })}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                {cfgDraft?.customTermsMode === 'TEXT' && (
                  <label className="cd-formcfg-terms-field">
                    <span className="cd-formcfg-terms-label">Terms text (plain text)</span>
                    <textarea className="cd-formcfg-terms-textarea" rows={6}
                      placeholder={'E.g. All orders are subject to our general sales conditions.\nDeliveries are made under Incoterms 2020 (DAP)…'}
                      value={cfgDraft.customTermsText}
                      onChange={e => setCfgDraft({ ...cfgDraft, customTermsText: e.target.value })} />
                  </label>
                )}
                {cfgDraft?.customTermsMode === 'LINK' && (
                  <label className="cd-formcfg-terms-field">
                    <span className="cd-formcfg-terms-label">Link to your terms page</span>
                    <input className="cd-formcfg-terms-input" type="url"
                      placeholder="https://yourcompany.com/terms"
                      value={cfgDraft.customTermsUrl}
                      onChange={e => setCfgDraft({ ...cfgDraft, customTermsUrl: e.target.value })} />
                  </label>
                )}
              </div>

              <div className="cd-embed">
                <div className="cd-formcfg-info">
                  <span className="cd-formcfg-label">Put the form on your own website</span>
                  <span className="cd-formcfg-desc">
                    Paste this where the form should appear. It loads your form from this
                    platform inside a frame, so customers stay on your site and their answers
                    still go straight to us — your website never sees or stores them.
                  </span>
                </div>

                <div className="cd-embed-row">
                  <code className="cd-embed-url">{formUrl || '…'}</code>
                  <button className="cd-embed-btn" disabled={!formUrl}
                    onClick={() => copyText(formUrl, 'Form link')}>Copy link</button>
                </div>

                <pre className="cd-embed-code">{snippet || '…'}</pre>
                <div className="cd-embed-row">
                  <button className="cd-invite-btn" disabled={!snippet}
                    onClick={() => copyText(snippet, 'Embed code')}>Copy embed code</button>
                  <span className="cd-embed-hint">
                    Add <code>?theme=dark</code> to the frame URL for the dark version, and{' '}
                    <code>?lang=de</code> (any EU language code) to open it in your shop&rsquo;s
                    language — <code>?theme=dark&amp;lang=de</code> for both. Customers can
                    still switch language in the form.
                  </span>
                </div>
              </div>
            </div>
          )}

          {tab === 'account' && isOwner && (
            <div className="cd-formcfg cd-account">
              <div className="cd-formcfg-header">
                <div>
                  <h2 className="cd-members-title">Account</h2>
                  <p className="cd-formcfg-sub">Your sign-in details and what happens to this company's data.</p>
                </div>
              </div>

              <div className="cd-embed">
                <div className="cd-formcfg-info">
                  <span className="cd-formcfg-label">Email address</span>
                  <span className="cd-formcfg-desc">
                    {account?.email}{' '}
                    {account?.emailVerified
                      ? <b style={{ color: 'var(--cd-green, #3ecf8e)' }}>· confirmed</b>
                      : <b style={{ color: 'var(--cd-amber, #e8b54a)' }}>· not confirmed yet</b>}
                  </span>
                </div>
                {!account?.emailVerified && (
                  <div className="cd-embed-row">
                    <button className="cd-embed-btn" disabled={resending} onClick={() => resendVerification()}>
                      {resending ? 'Sending…' : 'Send the confirmation link'}
                    </button>
                  </div>
                )}
              </div>

              <PasskeySettings onChanged={() => void refetchAccount()} />

              <MfaSettings
                enabled={account?.mfaEnabled ?? false}
                recoveryCodesLeft={account?.recoveryCodesLeft ?? 0}
                onChanged={() => void refetchAccount()}
              />

              <RevealLog onOpenSubmission={openSubmissionById} />

              {myCompanies.length > 1 && (
                <div className="cd-embed">
                  <div className="cd-formcfg-info">
                    <span className="cd-formcfg-label">Your companies</span>
                    <span className="cd-formcfg-desc">
                      You belong to more than one. Switching signs you into that company's dashboard.
                    </span>
                  </div>
                  {myCompanies.map(c => (
                    <div key={c.id} className="cd-embed-row">
                      <code className="cd-embed-url">{c.name} · /{c.slug} · {roleLabels[c.role]}</code>
                      <button className="cd-embed-btn" disabled={c.current}
                        onClick={() => switchCompany({ variables: { companyId: c.id } })}>
                        {c.current ? 'Current' : 'Switch to this one'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="cd-danger">
                <div className="cd-formcfg-info">
                  <span className="cd-formcfg-label">Close this account</span>
                  <span className="cd-formcfg-desc">
                    The form stops accepting statements and everything — submissions, team, settings —
                    is erased after 30 days. Nothing is deleted before then, and you can undo it at any
                    point during those 30 days.
                  </span>
                </div>
                {myCompanyData?.myCompany?.deletionRequestedAt ? (
                  <div className="cd-embed-row">
                    <span className="cd-embed-hint">
                      Scheduled for {new Date(myCompanyData.myCompany.deletionScheduledFor).toLocaleDateString()}.
                    </span>
                    <button className="cd-embed-btn" onClick={() => cancelDeletion()}>Keep the account</button>
                  </div>
                ) : (
                  <div className="cd-embed-row">
                    <input className="cd-embed-url" placeholder={`Type ${companySlug} to confirm`}
                      value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
                    <button className="cd-danger-btn"
                      disabled={requestingDeletion || deleteConfirm.trim().toLowerCase() !== companySlug.toLowerCase()}
                      onClick={() => requestDeletion({ variables: { confirmSlug: deleteConfirm.trim() } })}>
                      {requestingDeletion ? 'Scheduling…' : 'Close this account'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'members' && isOwner && (
            <div className="cd-members">
              <div className="cd-members-header">
                <h2 className="cd-members-title">Team Members</h2>
                <button className="cd-invite-btn" onClick={() => { setInviteOpen(true); setInviteResult(''); setInviteError(''); }}>
                  + Invite Member
                </button>
              </div>
              <div className="cd-members-list">
                {members.map(m => (
                  <div key={m.id} className="cd-member-row">
                    <div className="cd-member-info">
                      <span className="cd-member-name">{m.name}</span>
                      <span className="cd-member-email">{m.email}</span>
                    </div>
                    <div className="cd-member-actions">
                      <Select value={m.role as CompanyRole} options={ROLE_OPTIONS}
                        label={`Role for ${m.name || m.email}`} onChange={r => handleChangeRole(m, r)} />
                      <button className="cd-remove-btn" onClick={() => handleRemoveMember(m)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </main>

        {/* Submission modal */}
        {selected && (
          <div className="cd-modal-bg" onClick={() => setSelected(null)}>
            <div className="cd-modal" role="dialog" aria-modal="true" aria-label="Submission detail"
              ref={detailModalRef} tabIndex={-1} onClick={e => e.stopPropagation()}>
              <div className="cd-modal-header">
                <div>
                  <p className="cd-modal-company">{selected.companyName || `${selected.firstName} ${selected.lastName}`}</p>
                  <p className="cd-modal-sub">{selected.firstName} {selected.lastName} — {selected.email}</p>
                </div>
                <button className="cd-modal-close" onClick={() => setSelected(null)} aria-label="Close">✕</button>
              </div>
              {modalMode === 'view' ? (
                <div className="cd-modal-body">
                  <PriorApprovals submissionId={selected.id} onOpen={openSubmissionById} />
                  <div className="cd-detail-grid">
                    <Detail label="Buyer" value={selected.buyerType === 'INDIVIDUAL' ? 'Individual' : 'Company'} />
                    <Detail label="Order #" value={selected.orderNumber || <Dim />} />
                    <Detail label="Country" value={selected.country || <Dim />} />
                    <Detail label="Submitted" value={new Date(selected.createdAt).toLocaleString('en-GB')} />
                  </div>
                    <div className={`cd-id-block${selected.substanceCheckStatus === 'PENDING' ? ' cd-id-block--checking' : selected.substanceCheckStatus === 'OK' ? ' cd-id-block--ok' : selected.substanceCheckStatus === 'FLAGGED' ? ' cd-id-block--suspicious' : ''}`}>
                      <div className="cd-id-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                        <span>Substance Information</span>
                        {canManage && (
                          <button className="cd-btn-view" disabled={rechecking || selected.substanceCheckStatus === 'PENDING'}
                            onClick={() => handleRecheckSubstance(selected.id)}>
                            {rechecking || selected.substanceCheckStatus === 'PENDING' ? 'Checking…' : selected.substanceCheckStatus === 'NOT_CHECKED' ? 'Run check' : 'Re-run check'}
                          </button>
                        )}
                      </div>
                      <div className="cd-detail-grid" style={{ marginBottom: '1.25rem' }}>
                        <Detail label="Substance(s)" value={selected.substances} />
                        <Detail label="CAS Number" value={selected.casNumbers || <Dim />} />
                        <Detail label="Concentration" value={selected.concentration || <Dim />} />
                      </div>
                      <Detail label="Statement" value={
                      <StatementWithTranslation statement={selected.statement}
                        lang={selected.statementLang} translation={selected.statementTranslation} />
                    } />
                        <div className="cd-detail-grid" style={{ marginTop: '1.25rem', marginBottom: selected.substanceCheckNote ? '1rem' : 0 }}>
                          <Detail label="Compliance" value={<SubCheckBadge status={selected.substanceCheckStatus} />} />
                          {selected.substanceCheckedAt && (
                            <Detail label="Checked" value={<span title={formatDate(selected.substanceCheckedAt)}>{relativeTime(selected.substanceCheckedAt)}</span>} />
                          )}
                        </div>
                      {selected.substanceCheckNote && <Detail label="Assessment" value={selected.substanceCheckNote} />}
                      {renderOverride('SUBSTANCE')}
                    </div>
                  {selected.adminNote && (
                    <div className="cd-detail-full">
                      <Detail label="Note" value={selected.adminNote} />
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
                    const yesNo = (v: boolean | null | undefined, ok: string, bad: string) =>
                      v === true ? <span style={{ color: '#3ecf8e', fontWeight: 600 }}>{ok}</span>
                      : v === false ? <span style={{ color: '#f04e5e', fontWeight: 600 }}>{bad}</span>
                      : <Dim />;
                    return (
                  <div className={`cd-id-block${suspicious ? ' cd-id-block--suspicious' : clean ? ' cd-id-block--ok' : ''}`}>
                    <div className="cd-id-title">Identity Document</div>
                    <div className="cd-detail-grid" style={{ marginBottom: 0 }}>
                      <Detail label="Name on Document" value={selected.idDocumentName ?? <Dim />} />
                      <Detail label="Document Type" value={selected.idDocumentType ? docTypeLabels[selected.idDocumentType] : <Dim />} />
                      <RevealDocumentNumber
                        submissionId={selected.id}
                        canReveal={canManage}
                        mfaEnabled={account?.mfaEnabled ?? false}
                      />
                      {verified ? (<>
                        <Detail label="Verification" value={<IdVerificationBadge status={selected.idVerificationStatus} />} />
                        <Detail label="Liveness" value={yesNo(selected.idLivenessPassed, '✓ Passed', '✗ Failed')} />
                        <Detail label="Face Match" value={yesNo(selected.idFaceMatch, '✓ Match', '✗ No match')} />
                      </>) : (<>
                        <Detail label="MRZ Valid" value={yesNo(selected.idMrzValid, '✓ Yes', '✗ No')} />
                        <Detail label="Forgery Risk" value={
                          selected.idLikelySynthetic === true ? <span style={{ color: '#f04e5e', fontWeight: 600 }}>⚠ Suspicious</span>
                          : selected.idLikelySynthetic === false ? <span style={{ color: '#3ecf8e' }}>No flags</span>
                          : <Dim />} />
                      </>)}
                      <Detail label="Expiry" value={
                        selected.idDocumentExpiry
                          ? <span style={{ color: isExpired(selected.idDocumentExpiry) ? '#f04e5e' : 'inherit', fontWeight: isExpired(selected.idDocumentExpiry) ? 600 : 400 }}>
                              {new Date(selected.idDocumentExpiry).toLocaleDateString('en-GB')}{isExpired(selected.idDocumentExpiry) ? ' ✗ Expired' : ''}
                            </span>
                          : <Dim />} />
                      {verified && selected.idVerificationCheckedAt && (
                        <Detail label="Checked" value={formatDate(selected.idVerificationCheckedAt)} />
                      )}
                    </div>
                    {selected.idVerificationWarnings && (
                      <div className="cd-detail-full" style={{ marginTop: '0.9rem' }}>
                        <Detail label="Provider Warnings" value={selected.idVerificationWarnings} />
                      </div>
                    )}
                    {(suspicious || isExpired(selected.idDocumentExpiry)) && (
                      <div className="cd-id-alert">Please review this document manually before approving.</div>
                    )}
                    {renderOverride('IDENTITY')}
                  </div>
                    );
                  })()}
                  {selected.buyerType === 'COMPANY' && (
                    <div className={`cd-id-block${selected.viesAddressMatch === 'MISMATCH' || selected.viesStatus === 'INVALID' ? ' cd-id-block--suspicious' : selected.viesAddressMatch === 'MATCH' ? ' cd-id-block--ok' : ''}`}>
                      <div className="cd-id-title">VAT / VIES</div>
                      <div className="cd-detail-grid" style={{ marginBottom: selected.viesStatus === 'VALID' && (selected.viesName || selected.viesAddress) ? '1rem' : 0 }}>
                        <Detail label="VAT" value={selected.vatNumber || <Dim />} />
                        <Detail label="VIES Status" value={<ViesBadge status={selected.viesStatus} />} />
                      </div>
                      {selected.viesStatus === 'VALID' && (selected.viesName || selected.viesAddress) && (<>
                        <div className="cd-detail-grid" style={{ marginBottom: '1rem' }}>
                          <Detail label="Registered Name" value={selected.viesName || <Dim />} />
                          <Detail label="Address Match" value={<ViesAddressBadge match={selected.viesAddressMatch} />} />
                        </div>
                        <div className="cd-detail-grid" style={{ marginBottom: 0 }}>
                          <Detail label="Registered Address"
                            value={selected.viesAddress
                              ? <span style={{ whiteSpace: 'pre-line' }}>{selected.viesAddress}</span>
                              : <span className="cd-dim">No address on file</span>} />
                          <Detail label="Submitted Address"
                            value={<span style={{ whiteSpace: 'pre-line' }}>{[selected.street, [selected.zipCode, selected.place].filter(Boolean).join(' '), selected.country].filter(Boolean).join('\n') || '—'}</span>} />
                        </div>
                      </>)}
                      {selected.viesAddressMatch === 'MISMATCH' && (
                        <div className="cd-id-alert">
                          The submitted address does not match the address registered for this VAT. Please review before approving.
                        </div>
                      )}
                      {renderOverride('VIES')}
                    </div>
                  )}
                  <div className="cd-detail-grid" style={{ marginBottom: 0 }}>
                    <Detail label="Status" value={<StatusBadge status={selected.status} />} />
                    {(selected.status === 'APPROVED' || selected.status === 'DENIED') && (
                      <Detail
                        label={selected.status === 'APPROVED' ? 'Approved by' : 'Denied by'}
                        value={selected.reviewedByName
                          ? <>{selected.reviewedByName}{selected.reviewedAt && <span style={{ color: 'var(--cd-text-dim)' }}> · {formatDate(selected.reviewedAt)}</span>}</>
                          : <span style={{ color: 'var(--cd-text-dim)' }}>Not recorded — decided before reviewers were tracked</span>}
                      />
                    )}
                  </div>
                  {canManage && selected.status === 'PENDING_REVIEW' && !approvable(selected) && (
                    <p className="cd-gate-hint">
                      {isPending(selected)
                        ? 'Substance check is still running — approval is locked until it finishes.'
                        : `Resolve or override to approve: ${blockingCategories(selected).map(c => CATEGORY_LABEL[c]).join(', ')}.`}
                    </p>
                  )}
                  <div className="cd-modal-actions">
                    {canManage && selected.status === 'PENDING_REVIEW' && (
                      <>
                        <button className="cd-btn-approve cd-btn-lg" disabled={approving || !approvable(selected)} onClick={() => approve({ variables: { id: selected.id } })}>
                          {approving ? 'Approving…' : 'Approve'}
                        </button>
                        <button className="cd-btn-deny cd-btn-lg" onClick={() => setModalMode('deny')}>Deny…</button>
                      </>
                    )}
                    {canManage && selected.status !== 'PENDING_REVIEW' && (
                      <button className="cd-btn-view cd-btn-lg" disabled={reopening} onClick={handleReopen}>
                        {reopening ? 'Reopening…' : 'Reopen for review'}
                      </button>
                    )}
                    <button className="cd-btn-report cd-btn-lg" onClick={handleReport}>Report suspicious</button>
                    {isOwner && (
                      <button className="cd-btn-delete cd-btn-lg" disabled={deleting} onClick={handleDeleteSub}>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="cd-modal-body">
                  <p className="cd-deny-heading">Reason for denial</p>
                  <p className="cd-deny-sub">This will be sent to {selected.firstName}.</p>
                  <textarea className="cd-deny-textarea" value={denyReason} onChange={e => setDenyReason(e.target.value)}
                    placeholder="e.g. VAT number could not be verified." rows={4} autoFocus />
                  <div className="cd-modal-actions">
                    <button className="cd-btn-view" onClick={() => setModalMode('view')}>Cancel</button>
                    <button className="cd-btn-deny cd-btn-lg" onClick={() => deny({ variables: { id: selected.id, reason: denyReason } })} disabled={!denyReason.trim() || denying}>
                      {denying ? 'Denying…' : 'Confirm Denial'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invite modal */}
        {inviteOpen && (
          <div className="cd-modal-bg" onClick={() => setInviteOpen(false)}>
            <div className="cd-modal cd-modal--sm" role="dialog" aria-modal="true" aria-label="Invite team member"
              ref={inviteModalRef} tabIndex={-1} onClick={e => e.stopPropagation()}>
              <div className="cd-modal-header">
                <p className="cd-modal-company">Invite Team Member</p>
                <button className="cd-modal-close" onClick={() => setInviteOpen(false)} aria-label="Close">✕</button>
              </div>
              <div className="cd-modal-body">
                {inviteResult ? (
                  <>
                    <p className="cd-invite-success">Invite sent! Share this link if email doesn't arrive:</p>
                    <div className="cd-invite-link">{inviteResult}</div>
                    <button className="cd-btn-view cd-btn-lg" style={{ marginTop: '1rem', width: '100%' }}
                      onClick={copyInviteLink}>Copy link</button>
                    <button className="cd-btn-approve cd-btn-lg" style={{ marginTop: '0.6rem', width: '100%' }}
                      onClick={() => { setInviteOpen(false); setInviteResult(''); }}>Done</button>
                  </>
                ) : (
                  <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="cd-invite-field">
                      <label className="cd-detail-label" htmlFor="invite-email">Email Address</label>
                      <input id="invite-email" className="cd-deny-textarea" style={{ minHeight: 0, padding: '10px 14px', resize: 'none' }}
                        type="email" autoComplete="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
                    </div>
                    <div className="cd-invite-field">
                      <label className="cd-detail-label" htmlFor="invite-role">Role</label>
                      <Select id="invite-role" block value={inviteRole} options={ROLE_OPTIONS} onChange={setInviteRole} />
                    </div>
                    {inviteError && <div style={{ color: '#f04e5e', fontSize: 12 }}>{inviteError}</div>}
                    <button className="cd-btn-approve cd-btn-lg" type="submit" disabled={inviting}>
                      {inviting ? 'Sending…' : 'Send Invite'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Dim() { return <span style={{ color: 'var(--cd-text-dim)' }}>—</span>; }
// A pending submission warrants review while any check is failing and not yet
// overridden — once every failing check is overridden it becomes approvable.
function needsReview(s: Submission): boolean {
  return blockingCategories(s).length > 0;
}

// Traffic-light row color: green=approved, red=denied/needs-attention, yellow=pending.
/**
 * How loudly a row is drawn.
 *
 * Colour used to cover the whole queue: every pending row was tinted, red when
 * a check had failed and amber when it had not. A reviewer opening the
 * dashboard saw a wall of colour, which is the fastest way to teach someone to
 * stop reading it. So a tint now means a decision has been made — green
 * approved, red denied — and a pending row is left plain unless something
 * actually needs attention, in which case it gets a rail and nothing more.
 * The badges in the row carry the detail either way, so none of this is the
 * only signal.
 */
// Only a decision colours the row; open statements stay neutral, and the
// status and check badges say whether one needs a closer look.
function rowColor(s: Submission): 'green' | 'red' | 'plain' {
  if (s.status === 'APPROVED') return 'green';
  if (s.status === 'DENIED') return 'red';
  return 'plain';
}

function ViesBadge({ status }: { status: string }) {
  const map: Record<string, string> = { VALID: 'cd-badge-green', INVALID: 'cd-badge-red', ERROR: 'cd-badge-amber', NOT_CHECKED: 'cd-badge-grey' };
  const label: Record<string, string> = { NOT_CHECKED: 'NOT CHECKED' };
  return <span className={`cd-badge ${map[status] ?? ''}`}>{label[status] ?? status}</span>;
}
function ViesAddressBadge({ match }: { match: ViesAddressMatch }) {
  const map: Record<ViesAddressMatch, [string, string]> = {
    NOT_CHECKED: ['cd-badge-grey', 'NOT CHECKED'],
    UNAVAILABLE: ['cd-badge-grey', 'NO RECORD'],
    MATCH: ['cd-badge-green', '✓ MATCH'],
    PARTIAL: ['cd-badge-amber', '~ PARTIAL'],
    MISMATCH: ['cd-badge-red', '✗ MISMATCH'],
  };
  const [cls, label] = map[match];
  return <span className={`cd-badge ${cls}`}>{label}</span>;
}
function IdVerificationBadge({ status }: { status: IdVerificationStatus }) {
  const map: Record<IdVerificationStatus, [string, string]> = {
    NOT_CHECKED: ['cd-badge-grey', 'NOT CHECKED'],
    PENDING: ['cd-badge-blue', 'IN PROGRESS'],
    IN_REVIEW: ['cd-badge-amber', 'MANUAL REVIEW'],
    APPROVED: ['cd-badge-green', '✓ VERIFIED'],
    DECLINED: ['cd-badge-red', '✗ DECLINED'],
    EXPIRED: ['cd-badge-amber', 'EXPIRED'],
    ERROR: ['cd-badge-amber', 'ERROR'],
  };
  const [cls, label] = map[status] ?? map.ERROR;
  return <span className={`cd-badge ${cls}`}>{label}</span>;
}
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { PENDING_REVIEW: 'cd-badge-amber', APPROVED: 'cd-badge-green', DENIED: 'cd-badge-red' };
  const label: Record<string, string> = { PENDING_REVIEW: 'Pending', APPROVED: 'Approved', DENIED: 'Denied' };
  return <span className={`cd-badge ${map[status] ?? ''}`}>{label[status] ?? status}</span>;
}
// Pill version for the submissions table column (consistent with VIES/Status).
function SubCheckTag({ status }: { status: SubstanceCheckStatus }) {
  const map: Record<SubstanceCheckStatus, [string, string]> = {
    NOT_CHECKED: ['cd-badge-grey', 'Not checked'],
    PENDING: ['cd-badge-blue', 'Checking…'],
    OK: ['cd-badge-green', 'OK'],
    FLAGGED: ['cd-badge-red', '⚠ Flagged'],
    ERROR: ['cd-badge-amber', 'Error'],
  };
  const [cls, label] = map[status];
  return <span className={`cd-badge ${cls}`}>{label}</span>;
}

function SubCheckBadge({ status }: { status: SubstanceCheckStatus }) {
  const map: Record<SubstanceCheckStatus, [string, string]> = {
    NOT_CHECKED: ['var(--cd-text-dim)', 'Not checked'],
    PENDING: ['var(--cd-blue)', 'Checking…'],
    // Not "No concerns" — the check screens for known indicators, it does not
    // read the statement. Claiming more than it did is how reviewers stop reading.
    OK: ['#3ecf8e', '✓ Nothing flagged'],
    FLAGGED: ['#f04e5e', '⚠ Needs review'],
    ERROR: ['#f5a623', 'Check failed'],
  };
  const [color, label] = map[status];
  return <span style={{ color, fontWeight: 600 }}>{label}</span>;
}
function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="cd-detail">
      <span className="cd-detail-label">{label}</span>
      <span className="cd-detail-value">{value}</span>
    </div>
  );
}

// Floating pill shown during an admin support session — fixed to the bottom so
// it overlays both the dashboard and the SetupWizard without shifting layout.
const supportStyles = `
  .cd-support-banner {
    position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
    z-index: 50; /* Z.PINNED — above a modal on purpose */
    display: flex; align-items: center; gap: 14px;
    padding: 9px 10px 9px 16px;
    background: rgba(245, 166, 35, 0.12);
    border: 1px solid rgba(245, 166, 35, 0.4);
    border-radius: 100px;
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    font-family: 'Inter', sans-serif; font-size: 12.5px; color: #f5a623;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
    white-space: nowrap;
  }
  .cd-support-banner b { font-weight: 600; }
  .cd-support-banner--light { background: #fff4e0; border-color: rgba(161,92,7,0.35); color: #7a4505; box-shadow: 0 6px 24px rgba(15,23,42,0.12); }
  .cd-support-return {
    border: none; cursor: pointer;
    padding: 6px 13px; border-radius: 100px;
    background: #f5a623; color: #1a1405;
    font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
    transition: background 0.15s;
  }
  .cd-support-return:hover { background: #ffb83d; }
`;

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cd-bg: #0f0f10; --cd-surface: #1a1a1c; --cd-surface2: #1f1f21; --cd-surface3: #2a2a2d;
    --cd-border: rgba(255,255,255,0.07); --cd-border2: rgba(255,255,255,0.12);
    --cd-text: #f0f2f8; --cd-text-mid: #9a9a9f; --cd-text-dim: #5e5e63;
    --cd-accent: #f04e5e; --cd-green: #3ecf8e; --cd-amber: #f5a623; --cd-blue: #5b9cf6;
    --cd-r: 12px; --cd-r-sm: 8px; --cd-r-pill: 100px;
  }
  html, body { background: var(--cd-bg); }
  .cd-wrap { font-family: 'Inter', system-ui, sans-serif; height: 100vh; height: 100dvh; overflow: hidden; background: var(--cd-bg); color: var(--cd-text); font-size: 13px; display: flex; flex-direction: row; }

  /* Full viewport height; the main pane scrolls on its own */
  .cd-sidebar {
    width: 220px; min-width: 220px; flex-shrink: 0;
    background: rgba(15,15,16,0.95);
    border-right: 1px solid var(--cd-border);
    display: flex; flex-direction: column;
    height: 100%; overflow-y: auto; z-index: 20; /* Z.CHROME */
  }
  .cd-sb-top { flex: 1; display: flex; flex-direction: column; padding: 1.25rem 0.75rem 0; }
  .cd-sb-bottom { padding: 0.75rem; border-top: 1px solid var(--cd-border); display: flex; flex-direction: column; gap: 2px; }
  .cd-sb-brand { padding: 0 0.5rem 1.25rem; }
  .cd-nav-wordmark { font-size: 14px; font-weight: 800; letter-spacing: -0.02em; color: var(--cd-text); display: flex; align-items: center; gap: 8px; margin-bottom: 0.625rem; }
  .cd-sb-meta { display: flex; flex-direction: column; gap: 5px; align-items: flex-start; }
  .cd-nav-tag {
    font-size: 9px; font-weight: 600; letter-spacing: 0.16em; color: var(--cd-blue);
    background: rgba(91,156,246,0.1); border: 1px solid rgba(91,156,246,0.22);
    padding: 3px 9px; text-transform: uppercase; border-radius: var(--cd-r-pill);
  }
  .cd-nav-title { font-size: 12px; font-weight: 500; color: var(--cd-text-mid); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
  .cd-sb-nav { display: flex; flex-direction: column; gap: 2px; margin-top: 0.25rem; }
  .cd-sb-item {
    font-family: inherit; font-size: 13px; font-weight: 500; color: var(--cd-text-mid);
    background: transparent; border: none; border-radius: var(--cd-r-sm);
    padding: 9px 12px; cursor: pointer; display: flex; align-items: center; gap: 10px;
    text-align: left; width: 100%; transition: all 0.15s;
  }
  .cd-sb-item:hover:not(:disabled) { color: var(--cd-text); background: var(--cd-surface2); }
  .cd-sb-item:disabled { opacity: 0.35; cursor: not-allowed; }
  .cd-sb-active { color: var(--cd-text) !important; background: var(--cd-surface3) !important; }
  /* Statements waiting for a decision. Amber, not red: waiting is normal. */
  .cd-sb-count {
    margin-left: auto; font-size: 10px; font-weight: 700; font-variant-numeric: tabular-nums;
    color: #1a1405; background: var(--cd-amber); border-radius: var(--cd-r-pill);
    padding: 1px 6px; min-width: 18px; text-align: center;
  }
  .cd-light .cd-sb-count { color: #ffffff; }
  .cd-sb-item svg { flex-shrink: 0; opacity: 0.7; }
  .cd-sb-active svg { opacity: 1; }
  .cd-sb-link { text-decoration: none; }
  .cd-sb-theme, .cd-sb-signout {
    font-family: inherit; font-size: 12px; font-weight: 500; color: var(--cd-text-dim);
    background: transparent; border: none; border-radius: var(--cd-r-sm);
    padding: 9px 12px; cursor: pointer; display: flex; align-items: center; gap: 10px;
    width: 100%; text-align: left; transition: all 0.15s;
  }
  .cd-sb-theme:hover { color: var(--cd-text); background: var(--cd-surface2); }
  /* The one control in the sidebar that throws work away reads as such on
     hover, and still asks before doing it. */
  .cd-sb-signout:hover { color: var(--cd-accent); background: rgba(240,78,94,0.1); }
  .cd-sb-signout:focus-visible { outline: 2px solid var(--cd-accent); outline-offset: -2px; }
  .cd-sb-theme svg, .cd-sb-signout svg { flex-shrink: 0; }

  .cd-main { padding: 1.5rem 1.75rem; flex: 1; min-width: 0; overflow-y: auto; overflow-x: hidden; }
  .cd-filters { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .cd-filter-btn {
    font-family: inherit; font-size: 12px; font-weight: 500; background: var(--cd-surface);
    border: 1px solid var(--cd-border); border-radius: var(--cd-r-pill); padding: 7px 16px;
    cursor: pointer; color: var(--cd-text-mid); display: flex; align-items: center; gap: 7px; transition: all 0.2s;
  }
  .cd-filter-btn:hover { border-color: var(--cd-border2); color: var(--cd-text); background: var(--cd-surface2); }
  .cd-filter-active { background: var(--cd-surface3) !important; color: var(--cd-text) !important; border-color: var(--cd-border2) !important; }
  .cd-filter-count {
    font-size: 10px; font-weight: 600; border-radius: var(--cd-r-pill); padding: 1px 7px;
    background: rgba(255,255,255,0.07); color: var(--cd-text-mid);
  }
  .cd-filter-active .cd-filter-count { background: rgba(255,255,255,0.14); color: var(--cd-text); }
  .cd-refresh {
    margin-left: auto; background: var(--cd-surface); border: 1px solid var(--cd-border);
    border-radius: var(--cd-r-sm); padding: 8px 11px; cursor: pointer; color: var(--cd-text-dim); display: flex; align-items: center; transition: all 0.2s;
  }
  .cd-refresh:hover { border-color: var(--cd-border2); color: var(--cd-text-mid); }
  .cd-refresh { gap: 7px; font-family: inherit; font-size: 12px; font-weight: 600; }
  .cd-refresh:disabled { cursor: default; }
  .cd-refreshing svg { animation: cd-spin 0.8s linear infinite; }
  @keyframes cd-spin { to { transform: rotate(360deg); } }

  /* Motion: each tab fades up into place, rows arrive in a short cascade, and
     buttons give under the press. All of it stops for reduced motion. */
  .cd-tab-pane { animation: cd-pane-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
  @keyframes cd-pane-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .cd-table tbody tr { animation: cd-pane-in 240ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
  .cd-table tbody tr:nth-child(2) { animation-delay: 25ms; } .cd-table tbody tr:nth-child(3) { animation-delay: 50ms; }
  .cd-table tbody tr:nth-child(4) { animation-delay: 75ms; } .cd-table tbody tr:nth-child(5) { animation-delay: 100ms; }
  .cd-table tbody tr:nth-child(6) { animation-delay: 125ms; } .cd-table tbody tr:nth-child(n+7) { animation-delay: 150ms; }
  .cd-main button, .cd-sidebar button { transition-property: background, color, border-color, box-shadow, opacity, transform; transition-duration: 150ms; }
  .cd-main button:active:not(:disabled), .cd-sidebar button:active:not(:disabled) { transform: scale(0.97); }
  .cd-skel-table { background: var(--cd-surface); border: 1px solid var(--cd-border); border-radius: var(--cd-r); overflow: hidden; }
  .cd-skel-row { display: flex; align-items: center; gap: 24px; padding: 18px 18px; border-bottom: 1px solid var(--cd-border); }
  .cd-skel-row:last-child { border-bottom: none; }
  .cd-skel {
    display: block; height: 10px; border-radius: 5px;
    background: linear-gradient(90deg, var(--cd-surface2) 25%, var(--cd-surface3, #2a2a2d) 50%, var(--cd-surface2) 75%);
    background-size: 200% 100%; animation: cd-shimmer 1.2s ease-in-out infinite;
  }
  @keyframes cd-shimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }
  @media (prefers-reduced-motion: reduce) {
    .cd-tab-pane, .cd-table tbody tr, .cd-skel, .cd-refreshing svg { animation: none; }
    .cd-main button:active:not(:disabled), .cd-sidebar button:active:not(:disabled) { transform: none; }
  }
  .cd-state { text-align: center; padding: 3.5rem; font-size: 13px; color: var(--cd-text-dim); background: var(--cd-surface); border: 1px solid var(--cd-border); border-radius: var(--cd-r); }
  .cd-search-wrap { position: relative; display: flex; align-items: center; margin-bottom: 1rem; }
  .cd-result-count { font-size: 12px; color: var(--cd-text-dim); margin: -0.5rem 0 1rem 2px; }
  .cd-daterange { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; margin-bottom: 1rem; }
  .cd-daterange-label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--cd-text-dim); margin-right: 2px; }
  .cd-daterange-sep { color: var(--cd-text-dim); }
  .cd-date {
    font-family: inherit; font-size: 12px; color: var(--cd-text); background: var(--cd-surface);
    border: 1px solid var(--cd-border); border-radius: var(--cd-r-sm); padding: 6px 10px; outline: none;
    color-scheme: dark; transition: border-color 0.2s;
  }
  .cd-date:focus { border-color: var(--cd-border2); }
  .cd-date-preset {
    font-family: inherit; font-size: 12px; font-weight: 500; background: var(--cd-surface);
    border: 1px solid var(--cd-border); border-radius: var(--cd-r-pill); padding: 6px 13px;
    cursor: pointer; color: var(--cd-text-mid); transition: all 0.2s;
  }
  .cd-date-preset:hover { border-color: var(--cd-border2); color: var(--cd-text); background: var(--cd-surface2); }
  .cd-date-clear { color: var(--cd-accent); }
  .cd-row-more td { text-align: center; color: var(--cd-text-dim); font-size: 12px; padding: 14px; cursor: default; }
  .cd-list-foot { text-align: center; color: var(--cd-text-dim); font-size: 12px; padding: 12px; }
  .cd-search-icon { position: absolute; left: 13px; color: var(--cd-text-dim); pointer-events: none; }
  .cd-search {
    font-family: inherit; font-size: 13px; color: var(--cd-text); background: var(--cd-surface);
    border: 1px solid var(--cd-border); border-radius: var(--cd-r-sm); padding: 10px 36px 10px 38px;
    width: 100%; min-width: 0; outline: none; transition: border-color 0.2s, box-shadow 0.2s;
  }
  .cd-search::placeholder { color: var(--cd-text-dim); }
  .cd-search:focus { border-color: var(--cd-border2); box-shadow: 0 0 0 3px rgba(91,156,246,0.1); }
  .cd-search-clear {
    position: absolute; right: 10px; background: rgba(255,255,255,0.08); border: none;
    border-radius: 50%; width: 20px; height: 20px; font-size: 10px; color: var(--cd-text-dim);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
  }
  .cd-banner {
    display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
    background: rgba(232,181,74,0.08); border: 1px solid rgba(232,181,74,0.3);
    border-radius: var(--cd-r); padding: 12px 16px; margin-bottom: 18px; font-size: 12.5px; color: var(--cd-text);
  }
  .cd-banner--danger { background: rgba(240,78,94,0.08); border-color: rgba(240,78,94,0.3); }
  .cd-banner--info { background: rgba(91,156,246,0.08); border-color: rgba(91,156,246,0.3); }
  .cd-banner-actions { display: flex; align-items: center; gap: 8px; }
  .cd-banner-btn {
    font: inherit; font-size: 11.5px; padding: 6px 12px; cursor: pointer; white-space: nowrap;
    background: transparent; color: var(--cd-text); border: 1px solid var(--cd-border2); border-radius: var(--cd-r);
  }
  .cd-banner-btn:hover:not(:disabled) { border-color: var(--cd-text-dim); }
  .cd-banner-x {
    font: inherit; font-size: 16px; line-height: 1; padding: 2px 6px; cursor: pointer;
    background: none; border: 0; color: var(--cd-text-dim);
  }
  .cd-testmode {
    font: inherit; font-size: 11.5px; padding: 7px 12px; cursor: pointer; margin-left: auto;
    background: transparent; color: var(--cd-text-dim);
    border: 1px dashed var(--cd-border2); border-radius: var(--cd-r);
  }
  .cd-testmode:hover { color: var(--cd-text); }
  .cd-testmode-on {
    color: var(--cd-amber, #e8b54a); border-color: rgba(232,181,74,0.5); border-style: solid;
    background: rgba(232,181,74,0.08);
  }
  .cd-danger {
    margin-top: 18px; display: flex; flex-direction: column; gap: 12px;
    background: rgba(240,78,94,0.05); border: 1px solid rgba(240,78,94,0.25);
    border-radius: var(--cd-r); padding: 18px;
  }
  .cd-danger-btn {
    font: inherit; font-size: 12px; padding: 8px 14px; cursor: pointer; white-space: nowrap;
    background: rgba(240,78,94,0.12); color: #f04e5e;
    border: 1px solid rgba(240,78,94,0.4); border-radius: var(--cd-r);
  }
  .cd-danger-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .cd-embed { margin-top: 18px; display: flex; flex-direction: column; gap: 12px;
    background: var(--cd-surface); border: 1px solid var(--cd-border); border-radius: var(--cd-r); padding: 18px; }
  .cd-embed-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .cd-embed-url { flex: 1; min-width: 200px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px; padding: 8px 10px; border: 1px solid var(--cd-border); border-radius: var(--cd-r);
    background: var(--cd-surface2); color: var(--cd-text); overflow-x: auto; white-space: nowrap; }
  .cd-embed-btn { font: inherit; font-size: 12px; padding: 8px 12px; cursor: pointer;
    background: var(--cd-surface2); color: var(--cd-text); border: 1px solid var(--cd-border2); border-radius: var(--cd-r); }
  .cd-embed-btn:hover:not(:disabled) { border-color: var(--cd-text-dim); }
  .cd-embed-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px;
    line-height: 1.65; background: var(--cd-surface2); border: 1px solid var(--cd-border);
    border-radius: var(--cd-r); padding: 14px; color: var(--cd-text); overflow-x: auto; white-space: pre; }
  .cd-embed-hint { font-size: 11.5px; color: var(--cd-text-dim); }
  .cd-embed-hint code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

  .cd-table-wrap { background: var(--cd-surface); border: 1px solid var(--cd-border); border-radius: var(--cd-r); overflow: hidden; }
  .cd-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .cd-table thead tr { background: var(--cd-surface2); border-bottom: 1px solid var(--cd-border); }
  .cd-table th { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--cd-text-dim); padding: 12px 18px; text-align: left; white-space: nowrap; }
  .cd-table tbody tr { border-bottom: 1px solid var(--cd-border); transition: background 0.15s; }
  .cd-table tbody tr:last-child { border-bottom: none; }
  .cd-row { cursor: pointer; }
  .cd-row:hover { background: var(--cd-surface2); }
  /* Traffic-light row coloring — faint tint + colored left edge */
  .cd-row--green { background: rgba(62,207,142,0.06); }
  .cd-row--green:hover { background: rgba(62,207,142,0.12); }
  .cd-row--green td:first-child { box-shadow: inset 3px 0 0 var(--cd-green); }
  /* Pending and clean: no tint at all. The row is work to be done, not news. */
  .cd-row--plain td:first-child { box-shadow: inset 3px 0 0 transparent; }
  /* Pending with a failing check: the rail marks it without washing the row,
     so a queue of twenty rows still has twenty readable rows. */
  .cd-row--red { background: rgba(240,78,94,0.06); }
  .cd-row--red:hover { background: rgba(240,78,94,0.12); }
  .cd-row--red td:first-child { box-shadow: inset 3px 0 0 var(--cd-accent); }
  .cd-table td { padding: 14px 18px; vertical-align: middle; }
  .cd-cell-mono { font-size: 12px; color: var(--cd-text-dim); }
  .cd-company { font-weight: 600; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cd-dim { font-size: 11px; color: var(--cd-text-dim); margin-top: 3px; }
  .cd-badge { display: inline-flex; align-items: center; font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; padding: 3px 10px; border-radius: var(--cd-r-pill); border: 1px solid; }
  .cd-pending-badge { margin-left: 8px; }
  .cd-badge-green { color: var(--cd-green); background: rgba(62,207,142,0.1); border-color: rgba(62,207,142,0.25); }
  .cd-badge-red { color: var(--cd-accent); background: rgba(240,78,94,0.1); border-color: rgba(240,78,94,0.25); }
  .cd-badge-amber { color: var(--cd-amber); background: rgba(245,166,35,0.1); border-color: rgba(245,166,35,0.25); }
  .cd-badge-grey { color: var(--cd-text-dim); background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); }
  .cd-badge-blue { color: var(--cd-blue); background: rgba(91,156,246,0.12); border-color: rgba(91,156,246,0.3); }
  .cd-actions { display: flex; gap: 0.4rem; }
  .cd-btn-approve, .cd-btn-deny, .cd-btn-view, .cd-btn-delete, .cd-btn-report {
    font-family: inherit; font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
    border-radius: var(--cd-r-pill); padding: 5px 14px; cursor: pointer; border: 1px solid; transition: all 0.2s; white-space: nowrap;
  }
  .cd-btn-approve { color: var(--cd-green); background: rgba(62,207,142,0.1); border-color: rgba(62,207,142,0.2); }
  .cd-btn-approve:hover { background: rgba(62,207,142,0.2); border-color: rgba(62,207,142,0.4); }
  .cd-btn-deny { color: var(--cd-accent); background: rgba(240,78,94,0.1); border-color: rgba(240,78,94,0.2); }
  .cd-btn-deny:hover:not(:disabled) { background: rgba(240,78,94,0.2); border-color: rgba(240,78,94,0.4); }
  .cd-btn-deny:disabled { opacity: 0.35; cursor: not-allowed; }
  .cd-btn-view { color: var(--cd-text-mid); background: transparent; border-color: var(--cd-border2); }
  .cd-btn-view:hover { color: var(--cd-text); background: var(--cd-surface2); }
  .cd-btn-delete { color: var(--cd-text-dim); background: transparent; border-color: var(--cd-border); margin-left: auto; }
  .cd-btn-delete:hover:not(:disabled) { color: var(--cd-accent); border-color: rgba(240,78,94,0.3); background: rgba(240,78,94,0.07); }
  .cd-btn-delete:disabled { opacity: 0.35; cursor: not-allowed; }
  .cd-btn-report { color: var(--cd-amber); background: rgba(245,166,35,0.08); border-color: rgba(245,166,35,0.22); }
  .cd-btn-report:hover { background: rgba(245,166,35,0.16); border-color: rgba(245,166,35,0.4); }
  .cd-btn-lg { padding: 10px 24px; font-size: 12px; }

  /* MODAL */
  .cd-modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 40; /* Z.MODAL */ display: flex; align-items: center; justify-content: center; padding: 1.5rem; backdrop-filter: blur(6px); animation: fadeIn 0.15s ease; }
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  .cd-modal { font-family: 'Inter', system-ui, sans-serif; font-size: 13px; color: #f0f2f8; background: linear-gradient(160deg, #1a1a1c, #141415); border: 1px solid var(--cd-border2); border-radius: 16px; width: 100%; max-width: 620px; max-height: 88vh; overflow-y: auto; box-shadow: 0 24px 64px rgba(0,0,0,0.6); animation: slideUp 0.2s ease; }
  .cd-modal--sm { max-width: 420px; }
  @keyframes slideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
  .cd-modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 1.5rem 1.75rem 1.25rem; border-bottom: 1px solid var(--cd-border); }
  .cd-modal-company { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; color: #f0f2f8; }
  .cd-modal-sub { font-size: 12px; color: #9a9a9f; margin-top: 4px; }
  .cd-modal-close { background: rgba(255,255,255,0.06); border: none; width: 28px; height: 28px; border-radius: 50%; font-size: 13px; color: #9a9a9f; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-left: 1rem; transition: all 0.2s; }
  .cd-modal-close:hover { background: rgba(255,255,255,0.12); color: #f0f2f8; }
  .cd-modal-body { padding: 1.5rem 1.75rem; }
  .cd-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem 2rem; margin-bottom: 1.5rem; }
  .cd-detail-full { margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.875rem; }
  .cd-detail { display: flex; flex-direction: column; gap: 5px; }
  .cd-detail-label { font-size: 9px; font-weight: 600; letter-spacing: 0.13em; text-transform: uppercase; color: #77777c; }
  .cd-detail-value { font-size: 13px; color: #d0d5e8; white-space: pre-wrap; word-break: break-word; line-height: 1.65; }
  .cd-modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; align-items: center; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--cd-border); flex-wrap: wrap; }

  /* Sleek scrollbars — thin, rounded, theme-matched (replaces the chunky OS bar) */
  .cd-main, .cd-modal, .cd-sidebar, .cd-table-wrap { scrollbar-width: thin; scrollbar-color: var(--cd-border2) transparent; }
  .cd-main::-webkit-scrollbar, .cd-modal::-webkit-scrollbar, .cd-sidebar::-webkit-scrollbar, .cd-table-wrap::-webkit-scrollbar { width: 9px; height: 9px; }
  .cd-main::-webkit-scrollbar-track, .cd-modal::-webkit-scrollbar-track, .cd-sidebar::-webkit-scrollbar-track, .cd-table-wrap::-webkit-scrollbar-track { background: transparent; }
  .cd-main::-webkit-scrollbar-thumb, .cd-modal::-webkit-scrollbar-thumb, .cd-sidebar::-webkit-scrollbar-thumb, .cd-table-wrap::-webkit-scrollbar-thumb {
    background: var(--cd-border2); border-radius: 999px; border: 2px solid transparent; background-clip: padding-box; transition: background 0.2s;
  }
  .cd-main::-webkit-scrollbar-thumb:hover, .cd-modal::-webkit-scrollbar-thumb:hover, .cd-sidebar::-webkit-scrollbar-thumb:hover, .cd-table-wrap::-webkit-scrollbar-thumb:hover {
    background: var(--cd-text-dim); background-clip: padding-box;
  }
  .cd-main::-webkit-scrollbar-corner, .cd-modal::-webkit-scrollbar-corner { background: transparent; }
  .cd-id-block { background: #0d0d0e; border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 1rem 1.25rem 1.25rem; margin-bottom: 1.5rem; transition: background 0.2s, border-color 0.2s; }
  .cd-id-block--suspicious { background: rgba(240,78,94,0.07); border-color: rgba(240,78,94,0.35); }
  .cd-id-block--suspicious .cd-id-title { color: rgba(240,78,94,0.75); }
  .cd-id-block--ok { background: rgba(62,207,142,0.06); border-color: rgba(62,207,142,0.3); }
  .cd-id-block--ok .cd-id-title { color: rgba(62,207,142,0.8); }
  .cd-id-block--checking { background: rgba(91,156,246,0.07); border-color: rgba(91,156,246,0.35); }
  .cd-id-block--checking .cd-id-title { color: rgba(91,156,246,0.85); }
  .cd-id-title { font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #8a8a8f; margin-bottom: 0.875rem; }
  .cd-id-alert { margin-top: 0.875rem; background: rgba(240,78,94,0.1); border: 1px solid rgba(240,78,94,0.25); border-radius: var(--cd-r-sm); padding: 0.6rem 0.875rem; font-size: 11.5px; color: #f04e5e; font-weight: 500; }
  .cd-override { margin-top: 0.875rem; }
  .cd-override-btn { font-family: inherit; font-size: 12px; font-weight: 500; cursor: pointer; background: transparent; color: var(--cd-amber); border: 1px dashed rgba(245,166,35,0.5); border-radius: var(--cd-r-sm); padding: 7px 13px; transition: all 0.2s; }
  .cd-override-btn:hover { background: rgba(245,166,35,0.1); border-color: var(--cd-amber); }
  .cd-override-actions { display: flex; gap: 0.5rem; margin-top: 0.6rem; }
  .cd-override--done { display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: rgba(245,166,35,0.08); border: 1px solid rgba(245,166,35,0.3); border-radius: var(--cd-r-sm); padding: 0.6rem 0.875rem; font-size: 11.5px; color: var(--cd-amber); font-weight: 500; }
  .cd-override-undo { background: none; border: none; color: var(--cd-text-dim); font-size: 11px; cursor: pointer; text-decoration: underline; flex-shrink: 0; }
  .cd-override-undo:hover { color: var(--cd-text); }
  .cd-gate-hint { font-size: 12px; color: var(--cd-amber); margin: 0.75rem 0 0; text-align: right; }
  .cd-deny-heading { font-size: 15px; font-weight: 600; color: #f0f2f8; margin-bottom: 0.4rem; }
  .cd-deny-sub { font-size: 12px; color: #9a9a9f; margin-bottom: 1.25rem; }
  .cd-deny-textarea { font-family: inherit; font-size: 13px; color: #f0f2f8; background: var(--cd-surface2); border: 1px solid var(--cd-border2); border-radius: var(--cd-r-sm); padding: 12px 14px; width: 100%; resize: vertical; min-height: 110px; outline: none; transition: border-color 0.2s, box-shadow 0.2s; line-height: 1.6; }
  .cd-deny-textarea:focus { border-color: var(--cd-blue); box-shadow: 0 0 0 3px rgba(91,156,246,0.15); }

  /* MEMBERS */
  /* Not overflow: hidden — the role menu has to open past the card's edge. */
  .cd-members { background: var(--cd-surface); border: 1px solid var(--cd-border); border-radius: var(--cd-r); }
  .cd-members-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--cd-border); }
  .cd-members-title { font-size: 14px; font-weight: 600; color: var(--cd-text); }
  .cd-invite-btn { font-family: inherit; font-size: 12px; font-weight: 600; color: var(--cd-green); background: rgba(62,207,142,0.1); border: 1px solid rgba(62,207,142,0.25); border-radius: var(--cd-r-pill); padding: 7px 16px; cursor: pointer; transition: all 0.2s; }
  .cd-invite-btn:hover { background: rgba(62,207,142,0.2); border-color: rgba(62,207,142,0.4); }
  .cd-members-list { display: flex; flex-direction: column; }
  .cd-formcfg { width: 100%; }
  .cd-account { display: flex; flex-direction: column; gap: 16px; }
  .cd-account > * { margin-top: 0; margin-bottom: 0; }
  .cd-formcfg-link { color: var(--cd-blue); text-decoration: none; }
  .cd-formcfg-link:hover { text-decoration: underline; }
  .cd-formcfg-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
  .cd-formcfg-sub { font-size: 12px; color: var(--cd-text-dim); margin-top: 4px; }
  .cd-formcfg-save-wrap { display: flex; align-items: center; gap: 10px; }
  .cd-formcfg-saved { font-size: 12px; font-weight: 600; color: var(--cd-green); }
  .cd-formcfg-locked {
    display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--cd-text-dim);
    background: #0d0d0e; border: 1px solid var(--cd-border); border-radius: 10px;
    padding: 10px 14px; margin-bottom: 1rem;
  }
  .cd-formcfg-list { background: var(--cd-surface); border: 1px solid var(--cd-border); border-radius: 12px; overflow: hidden; }
  .cd-formcfg-row {
    display: flex; align-items: center; justify-content: space-between; gap: 1.25rem;
    padding: 1rem 1.5rem; border-bottom: 1px solid var(--cd-border);
  }
  .cd-formcfg-row:last-child { border-bottom: none; }
  .cd-formcfg-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .cd-formcfg-label { font-size: 13px; font-weight: 600; color: var(--cd-text); }
  .cd-formcfg-desc { font-size: 11.5px; color: var(--cd-text-dim); }
  .cd-formcfg-warning {
    font-size: 11.5px; color: var(--cd-amber); background: rgba(245,166,35,0.08);
    border: 1px solid rgba(245,166,35,0.22); border-radius: 8px;
    padding: 8px 10px; margin-top: 6px; line-height: 1.5;
  }
  .cd-formcfg-seg { display: flex; background: #0d0d0e; border: 1px solid var(--cd-border2); border-radius: 9px; padding: 3px; flex-shrink: 0; }
  .cd-seg-btn {
    font-family: inherit; font-size: 11.5px; font-weight: 500; color: var(--cd-text-dim);
    background: transparent; border: none; border-radius: 6px; padding: 6px 13px;
    cursor: pointer; transition: all 0.15s;
  }
  .cd-seg-btn:hover { color: var(--cd-text); }
  .cd-seg-active { color: #0f0f10 !important; background: #5b9cf6; box-shadow: 0 2px 8px rgba(91,156,246,0.25); }
  .cd-formcfg-error { font-size: 12px; font-weight: 500; color: var(--cd-accent); }
  .cd-setup-notice {
    font-size: 12.5px; color: var(--cd-text-dim); background: var(--cd-surface);
    border: 1px dashed var(--cd-border2); border-radius: 10px;
    padding: 12px 14px; margin-bottom: 1.25rem; line-height: 1.55;
  }
  .cd-formcfg-terms {
    display: flex; flex-direction: column;
    background: var(--cd-surface); border: 1px solid var(--cd-border); border-radius: 12px;
    padding: 1rem 1.5rem 1.25rem; margin-top: 1rem;
  }
  .cd-formcfg-terms-head { display: flex; align-items: center; justify-content: space-between; gap: 1.25rem; }
  .cd-formcfg-terms-field { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; }
  .cd-formcfg-terms-label { font-size: 11.5px; font-weight: 500; color: var(--cd-text-mid); }
  .cd-formcfg-terms-textarea, .cd-formcfg-terms-input {
    font-family: inherit; font-size: 13px; color: #f0f2f8; background: var(--cd-surface2);
    border: 1px solid var(--cd-border2); border-radius: var(--cd-r-sm); padding: 10px 14px;
    width: 100%; outline: none; transition: border-color 0.2s, box-shadow 0.2s; line-height: 1.6;
  }
  .cd-formcfg-terms-textarea { resize: vertical; min-height: 110px; }
  .cd-formcfg-terms-textarea:focus, .cd-formcfg-terms-input:focus { border-color: var(--cd-blue); box-shadow: 0 0 0 3px rgba(91,156,246,0.15); }
  .cd-formcfg-terms-textarea::placeholder, .cd-formcfg-terms-input::placeholder { color: var(--cd-text-dim); }
  @media (max-width: 768px) {
    .cd-sidebar { width: 60px; min-width: 60px; }
    .cd-sb-top { padding: 1rem 0.5rem 0; align-items: center; }
    .cd-sb-brand { padding: 0 0 1rem; display: flex; justify-content: center; }
    .cd-nav-wordmark { font-size: 12px; margin-bottom: 0; }
    .cd-nav-wordmark .wordmark-text { display: none; }
    .cd-sb-meta { display: none; }
    .cd-sb-label { display: none; }
    .cd-sb-nav { width: 100%; align-items: center; }
    .cd-sb-item { justify-content: center; padding: 10px; width: auto; }
    .cd-sb-bottom { padding: 0.5rem; align-items: center; }
    .cd-sb-theme, .cd-sb-signout { justify-content: center; padding: 10px; width: auto; }
    .cd-main { padding: 1rem; }
    .cd-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .cd-table { min-width: 560px; }
    .cd-filter-btn { padding: 9px 14px; }
    .cd-actions { flex-direction: column; gap: 0.4rem; }
    .cd-btn-approve, .cd-btn-deny, .cd-btn-view, .cd-btn-delete { padding: 9px 16px; }
    .cd-refresh { height: 38px; padding: 0 11px; }
    .cd-refresh span { display: none; }
    .cd-formcfg-row { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
    .cd-formcfg-header { flex-direction: column; }
    .cd-formcfg-terms-head { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
  }
  .cd-member-row { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid var(--cd-border); gap: 1rem; }
  .cd-member-row:last-child { border-bottom: none; }
  .cd-member-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .cd-member-name { font-weight: 500; color: var(--cd-text); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cd-member-email { font-size: 11px; color: var(--cd-text-dim); }
  .cd-member-actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
  .cd-remove-btn { font-family: inherit; font-size: 11px; font-weight: 500; color: var(--cd-text-dim); background: transparent; border: 1px solid var(--cd-border); border-radius: var(--cd-r-pill); padding: 5px 12px; cursor: pointer; transition: all 0.2s; }
  .cd-remove-btn:hover { color: var(--cd-accent); border-color: rgba(240,78,94,0.3); background: rgba(240,78,94,0.07); }
  .cd-invite-field { display: flex; flex-direction: column; gap: 6px; }
  .cd-invite-success { font-size: 13px; color: var(--cd-green); margin-bottom: 0.75rem; }
  .cd-invite-link { font-size: 11px; color: var(--cd-text-mid); background: var(--cd-surface2); border: 1px solid var(--cd-border2); border-radius: var(--cd-r-sm); padding: 10px 12px; word-break: break-all; }

  /* ── LIGHT THEME ─────────────────────────────────── */
  /* Light theme. Every text colour clears 4.5:1 on white, borders are strong
     enough to see the cards, and the status colours are the deeper shades
     that stay readable on a pale ground (the dark theme's bright green and
     amber all but vanish on white). */
  .cd-light {
    --cd-bg:       #eceff4;
    --cd-surface:  #ffffff;
    --cd-surface2: #f1f3f7;
    --cd-surface3: #e3e7ee;
    --cd-border:   rgba(15,23,42,0.12);
    --cd-border2:  rgba(15,23,42,0.2);
    --cd-text:     #0f172a;
    --cd-text-mid: #374151;
    --cd-text-dim: #5b6474;
    --cd-accent:   #c8283a;
    --cd-green:    #12804f;
    --cd-amber:    #a15c07;
    --cd-blue:     #1f5fd1;
  }
  .cd-light .cd-row--green { background: rgba(62,207,142,0.09); }
  .cd-light .cd-row--green:hover { background: rgba(62,207,142,0.15); }
  .cd-light .cd-row--red { background: rgba(240,78,94,0.08); }
  .cd-light .cd-row--red:hover { background: rgba(240,78,94,0.14); }
  .cd-light .cd-sidebar { background: #ffffff; border-right-color: rgba(0,0,0,0.08); }
  .cd-light .cd-sb-item { color: #6b7280; }
  .cd-light .cd-sb-item:hover:not(:disabled) { color: #111827; background: var(--cd-surface2); }
  .cd-light .cd-setup-notice { background: #fff; }
  .cd-light .cd-sb-active { color: #111827 !important; background: var(--cd-surface3) !important; }
  .cd-light .cd-sb-theme, .cd-light .cd-sb-signout { color: #6b7280; }
  .cd-light .cd-sb-theme:hover { color: #111827; background: rgba(0,0,0,0.05); }
  .cd-light .cd-sb-signout:hover { color: #c2322f; background: rgba(240,78,94,0.1); }
  .cd-light .cd-filter-count { background: rgba(0,0,0,0.06); }
  .cd-light .cd-filter-active .cd-filter-count { background: rgba(0,0,0,0.12); }
  .cd-light .cd-search { background: #fff; }
  .cd-light .cd-date, .cd-light .cd-date-preset { background: #fff; }
  .cd-light .cd-date { color-scheme: light; }
  .cd-light .cd-search-clear { background: rgba(0,0,0,0.07); color: #6b7280; }
  .cd-light .cd-badge-grey { background: rgba(0,0,0,0.04); border-color: rgba(0,0,0,0.1); }
  .cd-light .cd-modal { color: #111827; background: #ffffff; box-shadow: 0 24px 64px rgba(0,0,0,0.16); }
  .cd-light .cd-modal-company { color: #111827; }
  .cd-light .cd-modal-sub { color: #6b7280; }
  .cd-light .cd-modal-close { background: rgba(0,0,0,0.05); color: #6b7280; }
  .cd-light .cd-modal-close:hover { background: rgba(0,0,0,0.1); color: #111827; }
  .cd-light .cd-detail-label { color: #9ca3af; }
  .cd-light .cd-detail-value { color: #1f2937; }
  .cd-light .cd-id-block { background: #f4f6fb; border-color: rgba(0,0,0,0.08); }
  .cd-light .cd-id-title { color: #6b7280; }
  .cd-light .cd-deny-heading { color: #111827; }
  .cd-light .cd-deny-sub { color: #6b7280; }
  .cd-light .cd-deny-textarea { color: #111827; background: #fff; }
  .cd-light .cd-formcfg-locked { background: #eef1f7; }
  .cd-light .cd-formcfg-seg { background: #f0f2f8; }
  .cd-light .cd-seg-btn { color: #6b7280; }
  .cd-light .cd-seg-btn:hover { color: #111827; }
  .cd-light .cd-formcfg-terms-textarea, .cd-light .cd-formcfg-terms-input { color: #111827; background: #fff; }
`;
