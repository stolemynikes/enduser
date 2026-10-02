import { prisma } from '../lib/prisma.ts';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { LOCKED_MESSAGE, lockedFor, recordFailure, recordSuccess } from '../lib/loginGuard.ts';
import { verifyHumanOrThrow } from '../services/turnstile.ts';

// Compared against when the username is unknown, so a missing account costs the
// same time as a wrong password and cannot be told apart by timing.
const DUMMY_HASH = '$2b$12$K8pQZ1sTBFQ9DfP6y0kZsuQ0tHfZ0Uu7uN3sT2mN5nGZ8vKcX2h5S';

export const authResolvers = {
  Mutation: {
    adminLogin: async (
      _: unknown,
      { username, password, turnstileToken }: { username: string; password: string; turnstileToken?: string },
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
  },
};
