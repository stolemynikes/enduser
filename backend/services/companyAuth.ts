import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const SECRET = process.env.COMPANY_JWT_SECRET!;

/**
 * How long a seller's session lives without being used.
 *
 * It was 30 days, then a day; it is now an hour. That number decides what a
 * token captured by a phishing proxy is worth, and a proxy relaying the sign-in
 * live is exactly what a one-time code does not stop — so it is the single most
 * load-bearing constant in the authentication path.
 *
 * An hour is an *idle* limit, not a working one: the dashboard renews while
 * somebody is using it, including the moment a tab wakes up, so an uninterrupted
 * afternoon never meets a sign-in form. Walk away for longer and the password
 * is needed again, which is the trade being made deliberately.
 */
const SESSION_MINUTES = 60;

/** Support sessions are privileged admin access into a tenant — far shorter. */
const SUPPORT_HOURS = 2;

/**
 * However actively it is used, a session ends this long after the sign-in that
 * started it. Renewal kept a session alive for as long as it was renewed, so a
 * stolen token, or a tab left open on an unattended desk, never expired.
 */
export const MAX_SESSION_HOURS = 12;

/** True when the sign-in behind this session is older than the absolute limit. */
export function sessionTooOld(auth: number | undefined): boolean {
  return auth != null && Date.now() / 1000 - auth > MAX_SESSION_HOURS * 3600;
}

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
  /**
   * When the person last signed in, in seconds. Carried over on renewal like
   * the session id, so renewing extends the idle limit but never this one.
   */
  auth?: number;
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
    auth: payload.auth ?? Math.floor(Date.now() / 1000),
  };
  return jwt.sign(body, SECRET, {
    expiresIn: payload.support ? `${SUPPORT_HOURS}h` : `${SESSION_MINUTES}m`,
  });
}

export function verifyCompanyToken(token: string): CompanyTokenPayload | null {
  try {
    // Pin the algorithm rather than letting the library infer it from the key.
    const payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] }) as CompanyTokenPayload & { aud?: unknown };
    // Session tokens carry no audience; anything that does (a passkey ticket,
    // signed with the same secret) is not a session.
    if (payload.aud !== undefined) return null;
    return payload;
  } catch {
    return null;
  }
}
