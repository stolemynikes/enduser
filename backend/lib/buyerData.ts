// Answering a buyer's data-protection request: an access export (GDPR Art. 15)
// and an erasure (Art. 17).
//
// The seller is the controller for a buyer's statements and answers the
// request; this platform is its processor and makes that a two-minute job.
//
// Who a "buyer" is: every statement at this seller with the same email
// address, plus any with the same identity document — the same person can use
// two addresses. Emails are encrypted with a random IV, so they cannot be
// matched in SQL; the seller's statements are read (decrypted) and compared
// here, the way the decision search already does.
//
// What the export leaves out on purpose (Art. 15(4), the rights of others):
// reviewers' names, override reasons and internal notes — the seller's
// staff and their reasoning — and other buyers' data. The identity document
// number is masked: an export travels by email and sits in inboxes, and the
// full number can still be read, logged, through the existing reveal.
import PDFDocument from 'pdfkit';
import { prisma } from './prisma.ts';
import { RETENTION_MONTHS } from './retention.ts';

/** Far beyond what one seller holds in the 18 months a statement is kept. */
const SCAN_CAP = 50_000;

const normEmail = (e: string | null | undefined) => String(e ?? '').trim().toLowerCase();

/**
 * Ids of this buyer's statements at this seller, oldest first. The anchor must
 * already be proved to belong to `companyId`.
 */
