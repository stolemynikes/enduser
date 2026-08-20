// One-time (idempotent) migration: encrypt PII fields of existing Submission rows.
// Run from the backend directory: npx tsx scripts/encrypt-existing.ts
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';
import { PII_FIELDS, encryptField } from '../lib/cipher.ts';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const raw = new PrismaClient({ adapter }); // un-extended: no auto encrypt/decrypt

async function main() {
  const rows = await raw.submission.findMany();
  let migrated = 0;

  for (const row of rows) {
    const data: Record<string, string> = {};
    for (const f of PII_FIELDS) {
      const val = (row as Record<string, unknown>)[f];
      if (typeof val === 'string' && !val.startsWith('enc:v1:')) {
        data[f] = encryptField(val);
      }
    }
    if (Object.keys(data).length > 0) {
      await raw.submission.update({ where: { id: row.id }, data });
      migrated++;
    }
  }

  console.log(`Done: ${migrated} of ${rows.length} submission(s) encrypted.`);
  await raw.$disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
