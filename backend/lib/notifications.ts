// The dashboard's notification stream.
//
// Email and this are split on one question: can the person who needs to hear it
// still log in? Anything that matters when you are locked out — a password
// changed, an account scheduled for erasure, access revoked — stays email,
// because an in-app message would land in a session the wrong person may hold.
// Everything operational lives here: a statement arrived, a check came back
// bad, this buyer has been here before. That stream had no home at all before.
//
// Never throws. A notification that fails to write must not fail the action it
// was describing.
import { prisma } from './prisma.ts';

export type NotificationKind =
  | 'SUBMISSION_RECEIVED'
  | 'SUBSTANCE_FLAGGED'
  | 'VIES_INVALID'
  | 'IDENTITY_DECLINED'
  | 'DOCUMENT_EXPIRING'
  | 'DUPLICATE_SEEN'
  | 'ROLE_CHANGED'
  | 'INVITE_ACCEPTED'
  | 'SUPPORT_ACCESS';

type NewNotification = {
  companyId: string | null | undefined;
  kind: NotificationKind;
  title: string;
  body?: string | null;
  submissionId?: string | null;
  /** Set when the message concerns one person; null reaches everyone who can act. */
  userId?: string | null;
};

/** How many rows one tenant's bell keeps. Older ones are dropped on write. */
const KEEP_PER_COMPANY = 200;

export async function notify(input: NewNotification): Promise<void> {
  if (!input.companyId) return;
  try {
    await prisma.notification.create({
      data: {
        companyId: input.companyId,
        userId: input.userId ?? null,
        kind: input.kind,
        title: input.title.slice(0, 200),
        body: input.body?.slice(0, 600) ?? null,
        submissionId: input.submissionId ?? null,
      },
    });
    await trim(input.companyId);
  } catch (err: any) {
    console.error(`[notify] could not record a notification: ${err?.message ?? 'unknown error'}`);
  }
}

/**
 * Keeps a tenant's stream bounded. A busy seller would otherwise accumulate a
 * row per submission forever, and nobody scrolls back 10,000 messages.
 */
async function trim(companyId: string): Promise<void> {
  const count = await prisma.notification.count({ where: { companyId } });
  if (count <= KEEP_PER_COMPANY) return;
  const oldest = await prisma.notification.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    skip: KEEP_PER_COMPANY,
    select: { id: true },
  });
  if (oldest.length > 0) {
    await prisma.notification.deleteMany({ where: { id: { in: oldest.map(o => o.id) } } });
  }
}

/**
 * Everything worth saying about one freshly submitted statement, in one call.
 *
 * The arrival itself is always announced. A failing check gets its own line
 * rather than being folded into the first, because a reviewer skimming the bell
 * is deciding which row to open — "VAT not valid" is the reason to open it, and
 * burying that inside "new statement" wastes the notification.
 */
export async function notifySubmission(
  companyId: string | null | undefined,
  submission: {
    id: string;
    firstName: string;
    lastName: string;
    companyName: string;
    viesStatus: string;
    idVerificationStatus: string;
    idDocumentExpiry?: Date | null;
  },
): Promise<void> {
  if (!companyId) return;
  const who = submission.companyName
    ? `${submission.firstName} ${submission.lastName} (${submission.companyName})`
    : `${submission.firstName} ${submission.lastName}`;

  await notify({
    companyId, kind: 'SUBMISSION_RECEIVED', submissionId: submission.id,
    title: 'New end-user statement', body: `From ${who} — waiting for review.`,
  });

  if (submission.viesStatus === 'INVALID') {
    await notify({
      companyId, kind: 'VIES_INVALID', submissionId: submission.id,
      title: 'VAT number could not be validated',
      body: `${who} gave a VAT number the EU register does not recognise.`,
    });
  }

  if (submission.idVerificationStatus === 'DECLINED') {
    await notify({
      companyId, kind: 'IDENTITY_DECLINED', submissionId: submission.id,
      title: 'Identity verification was declined',
      body: `The identity check for ${who} did not pass.`,
    });
  }

  // Three months is enough notice to ask for a current document before the
  // statement is needed, and short enough not to flag every ordinary passport.
  const expiry = submission.idDocumentExpiry;
  if (expiry) {
    const days = Math.round((new Date(expiry).getTime() - Date.now()) / 86_400_000);
    if (days >= 0 && days <= 90) {
      await notify({
        companyId, kind: 'DOCUMENT_EXPIRING', submissionId: submission.id,
        title: 'Identity document expires soon',
        body: `${who}'s document expires in ${days} day${days === 1 ? '' : 's'}.`,
      });
    }
  }
}