export async function buyerStatementIds(
  companyId: string,
  anchor: { id: string; email: string; idDocumentNumberHash: string | null },
): Promise<string[]> {
  const email = normEmail(anchor.email);
  const rows = await prisma.submission.findMany({
    where: { companyId, isTest: false },
    select: { id: true, email: true, idDocumentNumberHash: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
    take: SCAN_CAP,
  });
  const ids = rows
    .filter(r => r.id === anchor.id
      || (email && normEmail(r.email) === email)
      || (anchor.idDocumentNumberHash && r.idDocumentNumberHash === anchor.idDocumentNumberHash))
    .map(r => r.id);
  // A test statement is still this buyer's only when it is the one asked about.
  return ids.includes(anchor.id) ? ids : [anchor.id, ...ids];
}

function maskDocument(n: string | null | undefined): string | null {
  const v = String(n ?? '').replace(/\s+/g, '');
  if (!v) return null;
  return v.length <= 3 ? '•••' : `${'•'.repeat(Math.min(v.length - 3, 8))}${v.slice(-3)}`;
}

function deletionDate(createdAt: Date): Date {
  const d = new Date(createdAt);
  d.setMonth(d.getMonth() + RETENTION_MONTHS);
  return d;
}

const STATUS: Record<string, string> = { PENDING_REVIEW: 'Awaiting review', APPROVED: 'Approved', DENIED: 'Declined' };
const CHECK: Record<string, string> = {
  NOT_CHECKED: 'Not checked', PENDING: 'Running', OK: 'No concerns', FLAGGED: 'Flagged for review', ERROR: 'Could not be completed',
  VALID: 'Valid', INVALID: 'Not valid', APPROVED: 'Approved', DECLINED: 'Declined', IN_REVIEW: 'In review', EXPIRED: 'Expired',
};

export type BuyerExport = {
  filename: string;
  pdfBase64: string;
  json: string;
  statements: number;
};

export async function buildBuyerExport(
  companyId: string, ids: string[], appUrl: string,
): Promise<BuyerExport> {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
  const rows = await prisma.submission.findMany({
    where: { id: { in: ids }, companyId },
    orderBy: { createdAt: 'asc' },
  });
  const sellerName = company?.name ?? 'the supplier';
  const privacyUrl = `${appUrl.replace(/\/+$/, '')}/privacy`;
  const generatedAt = new Date();

  const statements = rows.map(r => ({
    reference: r.id,
    submittedAt: r.createdAt.toISOString(),
    scheduledDeletion: deletionDate(r.createdAt).toISOString().slice(0, 10),
    declared: {
      email: r.email, firstName: r.firstName, lastName: r.lastName, orderNumber: r.orderNumber || null,
      buyerType: r.buyerType, companyName: r.companyName || null, vatNumber: r.vatNumber || null,
      street: r.street || null, zipCode: r.zipCode || null, place: r.place || null, country: r.country || null,
      substances: r.substances, casNumbers: r.casNumbers || null, concentration: r.concentration ?? null,
      statedUse: r.statement, statedUseLanguage: r.statementLang ?? null,
      statedUseEnglishTranslation: r.statementTranslation ?? null, formLanguage: r.locale ?? null,
    },
    identityCheck: r.idVerificationStatus === 'NOT_CHECKED' && !r.idDocumentType ? null : {
      outcome: CHECK[r.idVerificationStatus] ?? r.idVerificationStatus,
      checkedAt: r.idVerificationCheckedAt?.toISOString() ?? null,
      documentType: r.idDocumentType === 'PASSPORT' ? 'Passport' : r.idDocumentType === 'ID_CARD' ? 'Identity card' : null,
      nameOnDocument: r.idDocumentName ?? null,
      documentNumber: maskDocument(r.idDocumentNumber),
      documentExpiry: r.idDocumentExpiry?.toISOString().slice(0, 10) ?? null,
      livenessPassed: r.idLivenessPassed,
      faceMatched: r.idFaceMatch,
      photosHeldByProvider: !r.idVerificationPurged,
    },
    checks: {
      vat: r.viesStatus === 'NOT_CHECKED' ? null : {
        outcome: CHECK[r.viesStatus] ?? r.viesStatus,
        registeredName: r.viesName ?? null, registeredAddress: r.viesAddress ?? null,
      },
      substance: { outcome: CHECK[r.substanceCheckStatus] ?? r.substanceCheckStatus, checkedAt: r.substanceCheckedAt?.toISOString() ?? null },
    },
    decision: {
      status: STATUS[r.status] ?? r.status,
      decidedAt: r.reviewedAt?.toISOString() ?? null,
      reasonGiven: r.status === 'DENIED' ? (r.adminNote ?? null) : null,
    },
  }));

  const about = {
    controller: sellerName,
    processor: 'eustatement, which hosts the statement form and the checks for the controller',
    purpose: 'Verifying end-user statements for restricted chemical substances under Regulation (EU) 2019/1148, and deciding whether to supply.',
    legalBasis: 'Usually the controller\'s legal obligation and legitimate interest in supplying restricted substances lawfully (GDPR Art. 6(1)(c) and (f)); the controller can confirm which applies.',
    recipients: `The controller's own reviewers, and the service providers that run the platform, listed at ${privacyUrl}`,
    source: 'You, through the statement form; the identity-verification provider for the identity check; the EU VIES service for the VAT check.',
    retention: `Each statement is deleted automatically ${RETENTION_MONTHS} months after it was submitted; the dates are listed per statement.`,
    automatedDecisions: 'None. The checks only flag a statement for review; a person at the controller makes every decision.',
    yourRights: 'You may ask the controller to correct or delete your data, to restrict or object to its processing, and for a copy in a portable format. You may complain to a data protection authority; in the Netherlands, the Autoriteit Persoonsgegevens.',
    leftOut: 'The names of the controller\'s staff and their internal notes are not included, as they concern other people. Your identity document number is shown in part; the controller can provide it in full on request.',
  };

  const json = JSON.stringify({ generatedAt: generatedAt.toISOString(), aboutThisData: about, statements }, null, 2);
  const pdf = await renderPdf(sellerName, generatedAt, about, statements);
  const stamp = generatedAt.toISOString().slice(0, 10);
  return { filename: `personal-data-${stamp}`, pdfBase64: pdf.toString('base64'), json, statements: statements.length };
}

// The per-statement shape built above; the PDF reads the same object the JSON holds.
type Stmt = any;

function renderPdf(sellerName: string, at: Date, about: Record<string, string>, statements: Stmt[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56, info: { Title: 'Your personal data', Author: sellerName } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const INK = '#1a1814', MUTED = '#6b6660', NAVY = '#0f1e3c', RULE = '#d4d0c8';
    const rule = () => {
      doc.moveDown(0.4);
      doc.strokeColor(RULE).lineWidth(0.75).moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.moveDown(0.7);
    };
    const heading = (t: string) => {
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NAVY).text(t.toUpperCase(), { characterSpacing: 1.1 });
      doc.moveDown(0.4);
    };
    const field = (label: string, value: unknown) => {
      if (value === null || value === undefined || value === '') return;
      const text = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
      doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(label.toUpperCase(), { characterSpacing: 0.8 });
      doc.font('Helvetica').fontSize(10).fillColor(INK).text(text);
      doc.moveDown(0.45);
    };
    const date = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : null;

    doc.font('Helvetica-Bold').fontSize(17).fillColor(INK).text('Your personal data');
    doc.font('Helvetica').fontSize(9.5).fillColor(MUTED)
      .text(`Held by ${sellerName} · prepared ${date(at.toISOString())}`)
      .text(`${statements.length} end-user statement${statements.length === 1 ? '' : 's'}`);
    rule();

    heading('About this data');
    field('Controller', about.controller);
    field('Processor', about.processor);
    field('Purpose', about.purpose);
    field('Legal basis', about.legalBasis);
    field('Recipients', about.recipients);
    field('Source', about.source);
    field('Retention', about.retention);
    field('Automated decisions', about.automatedDecisions);
    field('Your rights', about.yourRights);
    field('Not included', about.leftOut);

    statements.forEach((s, i) => {
      doc.addPage();
      doc.font('Helvetica-Bold').fontSize(13).fillColor(INK).text(`Statement ${i + 1} of ${statements.length}`);
      doc.font('Helvetica').fontSize(9).fillColor(MUTED)
        .text(`Reference ${s.reference} · submitted ${date(s.submittedAt)} · deleted on ${date(s.scheduledDeletion)}`);
      rule();
      const d = s.declared;
      heading('What you declared');
      field('Name', `${d.firstName} ${d.lastName}`);
      field('Email', d.email);
      field('Order number', d.orderNumber);
      field('Buyer type', d.buyerType === 'INDIVIDUAL' ? 'Private individual' : 'Company');
      field('Company', d.companyName);
      field('VAT number', d.vatNumber);
      field('Address', [d.street, [d.zipCode, d.place].filter(Boolean).join(' '), d.country].filter(Boolean).join(', '));
      field('Substance(s)', d.substances);
      field('CAS number(s)', d.casNumbers);
      field('Concentration', d.concentration);
      field('Stated use', d.statedUse);
      field('English translation made for the reviewer', d.statedUseEnglishTranslation);
      if (s.identityCheck) {
        const c = s.identityCheck;
        heading('Identity check');
        field('Outcome', c.outcome);
        field('Checked', date(c.checkedAt));
        field('Document', c.documentType);
        field('Name on the document', c.nameOnDocument);
        field('Document number (partly hidden)', c.documentNumber);
        field('Document expires', date(c.documentExpiry));
        field('Liveness check passed', c.livenessPassed);
        field('Face matched the document', c.faceMatched);
        field('Photos still held by the provider', c.photosHeldByProvider);
      }
      heading('Checks');
      if (s.checks.vat) {
        field('VAT number', s.checks.vat.outcome);
        field('Registered name (EU VIES)', s.checks.vat.registeredName);
        field('Registered address (EU VIES)', s.checks.vat.registeredAddress);
      }
      field('Substance and stated use', s.checks.substance.outcome);
      heading('Decision');
      field('Status', s.decision.status);
      field('Decided', date(s.decision.decidedAt));
      field('Reason given', s.decision.reasonGiven);
    });
    doc.end();
  });
}
