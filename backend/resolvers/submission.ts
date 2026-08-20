import { prisma } from '../lib/prisma.ts';
import { assertApprovable, applyOverride, clearOverride } from '../lib/overrides.ts';
import { type OverrideCategory, type IdVerificationStatus } from '../lib/approvalGate.ts';
import { checkVies, matchViesAddress, type ViesAddressMatch } from '../services/vies.ts';
import { DIDIT_ENABLED, retrieveDecision, deleteSession } from '../services/didit.ts';
import { consumeSession, sessionMatches } from '../services/diditSessionStore.ts';
import { checkSubstanceUse, SUBSTANCE_CHECK_ENABLED } from '../services/substanceCheck.ts';
import { DEFAULT_CONFIG, resolveConfig, type FormConfig } from '../lib/formConfig.ts';

// Runs the substance/use compliance check for a submission and writes
// the result back. Fire-and-forget from the submit mutation; also reused by the
// re-run mutations and the startup requeue. Never throws.
export async function runSubstanceCheck(id: string) {
  try {
    const sub = await prisma.submission.findUnique({ where: { id } });
    if (!sub) return;
    const result = await checkSubstanceUse({
      substances: sub.substances,
      casNumbers: sub.casNumbers,
      concentration: sub.concentration,
      statement: sub.statement,
      buyerType: sub.buyerType,
    });
    await prisma.submission.update({
      where: { id },
      data: {
        substanceCheckStatus: result.status,
        substanceCheckNote: result.note,
        substanceCheckedAt: new Date(),
      },
    });
  } catch (err) {
    await prisma.submission.update({
      where: { id },
      data: { substanceCheckStatus: 'ERROR', substanceCheckNote: 'Compliance check could not be completed.', substanceCheckedAt: new Date() },
    }).catch(() => {});
  }
}
import {
  sendSubmissionReceived,
  sendApproved,
  sendDenied,
  sendAdminNotification,
} from '../services/email.ts';
import { notifyCompanyOfSubmission, sellerName } from '../lib/notify.ts';
import { statementCopy } from '../lib/statementCopy.ts';

