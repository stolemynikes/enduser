// Fail-closed approval gate. A submission may only be approved when every
// applicable automated check is green — or has an active manual override on record.
// Mirrored on the frontend (both dashboards) for the disabled-button UX; this is
// the authoritative enforcement.

export type OverrideCategory = 'VIES' | 'IDENTITY' | 'SUBSTANCE';

// Structural shape — satisfied by a Prisma Submission with `overrides` included.
export type GateSubmission = {
  buyerType: 'INDIVIDUAL' | 'COMPANY';
  viesStatus: 'VALID' | 'INVALID' | 'ERROR' | 'NOT_CHECKED';
  viesAddressMatch: 'NOT_CHECKED' | 'UNAVAILABLE' | 'MATCH' | 'PARTIAL' | 'MISMATCH';
  idDataCollectedAt: Date | string | null;
  idMrzValid: boolean | null;
  idLikelySynthetic: boolean | null;
  idDocumentExpiry: Date | string | null;
  idVerificationStatus: IdVerificationStatus;
  idLivenessPassed: boolean | null;
  idFaceMatch: boolean | null;
  substanceCheckStatus: 'NOT_CHECKED' | 'PENDING' | 'OK' | 'FLAGGED' | 'ERROR';
  overrides: { category: OverrideCategory }[];
};

export type IdVerificationStatus =
  | 'NOT_CHECKED' | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'DECLINED' | 'EXPIRED' | 'ERROR';

// A category "fails" only when it applies and is not affirmatively green.
function viesFailing(s: GateSubmission): boolean {
  if (s.buyerType !== 'COMPANY') return false; // no VAT to verify
  const statusOk = s.viesStatus === 'VALID';
  const addressOk =
    s.viesAddressMatch === 'MATCH' ||
    s.viesAddressMatch === 'UNAVAILABLE' ||
    s.viesAddressMatch === 'NOT_CHECKED';
  return !(statusOk && addressOk);
}

// Identity is green only on an affirmative pass, and an expired document fails
// under either pipeline. Rows verified through Didit carry a verification
// status; rows captured by the old in-house OCR carry the MRZ booleans instead.
function identityFailing(s: GateSubmission, now: Date): boolean {
  if (!s.idDataCollectedAt) return false; // ID not collected for this form
  if (s.idDocumentExpiry && new Date(s.idDocumentExpiry).getTime() < now.getTime()) return true;
  // Still with Didit's reviewers: not failed, not passed. Handled as pending
  // below, so it cannot be overridden into an approval before the answer.
  if (identityInProgress(s)) return false;

  if (s.idVerificationStatus !== 'NOT_CHECKED') {
    if (s.idVerificationStatus !== 'APPROVED') return true;
    // Didit can approve the document while a sub-check came back negative;
    // surface that rather than inheriting the headline verdict.
    if (s.idLivenessPassed === false) return true;
    if (s.idFaceMatch === false) return true;
    return false;
  }

  // Legacy rows.
  if (s.idMrzValid !== true) return true;
  if (s.idLikelySynthetic === true) return true;
  return false;
}

// Didit hands some checks to a human reviewer and answers later through the
// webhook. Until it does, the identity has not been established either way.
function identityInProgress(s: GateSubmission): boolean {
  return !!s.idDataCollectedAt
    && (s.idVerificationStatus === 'IN_REVIEW' || s.idVerificationStatus === 'PENDING');
}

// Substance: OK / NOT_CHECKED are green; FLAGGED / ERROR are overridable;
// PENDING blocks approval but cannot be overridden (must finish or re-run).
function substanceFailing(s: GateSubmission): boolean {
  return s.substanceCheckStatus === 'FLAGGED' || s.substanceCheckStatus === 'ERROR';
}

// Categories that are currently not-green (regardless of overrides).
export function failingCategories(s: GateSubmission, now: Date = new Date()): OverrideCategory[] {
  const out: OverrideCategory[] = [];
  if (viesFailing(s)) out.push('VIES');
  if (identityFailing(s, now)) out.push('IDENTITY');
  if (substanceFailing(s)) out.push('SUBSTANCE');
  return out;
}

export type GateResult = {
  blocking: OverrideCategory[]; // failing AND not overridden
  /**
   * A check that has not finished — the substance check still running, or the
   * identity still with Didit's reviewers. Blocks approval and cannot be
   * overridden: an override is a decision about a result, and there is none yet.
   */
  pending: 'SUBSTANCE' | 'IDENTITY' | null;
  approvable: boolean;
};

export function evaluateGate(s: GateSubmission, now: Date = new Date()): GateResult {
  const overridden = new Set(s.overrides.map(o => o.category));
  const blocking = failingCategories(s, now).filter(c => !overridden.has(c));
  const pending = s.substanceCheckStatus === 'PENDING' ? 'SUBSTANCE'
    : identityInProgress(s) ? 'IDENTITY'
    : null;
  return { blocking, pending, approvable: blocking.length === 0 && !pending };
}
