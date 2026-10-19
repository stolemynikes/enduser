// Error spikes for the nightly alert.
//
// A single check that errors is routine — PubChem or a member state's VIES
// node is down for a moment, and the reviewer re-runs it. Many in one day
// means an outage or a fault on our side that nobody would otherwise notice,
// because each error only shows up on its own statement. Counts only: the
// alert says how many, never whose.
import { prisma } from './prisma.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
/** At least this many errors of one kind in a day… */
const MIN_ERRORS = 3;
/** …making up at least this share of that day's checks of that kind. */
const MIN_SHARE = 0.2;

/** `companyId` scopes the count for tests, which share the database. */
export async function errorSpikes(
  { now = Date.now(), companyId }: { now?: number; companyId?: string } = {},
): Promise<string[]> {
  const since = { createdAt: { gte: new Date(now - DAY_MS) }, ...(companyId ? { companyId } : {}) };
  const kinds = [
    { label: 'substance check', field: 'substanceCheckStatus', checked: { not: 'NOT_CHECKED' } },
    { label: 'VIES check', field: 'viesStatus', checked: { not: 'NOT_CHECKED' } },
    { label: 'identity check', field: 'idVerificationStatus', checked: { not: 'NOT_CHECKED' } },
  ] as const;

  const lines: string[] = [];
  for (const k of kinds) {
    const [errors, total] = await Promise.all([
      prisma.submission.count({ where: { ...since, [k.field]: 'ERROR' } }),
      prisma.submission.count({ where: { ...since, [k.field]: k.checked } }),
    ]);
    if (errors >= MIN_ERRORS && errors / Math.max(total, 1) >= MIN_SHARE) {
      lines.push(`${errors} of ${total} ${k.label}s in the last 24 hours ended in ERROR.`);
    }
  }
  return lines;
}
