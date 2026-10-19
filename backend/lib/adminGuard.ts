// The one check every platform-admin operation goes through.
import { GraphQLError } from 'graphql';

type AdminCtx = { admin?: boolean; adminId?: string; needsEnrolment?: boolean };

/**
 * A platform admin, allowed to act.
 *
 * The enrolment requirement is checked here rather than per resolver, for the
 * same reason as on the company side: a guard added resolver by resolver is a
 * guard with a hole in it. (It had one: the platform queue and the admin's
 * decision mutations in resolvers/submission.ts checked only `ctx.admin`, so
 * an admin without a second factor could still use them.)
 *
 * The MFA and passkey mutations live in resolvers/auth.ts behind a lenient
 * guard, so an admin without a factor can reach the screen that gives them
 * one — and nothing else.
 */
export function requireAdmin(ctx: AdminCtx) {
  if (!ctx.admin || !ctx.adminId) throw new Error('Unauthorized');
  if (ctx.needsEnrolment) {
    throw new GraphQLError(
      'Set up two-factor authentication to continue.',
      { extensions: { code: 'MFA_ENROLMENT_REQUIRED' } },
    );
  }
  return ctx.adminId;
}
