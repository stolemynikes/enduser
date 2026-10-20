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

// The decision history keeps what a reviewer wrote — an override's reason, a
// denial's note — which can name the buyer, so it is encrypted the same way.
const DECISION_FIELD = 'decisionLog.reason';
function encryptDecision<T extends { reason?: unknown }>(data: T): T {
  return typeof data?.reason === 'string' ? { ...data, reason: encryptField(data.reason, DECISION_FIELD) } : data;
}
function decryptDecision<T>(row: T): T {
  const r = row as { reason?: unknown } | null;
  return r && typeof r.reason === 'string' ? { ...r, reason: decryptField(r.reason, DECISION_FIELD) } as T : row;
}

// The identity check's details — which document, when it expires, whether
// liveness and the face match passed — are not text, so the per-field cipher
// cannot hold them in their own columns. They are sealed together as one
// encrypted JSON value in idCheckSealed and their columns left empty; on read
// they are put back, so callers see the fields as before. Rows written before
// this keep them in the columns and are read unchanged. Not filterable in SQL.
const SEALED = ['idDocumentType', 'idDocumentExpiry', 'idLivenessPassed', 'idFaceMatch'] as const;
const SEALED_FIELD = 'submission.idCheck';
type Row = Record<string, unknown>;

function sealedValues(row: Row | null | undefined): Row | null {
  if (!row || typeof row.idCheckSealed !== 'string') return null;
  const v = JSON.parse(decryptField(row.idCheckSealed, SEALED_FIELD)) as Row;
  if (typeof v.idDocumentExpiry === 'string') v.idDocumentExpiry = new Date(v.idDocumentExpiry);
  return v;
}

function openSealed<T>(row: T): T {
  if (!row || typeof row !== 'object' || !('idCheckSealed' in (row as Row))) return row;
  const out: Row = { ...(row as Row) };
  const v = sealedValues(out);
  if (v) for (const k of SEALED) if (k in out) out[k] = v[k] ?? null;
  delete out.idCheckSealed;
  return out as T;
}

/** Moves the sealed fields of a write into idCheckSealed, merged over `current`. */
function seal(data: Row | undefined, current: Row | null): Row | undefined {
  if (!data || !SEALED.some(k => k in data)) return data;
  const merged: Row = {};
  for (const k of SEALED) merged[k] = current?.[k] ?? null;
  const out: Row = { ...data };
  for (const k of SEALED) {
    if (!(k in data)) continue;
    merged[k] = data[k] instanceof Date ? (data[k] as Date).toISOString() : data[k] ?? null;
    out[k] = null;
  }
  out.idCheckSealed = encryptField(JSON.stringify(merged), SEALED_FIELD);
  return out;
}

/** What a row already holds, for merging a partial update. */
async function currentSealed(where: unknown): Promise<Row | null> {
  const row = await base.submission.findUnique({
    where: where as any,
    select: { idCheckSealed: true, idDocumentType: true, idDocumentExpiry: true, idLivenessPassed: true, idFaceMatch: true },
  });
  if (!row) return null;
  return sealedValues(row as Row) ?? (row as Row);
}

/** Asks for idCheckSealed whenever a sealed field is selected. */
function withSealed<A extends { select?: Row | null }>(args: A): A {
  if (args?.select && SEALED.some(k => args.select![k])) return { ...args, select: { ...args.select, idCheckSealed: true } };
  return args;
}

const openRow = <T>(row: T): T => decryptRecord(openSealed(row));

// Transparent field-level encryption for Submission PII:
// encrypt on write, decrypt on read — resolvers never see ciphertext.
export const prisma = base.$extends({
  query: {
    decisionLog: {
      async create({ args, query }) {
        args.data = encryptDecision(args.data);
        return decryptDecision(await query(args));
      },
      async findMany({ args, query }) {
        const rows = await query(args);
        return Array.isArray(rows) ? rows.map(decryptDecision) : rows;
      },
    },
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
        args.data = encryptData(seal(args.data as Row, null) as any);
        return openRow(await query(withSealed(args as any)));
      },
      async update({ args, query }) {
        const data = args.data as Row;
        const sealed = SEALED.some(k => k in data) ? seal(data, await currentSealed(args.where)) : data;
        args.data = encryptData(sealed as any);
        return openRow(await query(withSealed(args as any)));
      },
      async upsert({ args, query }) {
        const current = await currentSealed(args.where);
        args.create = encryptData(seal(args.create as Row, null) as any);
        args.update = encryptData(seal(args.update as Row, current) as any);
        return openRow(await query(withSealed(args as any)));
      },
      async findUnique({ args, query }) {
        return openRow(await query(withSealed(args as any)));
      },
      async findFirst({ args, query }) {
        return openRow(await query(withSealed(args as any)));
      },
      async findMany({ args, query }) {
        const rows = await query(withSealed(args as any));
        return Array.isArray(rows) ? rows.map(openRow) : rows;
      },
      async delete({ args, query }) {
        return openRow(await query(withSealed(args as any)));
      },
    },
  },
});
