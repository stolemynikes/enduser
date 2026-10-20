// The decision log for a period, as a CSV for an auditor or an inspection:
// every approval, denial, reopening and override, who did it, when, and the
// reason given — one row per event, from the append-only history.
//
// It holds buyers' names and order numbers — the seller's own records — so it
// is the owner's alone, needs a fresh second-factor code, and is recorded.
import { prisma } from './prisma.ts';

const CAP = 20_000;

/**
 * A cell a spreadsheet will not run. A value starting with = + - @ (or a tab
 * or carriage return) is read by Excel and LibreOffice as a formula; a buyer
 * who typed "=HYPERLINK(...)" as their name would otherwise get code into the
 * auditor's spreadsheet. Such values are prefixed with an apostrophe.
 */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const CATEGORY: Record<string, string> = { VIES: 'VAT number', IDENTITY: 'Identity', SUBSTANCE: 'Substance' };
const ACTION: Record<string, string> = {
  APPROVED: 'Approved', DENIED: 'Denied', REOPENED: 'Reopened', OVERRIDE: 'Check overridden', OVERRIDE_CLEARED: 'Override removed',
};

type Statement = {
  id: string; isTest: boolean; firstName: string; lastName: string; email: string;
  orderNumber: string | null; createdAt: Date;
};

/**
 * The decision history of a company's statements, oldest first, with each
 * statement's buyer details where the statement still exists. Read from the
 * append-only DecisionLog, never from the statements' current state: a
 * reopened statement, a replaced or cleared override, still shows what was
 * decided and why. Test statements are left out.
 */
export async function decisionHistory(companyId: string, where: { from?: Date; to?: Date; actions?: string[] } = {}) {
  const events = await prisma.decisionLog.findMany({
    where: {
      companyId,
      ...(where.actions ? { action: { in: where.actions } } : {}),
      ...(where.from || where.to ? { at: { ...(where.from ? { gte: where.from } : {}), ...(where.to ? { lt: where.to } : {}) } } : {}),
    },
    orderBy: [{ at: 'asc' }, { id: 'asc' }],
    take: CAP,
  });
  const ids = [...new Set(events.map(e => e.submissionId))];
  const statements = new Map<string, Statement>();
  for (let i = 0; i < ids.length; i += 1000) {
    const rows = await prisma.submission.findMany({
      where: { companyId, id: { in: ids.slice(i, i + 1000) } },
      select: { id: true, isTest: true, firstName: true, lastName: true, email: true, orderNumber: true, createdAt: true },
    });
    for (const r of rows) statements.set(r.id, r as Statement);
  }
  return {
    events: events
      .filter(e => !statements.get(e.submissionId)?.isTest)
      .map(e => ({ ...e, statement: statements.get(e.submissionId) ?? null })),
    truncated: events.length === CAP,
  };
}

export async function decisionLogCsv(companyId: string, from: string, to: string) {
  const { events, truncated } = await decisionHistory(companyId, {
    from: new Date(`${from}T00:00:00Z`),
    to: new Date(new Date(`${to}T00:00:00Z`).getTime() + 86_400_000),
  });
  const header = [
    'At (UTC)', 'Action', 'Check', 'By', 'Reason', 'Status before', 'Status after',
    'Order number', 'Buyer', 'Buyer email', 'Submitted at (UTC)', 'Reference',
  ];
  const lines = [header.map(csvCell).join(',')];
  for (const e of events) {
    const s = e.statement;
    lines.push([
      e.at.toISOString().replace('T', ' ').slice(0, 19),
      ACTION[e.action] ?? e.action,
      e.category ? CATEGORY[e.category] ?? e.category : '',
      e.byName,
      e.reason ?? '',
      e.fromStatus ?? '',
      e.toStatus ?? '',
      s?.orderNumber ?? '',
      s ? `${s.firstName} ${s.lastName}`.trim() : '(statement deleted)',
      s?.email ?? '',
      s ? s.createdAt.toISOString().replace('T', ' ').slice(0, 19) : '',
      e.submissionId,
    ].map(csvCell).join(','));
  }
  // A byte-order mark so Excel reads the UTF-8 names (é, ø, ł) correctly.
  return { csv: '\ufeff' + lines.join('\r\n') + '\r\n', rows: events.length, truncated };
}
