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

      const token = jwt.sign(
        { adminId: admin.id },
        process.env.JWT_SECRET ?? 'secret',
        { expiresIn: '8h' }
      );

      return { token };
    },
  },
};
