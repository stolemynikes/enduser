import { prisma } from '../lib/prisma.ts';
import { applyOverride, claimSubstanceRecheck, clearOverride, decideSubmission } from '../lib/overrides.ts';
import { type OverrideCategory, type IdVerificationStatus } from '../lib/approvalGate.ts';
import { checkVies, matchViesAddress, type ViesAddressMatch } from '../services/vies.ts';
import { DIDIT_ENABLED, retrieveDecision, deleteSession, type DiditDecision } from '../services/didit.ts';
import { consumeSession, sessionMatches } from '../services/diditSessionStore.ts';
import { checkSubstanceUse, SUBSTANCE_CHECK_ENABLED } from '../services/substanceCheck.ts';
import { TRANSLATION_ENABLED, translateStatement } from '../services/translate.ts';
import { DEFAULT_CONFIG, resolveConfig, type FormConfig } from '../lib/formConfig.ts';

// The ISO codes the public form is offered in (frontend/src/i18n/languages.ts).
const FORM_LOCALES = new Set(['bg', 'cs', 'da', 'de', 'el', 'en', 'es', 'et', 'fi', 'fr', 'ga', 'hr',
  'hu', 'it', 'lt', 'lv', 'mt', 'nl', 'pl', 'pt', 'ro', 'sk', 'sl', 'sv']);

/**
 * Detects the stated use's language and stores a translation when one helps.
 * Runs once per submission: `statementLang` is set afterwards ('' meaning
 * "looked, could not tell"). Left unset when the translator was down, so the
 * next check re-run tries again. Returns the row, translated or not.
 */
export async function ensureTranslation(id: string) {
  const sub = await prisma.submission.findUnique({ where: { id } });
  if (!sub || sub.statementLang != null) return sub;
  const { lang, translation, unavailable } = await translateStatement(sub.statement, sub.locale);
  if (unavailable) return sub;
  return prisma.submission.update({
    where: { id },
    data: { statementLang: lang ?? '', statementTranslation: translation },
  });
}

