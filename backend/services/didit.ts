// Didit identity verification client.
//
// Replaces the in-house OCR/MRZ pipeline. The document image never reaches this
// server: the buyer is sent to Didit's hosted flow, Didit performs capture,
// liveness and face match, and we only ever pull back the decision as JSON.
//
// Everything here is server-to-server. The API key must never be exposed to the
// browser, and the decision is always fetched by us — a status reported by the
// client (redirect query string, webhook body) is a hint, never a fact.
import 'dotenv/config';
import { noteService } from '../lib/ops.ts';

const BASE_URL = (process.env.DIDIT_BASE_URL ?? 'https://verification.didit.me').replace(/\/+$/, '');
const API_KEY = process.env.DIDIT_API_KEY;
const WORKFLOW_ID = process.env.DIDIT_WORKFLOW_ID;

export const DIDIT_ENABLED = !!(API_KEY && WORKFLOW_ID);

const TIMEOUT_MS = 20_000;

// Only passports and identity cards are accepted (standing policy: no driver's
// licences). Sent to Didit so its UI refuses anything else, and re-checked
// against the returned document_type below — the console setting is a
// convenience, the server-side check is the control.
const ALLOWED_DOCUMENT_CODES = ['P', 'ID'] as const;

export type DiditVerificationStatus =
  | 'PENDING' | 'APPROVED' | 'DECLINED' | 'IN_REVIEW' | 'EXPIRED' | 'ERROR';

export type DiditDecision = {
  status: DiditVerificationStatus;
  /** Raw Didit status string, for the dashboard note. */
  rawStatus: string;
  documentType: 'PASSPORT' | 'ID_CARD' | null;
  /** Present but unmapped document type (e.g. a driver's licence) — rejected upstream. */
  rawDocumentType: string | null;
  fullName: string | null;
  documentNumber: string | null;
  expiryDate: string | null;
  /** ISO date of birth, when the document carried one. */
  dateOfBirth: string | null;
  /** Age in whole years at the moment the decision was read; null when unknown. */
  age: number | null;
  livenessPassed: boolean | null;
  faceMatch: boolean | null;
  /** Human-readable warning summary for the reviewer; null when clean. */
  warnings: string | null;
};

function requireConfig() {
  if (!DIDIT_ENABLED) {
    throw new Error('Identity verification is not configured.');
  }
}

async function call(path: string, init: RequestInit = {}): Promise<any> {
  requireConfig();
  let res: Response;
  let text: string;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'x-api-key': API_KEY as string,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    text = await res.text();
  } catch (err) {
    noteService('didit', false);
    throw err;
  }
  // A 4xx is Didit answering (an unknown session, a rejected request); only a
  // 5xx or no answer at all says the service itself is in trouble.
  noteService('didit', res.status < 500);
  if (!res.ok) {
    // Body may carry provider detail we do not want to surface to the buyer.
    console.error(`[didit] ${init.method ?? 'GET'} ${path} → ${res.status}: ${text.slice(0, 500)}`);
    throw Object.assign(new Error(`Didit request failed (${res.status})`), { status: res.status });
  }
  return text ? JSON.parse(text) : {};
}

/**
 * Create a hosted verification session. `vendorData` is our own opaque
 * reference — never the buyer's email or name, since it is echoed back in
 * webhooks and stored on Didit's side.
 */
export async function createVerificationSession(
  { vendorData, callbackUrl }: { vendorData: string; callbackUrl?: string }
): Promise<{ sessionId: string; url: string }> {
  const body: Record<string, unknown> = {
    workflow_id: WORKFLOW_ID,
    vendor_data: vendorData,
    expected_details: { expected_document_types: [...ALLOWED_DOCUMENT_CODES] },
  };
  if (callbackUrl) body.callback = callbackUrl;

  const json = await call('/v3/session/', { method: 'POST', body: JSON.stringify(body) });
  const sessionId = String(json.session_id ?? '');
  const url = String(json.url ?? '');
  if (!sessionId || !url) throw new Error('Didit returned an incomplete session.');
  return { sessionId, url };
}

/** Fetch the authoritative decision. This is the only source of truth. */
export async function retrieveDecision(sessionId: string): Promise<DiditDecision> {
  const json = await call(`/v3/session/${encodeURIComponent(sessionId)}/decision/`);
  return mapDecision(json);
}

