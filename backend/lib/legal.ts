// The version of the Terms, the Data Processing Agreement and the Privacy
// Policy currently published. It is the date shown on those pages, and must
// equal LAST_UPDATED in frontend/src/lib/legal.ts — legalVersionTest fails
// when the two drift apart. Changing it asks every company owner to accept the
// new version.
import PDFDocument from 'pdfkit';
import { prisma } from './prisma.ts';

export const LEGAL_VERSION = '2026-10-09';

export async function recordAcceptance(companyId: string, user: { id: string; name: string; email: string }) {
  return prisma.legalAcceptance.create({
    data: {
      companyId, userId: user.id, userName: user.name.slice(0, 200), userEmail: user.email.slice(0, 254),
      version: LEGAL_VERSION,
    },
  });
}

export async function legalStatus(companyId: string) {
  const rows = await prisma.legalAcceptance.findMany({
    where: { companyId }, orderBy: { acceptedAt: 'desc' }, take: 50,
  });
  const latest = rows[0] ?? null;
  return {
    currentVersion: LEGAL_VERSION,
    acceptedVersion: latest?.version ?? null,
    needsAcceptance: latest?.version !== LEGAL_VERSION,
    history: rows.map(r => ({ version: r.version, acceptedAt: r.acceptedAt.toISOString(), acceptedBy: r.userName })),
  };
}

/** A record of every acceptance, for the company's own files. */
export async function acceptanceRecordPdf(companyId: string, appUrl: string): Promise<string> {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true, slug: true } });
  const rows = await prisma.legalAcceptance.findMany({ where: { companyId }, orderBy: { acceptedAt: 'asc' } });
  const base = appUrl.replace(/\/+$/, '');
  const buf = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56, info: { Title: 'Record of acceptance', Author: 'eustatement' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const INK = '#1a1814', MUTED = '#6b6660';
    doc.font('Helvetica-Bold').fontSize(17).fillColor(INK).text('Record of acceptance');
    doc.font('Helvetica').fontSize(9.5).fillColor(MUTED)
      .text(`${company?.name ?? ''} · ${base}/${company?.slug ?? ''}`)
      .text(`Prepared ${new Date().toISOString().slice(0, 10)}`);
    doc.moveDown(1);
    doc.font('Helvetica').fontSize(10.5).fillColor(INK).text(
      'Each line below records that the person named accepted, on behalf of the company, the Terms of Service, '
      + 'the Data Processing Agreement and the Privacy Policy as published on the version date shown. '
      + `The current texts are at ${base}/terms, ${base}/dpa and ${base}/privacy.`,
    );
    doc.moveDown(1);
    if (rows.length === 0) {
      doc.fillColor(MUTED).text('No acceptance has been recorded yet.');
    }
    for (const r of rows) {
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(INK).text(`Version ${r.version}`);
      doc.font('Helvetica').fontSize(10).fillColor(INK)
        .text(`Accepted ${r.acceptedAt.toISOString().replace('T', ' ').slice(0, 16)} UTC by ${r.userName} <${r.userEmail}>`);
      doc.moveDown(0.6);
    }
    doc.end();
  });
  return buf.toString('base64');
}
