// Who is making this request, decided against the database rather than against
// claims alone.
//
// A JWT is a snapshot of what was true when it was signed. Reading the role and
// the membership out of it meant a removed employee kept access, a demoted owner
// kept owner powers, and a password reset left stolen sessions alive — for up to
// the 30-day token lifetime. Every request now costs one indexed lookup and
// answers with what is true now.
import jwt from 'jsonwebtoken';
import { prisma } from './prisma.ts';
import { verifyCompanyToken } from '../services/companyAuth.ts';

export type RequestContext = {
  admin?: boolean;
  adminId?: string;
  companyUserId?: string;
  companyId?: string;
  companyRole?: string;
  support?: boolean;
  /**
   * Which browser this request came from. Minted at sign-in and carried through
   * renewals, so a sensitive read can be attributed to a session rather than
   * only to an account — two people on one login are otherwise indistinguishable
   * in an audit trail.
   */
  sessionId?: string;
};

/**
 * Tokens issued before the account's cut-off are refused.
 *
 * `iat` is only accurate to the second, so a token minted in the same second as
 * the reset would otherwise look older than it is — and the person who just
 * reset their password would be signed out of the session they were given.
 * One second of grace covers that without meaningfully widening the window.
 */
const CLOCK_GRANULARITY_MS = 1000;

function issuedBefore(iat: number | undefined, cutoff: Date | null | undefined): boolean {
  if (!cutoff) return false;
  if (!iat) return true; // no issue time to compare — treat as stale
  return iat * 1000 + CLOCK_GRANULARITY_MS < cutoff.getTime();
}

export async function contextFor(authorization: string | undefined, operation: string): Promise<RequestContext> {
  const header = authorization ?? '';
  if (!header.startsWith('Bearer ')) return {};
  const token = header.slice(7);

  // Platform admin.
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as { adminId: string; iat?: number };
    const admin = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      select: { id: true, sessionsValidFrom: true },
    });
    if (!admin || issuedBefore(payload.iat, admin.sessionsValidFrom)) return {};
    return { admin: true, adminId: admin.id };
  } catch { /* not an admin token */ }

  const claims = verifyCompanyToken(token);
  if (!claims) return {};

  // The membership is the authority on whether this person still belongs to
  // this company, and on what they may do there.
  const membership = await prisma.companyMember.findUnique({
    where: { companyId_userId: { companyId: claims.companyId, userId: claims.companyUserId } },
    select: {
      role: true,
      company: { select: { deletedAt: true } },
      user: { select: { sessionsValidFrom: true } },
    },
  });
  if (!membership) return {};                       // removed from the company
  if (membership.company.deletedAt) return {};      // company purged
  if (issuedBefore(claims.iat, membership.user.sessionsValidFrom)) return {};

  if (claims.support) {
    console.log(`[support] admin ${claims.adminId} → company ${claims.companyId}: ${operation}`);
  }

  return {
    companyUserId: claims.companyUserId,
    companyId: claims.companyId,
    // The database's role, never the token's.
    companyRole: membership.role,
    support: claims.support,
    adminId: claims.adminId,
    sessionId: claims.sid,
  };
}
