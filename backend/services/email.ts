import 'dotenv/config';
import nodemailer from 'nodemailer';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

const FROM_ADDRESS = process.env.SMTP_FROM ?? 'noreply@enduser.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@enduser.com';
const APP_URL = (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
const PLATFORM = 'EU Statement';

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
  await transporter.sendMail({
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
  await transporter.sendMail({
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
  await transporter.sendMail({
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
 * — the owner and any Employee+ — because everyone else can only read
 * decisions, and a notification nobody can act on is noise.
 */
export async function sendNewSubmissionToCompany(
  recipients: string[],
  { sellerName, buyerName, buyerCompany }: { sellerName: string; buyerName: string; buyerCompany: string },
) {
  if (recipients.length === 0) return;
  const from = buyerCompany ? `${buyerName} (${buyerCompany})` : buyerName;
  await transporter.sendMail({
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
  await transporter.sendMail({
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
  await transporter.sendMail({
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
  await transporter.sendMail({
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
  await transporter.sendMail({
    from: { name: PLATFORM, address: FROM_ADDRESS },
    to: ADMIN_EMAIL,
    subject: 'New end-user statement pending review',
    html: layout(`<p>A new end-user statement was submitted by <strong>${esc(companyName)}</strong>
      and is pending review.</p>
      <p>Submission ID: ${esc(submissionId)}</p>`),
  });
}
