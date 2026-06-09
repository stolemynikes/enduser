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

const FROM = process.env.SMTP_FROM ?? 'noreply@enduser.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@enduser.com';

export async function sendSubmissionReceived(to: string, name: string) {
  await transporter.sendMail({
    from: FROM, to,
    subject: 'We received your end-user statement',
    html: `<p>Dear ${esc(name)},</p>
    <p>We have received your end-user statement and it is currently under review. You will be notified once a decision has been made.</p>
    <p>Kind regards,<br/>EndUser Team</p>`,
  });
}

export async function sendAutoRejected(to: string, name: string) {
  await transporter.sendMail({
    from: FROM, to,
    subject: 'Your end-user statement could not be verified',
    html: `<p>Dear ${esc(name)},</p>
    <p>Unfortunately we were unable to verify your company's VAT number through the VIES system. Your submission has been denied.</p>
    <p>If you believe this is an error, please contact us directly.</p>
    <p>Kind regards,<br/>EndUser Team</p>`,
  });
}

export async function sendApproved(to: string, name: string) {
  await transporter.sendMail({
    from: FROM, to,
    subject: 'Your end-user statement has been approved',
    html: `<p>Dear ${esc(name)},</p>
    <p>We are pleased to inform you that your end-user statement has been <strong>approved</strong>.</p>
    <p>Kind regards,<br/>EndUser Team</p>`,
  });
}

export async function sendDenied(to: string, name: string, reason: string) {
  await transporter.sendMail({
    from: FROM, to,
    subject: 'Your end-user statement has been denied',
    html: `<p>Dear ${esc(name)},</p>
    <p>After review, your end-user statement has been <strong>denied</strong>.</p>
    <p><strong>Reason:</strong> ${esc(reason)}</p>
    <p>If you have questions, please contact us directly.</p>
    <p>Kind regards,<br/>EndUser Team</p>`,
  });
}

export async function sendAdminNotification(submissionId: string, companyName: string) {
  await transporter.sendMail({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: 'New end-user statement pending review',
    html: `<p>A new end-user statement has been submitted by <strong>${esc(companyName)}</strong> and is pending review.</p>
    <p>Submission ID: ${esc(submissionId)}</p>
    <p>Please log in to the dashboard to review it.</p>`,
  });
}