export const submissionResolvers = {
  Query: {
    submissions: (_: unknown, __: unknown, ctx: { admin?: boolean }) => {
      if (!ctx.admin) throw new Error('Unauthorized');
      return prisma.submission.findMany({ orderBy: { createdAt: 'desc' }, include: { overrides: true } });
    },
    submission: (_: unknown, { id }: { id: string }, ctx: { admin?: boolean }) => {
      if (!ctx.admin) throw new Error('Unauthorized');
      return prisma.submission.findUnique({ where: { id }, include: { overrides: true } });
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
        ['concentration', 100],
        ['statement', LONG],
        // The idDocument* fields are absent here on purpose — they are not
        // accepted from the client at all, they come back from Didit.
      ];
      for (const [field, max] of fields) {
        const val = data[field];
        if (typeof val === 'string' && val.length > max)
          throw new Error(`Field "${field}" exceeds maximum length of ${max} characters.`);
      }

      const email = typeof data.email === 'string' ? data.email.trim() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Please enter a valid email address.');
      }
      data.email = email;

      // Identity fields are never trusted from the client. The browser supplies
      // only a Didit session id; every value below is read back from Didit by
      // this server.
      const diditSessionId = typeof data.diditSessionId === 'string' ? data.diditSessionId : '';
      const {
        diditSessionId: _t,
        idMrzValid: _a,
        idLikelySynthetic: _b,
        idDocumentName: _c,
        idDocumentType: _d,
        idDocumentNumber: _e,
        buyerType: submittedBuyerType,
        companySlug,
        ...rest
      } = data as any;
      let idExpiry: string | null = null;
      let idVerification: {
        sessionId: string | null;
        status: IdVerificationStatus;
        livenessPassed: boolean | null;
        faceMatch: boolean | null;
        warnings: string | null;
        purged: boolean;
      } = { sessionId: null, status: 'NOT_CHECKED', livenessPassed: null, faceMatch: null, warnings: null, purged: false };

      // Resolve the company's form config (defaults when no slug / unknown company)
      let companyId: string | undefined;
      let config: FormConfig = DEFAULT_CONFIG;
      if (companySlug) {
        const co = await prisma.company.findUnique({ where: { slug: companySlug } });
        if (co) {
          companyId = co.id;
          config = resolveConfig(co.formConfig);
        }
      }

      // Server-side enforcement: REQUIRED fields must be present,
      // HIDDEN fields are discarded even if sent.
      const configFields: Record<'orderNumber' | 'address' | 'casNumbers' | 'concentration', string[]> = {
        orderNumber: ['orderNumber'],
        address: ['street', 'zipCode', 'place', 'country'],
        casNumbers: ['casNumbers'],
        concentration: ['concentration'],
      };
      for (const [setting, keys] of Object.entries(configFields)) {
        const mode = config[setting as keyof FormConfig];
        for (const key of keys) {
          const val = typeof rest[key] === 'string' ? rest[key].trim() : '';
          if (mode === 'HIDDEN') rest[key] = '';
          else if (mode === 'REQUIRED' && !val) throw new Error(`Field "${key}" is required.`);
          else rest[key] = val;
        }
      }

      // Buyer type governs the company-identity fields. The effective type comes
      // from the company's policy (or the buyer's choice when both are allowed).
      const buyerType: 'INDIVIDUAL' | 'COMPANY' =
        config.buyerTypes === 'COMPANY_ONLY' ? 'COMPANY'
        : config.buyerTypes === 'INDIVIDUAL_ONLY' ? 'INDIVIDUAL'
        : submittedBuyerType === 'INDIVIDUAL' || submittedBuyerType === 'COMPANY' ? submittedBuyerType
        : (() => { throw new Error('Please select whether you are an individual or a company.'); })();

      if (buyerType === 'COMPANY') {
        const companyNameVal = typeof rest.companyName === 'string' ? rest.companyName.trim() : '';
        const vatVal = typeof rest.vatNumber === 'string' ? rest.vatNumber.trim() : '';
        if (!companyNameVal) throw new Error('Company name is required.');
        if (!vatVal) throw new Error('VAT number is required.');
        rest.companyName = companyNameVal;
        rest.vatNumber = vatVal;
      } else {
        rest.companyName = '';
        rest.vatNumber = '';
      }

      // Identity section — every field is read back from Didit, never taken
      // from the request. The session must be one this server started for this
      // company's form, and it is spent here so it cannot be reused.
      if (config.idVerification === 'HIDDEN') {
        rest.idDocumentName = null;
        rest.idDocumentType = null;
        rest.idDocumentNumber = null;
      } else {
        if (!DIDIT_ENABLED) {
          throw new Error('Identity verification is temporarily unavailable — please try again later.');
        }
        if (!diditSessionId) {
          throw new Error('Please complete the identity verification step.');
        }
        // Ownership first, without spending the session: a submit that arrives
        // before the buyer finished the hosted flow must leave the verification
        // intact, otherwise they have to start (and pay for) a new one.
        if (!(await sessionMatches(diditSessionId, companyId ?? null))) {
          throw new Error('Your identity verification expired or was already used — please start it again.');
        }

        let decision;
        try {
          decision = await retrieveDecision(diditSessionId);
        } catch {
          throw new Error('We could not confirm your identity verification — please try again.');
        }

        if (decision.status === 'PENDING') {
          throw new Error('Your identity verification is not finished yet — please complete it and try again.');
        }

        // Terminal outcome: spend it. Two submissions racing on one session both
        // reach here, and only the one that wins this call proceeds.
        if (!(await consumeSession(diditSessionId, companyId ?? null))) {
          throw new Error('Your identity verification expired or was already used — please start it again.');
        }
        // Re-assert the document policy server-side. Didit is told to only
        // offer passports and identity cards, but that is a setting on their
        // side, not a control on ours.
        if (decision.documentType == null && decision.status === 'APPROVED') {
          throw new Error('Only passports and identity cards are accepted.');
        }

        // Capped even though it comes from Didit — an upstream field should not
        // be able to decide how much we write.
        rest.idDocumentName = decision.fullName?.slice(0, SHORT) ?? null;
        rest.idDocumentType = decision.documentType;
        rest.idDocumentNumber = decision.documentNumber?.slice(0, 50) ?? null;
        idExpiry = decision.expiryDate;
        idVerification = {
          sessionId: diditSessionId,
          status: decision.status,
          livenessPassed: decision.livenessPassed,
          faceMatch: decision.faceMatch,
          warnings: decision.rawDocumentType && !decision.documentType
            ? [`Unsupported document type: ${decision.rawDocumentType}`, decision.warnings].filter(Boolean).join('; ')
            : decision.warnings,
          purged: false,
        };

        // Process-and-purge: once the decision is on our side, the document
        // images Didit is holding are deleted. Only terminal outcomes are
        // purged — IN_REVIEW still needs the session for the webhook to land.
        if (decision.status === 'APPROVED' || decision.status === 'DECLINED' || decision.status === 'EXPIRED') {
          idVerification.purged = await deleteSession(diditSessionId);
        }
      }
      const idCollected = config.idVerification !== 'HIDDEN';

      // VIES check only when a VAT number was collected. The country code comes
      // from the VAT number's own prefix (e.g. NL8231...); checkVies parses it.
      let viesStatus: 'VALID' | 'INVALID' | 'ERROR' | 'NOT_CHECKED' = 'NOT_CHECKED';
      let viesName: string | null = null;
      let viesAddress: string | null = null;
      let viesAddressMatch: ViesAddressMatch = 'NOT_CHECKED';
      const vat = (rest.vatNumber as string) ?? '';
      if (vat) {
        const countryCode = vat.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
        const lookup = await checkVies(countryCode, vat);
        viesStatus = lookup.status;
        // When the VAT is valid, record the registered name/address and compare
        // it to the submitted address — for review, never to auto-deny.
        if (viesStatus === 'VALID' && buyerType === 'COMPANY') {
          viesName = lookup.name;
          viesAddress = lookup.address;
          if (config.address !== 'HIDDEN') {
            viesAddressMatch = matchViesAddress(
              { street: rest.street as string, zipCode: rest.zipCode as string, place: rest.place as string },
              viesAddress,
            );
          }
        }
      }
      // Queue the background substance/use compliance check when we have enough
      // to check (substance + CAS) and the feature is configured.
      const willCheckSubstance =
        SUBSTANCE_CHECK_ENABLED &&
        !!(rest.substances as string)?.trim() &&
        !!(rest.casNumbers as string)?.trim();

      const submission = await prisma.submission.create({
        data: {
          ...rest,
          idDataCollectedAt: idCollected ? new Date() : null,
          idDocumentExpiry: idCollected && idExpiry ? new Date(idExpiry) : null,
          idVerificationSessionId: idVerification.sessionId,
          idVerificationStatus: idVerification.status,
          idLivenessPassed: idVerification.livenessPassed,
          idFaceMatch: idVerification.faceMatch,
          idVerificationWarnings: idVerification.warnings,
          idVerificationPurged: idVerification.purged,
          idVerificationCheckedAt: idCollected ? new Date() : null,
          viesStatus,
          viesName,
          viesAddress,
          viesAddressMatch,
          buyerType,
          substanceCheckStatus: willCheckSubstance ? 'PENDING' : 'NOT_CHECKED',
          status: 'PENDING_REVIEW',
          ...(companyId ? { companyId } : {}),
        },
      });

      const name = `${submission.firstName} ${submission.lastName}`;
      const seller = await sellerName(companyId);

      // No auto-decisions: every submission goes to manual review (an invalid VAT
      // is surfaced as a flag in the dashboard, not an automatic rejection).
      // The buyer keeps their own copy — the declaration as submitted, without
      // any identity document details.
      const copy = await statementCopy(submission);
      await sendSubmissionReceived(submission.email, name, seller, copy).catch(() => {});
      await sendAdminNotification(submission.id, submission.companyName).catch(() => {});
      // The seller has to learn about this from something other than refreshing
      // the dashboard.
      void notifyCompanyOfSubmission(companyId, {
        buyerName: name,
        buyerCompany: submission.companyName,
      });

      // Background — don't make the customer wait for the LLM round-trip.
      if (willCheckSubstance) void runSubstanceCheck(submission.id);

      return submission;
    },

    approveSubmission: async (_: unknown, { id }: { id: string }, ctx: { admin?: boolean; adminId?: string }) => {
      if (!ctx.admin) throw new Error('Unauthorized');

      await assertApprovable(id);
      const submission = await prisma.submission.update({
        where: { id },
        data: { status: 'APPROVED', reviewedById: ctx.adminId ?? 'admin', reviewedByName: 'Admin', reviewedAt: new Date() },
        include: { overrides: true },
      });

      const name = `${submission.firstName} ${submission.lastName}`;
      await sendApproved(
        submission.email, name, await sellerName(submission.companyId), await statementCopy(submission),
      ).catch(() => {});

      return submission;
    },

    denySubmission: async (
      _: unknown,
      { id, reason }: { id: string; reason: string },
      ctx: { admin?: boolean; adminId?: string }
    ) => {
      if (!ctx.admin) throw new Error('Unauthorized');

      const submission = await prisma.submission.update({
        where: { id },
        data: { status: 'DENIED', adminNote: reason, reviewedById: ctx.adminId ?? 'admin', reviewedByName: 'Admin', reviewedAt: new Date() },
        include: { overrides: true },
      });

      const name = `${submission.firstName} ${submission.lastName}`;
      await sendDenied(submission.email, name, reason, await sellerName(submission.companyId)).catch(() => {});

      return submission;
    },

    overrideSubmissionCheck: async (
      _: unknown,
      { id, category, reason }: { id: string; category: OverrideCategory; reason: string },
      ctx: { admin?: boolean; adminId?: string }
    ) => {
      if (!ctx.admin) throw new Error('Unauthorized');
      return applyOverride(id, category, reason, ctx.adminId ?? 'admin', 'Admin');
    },

    clearSubmissionCheckOverride: async (
      _: unknown,
      { id, category }: { id: string; category: OverrideCategory },
      ctx: { admin?: boolean }
    ) => {
      if (!ctx.admin) throw new Error('Unauthorized');
      return clearOverride(id, category);
    },

    recheckSubmissionSubstance: async (_: unknown, { id }: { id: string }, ctx: { admin?: boolean }) => {
      if (!ctx.admin) throw new Error('Unauthorized');
      if (!SUBSTANCE_CHECK_ENABLED) throw new Error('Substance check is not configured.');
      const submission = await prisma.submission.update({
        where: { id },
        data: { substanceCheckStatus: 'PENDING' },
        include: { overrides: true },
      });
      void runSubstanceCheck(id);
      return submission;
    },
  },
};
