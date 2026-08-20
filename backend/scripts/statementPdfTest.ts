// The buyer's PDF copy must carry what they declared and nothing that was
// learned about them. This decodes the generated PDF and asserts on its text,
// so a future field added to the template cannot quietly leak.
//
// Run: npx tsx scripts/statementPdfTest.ts
import zlib from 'node:zlib';
import { buildStatementPdf } from '../services/statementPdf.ts';
import { DEFAULT_TERMS_TEXT } from '../lib/formConfig.ts';

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};

/** Pulls the visible text out of a PDFKit document (Flate streams, hex strings). */
function pdfText(pdf: Buffer): string {
  const latin = pdf.toString('latin1');
  const parts: string[] = [];
  const re = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(latin))) {
    const start = m.index + m[0].length;
    const end = latin.indexOf('endstream', start);
    try { parts.push(zlib.inflateSync(pdf.subarray(start, end)).toString('latin1')); } catch { /* not flate */ }
  }
  const body = parts.join('\n');
  const words = [...body.matchAll(/<([0-9A-Fa-f]+)>/g)]
    .map(h => Buffer.from(h[1], 'hex').toString('latin1'));
  // PDFKit splits words for kerning, so strip spacing to match on substrings.
  return words.join('').replace(/\s+/g, ' ');
}

const SECRET_DOCUMENT_NUMBER = 'NYHBBH4L8';

(async () => {
  console.log('— The buyer\'s copy —');
  const pdf = await buildStatementPdf({
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    createdAt: new Date('2026-08-20'),
    status: 'APPROVED',
    email: 'j.vermeer@labnoord.nl',
    orderNumber: 'NL-40118',
    firstName: 'Jan',
    lastName: 'Vermeer',
    street: 'Kanaalweg 12',
    zipCode: '9711 AB',
    place: 'Groningen',
    country: 'Netherlands',
    buyerType: 'COMPANY',
    companyName: 'Lab Noord BV',
    vatNumber: 'NL8231.23.456.B01',
    substances: 'Sulphuric acid',
    casNumbers: '7664-93-9',
    concentration: '15% w/w',
    statement: 'Titration standards for a teaching laboratory.',
    idDataCollectedAt: new Date('2026-08-20'),
    idVerificationCheckedAt: new Date('2026-08-20'),
  }, { sellerName: 'Acme Chem BV', termsText: DEFAULT_TERMS_TEXT });

  const text = pdfText(pdf).replace(/\s/g, '');

  check('it is a PDF', pdf.subarray(0, 5).toString() === '%PDF-');
  check('the buyer can identify it', text.includes('aaaaaaaa'));
  check('their own declaration is there',
    text.includes('Sulphuricacid') && text.includes('7664-93-9'), text.slice(0, 200));
  check('the concentration they declared is there', text.includes('15%w/w'));
  check('the terms they accepted are there', text.includes('Ihereby') || text.includes('Iherebyconfirm'));
  check('identity is recorded as done, without detail', text.includes('Documentdetailsareheldbythesupplier'));

  console.log('— What must never be in it —');
  check('no ID document number', !text.includes(SECRET_DOCUMENT_NUMBER));
  check('no liveness or face-match result', !/liveness|facematch/i.test(text));
  check('no VIES lookup result', !/vies/i.test(text));
  check('no reviewer name or override reason', !/reviewedby|override/i.test(text));
  check('no internal note', !/adminnote/i.test(text));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
