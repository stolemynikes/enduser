import { prisma } from '../lib/prisma.ts';
import { checkVies } from '../services/vies.ts';
import {
  sendSubmissionReceived,
  sendAutoRejected,
  sendApproved,
  sendDenied,
  sendAdminNotification,
} from '../services/email.ts';

export const submissionResolvers = {
  Query: {
    submissions: (_: unknown, __: unknown, ctx: { admin?: boolean }) => {
      if (!ctx.admin) throw new Error('Unauthorized');
      return prisma.submission.findMany({ orderBy: { createdAt: 'desc' } });
    },
    submission: (_: unknown, { id }: { id: string }, ctx: { admin?: boolean }) => {
      if (!ctx.admin) throw new Error('Unauthorized');
      return prisma.submission.findUnique({ where: { id } });
    },
  },

  Mutation: {
    submitEndUserStatement: async (
      _: unknown,
      { input }: { input: Record<string, string | boolean> }
    ) => {
      const { agreedToTerms, ...data } = input;
      if (!agreedToTerms) throw new Error('You must agree to the terms and conditions.');

      const SHORT = 255, LONG = 2000;
      const fields: [string, number][] = [
        ['email', SHORT], ['orderNumber', SHORT], ['firstName', SHORT], ['lastName', SHORT],
        ['street', SHORT], ['zipCode', 20], ['place', SHORT], ['country', SHORT],
        ['companyName', SHORT], ['vatNumber', 50], ['substances', SHORT], ['casNumbers', SHORT],
        ['statement', LONG], ['idDocumentName', SHORT], ['idDocumentNumber', 50],
      ];
      for (const [field, max] of fields) {
        const val = data[field];
        if (typeof val === 'string' && val.length > max)
          throw new Error(`Field "${field}" exceeds maximum length of ${max} characters.`);
      }

      const countryCode = (data.country as string).slice(0, 2).toUpperCase();
      const viesStatus = await checkVies(countryCode, data.vatNumber as string);

      const autoDenied = viesStatus === 'INVALID';

      const submission = await prisma.submission.create({
        data: {
          ...(data as any),
          idDataCollectedAt: new Date(),
          viesStatus,
          status: autoDenied ? 'DENIED' : 'PENDING_REVIEW',
        },
      });

      const name = `${submission.firstName} ${submission.lastName}`;

      if (autoDenied) {
        await sendAutoRejected(submission.email, name).catch(() => {});
      } else {
        await sendSubmissionReceived(submission.email, name).catch(() => {});
        await sendAdminNotification(submission.id, submission.companyName).catch(() => {});
      }

      return submission;
    },

    approveSubmission: async (_: unknown, { id }: { id: string }, ctx: { admin?: boolean }) => {
      if (!ctx.admin) throw new Error('Unauthorized');

      const submission = await prisma.submission.update({
        where: { id },
        data: { status: 'APPROVED' },
      });

      const name = `${submission.firstName} ${submission.lastName}`;
      await sendApproved(submission.email, name).catch(() => {});

      return submission;
    },

    denySubmission: async (
      _: unknown,
      { id, reason }: { id: string; reason: string },
      ctx: { admin?: boolean }
    ) => {
      if (!ctx.admin) throw new Error('Unauthorized');

      const submission = await prisma.submission.update({
        where: { id },
        data: { status: 'DENIED', adminNote: reason },
      });

      const name = `${submission.firstName} ${submission.lastName}`;
      await sendDenied(submission.email, name, reason).catch(() => {});

      return submission;
    },
  },
};
