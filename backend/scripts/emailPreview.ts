// Renders every email template to HTML without sending anything.
//
// No message has ever actually been delivered from this project — SMTP_USER is
// empty — so previewing is the only way to see what a buyer or a seller gets.
// Each template is called with realistic arguments and its rendered body is
// written to a file; one index page links them all.
//
// Run: npm run email:preview   (then open backend/preview/index.html)
//
// MAIL_PREVIEW is set by that npm script, not here: imports are evaluated
// before any statement in this file, so the mail service would already have
// built a real transport by the time an assignment here ran.
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  sendSubmissionReceived, sendApproved, sendDenied, sendNewSubmissionToCompany,
  sendCompanyInvite, sendPasswordReset, sendEmailVerification, sendAdminNotification,
} from '../services/email.ts';
import { buildStatementPdf } from '../services/statementPdf.ts';
import { DEFAULT_TERMS_TEXT } from '../lib/formConfig.ts';

const OUT = path.join(import.meta.dirname, '..', 'preview');

// jsonTransport resolves with the serialised message rather than sending it.
// Capturing it needs the same transport the service builds under MAIL_PREVIEW.
type Captured = { name: string; label: string; who: string; subject: string; from: string; to: string; html: string };
const captured: Captured[] = [];

async function capture(name: string, label: string, who: string, send: () => Promise<unknown>) {
  // Under jsonTransport, sendMail resolves with the serialised message rather
  // than delivering it — which is what the send functions now hand back.
  const info = await send() as { message?: string } | undefined;
  const message = typeof info?.message === 'string' ? info.message : null;
  if (!message) {
    console.warn(`  ! ${name} returned no message — skipped`);
    return;
  }
  const parsed = JSON.parse(message) as {
    subject?: string; html?: string; from?: { name?: string; address?: string };
    to?: { address?: string }[]; bcc?: { address?: string }[];
  };
  const addressee = parsed.to?.[0]?.address ?? parsed.bcc?.[0]?.address ?? '—';
  captured.push({
    name, label, who,
    subject: parsed.subject ?? '(no subject)',
    from: parsed.from ? `${parsed.from.name ?? ''} <${parsed.from.address ?? ''}>` : '—',
    to: addressee,
    html: parsed.html ?? '',
  });
  console.log(`  ✓ ${label}`);
}

const BUYER = 'buyer@example.com';
const SELLER = 'Chemicals Direct BV';

// A real statement copy, so the attachment line in the templates that carry one
// is exercised rather than assumed.
async function statementCopy() {
  const content = await buildStatementPdf({
    id: 'cmprev0000000example',
    createdAt: new Date('2026-10-01T09:14:00Z'),
    email: BUYER,
    orderNumber: 'ORD-20481',
    firstName: 'Maria',
    lastName: 'de Vries',
    street: 'Keizersgracht 241',
    zipCode: '1016 EA',
    place: 'Amsterdam',
    country: 'Netherlands',
    companyName: 'De Vries Analytisch BV',
    vatNumber: 'NL861234567B01',
    buyerType: 'COMPANY',
    substances: 'Acetone',
    casNumbers: '67-64-1',
    concentration: '99.5%',
    statement: 'Solvent for HPLC sample preparation in our accredited water-analysis laboratory.',
    status: 'APPROVED',
  } as Parameters<typeof buildStatementPdf>[0], { sellerName: SELLER, termsText: DEFAULT_TERMS_TEXT });
  return { filename: 'end-user-statement-cmprev00.pdf', content };
}

