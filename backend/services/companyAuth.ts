import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const SECRET = process.env.COMPANY_JWT_SECRET!;

/**
 * How long a seller's session lives.
 *
 * It was 30 days, which is how long a token captured by a phishing proxy would
 * have kept working — and a proxy that relays the login live is what defeats a
 * one-time code, so this is the number that decides what that attack is worth.
 * A day, renewed silently while someone is working, means a daily user never
 * notices and a captured token is stale by tomorrow.
 */
const SESSION_HOURS = 24;

/** Support sessions are privileged admin access into a tenant — far shorter. */
const SUPPORT_HOURS = 2;

export type CompanyTokenPayload = {
  /** Issued-at, present on verified tokens; used to refuse pre-reset sessions. */
  iat?: number;
  companyUserId: string;
  companyId: string;
  role: string;
  /**
   * Session id, minted at sign-in. Distinguishes one browser from another on the
   * same account, which is what lets a privilege elevation be bound to the
   * session that earned it rather than to the account.
   */
  sid?: string;
  // Set on tokens issued via adminSupportLogin so support sessions are
  // distinguishable and every operation can be audit-logged.
  support?: boolean;
  adminId?: string;
};

export function signCompanyToken(payload: CompanyTokenPayload): string {
  const body: CompanyTokenPayload = {
    ...payload,
    // A session that arrives without one is being created here; one that is
    // being renewed keeps the id it already had, so an elevation survives a
    // refresh and does not survive a new sign-in.
    sid: payload.sid ?? crypto.randomBytes(16).toString('base64url'),
  };
  return jwt.sign(body, SECRET, {
    expiresIn: payload.support ? `${SUPPORT_HOURS}h` : `${SESSION_HOURS}h`,
  });
}

export function verifyCompanyToken(token: string): CompanyTokenPayload | null {
  try {
    // Pin the algorithm rather than letting the library infer it from the key.
    return jwt.verify(token, SECRET, { algorithms: ['HS256'] }) as CompanyTokenPayload;
  } catch {
    return null;
  }
}
