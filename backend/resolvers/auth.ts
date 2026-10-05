import { prisma } from '../lib/prisma.ts';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { GraphQLError } from 'graphql';
import { LOCKED_MESSAGE, lockedFor, recordFailure, recordSuccess } from '../lib/loginGuard.ts';
import { verifyHumanOrThrow } from '../services/turnstile.ts';
import {
  MFA_SELECT, checkSecondFactor, confirmEnrolment, disableMfa, issueRecoveryCodes,
  mfaEnabled, recoveryCodesLeft, startEnrolment,
} from '../lib/mfa.ts';

type AdminCtx = { admin?: boolean; adminId?: string };

function requireAdminId(ctx: AdminCtx): string {
  if (!ctx.admin || !ctx.adminId) throw new Error('Unauthorized');
  return ctx.adminId;
}

/**
 * The second factor is asked for with a machine-readable code, because the
 * sign-in form has to tell the difference between "now type your code" and
 * "that code was wrong" — and a human-readable string is not something a UI
 * should have to match on.
 */
export function secondFactorError(reason: 'missing' | 'invalid'): GraphQLError {
  return reason === 'missing'
    ? new GraphQLError('Enter the code from your authenticator app.', {
        extensions: { code: 'MFA_REQUIRED' },
      })
    : new GraphQLError('That code is not valid. Try the next one your app shows.', {
        extensions: { code: 'MFA_INVALID' },
      });
}

// Compared against when the username is unknown, so a missing account costs the
// same time as a wrong password and cannot be told apart by timing.
const DUMMY_HASH = '$2b$12$K8pQZ1sTBFQ9DfP6y0kZsuQ0tHfZ0Uu7uN3sT2mN5nGZ8vKcX2h5S';

export const authResolvers = {
  Mutation: {
    adminLogin: async (
      _: unknown,
      { username, password, turnstileToken, totp }:
        { username: string; password: string; turnstileToken?: string; totp?: string },
    ) => {
      await verifyHumanOrThrow(turnstileToken);

      const admin = typeof username === 'string' && username.length <= 200
        ? await prisma.admin.findUnique({ where: { username } })
        : null;
      const minutes = lockedFor(admin);

      const valid = await bcrypt.compare(password, admin?.password ?? DUMMY_HASH);

      // Tell a wrong guess nothing. Announcing the lock before checking the
      // password confirmed the account exists and that it is under attack —
      // and let a guesser keep the lock alive for free.
      if (!admin || !valid) {
        if (admin && minutes === 0) await recordFailure('admin', admin);
        throw new Error('Invalid credentials');
      }
      if (minutes > 0) throw new Error(LOCKED_MESSAGE(minutes));

      // Only now, with the password already proved, is the second factor
      // checked. Asking earlier would tell a guesser which accounts have one,
      // which is a map of which accounts are worth the effort.
      const second = await checkSecondFactor('admin', admin, totp);
      if (!second.ok) {
        // A wrong code counts against the same budget as a wrong password, so
        // six digits cannot be ground down. A code not yet given does not: the
        // form has simply not been filled in.
        if (second.reason === 'invalid') await recordFailure('admin', admin);
        throw secondFactorError(second.reason);
      }
      if (second.usedRecoveryCode) {
        console.warn(`[mfa] admin ${admin.id} signed in with a recovery code`);
      }
      await recordSuccess('admin', admin.id);

      // Startup (index.ts) guarantees JWT_SECRET is set — never fall back to a
      // hardcoded secret.
      const token = jwt.sign(
        { adminId: admin.id },
        process.env.JWT_SECRET!,
        { expiresIn: '8h', algorithm: 'HS256' }
      );

      return { token };
    },

    /**
     * Step one of enrolment: a secret the app can scan, not yet in force. The
     * factor only switches on when a code proves the app really has it.
     */
    startAdminMfaEnrolment: async (_: unknown, __: unknown, ctx: AdminCtx) => {
      const adminId = requireAdminId(ctx);
      const admin = await prisma.admin.findUnique({
        where: { id: adminId }, select: { username: true, totpEnabledAt: true },
      });
      if (!admin) throw new Error('Unauthorized');
      if (admin.totpEnabledAt) {
        throw new Error('Two-factor authentication is already on. Turn it off first to re-enrol.');
      }
      return startEnrolment('admin', adminId, admin.username);
    },

    /** Step two: switch it on, and hand over the recovery codes exactly once. */
    confirmAdminMfaEnrolment: async (_: unknown, { code }: { code: string }, ctx: AdminCtx) => {
      const adminId = requireAdminId(ctx);
      const result = await confirmEnrolment('admin', adminId, code);
      if (!result.ok) {
        throw result.reason === 'not-started'
          ? new Error('Start the set-up again — no pending secret was found.')
          : secondFactorError('invalid');
      }
      console.log(`[mfa] admin ${adminId} enabled two-factor authentication`);
      return { recoveryCodes: result.recoveryCodes };
    },

    /**
     * Turning it off needs the password and a current code. Either alone would
     * make a stolen session enough to strip the very factor that session was
     * supposed to be protected by.
     */
    disableAdminMfa: async (
      _: unknown, { password, code }: { password: string; code: string }, ctx: AdminCtx,
    ) => {
      const adminId = requireAdminId(ctx);
      const admin = await prisma.admin.findUnique({ where: { id: adminId } });
      if (!admin) throw new Error('Unauthorized');
      if (!mfaEnabled(admin)) return true;
      if (!(await bcrypt.compare(password, admin.password))) throw new Error('That password is not correct.');
      const second = await checkSecondFactor('admin', admin, code);
      if (!second.ok) throw secondFactorError(second.reason);
      await disableMfa('admin', adminId);
      console.warn(`[mfa] admin ${adminId} disabled two-factor authentication`);
      return true;
    },

    /** Replaces the remaining codes with a fresh set, on a current code. */
    regenerateAdminRecoveryCodes: async (_: unknown, { code }: { code: string }, ctx: AdminCtx) => {
      const adminId = requireAdminId(ctx);
      const admin = await prisma.admin.findUnique({ where: { id: adminId } });
      if (!admin || !mfaEnabled(admin)) throw new Error('Two-factor authentication is not on.');
      const second = await checkSecondFactor('admin', admin, code);
      if (!second.ok) throw secondFactorError(second.reason);
      return { recoveryCodes: await issueRecoveryCodes('admin', adminId) };
    },
  },

  Query: {
    /** What the admin account screen needs to render the two-factor section. */
    adminMfaStatus: async (_: unknown, __: unknown, ctx: AdminCtx) => {
      const adminId = requireAdminId(ctx);
      const admin = await prisma.admin.findUnique({
        where: { id: adminId }, select: MFA_SELECT,
      });
      if (!admin) throw new Error('Unauthorized');
      const enabled = mfaEnabled(admin);
      return {
        enabled,
        recoveryCodesLeft: enabled ? await recoveryCodesLeft('admin', adminId) : 0,
      };
    },
  },
};
