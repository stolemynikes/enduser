import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';
import { encryptData, decryptRecord, encryptField, decryptField } from './cipher.ts';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const base = new PrismaClient({ adapter });

// A notification's body names the buyer ("From Jan de Vries — waiting for
// review"), so it is encrypted like the submission it points to. Titles are
// fixed phrases and stay readable. Rows written before this are plaintext and
// read back unchanged (decryptField passes plaintext through).
const NOTE_FIELD = 'notification.body';
function encryptNote<T extends { body?: unknown }>(data: T): T {
  return typeof data?.body === 'string' ? { ...data, body: encryptField(data.body, NOTE_FIELD) } : data;
}
function decryptNote<T>(row: T): T {
  const r = row as { body?: unknown } | null;
  return r && typeof r.body === 'string' ? { ...r, body: decryptField(r.body, NOTE_FIELD) } as T : row;
}

// Transparent field-level encryption for Submission PII:
// encrypt on write, decrypt on read — resolvers never see ciphertext.
export const prisma = base.$extends({
  query: {
    notification: {
      async create({ args, query }) {
        args.data = encryptNote(args.data);
        return decryptNote(await query(args));
      },
      async createMany({ args, query }) {
        args.data = Array.isArray(args.data) ? args.data.map(encryptNote) : encryptNote(args.data);
        return query(args);
      },
      async update({ args, query }) {
        args.data = encryptNote(args.data as any);
        return decryptNote(await query(args));
      },
      async findUnique({ args, query }) {
        return decryptNote(await query(args));
      },
      async findFirst({ args, query }) {
        return decryptNote(await query(args));
      },
      async findMany({ args, query }) {
        const rows = await query(args);
        return Array.isArray(rows) ? rows.map(decryptNote) : rows;
      },
    },
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
