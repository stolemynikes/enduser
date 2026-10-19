// The decision log for a period, as a CSV for an auditor or an inspection:
// every approval and denial, who made it, when, the reason given, and every
// failed check that was overridden with the reviewer's reason.
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

export async function decisionLogCsv(companyId: string, from: string, to: string) {
  const rows = await prisma.submission.findMany({
    where: {
      companyId, isTest: false, status: { in: ['APPROVED', 'DENIED'] },
      reviewedAt: { gte: new Date(`${from}T00:00:00Z`), lt: new Date(new Date(`${to}T00:00:00Z`).getTime() + 86_400_000) },
    },
    orderBy: { reviewedAt: 'asc' },
    take: CAP,
    include: { overrides: { orderBy: { createdAt: 'asc' } } },
  });
  const header = [
    'Decided at (UTC)', 'Decision', 'Reviewer', 'Reason given to the buyer', 'Order number', 'Buyer', 'Buyer email',
    'Submitted at (UTC)', 'Reference', 'Overridden checks',
  ];
  const lines = [header.map(csvCell).join(',')];
  for (const s of rows) {
    const overrides = s.overrides
      .map(o => `${CATEGORY[o.category] ?? o.category} by ${o.createdByName} on ${o.createdAt.toISOString().slice(0, 16).replace('T', ' ')}: ${o.reason}`)
      .join(' | ');
    lines.push([
      s.reviewedAt?.toISOString().replace('T', ' ').slice(0, 19) ?? '',
      s.status === 'APPROVED' ? 'Approved' : 'Denied',
      s.reviewedByName ?? '',
      s.status === 'DENIED' ? (s.adminNote ?? '') : '',
      s.orderNumber ?? '',
      `${s.firstName} ${s.lastName}`.trim(),
      s.email,
      s.createdAt.toISOString().replace('T', ' ').slice(0, 19),
      s.id,
      overrides,
    ].map(csvCell).join(','));
  }
  // A byte-order mark so Excel reads the UTF-8 names (é, ø, ł) correctly.
  return { csv: '﻿' + lines.join('\r\n') + '\r\n', rows: rows.length, truncated: rows.length === CAP };
}
