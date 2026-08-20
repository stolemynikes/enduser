import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';
import { encryptData, decryptRecord } from './cipher.ts';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const base = new PrismaClient({ adapter });

// Transparent field-level encryption for Submission PII:
// encrypt on write, decrypt on read — resolvers never see ciphertext.
export const prisma = base.$extends({
  query: {
    submission: {
      async create({ args, query }) {
        args.data = encryptData(args.data);
        return decryptRecord(await query(args));
      },
      async update({ args, query }) {
        args.data = encryptData(args.data);
        return decryptRecord(await query(args));
      },
      async upsert({ args, query }) {
        args.create = encryptData(args.create);
        args.update = encryptData(args.update);
        return decryptRecord(await query(args));
      },
      async findUnique({ args, query }) {
        return decryptRecord(await query(args));
      },
      async findFirst({ args, query }) {
        return decryptRecord(await query(args));
      },
      async findMany({ args, query }) {
        const rows = await query(args);
        return Array.isArray(rows) ? rows.map(decryptRecord) : rows;
      },
      async delete({ args, query }) {
        return decryptRecord(await query(args));
      },
    },
  },
});
