// Announcing a new or replaced sub-processor.
//
// The DPA (section 7) promises at least 30 days' notice, by email or in the
// dashboard. This does both, and refuses a date closer than 30 days, so the
// promise cannot be broken by a hurried announcement. The list on the legal
// pages (frontend/src/lib/legal.ts) is changed by hand on the effective date,
// with LAST_UPDATED bumped — which asks every owner to accept the new version.
import { prisma } from './prisma.ts';
import { mailBudgetAllows } from './mailBudget.ts';
import { sendSubprocessorNotice } from '../services/email.ts';

export const NOTICE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A problem with what the admin typed — safe to show them. */
export class NoticeInputError extends Error {}
/** A notice stays on the dashboard until a week after it takes effect. */
const SHOW_AFTER_MS = 7 * DAY_MS;

function bounded(label: string, v: unknown, max: number): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) throw new NoticeInputError(`${label} is required.`);
  if (s.length > max) throw new NoticeInputError(`${label} must be at most ${max} characters.`);
  return s;
}

export async function announceSubprocessor(
  adminId: string,
  input: { name: string; purpose: string; data: string; location: string; effectiveDate: string },
) {
  const name = bounded('Name', input.name, 120);
  const purpose = bounded('Purpose', input.purpose, 300);
  const data = bounded('Data', input.data, 300);
  const location = bounded('Location', input.location, 120);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.effectiveDate ?? ''))) throw new NoticeInputError('Effective date must be YYYY-MM-DD.');
  const effectiveAt = new Date(`${input.effectiveDate}T00:00:00Z`);
  if (Number.isNaN(effectiveAt.getTime())) throw new NoticeInputError('Effective date is not a date.');
  const earliest = Date.now() + NOTICE_DAYS * DAY_MS - DAY_MS; // the whole 30th day counts
  if (effectiveAt.getTime() < earliest) {
    throw new NoticeInputError(`The DPA promises ${NOTICE_DAYS} days' notice: choose a date on or after ${new Date(earliest + DAY_MS).toISOString().slice(0, 10)}.`);
  }

  const notice = await prisma.subprocessorNotice.create({
    data: { name, purpose, data, location, effectiveAt, createdById: adminId },
  });

  // Every owner of every company still on the platform. A company being
  // closed still has its DPA until it is gone, so it is told too.
  const owners = await prisma.companyMember.findMany({
    where: { role: 'OWNER', company: { deletedAt: null } },
    select: { user: { select: { email: true, name: true } }, company: { select: { name: true } } },
  });
  let sent = 0;
  let failed = 0;
  for (const o of owners) {
    if (!(await mailBudgetAllows(o.user.email, 'subprocessor-notice'))) { failed++; continue; }
    try {
      await sendSubprocessorNotice(o.user.email, o.user.name, o.company.name, notice);
      sent++;
    } catch {
      failed++;
    }
  }
  return prisma.subprocessorNotice.update({ where: { id: notice.id }, data: { sent, failed } });
}

/** Notices to show on a dashboard: announced, and not more than a week past. */
export function activeNotices(now: number = Date.now()) {
  return prisma.subprocessorNotice.findMany({
    where: { effectiveAt: { gte: new Date(now - SHOW_AFTER_MS) } },
    orderBy: { effectiveAt: 'asc' },
    take: 10,
  });
}

export function allNotices() {
  return prisma.subprocessorNotice.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
}