/**
 * Process-and-purge: once the decision fields are stored on our side, the
 * session (including the document images Didit holds) is deleted. Never throws —
 * a failed purge must not fail the buyer's submission, but it is logged so it
 * can be reconciled.
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  const id = encodeURIComponent(sessionId);
  try {
    await call(`/v3/session/${id}/delete/`, { method: 'DELETE' });
    return true;
  } catch (err: any) {
    // A 404 usually means it is already gone — deleted earlier, or never
    // created. Not taken on trust: a wrong path also answers 404 (the delete
    // route was once wrong and every purge "failed" that way). Only when the
    // session's own decision is gone as well does it count as deleted.
    if (err?.status === 404) {
      try {
        await call(`/v3/session/${id}/decision/`);
      } catch (check: any) {
        if (check?.status === 404) return true;
      }
    }
    console.error(`[didit] purge failed for session ${sessionId}: ${err?.message ?? 'unknown error'}`);
    return false;
  }
}

const STATUS_MAP: Record<string, DiditVerificationStatus> = {
  'not started': 'PENDING',
  'in progress': 'PENDING',
  'awaiting user': 'PENDING',
  'resubmitted': 'PENDING',
  'in review': 'IN_REVIEW',
  'approved': 'APPROVED',
  'declined': 'DECLINED',
  'expired': 'EXPIRED',
  'kyc expired': 'EXPIRED',
  'abandoned': 'EXPIRED',
};

function normalizeStatus(raw: unknown): DiditVerificationStatus {
  return STATUS_MAP[String(raw ?? '').trim().toLowerCase()] ?? 'ERROR';
}

// Didit reports the document type either as a workflow code (P / ID) or as a
// display name, depending on the workflow. Accept both; anything else stays
// unmapped so the caller rejects it.
function mapDocumentType(raw: unknown): 'PASSPORT' | 'ID_CARD' | null {
  const v = String(raw ?? '').trim().toUpperCase().replace(/[\s_-]+/g, ' ');
  if (v === 'P' || v === 'PASSPORT') return 'PASSPORT';
  if (v === 'ID' || v === 'ID CARD' || v === 'IDENTITY CARD' || v === 'NATIONAL ID') return 'ID_CARD';
  return null;
}

function firstOf(value: unknown): any {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

// Didit dates come back as YYYY-MM-DD (and occasionally DD-MM-YYYY on some
// document types). Only accept an unambiguous ISO date; anything else is
// dropped rather than guessed, since a wrong expiry silently passes the gate.
function isoDate(raw: unknown): string | null {
  const v = String(raw ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return Number.isNaN(Date.parse(v)) ? null : v;
}

/** Whole years between an ISO date and now. */
export function ageFrom(isoBirthDate: string | null, now: Date = new Date()): number | null {
  if (!isoBirthDate) return null;
  const born = new Date(isoBirthDate);
  if (Number.isNaN(born.getTime())) return null;
  let years = now.getFullYear() - born.getFullYear();
  const beforeBirthday =
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) years--;
  return years >= 0 && years < 130 ? years : null;
}

function str(raw: unknown): string | null {
  const v = String(raw ?? '').trim();
  return v && v !== 'null' && v !== 'undefined' ? v : null;
}

function mapDecision(json: any): DiditDecision {
  const rawStatus = String(json?.status ?? '');
  const status = normalizeStatus(rawStatus);

  const id = firstOf(json?.id_verifications) ?? json?.id_verification ?? {};
  const liveness = firstOf(json?.liveness_checks) ?? json?.liveness ?? null;
  const face = firstOf(json?.face_matches) ?? json?.face_match ?? null;

  const dateOfBirth = isoDate(id.date_of_birth);
  const fullName = str(id.full_name)
    ?? str([str(id.first_name), str(id.last_name)].filter(Boolean).join(' '));

  const warnings: string[] = [];
  for (const source of [json, id, liveness, face]) {
    for (const w of (source?.warnings ?? []) as any[]) {
      const text = str(w?.long_description) ?? str(w?.short_description) ?? str(w?.risk) ?? str(w);
      if (text) warnings.push(text);
    }
  }

  const subStatus = (v: any) => {
    const s = str(v?.status)?.toLowerCase();
    return s == null ? null : s === 'approved' || s === 'passed' || s === 'match';
  };

  return {
    status,
    rawStatus,
    documentType: mapDocumentType(id.document_type),
    rawDocumentType: str(id.document_type),
    fullName,
    documentNumber: str(id.document_number),
    expiryDate: isoDate(id.expiration_date),
    dateOfBirth,
    // Prefer our own arithmetic over a provider-supplied age: a number computed
    // when the session was created would be stale, and the age is about to
    // decide whether a sale is lawful.
    age: ageFrom(dateOfBirth) ?? (Number.isInteger(id.age) ? Number(id.age) : null),
    livenessPassed: liveness ? subStatus(liveness) : null,
    faceMatch: face ? subStatus(face) : null,
    warnings: warnings.length ? [...new Set(warnings)].join('; ').slice(0, 1000) : null,
  };
}
