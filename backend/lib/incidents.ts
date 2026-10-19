// Telling company owners about a security incident or a personal-data breach.
//
// The DPA promises sellers are told without undue delay; INCIDENT.md is the
// procedure, and this is its "notify" step. It writes to every owner of the
// chosen companies, keeps a record of when it went and how many it reached,
// and never lets the message carry markup.
import { prisma } from './prisma.ts';
import { mailBudgetAllows } from './mailBudget.ts';
import { sendIncidentNotice } from '../services/email.ts';

export class IncidentInputError extends Error {}

export async function notifyIncident(
  adminId: string,
  input: { subject: string; message: string; allCompanies: boolean; slugs?: string[] | null },
) {
  const subject = typeof input.subject === 'string' ? input.subject.trim() : '';
  const message = typeof input.message === 'string' ? input.message.trim() : '';
  if (subject.length < 5 || subject.length > 150) throw new IncidentInputError('Give a subject of 5 to 150 characters.');
  if (message.length < 20 || message.length > 10_000) throw new IncidentInputError('Write a message of 20 to 10,000 characters.');

  let companyWhere: { deletedAt: null; slug?: { in: string[] } } = { deletedAt: null };
  if (!input.allCompanies) {
    const slugs = [...new Set((input.slugs ?? []).map(s => String(s).trim().toLowerCase()).filter(Boolean))].slice(0, 500);
    if (slugs.length === 0) throw new IncidentInputError('List the companies (their form addresses), or choose all companies.');
    const found = await prisma.company.findMany({ where: { slug: { in: slugs }, deletedAt: null }, select: { slug: true } });
    const missing = slugs.filter(s => !found.some(f => f.slug === s));
    if (missing.length) throw new IncidentInputError(`No company with the form address: ${missing.join(', ')}.`);
    companyWhere = { deletedAt: null, slug: { in: slugs } };
  }

  const owners = await prisma.companyMember.findMany({
    where: { role: 'OWNER', company: companyWhere },
    select: { companyId: true, user: { select: { email: true, name: true } }, company: { select: { name: true } } },
  });
  const companies = new Set(owners.map(o => o.companyId)).size;
  const notice = await prisma.incidentNotice.create({
    data: { subject, message, allCompanies: !!input.allCompanies, companies, createdById: adminId },
  });

  let sent = 0;
  let failed = 0;
  for (const o of owners) {
    if (!(await mailBudgetAllows(o.user.email, 'incident-notice'))) { failed++; continue; }
    try {
      await sendIncidentNotice(o.user.email, o.user.name, o.company.name, subject, message);
      sent++;
    } catch {
      failed++;
    }
  }
  return prisma.incidentNotice.update({ where: { id: notice.id }, data: { sent, failed } });
}

export function incidentNotices() {
  return prisma.incidentNotice.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
}
