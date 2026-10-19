// The buyer's own copy of the statement they submitted.
//
// WHAT IS DELIBERATELY NOT IN HERE: anything from the identity document
// (document number, the name as printed on it, expiry, liveness and face-match
// results, provider warnings), and anything from the seller's internal review
// (VIES lookup results, the substance check note, reviewer names, override
// reasons, internal notes). Email is not a confidential channel and this file
// will sit in an inbox for years — so it carries what the buyer themselves
// declared, plus the terms they agreed to, and nothing that was learned *about*
// them.
import PDFDocument from 'pdfkit';

export type StatementForPdf = {
  id: string;
  createdAt: Date | string;
  status: string;
  email: string;
  orderNumber: string;
  firstName: string;
  lastName: string;
  street: string;
  zipCode: string;
  place: string;
  country: string;
  buyerType: string;
  companyName: string;
  vatNumber: string;
  substances: string;
  casNumbers: string;
  concentration?: string | null;
  statement: string;
  idDataCollectedAt?: Date | string | null;
  idVerificationCheckedAt?: Date | string | null;
};

const INK = '#1a1814';
const MUTED = '#6b6660';
const RULE = '#d4d0c8';
const NAVY = '#0f1e3c';

const dateOf = (v: Date | string | null | undefined): string =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

const STATUS_TEXT: Record<string, string> = {
  PENDING_REVIEW: 'Submitted — awaiting review',
  APPROVED: 'Approved',
  DENIED: 'Declined',
};

export function buildStatementPdf(
  submission: StatementForPdf,
  { sellerName, termsText, termsUrl, checkUrl, checkCode }: { sellerName?: string; termsText?: string; termsUrl?: string; checkUrl?: string; checkCode?: string },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56, info: {
      Title: 'End-User Statement',
      Author: sellerName ?? 'eustatement',
      Subject: `End-user statement ${submission.id}`,
    } });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const line = () => {
      doc.moveDown(0.5);
      doc.strokeColor(RULE).lineWidth(0.75)
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y).stroke();
      doc.moveDown(0.8);
    };

    const field = (label: string, value: string) => {
      doc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
        .text(label.toUpperCase(), { characterSpacing: 0.8 });
      doc.font('Helvetica').fontSize(10.5).fillColor(INK).text(value || '—');
      doc.moveDown(0.55);
    };

    const heading = (text: string) => {
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NAVY)
        .text(text.toUpperCase(), { characterSpacing: 1.1 });
      doc.moveDown(0.45);
    };

    // ── header ───────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(17).fillColor(INK).text('End-User Statement');
    doc.font('Helvetica').fontSize(9.5).fillColor(MUTED)
      .text('Chemical substances — regulated use declaration');
    if (sellerName) doc.text(`Submitted to ${sellerName}`);
    line();

    doc.font('Helvetica').fontSize(9).fillColor(MUTED)
      .text(`Reference ${submission.id}`)
      .text(`Submitted ${dateOf(submission.createdAt)}`)
      .text(`Status: ${STATUS_TEXT[submission.status] ?? submission.status}`);
    line();

    // ── what the buyer declared ──────────────────────────────────────────
    heading('Buyer');
    field('Name', `${submission.firstName} ${submission.lastName}`);
    field('Email', submission.email);
    if (submission.orderNumber) field('Order number', submission.orderNumber);
    if (submission.buyerType === 'COMPANY' && submission.companyName) {
      field('Company', submission.companyName);
      if (submission.vatNumber) field('VAT number', submission.vatNumber);
    } else if (submission.buyerType === 'INDIVIDUAL') {
      field('Buyer type', 'Private individual');
    }
    const address = [submission.street, [submission.zipCode, submission.place].filter(Boolean).join(' '), submission.country]
      .filter(Boolean).join(', ');
    if (address) field('Address', address);

    heading('Substance');
    field('Substance(s)', submission.substances);
    if (submission.casNumbers) field('CAS number(s)', submission.casNumbers);
    if (submission.concentration) field('Concentration', submission.concentration);
    field('Intended use', submission.statement);

    // Identity is recorded as having happened, and nothing more: the document
    // details belong in the seller's file, not in the buyer's inbox.
    if (submission.idDataCollectedAt) {
      heading('Identity');
      field(
        'Verification',
        `Completed ${dateOf(submission.idVerificationCheckedAt ?? submission.idDataCollectedAt)} through the identity provider. `
        + 'Document details are held by the supplier and are not reproduced here.',
      );
    }

    // ── the terms they agreed to ─────────────────────────────────────────
    heading('Terms accepted');
    if (termsUrl) {
      doc.font('Helvetica').fontSize(9.5).fillColor(INK)
        .text('The buyer confirmed agreement with the terms published at:');
      doc.fillColor(NAVY).text(termsUrl, { link: termsUrl, underline: true });
      doc.fillColor(INK);
    } else if (termsText) {
      doc.font('Helvetica').fontSize(8.5).fillColor(INK)
        .text(termsText, { align: 'left', lineGap: 1.5 });
    }

    doc.moveDown(1);
    line();
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(
      'This copy is provided for the buyer\'s records. It reproduces the declaration as submitted; '
      + 'identity document details and the supplier\'s verification results are not included.',
      { align: 'left' },
    );
    if (checkUrl && checkCode) {
      doc.moveDown(0.6);
      doc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
        .text(`To check this copy is genuine: reference ${submission.id}, code ${checkCode.replace(/(.{5})(?=.)/g, '$1-')}, at `, { continued: true })
        .fillColor(NAVY).text(checkUrl, { link: checkUrl, underline: true });
    }

    doc.end();
  });
}
