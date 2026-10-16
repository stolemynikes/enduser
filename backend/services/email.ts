import 'dotenv/config';
import nodemailer from 'nodemailer';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Preview mode captures what would have been sent instead of connecting to a
// mail server, so the templates can be looked at without a mailbox and without
// delivering anything. Refused outside development: a flag that silently stops
// mail going out is not something production should be able to turn on.
const PREVIEW = process.env.MAIL_PREVIEW === '1' && process.env.NODE_ENV !== 'production';
if (PREVIEW) console.warn('[mail] MAIL_PREVIEW=1 — messages are rendered, not sent.');

const transporter = PREVIEW
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });

const FROM_ADDRESS = process.env.SMTP_FROM ?? 'noreply@enduser.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@enduser.com';
/** Where requests and platform notices go — exported so callers can budget against it. */
export const ADMIN_INBOX = ADMIN_EMAIL;
const APP_URL = (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
const PLATFORM = 'eustatement';

/**
 * The buyer filled in a form belonging to a seller, not to us — so the seller's
 * name is what appears in the inbox. The address stays ours, because SPF and
 * DKIM are bound to our domain: sending as the seller's own address would fail
 * authentication and land in spam.
 */
function sellerFrom(sellerName?: string) {
  return sellerName
    ? { name: `${sellerName} via ${PLATFORM}`, address: FROM_ADDRESS }
    : { name: PLATFORM, address: FROM_ADDRESS };
}

function signature(sellerName?: string): string {
  return sellerName
    ? `<p style="color:#555">Kind regards,<br/>${esc(sellerName)}</p>
       <p style="color:#888;font-size:12px">Sent via ${PLATFORM} on behalf of ${esc(sellerName)}.</p>`
    : `<p style="color:#555">Kind regards,<br/>${PLATFORM}</p>`;
}

function layout(body: string, sellerName?: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.6;color:#1a1a1a;max-width:560px">
    ${body}
    ${signature(sellerName)}
  </div>`;
}

/** A copy of the statement, so the buyer keeps their own record of it. */
export type StatementCopy = { filename: string; content: Buffer };

function attach(copy?: StatementCopy) {
  return copy ? [{ filename: copy.filename, content: copy.content, contentType: 'application/pdf' }] : undefined;
}

export async function sendSubmissionReceived(
  to: string, name: string, sellerName?: string, copy?: StatementCopy,
) {
  const who = sellerName ?? 'the supplier';
  return transporter.sendMail({
    from: sellerFrom(sellerName), to,
    subject: sellerName
      ? `${sellerName} received your end-user statement`
      : 'We received your end-user statement',
    html: layout(`<p>Dear ${esc(name)},</p>
      <p>${esc(who)} has received your end-user statement. It is being reviewed and you will hear
      from us once a decision has been made.</p>
      ${copy ? '<p>Your copy is attached. It holds the declaration as you submitted it — your identity document details are not included.</p>' : ''}`, sellerName),
    attachments: attach(copy),
  });
}

export async function sendApproved(
  to: string, name: string, sellerName?: string, copy?: StatementCopy,
) {
  return transporter.sendMail({
    from: sellerFrom(sellerName), to,
    subject: 'Your end-user statement has been approved',
    html: layout(`<p>Dear ${esc(name)},</p>
      <p>Your end-user statement has been <strong>approved</strong>. No further action is needed
      from you.</p>
      ${copy ? '<p>The approved statement is attached for your records.</p>' : ''}`, sellerName),
    attachments: attach(copy),
  });
}

export async function sendDenied(to: string, name: string, reason: string, sellerName?: string) {
  return transporter.sendMail({
    from: sellerFrom(sellerName), to,
    subject: 'Your end-user statement has been declined',
    html: layout(`<p>Dear ${esc(name)},</p>
      <p>After review, your end-user statement has been <strong>declined</strong>.</p>
      <p><strong>Reason given:</strong> ${esc(reason)}</p>
      <p>If you think this is a mistake, reply to the supplier you ordered from.</p>`, sellerName),
  });
}

/**
 * Tells the seller a statement is waiting. Goes to the people who can act on it
 * — the owner and any Reviewer — because everyone else can only read
 * decisions, and a notification nobody can act on is noise.
 */
export async function sendNewSubmissionToCompany(
  recipients: string[],
  { sellerName, buyerName, buyerCompany }: { sellerName: string; buyerName: string; buyerCompany: string },
) {
  if (recipients.length === 0) return;
  const from = buyerCompany ? `${buyerName} (${buyerCompany})` : buyerName;
  return transporter.sendMail({
    from: { name: PLATFORM, address: FROM_ADDRESS },
    // One address per message rather than a shared To line, so recipients do not
    // see each other and each mail can be filtered on its own.
    bcc: recipients,
    subject: `New end-user statement — ${from}`,
    html: layout(`<p>A new end-user statement is waiting for review at ${esc(sellerName)}.</p>
      <p><strong>From:</strong> ${esc(from)}</p>
      <p>The automated checks (VAT, identity, substance) run on their own — the statement
      appears in your queue with their results attached.</p>
      <p><a href="${APP_URL}/company/dashboard"
        style="display:inline-block;background:#1a3160;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open the dashboard</a></p>`),
  });
}

