// How much mail one address may receive from the public surface.
//
// Both the submission form and the password-reset request send mail to an
// address the caller types, without proving they own it. Unbudgeted, that is a
// mailer pointed at someone else's inbox, wearing this platform's sending
// domain — and the reputation damage lands here, not on the attacker.
//
// Addresses are counted by HMAC, so the budget table holds no readable
// recipients.
import { prisma } from './prisma.ts';
import { pseudonym } from './tokens.ts';

/** Per-kind budget: how many messages, over how many minutes. */
const BUDGETS: Record<string, { max: number; minutes: number }> = {
  // A buyer legitimately submitting twice in an hour is plausible; ten is not.
  submission: { max: 5, minutes: 60 },
  // One person forgetting their password needs one or two links.
  reset: { max: 3, minutes: 60 },
  verification: { max: 3, minutes: 60 },
  // An invitation is mail this platform sends, in a seller's wording, to an
  // address the seller typed. Signing up is free, so the budget is what stops
  // a throwaway account from becoming a phishing mailer on our domain.
  invite: { max: 3, minutes: 60 },
  // Keyed on the company rather than a recipient: a cap on how much invite
  // mail one tenant can generate however many addresses it spreads it over.
  'invite-tenant': { max: 20, minutes: 24 * 60 },
  // Seller notifications and the platform's own queue alert are triggered by
  // the public form, so they are budgeted per tenant / per inbox too.
  'seller-notify': { max: 60, minutes: 60 },
  'admin-notify': { max: 60, minutes: 60 },
  // Sign-ups notify the platform admin. Generous for real interest, small
  // enough that a scripted burst of registrations cannot flood the inbox.
  'access-request': { max: 20, minutes: 60 },
  // The applicant hears about the decision once; a decision is not repeated.
  'access-decision': { max: 5, minutes: 60 },
  // The nightly maintenance alert: one a night is the design, three is slack.
  'ops-alert': { max: 3, minutes: 24 * 60 },
};

/**
 * Records an intent to send and reports whether it fits the budget. Fails open
 * on a database error: losing a receipt because the counter is unavailable is
 * worse than sending one too many.
 */
export async function mailBudgetAllows(recipient: string, kind: keyof typeof BUDGETS | string): Promise<boolean> {
  const budget = BUDGETS[kind];
  if (!budget) return true;
  const recipientHash = pseudonym(recipient);
  const since = new Date(Date.now() - budget.minutes * 60_000);
  try {
    const used = await prisma.mailBudget.count({ where: { recipientHash, kind, sentAt: { gte: since } } });
    if (used >= budget.max) {
      console.warn(`[mail] budget reached for a recipient (${kind}) — message not sent`);
      return false;
    }
    await prisma.mailBudget.create({ data: { recipientHash, kind } });
    return true;
  } catch (err: any) {
    console.error(`[mail] budget check failed: ${err?.message ?? 'unknown error'}`);
    return true;
  }
}

/** Drops spent budget rows. Called from the nightly maintenance job. */
export async function pruneMailBudget(): Promise<number> {
  const { count } = await prisma.mailBudget.deleteMany({
    where: { sentAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  return count;
}
