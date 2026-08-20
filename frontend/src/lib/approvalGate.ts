// Client mirror of the backend approval gate (backend/lib/approvalGate.ts).
// Drives the disabled Approve button + per-check Override UI. The backend is the
// authoritative enforcer; this only shapes the UX.

export type OverrideCategory = 'VIES' | 'IDENTITY' | 'SUBSTANCE';

// Structural shape — both dashboards' Submission types satisfy it.
export type GateSubmission = {
  buyerType: 'INDIVIDUAL' | 'COMPANY';
  viesStatus: 'VALID' | 'INVALID' | 'ERROR' | 'NOT_CHECKED';
  viesAddressMatch: 'NOT_CHECKED' | 'UNAVAILABLE' | 'MATCH' | 'PARTIAL' | 'MISMATCH';
  idDataCollectedAt?: string | null;
  idDocumentNumber?: string | null;
  idMrzValid?: boolean | null;
  idLikelySynthetic?: boolean | null;
  idDocumentExpiry?: string | null;
  idVerificationStatus?: IdVerificationStatus | null;
  idLivenessPassed?: boolean | null;
  idFaceMatch?: boolean | null;
  substanceCheckStatus: 'NOT_CHECKED' | 'PENDING' | 'OK' | 'FLAGGED' | 'ERROR';
  overrides: { category: OverrideCategory }[];
};

export type IdVerificationStatus =
  | 'NOT_CHECKED' | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'DECLINED' | 'EXPIRED' | 'ERROR';

export const CATEGORY_LABEL: Record<OverrideCategory, string> = {
  VIES: 'VAT / VIES',
  IDENTITY: 'Identity',
  SUBSTANCE: 'Substance',
};

// The dashboards don't all fetch idDataCollectedAt; fall back to "an ID number is
// present" as the signal that identity verification applies to this submission.
function idCollected(s: GateSubmission): boolean {
  return !!s.idDataCollectedAt || !!s.idDocumentNumber;
}

export function isExpired(expiry?: string | null, now: Date = new Date()): boolean {
  return !!expiry && new Date(expiry).getTime() < now.getTime();
}

export function viesFailing(s: GateSubmission): boolean {
  if (s.buyerType !== 'COMPANY') return false;
  const statusOk = s.viesStatus === 'VALID';
  const addressOk =
    s.viesAddressMatch === 'MATCH' ||
    s.viesAddressMatch === 'UNAVAILABLE' ||
    s.viesAddressMatch === 'NOT_CHECKED';
  return !(statusOk && addressOk);
}

export function identityFailing(s: GateSubmission, now: Date = new Date()): boolean {
  if (!idCollected(s)) return false;
  if (isExpired(s.idDocumentExpiry, now)) return true;

  // Rows verified through Didit carry a verification status; older rows from
  // the in-house OCR pipeline carry the MRZ booleans instead.
  const status = s.idVerificationStatus ?? 'NOT_CHECKED';
  if (status !== 'NOT_CHECKED') {
    if (status !== 'APPROVED') return true;
    if (s.idLivenessPassed === false) return true;
    if (s.idFaceMatch === false) return true;
    return false;
  }

  if (s.idMrzValid !== true) return true;
  if (s.idLikelySynthetic === true) return true;
  return false;
}

export function substanceFailing(s: GateSubmission): boolean {
  return s.substanceCheckStatus === 'FLAGGED' || s.substanceCheckStatus === 'ERROR';
}

export function categoryFailing(s: GateSubmission, c: OverrideCategory, now: Date = new Date()): boolean {
  return c === 'VIES' ? viesFailing(s) : c === 'IDENTITY' ? identityFailing(s, now) : substanceFailing(s);
}

export function isOverridden(s: GateSubmission, c: OverrideCategory): boolean {
  return s.overrides.some(o => o.category === c);
}

export function failingCategories(s: GateSubmission, now: Date = new Date()): OverrideCategory[] {
  return (['VIES', 'IDENTITY', 'SUBSTANCE'] as OverrideCategory[]).filter(c => categoryFailing(s, c, now));
}

// Categories that still block approval (failing and not overridden).
export function blockingCategories(s: GateSubmission, now: Date = new Date()): OverrideCategory[] {
  return failingCategories(s, now).filter(c => !isOverridden(s, c));
}

export function isPending(s: GateSubmission): boolean {
  return s.substanceCheckStatus === 'PENDING';
}

export function approvable(s: GateSubmission, now: Date = new Date()): boolean {
  return blockingCategories(s, now).length === 0 && !isPending(s);
}