function page(items: Captured[]): string {
  const rows = items.map(i => `
    <article>
      <header>
        <h2>${i.label}</h2>
        <dl>
          <dt>Goes to</dt><dd>${i.who}</dd>
          <dt>From</dt><dd>${i.from.replace(/</g, '&lt;')}</dd>
          <dt>To</dt><dd>${i.to}</dd>
          <dt>Subject</dt><dd><strong>${i.subject.replace(/</g, '&lt;')}</strong></dd>
        </dl>
      </header>
      <div class="body">${i.html}</div>
    </article>`).join('\n');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Email templates — EU Statement</title>
<style>
  :root { --ink:#0b0d13; --muted:#6b7485; --line:#e4e7ef; --accent:#5b9cf6; --ground:#f6f7fb; }
  body { margin:0; padding:40px 24px; background:var(--ground); color:var(--ink);
         font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif; }
  .wrap { max-width:720px; margin:0 auto; }
  h1 { font-size:24px; letter-spacing:-0.02em; margin:0 0 4px; }
  .lede { color:var(--muted); margin:0 0 32px; }
  article { background:#fff; border:1px solid var(--line); border-radius:12px; margin-bottom:24px; overflow:hidden; }
  header { padding:16px 20px; border-bottom:1px solid var(--line); background:#fcfcfe; }
  h2 { font-size:15px; margin:0 0 10px; }
  dl { display:grid; grid-template-columns:auto 1fr; gap:2px 12px; margin:0; font-size:13px; }
  dt { color:var(--muted); }
  dd { margin:0; }
  .body { padding:20px; }
  footer { color:var(--muted); font-size:13px; text-align:center; padding-top:8px; }
</style></head>
<body><div class="wrap">
  <h1>Email templates</h1>
  <p class="lede">${items.length} templates, rendered with realistic values. Nothing was sent.</p>
  ${rows}
  <footer>Generated by <code>npm run email:preview</code> — ${new Date().toISOString().slice(0, 10)}</footer>
</div></body></html>`;
}

(async () => {
  console.log('Rendering templates…');
  const copy = await statementCopy();

  await capture('submission-received', 'Submission received', 'the buyer, right after they submit',
    () => sendSubmissionReceived(BUYER, 'Maria de Vries', SELLER));
  await capture('approved', 'Statement approved', 'the buyer, with their PDF copy attached',
    () => sendApproved(BUYER, 'Maria de Vries', SELLER, copy));
  await capture('denied', 'Statement declined', 'the buyer, with the reviewer’s reason',
    () => sendDenied(BUYER, 'Maria de Vries',
      'The VAT number could not be verified against the EU VIES register.', SELLER));
  await capture('new-submission', 'New statement waiting', 'the seller’s reviewers (owner and Employee+)',
    () => sendNewSubmissionToCompany(['owner@chemicalsdirect.example'], {
      sellerName: SELLER, buyerName: 'Maria de Vries', buyerCompany: 'De Vries Analytisch BV' }));
  await capture('invite', 'Colleague invitation', 'someone an owner invited into their team',
    () => sendCompanyInvite('colleague@chemicalsdirect.example', 'Pepijn', SELLER,
      'https://eustatement.example/invite/EXAMPLE-TOKEN'));
  await capture('password-reset', 'Password reset', 'a seller’s account holder who asked for a link',
    () => sendPasswordReset('owner@chemicalsdirect.example', 'Pepijn',
      'https://eustatement.example/reset/EXAMPLE-TOKEN'));
  await capture('verify-email', 'Confirm your address', 'a new account, before its form can go live',
    () => sendEmailVerification('owner@chemicalsdirect.example', 'Pepijn',
      'https://eustatement.example/verify/EXAMPLE-TOKEN'));
  await capture('admin-notification', 'Platform queue alert', 'the platform inbox',
    () => sendAdminNotification('cmprev0000000example', 'De Vries Analytisch BV'));

  await fs.mkdir(OUT, { recursive: true });
  for (const item of captured) {
    await fs.writeFile(path.join(OUT, `${item.name}.html`), item.html, 'utf8');
  }
  const index = path.join(OUT, 'index.html');
  await fs.writeFile(index, page(captured), 'utf8');

  console.log(`\n${captured.length} templates written to ${path.relative(process.cwd(), OUT)}/`);
  console.log(`Open ${path.relative(process.cwd(), index)}`);
  process.exit(0);
})();