// Runs the substance/use compliance check for a submission and writes
// the result back. Fire-and-forget from the submit mutation; also reused by the
// re-run mutations and the startup requeue. Never throws.
export async function runSubstanceCheck(id: string) {
  try {
    // Translated first, once, so the screen below can read the translation
    // too. A re-run reuses it rather than translating the same text again.
    const sub = await ensureTranslation(id);
    if (!sub) return;
    const result = await checkSubstanceUse({
      substances: sub.substances,
      casNumbers: sub.casNumbers,
      concentration: sub.concentration,
      statement: sub.statement,
      statementTranslation: sub.statementTranslation,
      statementLang: sub.statementLang || null,
      // Still unset after ensureTranslation means the translator could not be
      // reached this time — said in the note, so a green result for a
      // statement nobody could read is not mistaken for a screened one.
      translationUnavailable: TRANSLATION_ENABLED && sub.statementLang == null,
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
    // The check finishes after the buyer is gone and after the arrival
    // notification has been written, so a flag needs its own line — otherwise
    // the one result that asks for a human lands in silence.
    if (result.status === 'FLAGGED') {
      await notify({
        companyId: sub.companyId, kind: 'SUBSTANCE_FLAGGED', submissionId: id,
        title: 'Substance check flagged a statement',
        body: `${sub.firstName} ${sub.lastName} — ${result.note}`.slice(0, 600),
      });
    }
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
import { verifyHumanOrThrow } from '../services/turnstile.ts';
import { mailBudgetAllows } from '../lib/mailBudget.ts';
import { statementCopy } from '../lib/statementCopy.ts';
import { matchKeys } from '../lib/matchKeys.ts';
import { buyerError, type BuyerErrorCode } from '../lib/buyerError.ts';
import { recordEvent } from '../lib/ops.ts';
import { checkStatement } from '../lib/statementCheck.ts';
import { requireAdmin } from '../lib/adminGuard.ts';
import { formOpen } from '../lib/access.ts';
import { revealDocumentNumber } from '../lib/reveal.ts';
import { secondFactorError, mfaSetupRequiredError } from './auth.ts';
import { notifySubmission, notify } from '../lib/notifications.ts';
import { findPriorApprovals } from '../lib/duplicates.ts';

/** Nobody under this age may be supplied a listed precursor. */
import { MINIMUM_AGE, nameMismatchWarning, verifiedName } from '../lib/diditReconcile.ts';


export const submissionResolvers = {
  Query: {
    checkStatement: (_: unknown, { reference, code }: { reference: string; code: string }) =>
      checkStatement(reference, code),

    /**
     * The platform-wide queue. Paged: unbounded, this decrypted every
     * submission in the database into one response, so a single click turned
     * into a memory spike proportional to the whole platform's history.
     */
    submissions: (
      _: unknown,
      { limit, offset }: { limit?: number; offset?: number },
      ctx: { admin?: boolean },
    ) => {
      requireAdmin(ctx);
      return prisma.submission.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { overrides: true },
        take: Math.min(Math.max(limit ?? 200, 1), 200),
        skip: Math.max(offset ?? 0, 0),
      });
    },
    submission: (_: unknown, { id }: { id: string }, ctx: { admin?: boolean }) => {
      requireAdmin(ctx);
      return prisma.submission.findUnique({ where: { id }, include: { overrides: true } });
    },
  },

  Mutation: {
    submitEndUserStatement: async (
      _: unknown,
      { input }: { input: Record<string, string | boolean> }
    ) => {
      const { agreedToTerms, turnstileToken, ...data } = input as Record<string, any>;
      // The form is public and every submission costs outbound work — a VIES
      // lookup, PubChem calls, mail — so the first question is whether there is
      // a person here at all.
      await verifyHumanOrThrow(typeof turnstileToken === 'string' ? turnstileToken : undefined);
      if (!agreedToTerms) throw buyerError('TERMS_REQUIRED', 'You must agree to the terms and conditions.');

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
          throw buyerError('FIELD_TOO_LONG', `Field "${field}" exceeds maximum length of ${max} characters.`);
      }

      const email = typeof data.email === 'string' ? data.email.trim() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw buyerError('INVALID_EMAIL', 'Please enter a valid email address.');
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
        locale: submittedLocale,
        ...rest
      } = data as any;
      // Stored only when it is one of the form's own languages: it is shown to
      // reviewers and steers translation, so free text has no business here.
      const locale = typeof submittedLocale === 'string' && FORM_LOCALES.has(submittedLocale) ? submittedLocale : null;
      let idExpiry: string | null = null;
      let verifiedDecision: DiditDecision | null = null;
      let idVerification: {
        sessionId: string | null;
        status: IdVerificationStatus;
        livenessPassed: boolean | null;
        faceMatch: boolean | null;
        warnings: string | null;
        purged: boolean;
      } = { sessionId: null, status: 'NOT_CHECKED', livenessPassed: null, faceMatch: null, warnings: null, purged: false };

      // A statement belongs to an open company's form. One with no form, or a
      // form address nobody owns, used to be accepted into the platform queue
      // under the default settings — a statement nobody had asked for.
      let companyId: string | undefined;
      let config: FormConfig = DEFAULT_CONFIG;
      if (!companySlug) {
        throw buyerError('FORM_NOT_OPEN', 'This form is not accepting submissions yet.');
      }
      if (companySlug) {
        const co = await prisma.company.findUnique({ where: { slug: companySlug } });
        if (co) {
          // Enforced here as well as in formInfo, by the one rule both use
          // (lib/access.ts formOpen): a form belonging to an unconfirmed or
          // unapproved account accepts nothing, so registering under someone
          // else's address buys an attacker a dead page rather than a working
          // collection point.
          if (!(await formOpen(co.id))) {
            throw buyerError('FORM_NOT_OPEN', 'This form is not accepting submissions yet.');
          }
          companyId = co.id;
          config = resolveConfig(co.formConfig);
        } else {
          throw buyerError('FORM_NOT_OPEN', 'This form is not accepting submissions yet.');
        }
      }

      // The core fields every form collects (lib/formConfig.ts). The form
      // requires them too, but only this check holds for a direct API call —
      // and a blank substance would skip the substance check, which counts as
      // green at approval.
      for (const key of ['firstName', 'lastName', 'substances', 'statement']) {
        if (typeof rest[key] !== 'string' || !rest[key].trim()) {
          throw buyerError('FIELD_REQUIRED', `Field "${key}" is required.`);
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
          else if (mode === 'REQUIRED' && !val) throw buyerError('FIELD_REQUIRED', `Field "${key}" is required.`);
          else rest[key] = val;
        }
      }

      // Buyer type governs the company-identity fields. The effective type comes
      // from the company's policy (or the buyer's choice when both are allowed).
      const buyerType: 'INDIVIDUAL' | 'COMPANY' =
        config.buyerTypes === 'COMPANY_ONLY' ? 'COMPANY'
        : config.buyerTypes === 'INDIVIDUAL_ONLY' ? 'INDIVIDUAL'
        : submittedBuyerType === 'INDIVIDUAL' || submittedBuyerType === 'COMPANY' ? submittedBuyerType
        : (() => { throw buyerError('BUYER_TYPE_REQUIRED', 'Please select whether you are an individual or a company.'); })();

      if (buyerType === 'COMPANY') {
        const companyNameVal = typeof rest.companyName === 'string' ? rest.companyName.trim() : '';
        const vatVal = typeof rest.vatNumber === 'string' ? rest.vatNumber.trim() : '';
        if (!companyNameVal) throw buyerError('COMPANY_NAME_REQUIRED', 'Company name is required.');
        if (!vatVal) throw buyerError('VAT_REQUIRED', 'VAT number is required.');
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
          throw buyerError('ID_UNAVAILABLE', 'Identity verification is temporarily unavailable — please try again later.');
        }
        if (!diditSessionId) {
          throw buyerError('ID_REQUIRED', 'Please complete the identity verification step.');
        }
        // Ownership first, without spending the session: a submit that arrives
        // before the buyer finished the hosted flow must leave the verification
        // intact, otherwise they have to start (and pay for) a new one.
        if (!(await sessionMatches(diditSessionId, companyId ?? null))) {
          throw buyerError('ID_EXPIRED', 'Your identity verification expired or was already used — please start it again.');
        }

        let decision;
        try {
          decision = await retrieveDecision(diditSessionId);
        } catch {
          throw buyerError('ID_UNCONFIRMED', 'We could not confirm your identity verification — please try again.');
        }

        if (decision.status === 'PENDING') {
          throw buyerError('ID_UNFINISHED', 'Your identity verification is not finished yet — please complete it and try again.');
        }

        // Terminal outcome: spend it. Two submissions racing on one session both
        // reach here, and only the one that wins this call proceeds.
        if (!(await consumeSession(diditSessionId, companyId ?? null))) {
          throw buyerError('ID_EXPIRED', 'Your identity verification expired or was already used — please start it again.');
        }
        // Re-assert the document policy server-side. Didit is told to only
        // offer passports and identity cards, but that is a setting on their
        // side, not a control on ours.
        // A refusal from here on ends this verification for good: the session
        // is spent and no submission will own it. Its photos are deleted at
        // Didit now rather than by the nightly prune — for an under-age buyer
        // especially, a day is too long to keep them.
        const refuse = async (code: BuyerErrorCode, message: string): Promise<never> => {
          if (await deleteSession(diditSessionId)) {
            recordEvent('didit-purge-refused');
            // Done with it: left in place, the nightly prune would see a spent
            // session no submission owns and try to delete it a second time.
            await prisma.verificationSession.deleteMany({ where: { sessionId: diditSessionId } }).catch(() => {});
          }
          throw buyerError(code, message);
        };

        if (decision.documentType == null && decision.status === 'APPROVED') {
          await refuse('ID_DOCUMENT_TYPE', 'Only passports and identity cards are accepted.');
        }

        // Age is checked here and nowhere else, because here is the only place
        // it is known: the document says so, the buyer does not. Under age the
        // submission is refused outright rather than stored and declined — a
        // minor's passport number is not something to keep a record of in order
        // to say no to them.
        if (decision.age != null && decision.age < MINIMUM_AGE) {
          console.warn('[submit] refused: buyer is under the minimum age');
          await refuse(
            'UNDER_AGE',
            `You must be at least ${MINIMUM_AGE} years old to submit an end-user statement.`,
          );
        }

        // Capped even though it comes from Didit — an upstream field should not
        // be able to decide how much we write.
        rest.idDocumentName = decision.fullName?.slice(0, SHORT) ?? null;
        rest.idDocumentType = decision.documentType;
        rest.idDocumentNumber = decision.documentNumber?.slice(0, 50) ?? null;
        idExpiry = decision.expiryDate;
        verifiedDecision = decision;
        idVerification = {
          sessionId: diditSessionId,
          status: decision.status,
          livenessPassed: decision.livenessPassed,
          faceMatch: decision.faceMatch,
          warnings: [
            decision.rawDocumentType && !decision.documentType
              ? `Unsupported document type: ${decision.rawDocumentType}` : null,
            // Silence here would read as "age is fine". It is not known.
            decision.age == null && decision.status === 'APPROVED'
              ? 'Date of birth was not supplied — age could not be verified' : null,
            decision.warnings,
          ].filter(Boolean).join('; ') || null,
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
      // Every submission is checked. This used to require a CAS number, and a
      // form with the CAS field hidden therefore never had its stated use
      // screened — while "not checked" counts as green at approval. Without a
      // CAS the check identifies the substance by name instead.
      const willCheckSubstance = SUBSTANCE_CHECK_ENABLED && !!(rest.substances as string)?.trim();

      // Compared on the verified document only: a name Didit has not confirmed
      // has nothing to be checked against. On a mismatch the document's name
      // becomes the buyer's name and the typed one is kept apart
      // (lib/diditReconcile.ts verifiedName).
      const verified = verifiedDecision
        ? verifiedName(verifiedDecision, { firstName: String(rest.firstName ?? ''), lastName: String(rest.lastName ?? '') })
        : null;
      const nameMatch = verified ? verified.idNameMatches : null;
      if (verified) Object.assign(rest, verified);

      const submission = await prisma.submission.create({
        data: {
          ...rest,
          // Deterministic fingerprints, so a reviewer can be told this buyer
          // has been here before — see lib/matchKeys.ts. Scoped to the tenant,
          // which is why the company id is the first argument and why a
          // submission belonging to no company carries none.
          ...matchKeys(companyId, {
            idDocumentNumber: rest.idDocumentNumber as string | null,
            vatNumber: rest.vatNumber as string | null,
            casNumbers: rest.casNumbers as string | null,
            substances: rest.substances as string | null,
          }),
          idDataCollectedAt: idCollected ? new Date() : null,
          idDocumentExpiry: idCollected && idExpiry ? new Date(idExpiry) : null,
          idVerificationSessionId: idVerification.sessionId,
          idVerificationStatus: idVerification.status,
          idLivenessPassed: idVerification.livenessPassed,
          idFaceMatch: idVerification.faceMatch,
          idVerificationWarnings: nameMatch === false
            ? [nameMismatchWarning(verified), idVerification.warnings].filter(Boolean).join('; ').slice(0, 1000)
            : idVerification.warnings,
          // The terms as the buyer saw them, so the PDF and emails keep
          // showing what was agreed to after the seller edits the form.
          termsText: config.customTermsMode === 'TEXT' ? config.customTermsText || null : null,
          termsUrl: config.customTermsMode === 'LINK' ? config.customTermsUrl || null : null,
          idVerificationPurged: idVerification.purged,
          idVerificationCheckedAt: idCollected ? new Date() : null,
          viesStatus,
          viesName,
          viesAddress,
          viesAddressMatch,
          buyerType,
          locale,
          substanceCheckStatus: willCheckSubstance ? 'PENDING' : 'NOT_CHECKED',
          status: 'PENDING_REVIEW',
          ...(companyId ? { companyId } : {}),
        },
      });

      const name = `${submission.firstName} ${submission.lastName}`;
      const seller = await sellerName(companyId);

      // No auto-decisions: every submission goes to manual review (an invalid VAT
      // is surfaced as a flag in the dashboard, not an automatic rejection).
      // The receipt goes to an address nobody has proved they own, so it stays
      // small and budgeted: no attachment here. The buyer's copy is attached to
      // the approval instead, once a person has decided.
      if (await mailBudgetAllows(submission.email, 'submission')) {
        await sendSubmissionReceived(submission.email, name, seller).catch(() => {});
      }
      // Same reasoning as the seller notification: the public form decides how
      // often this fires, so it gets a budget rather than a promise.
      if (await mailBudgetAllows('platform-queue', 'admin-notify')) {
        await sendAdminNotification(submission.id, submission.companyName).catch(() => {});
      }
      // The seller has to learn about this from something other than refreshing
      // the dashboard: email for the inbox they already watch, and the bell for
      // the dashboard they are already looking at.
      void notifyCompanyOfSubmission(companyId, {
        buyerName: name,
        buyerCompany: submission.companyName,
      });
      void notifySubmission(companyId, submission);

      // "You have approved this before" is worth knowing at the moment the row
      // appears, not only once someone opens it.
      void findPriorApprovals(submission).then(async prior => {
        if (prior.total === 0) return;
        const first = prior.matches[0];
        if (!first) return;
        await notify({
          companyId, kind: 'DUPLICATE_SEEN', submissionId: submission.id,
          title: 'This request has been approved before',
          body: `${name} asked for the same substances on `
            + `${first.approvedAt ? new Date(first.approvedAt).toLocaleDateString('en-GB') : 'an earlier date'}`
            + `${first.approvedByName ? `, approved by ${first.approvedByName}` : ''}.`,
        });
      }).catch(() => {});

      // Background — don't make the customer wait for the LLM round-trip.
      // The check translates first. A form without CAS numbers gets no check,
      // but its stated use still deserves a translation the reviewer can read.
      if (willCheckSubstance) void runSubstanceCheck(submission.id);
      else void ensureTranslation(submission.id).catch(() => {});

      return submission;
    },

    approveSubmission: async (_: unknown, { id }: { id: string }, ctx: { admin?: boolean; adminId?: string }) => {
      requireAdmin(ctx);

      const submission = await decideSubmission(id, null, 'APPROVED', {
        reviewedById: ctx.adminId ?? 'admin', reviewedByName: 'Admin', reviewedAt: new Date(),
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
      requireAdmin(ctx);

      const note = typeof reason === 'string' ? reason.trim().slice(0, 1000) : '';
      if (!note) throw new Error('A reason is required.');
      const submission = await decideSubmission(id, null, 'DENIED', {
        adminNote: note, reviewedById: ctx.adminId ?? 'admin', reviewedByName: 'Admin', reviewedAt: new Date(),
      });

      const name = `${submission.firstName} ${submission.lastName}`;
      await sendDenied(submission.email, name, note, await sellerName(submission.companyId)).catch(() => {});

      return submission;
    },

    overrideSubmissionCheck: async (
      _: unknown,
      { id, category, reason }: { id: string; category: OverrideCategory; reason: string },
      ctx: { admin?: boolean; adminId?: string }
    ) => {
      requireAdmin(ctx);
      return applyOverride(id, category, reason, ctx.adminId ?? 'admin', 'Admin');
    },

    clearSubmissionCheckOverride: async (
      _: unknown,
      { id, category }: { id: string; category: OverrideCategory },
      ctx: { admin?: boolean; adminId?: string }
    ) => {
      requireAdmin(ctx);
      return clearOverride(id, category, { id: ctx.adminId ?? 'admin', name: 'Admin' });
    },

    /**
     * The platform admin's path to a document number.
     *
     * Added because closing the seller's path and leaving the admin with none
     * meant nobody could produce the number at all — and an Article 9 report
     * can land on the platform rather than on the seller. Same shape as the
     * seller's: the admin's own factor, and a line in the tenant's own log, so
     * a seller can see when we looked.
     */
    revealSubmissionDocumentNumber: async (
      _: unknown,
      { id, credential }: { id: string; credential: string },
      ctx: { admin?: boolean; adminId?: string },
    ) => {
      const adminId = requireAdmin(ctx);
      const submission = await prisma.submission.findUnique({ where: { id } });
      if (!submission) throw new Error('Submission not found.');

      const outcome = await revealDocumentNumber({
        submission,
        // A submission with no company still needs somewhere to file the
        // access; the platform is the tenant of last resort.
        companyId: submission.companyId ?? 'platform',
        userId: adminId,
        userName: 'Platform admin',
        adminId,
        asAdmin: true,
        credential,
      });
      if (!outcome.ok) {
        throw outcome.reason === 'no-credential'
          ? mfaSetupRequiredError()
          : secondFactorError(outcome.reason);
      }
      return { submissionId: id, documentNumber: outcome.documentNumber };
    },

    recheckSubmissionSubstance: async (_: unknown, { id }: { id: string }, ctx: { admin?: boolean }) => {
      requireAdmin(ctx);
      if (!SUBSTANCE_CHECK_ENABLED) throw new Error('Substance check is not configured.');
      // Every re-run is outbound work against PubChem — see the company-side
      // mutation for why a held-down button must not become an amplifier.
      await claimSubstanceRecheck(id, null);
      const submission = await prisma.submission.findUnique({ where: { id }, include: { overrides: true } });
      void runSubstanceCheck(id);
      return submission;
    },
  },
};
