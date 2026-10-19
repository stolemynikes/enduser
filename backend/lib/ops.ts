// Operational bookkeeping for the admin health page: how each outside service
// last answered, and counted events. Nothing here holds personal data — a
// service name, an event kind, a time.
//
// Every write is fire-and-forget and swallows its own errors. Bookkeeping must
// never be the reason a buyer's submission or a reviewer's decision fails.
import { prisma } from './prisma.ts';

export type Service = 'pubchem' | 'wikidata' | 'vies' | 'didit' | 'translate' | 'mail';
export const SERVICES: Service[] = ['pubchem', 'wikidata', 'vies', 'didit', 'translate', 'mail'];

export type OpsEventKind =
  | 'didit-session-started'
  | 'didit-purge-abandoned'
  | 'didit-purge-refused'
  | 'didit-purge-gaveup'
  | 'didit-purge-failed'
  | 'mail-failed';

/** Records that a call to `service` succeeded or failed. */
export function noteService(service: Service, ok: boolean): void {
  const now = new Date();
  void prisma.serviceHealth.upsert({
    where: { service },
    create: ok ? { service, lastOkAt: now } : { service, lastFailAt: now, failStreak: 1 },
    update: ok ? { lastOkAt: now, failStreak: 0 } : { lastFailAt: now, failStreak: { increment: 1 } },
  }).catch(() => {});
}

/** Counts one event. `detail` is a sub-kind, never personal data. */
export function recordEvent(kind: OpsEventKind, detail?: string): void {
  void prisma.opsEvent.create({ data: { kind, detail: detail ?? null } }).catch(() => {});
}

/** Drops events older than a year. Called from the nightly maintenance job. */
export async function pruneOpsEvents(): Promise<number> {
  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const { count } = await prisma.opsEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return count;
}