export async function sendCompanyInvite(to: string, inviterName: string, companyName: string, inviteUrl: string) {
  return transporter.sendMail({
    from: sellerFrom(companyName), to,
    subject: `You've been invited to join ${companyName}`,
    html: layout(`<p>Hi,</p>
      <p><strong>${esc(inviterName)}</strong> has invited you to join <strong>${esc(companyName)}</strong>
      on ${PLATFORM}.</p>
      <p><a href="${esc(inviteUrl)}"
        style="display:inline-block;background:#1a3160;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Accept the invitation</a></p>
      <p>This link expires in 7 days. If you weren't expecting it, ignore this email.</p>`, companyName),
  });
}

export async function sendPasswordReset(to: string, name: string, resetUrl: string) {
  return transporter.sendMail({
    from: { name: PLATFORM, address: FROM_ADDRESS }, to,
    subject: 'Reset your password',
    html: layout(`<p>Hi ${esc(name)},</p>
      <p>Use the link below to set a new password. It works once and expires in 60 minutes.</p>
      <p><a href="${esc(resetUrl)}"
        style="display:inline-block;background:#1a3160;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Set a new password</a></p>
      <p style="color:#666">If you didn't ask for this, nothing has changed — you can ignore this
      email and your current password keeps working.</p>`),
  });
}

export async function sendEmailVerification(to: string, name: string, verifyUrl: string) {
  return transporter.sendMail({
    from: { name: PLATFORM, address: FROM_ADDRESS }, to,
    subject: 'Confirm your email address',
    html: layout(`<p>Hi ${esc(name)},</p>
      <p>Confirm this address so we can send you decisions, invitations and password resets.</p>
      <p><a href="${esc(verifyUrl)}"
        style="display:inline-block;background:#1a3160;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Confirm my email</a></p>
      <p style="color:#666">The link expires in 7 days.</p>`),
  });
}

export async function sendAdminNotification(submissionId: string, companyName: string) {
  return transporter.sendMail({
    from: { name: PLATFORM, address: FROM_ADDRESS },
    to: ADMIN_EMAIL,
    subject: 'New end-user statement pending review',
    html: layout(`<p>A new end-user statement was submitted by <strong>${esc(companyName)}</strong>
      and is pending review.</p>
      <p>Submission ID: ${esc(submissionId)}</p>`),
  });
}

/** A company asked for access. The admin decides in the dashboard. */
export async function sendAccessRequestToAdmin(companyName: string, ownerName: string, ownerEmail: string, note: string | null) {
  return transporter.sendMail({
    from: { name: PLATFORM, address: FROM_ADDRESS },
    to: ADMIN_EMAIL,
    subject: `Access request: ${companyName}`,
    html: layout(`<p><strong>${esc(companyName)}</strong> asked for access.</p>
      <p>${esc(ownerName)} &lt;${esc(ownerEmail)}&gt;</p>
      ${note ? `<blockquote style="margin:0;padding:8px 12px;border-left:3px solid #ccc;color:#444">${esc(note)}</blockquote>` : '<p style="color:#888">No note was given.</p>'}
      <p><a href="${esc(APP_URL)}/admin/dashboard"
        style="display:inline-block;background:#1a3160;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Review the request</a></p>`),
  });
}

/** The applicant's request was approved: their form is now open. */
export async function sendAccessApproved(to: string, name: string, companyName: string, formUrl: string) {
  return transporter.sendMail({
    from: { name: PLATFORM, address: FROM_ADDRESS }, to,
    subject: `${companyName} is approved`,
    html: layout(`<p>Hi ${esc(name)},</p>
      <p>Your access request for <strong>${esc(companyName)}</strong> is approved. Once your form is set up it accepts end-user statements at:</p>
      <p><a href="${esc(formUrl)}">${esc(formUrl)}</a></p>
      <p><a href="${esc(APP_URL)}/company/dashboard"
        style="display:inline-block;background:#1a3160;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Open your dashboard</a></p>`),
  });
}

/** The applicant's request was declined, with the reason given. */
export async function sendAccessRejected(to: string, name: string, companyName: string, reason: string) {
  return transporter.sendMail({
    from: { name: PLATFORM, address: FROM_ADDRESS }, to,
    // The sender address takes no replies; a reply reaches the admin who decided.
    replyTo: ADMIN_EMAIL,
    subject: `Your access request for ${companyName}`,
    html: layout(`<p>Hi ${esc(name)},</p>
      <p>Your access request for <strong>${esc(companyName)}</strong> was not approved.</p>
      <p style="padding:8px 12px;border-left:3px solid #ccc;color:#444">${esc(reason)}</p>
      <p>If you think this is a mistake, reply to this message.</p>`),
  });
}
