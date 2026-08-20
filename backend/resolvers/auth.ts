import { prisma } from '../lib/prisma.ts';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const authResolvers = {
  Mutation: {
    adminLogin: async (_: unknown, { username, password }: { username: string; password: string }) => {
      const admin = await prisma.admin.findUnique({ where: { username } });
      if (!admin) throw new Error('Invalid credentials');

      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) throw new Error('Invalid credentials');

      // Startup (index.ts) guarantees JWT_SECRET is set — never fall back to a
      // hardcoded secret.
      const token = jwt.sign(
        { adminId: admin.id },
        process.env.JWT_SECRET!,
        { expiresIn: '8h' }
      );

      return { token };
    },
  },
};
