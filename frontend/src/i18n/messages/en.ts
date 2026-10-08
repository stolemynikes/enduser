// English — the reference language. Every other file in this folder is typed
// against this one, so a key missing from a translation is a build error, not a
// blank on a buyer's screen.
//
// Three kinds of text live here, and they are not equally free to change:
//
//   ANNEX IV  Wording from Annex IV of Reg. (EU) 2019/1148, the customer's
//             statement the regulation prescribes. Each translation uses that
//             language version's own words, verbatim. Do not paraphrase.
//   LEGAL     Sentences the buyer agrees to or is bound by. A mistranslation
//             here can be held against the seller. Listed in LEGAL_KEYS so
//             they can be handed to a native speaker for review.
//   (rest)    Interface text. Fix freely.

const en = {
  // ── Page ───────────────────────────────────────────────────────────────
  docTitle: 'End-User Statement',
  docTitleCompany: (company: string) => `${company} — Statement`,
  badge: 'Official document',
  title: 'End-User Statement',
  subtitle: 'Chemical substances — regulated use declaration',
  submittedTo: (company: string) => `Submitted to ${company}`,
  themeToggle: 'Switch light or dark',

  // ── Language picker ────────────────────────────────────────────────────
  language: 'Language',
  languageSearch: 'Search languages',
  languageNone: 'No language matches',
  languageSuggested: 'Suggested',
  languageAll: 'All languages',

  // ── Sections ───────────────────────────────────────────────────────────
  secBuyerType: 'Buyer type',
  secContact: 'Contact information',
  secCompany: 'Company details',
  secAddress: 'Address',
  secSubstance: 'Substance information',
  secIdentity: 'Identity verification',
  secTerms: 'Terms and conditions',

  buyerTypeQuestion: 'Are you ordering as a private individual or on behalf of a company?',
  buyerIndividual: 'Individual',
  buyerCompany: 'Company',

  // ── Fields ─────────────────────────────────────────────────────────────
  optional: '(optional)',
  email: 'Email',
  orderNumber: 'Order number',
  firstName: 'First name',
  lastName: 'Last name',
  companyName: 'Company name',
  vatNumber: 'VAT number',
  vatHint: 'Needed for the EU VIES check, e.g. NL123456789B01',
  street: 'Street and number',
  zipCode: 'Postcode',
  place: 'Town or city',
  country: 'Country',
  countrySelect: '— Select —',
  substanceName: 'Name of the substance(s)',
  /** ANNEX IV */
  casNo: 'CAS No.',
  /** ANNEX IV */
  concentration: 'Concentration',
  concentrationHint: 'As printed on the label, e.g. 15% w/w. The legal limits for restricted precursors depend on it.',
  /** ANNEX IV */
  intendedUse: 'Intended use',
  intendedUseHint: 'Describe what you will use the substance for.',

  // ── Identity verification ─────────────────────────────────────────────
  idNote:
    'Your passport or identity card is checked by Didit, our identity verification provider. '
    + 'A secure window opens where you photograph your document and take a short selfie. '
    + 'The photos stay with Didit — this form never receives or stores them. Only the outcome '
    + 'and the details printed on your document are kept.',
  idUnavailableTitle: 'Identity verification is temporarily unavailable',
  idUnavailableNote: (seller?: string) =>
    `This form needs it, so it cannot be sent right now. Please try again later or contact ${seller ?? 'the seller'}.`,
  fillFirst: (list: string) => `Fill in the rest of the form first, then verify. Still missing: ${list}.`,
  verifyButton: 'Verify my identity',
  verifyOpening: 'Opening secure verification…',
  verifyWaiting: 'Waiting for you to finish verification…',
  verifyWaitingHint: 'Complete the steps in the verification window, then come back here. This page updates by itself.',
  verifyBlocked: 'Your browser blocked the verification window.',
  verifyBlockedLink: 'Open it in a new tab',
  verifyRestart: 'Window closed? Start again',
  verified: 'Identity verified',
  verifyInReview: 'Your document is being checked by hand. You can send the form now — the seller will see the result.',
  verifyFailedTitle: 'Verification not passed',
  verifyFailedNote: 'You can still send this form. The seller will review it by hand.',
  verifyTryAgain: 'Try again',

  // ── Terms ──────────────────────────────────────────────────────────────
  termsIntro: (seller?: string) => seller ? `Terms and conditions of ${seller}:` : 'Terms and conditions of the seller:',
  termsReadLink: (seller?: string) => seller ? `Read the terms and conditions of ${seller}` : 'Read the seller’s terms and conditions',
  termsAsWritten: (seller?: string) => `These terms are set by ${seller ?? 'the seller'} and are shown as they wrote them.`,
  /** LEGAL */
  agree: 'I have read and agree to the terms and conditions above',
  /** LEGAL — shown when the seller has not written terms of their own. */
  defaultTerms: `I hereby confirm that:
— The substances, preparations and products are only used in an authorized manner (in accordance with European and national legislation), used only for research, scientific and educational purposes.

The ordered substance(s):
— Not used to manufacture or serve as a constituent or intermediate of narcotics and/or psychotropic substances.
— Not used in medicinal products for human or veterinary use, agriculture, food or cosmetics, except as a raw material, auxiliary or operating material and/or as a research and analytical reagent.
— Not used to develop or produce chemical weapons.
— Not to be used for military or illegal purposes.
— Do not re-export the item(s) to third countries without the prior consent of the export control authorities.
— Will not be re-exported/exported or otherwise nationally or resold internationally or transferred to a destination subject to an EU, UN or US embargo, if such act would conflict with the terms of that embargo.
— Supplies the mentioned products only to customers who can also submit such an End-use certificate. We will carefully keep all received certificates and submit them on request.
— I am over 18 years old.`,

  // ── Sending ────────────────────────────────────────────────────────────
  requiredNote: 'Required fields',
  stillToComplete: (list: string) => `Still to complete: ${list}.`,
  submitting: 'Sending…',
  submit: 'Send statement',
  /** LEGAL */
  footer: 'This document is legally binding. All information provided is subject to verification.',

  // What is still missing, as list items inside the sentences above.
  missing: {
    email: 'a valid email address',
    firstName: 'first name',
    lastName: 'last name',
    orderNumber: 'order number',
    buyerType: 'whether you are an individual or a company',
    companyName: 'company name',
    vatNumber: 'VAT number',
    street: 'street',
    zipCode: 'postcode',
    place: 'town or city',
    country: 'country',
    substance: 'substance name',
    cas: 'CAS number',
    concentration: 'concentration',
    intendedUse: 'intended use',
    identity: 'identity verification',
    terms: 'agreement to the terms',
    robot: 'the anti-robot check',
  },

  // ── Outcomes ───────────────────────────────────────────────────────────
  successTitle: 'Statement received',
  successBody: 'Your end-user statement has been sent. You will get a confirmation by email, and another message once it has been reviewed.',
  successNote: 'Keep this confirmation for your records.',
  notFoundTitle: 'Form not found',
  notFoundBody: 'There is no form at this address. Please check the link.',
  notReadyTitle: 'Form not available yet',
  notReadyBody: 'This form is not open for submissions yet. Please check back later.',
  contactSupplier: 'If you received this link from a supplier, contact them for help.',

  // ── Errors raised in the browser ───────────────────────────────────────
  errVerifyExpired: 'Your verification session expired. Please start it again.',
  errVerifyStart: 'Identity verification could not be started. Please try again.',
  errIncomplete: (list: string) => `Please complete the form first. Still missing: ${list}.`,
  errIdUnavailable: 'Identity verification is temporarily unavailable, so this form cannot be sent right now.',
  errRateLimited: 'Too many attempts from this connection. Please wait a few minutes and try again.',
  errGeneric: 'Something went wrong. Please try again.',

  // ── Errors from the server, by code (backend/lib/buyerError.ts) ─────────
  server: {
    TERMS_REQUIRED: 'You must agree to the terms and conditions.',
    FIELD_TOO_LONG: 'One of the fields is too long. Please shorten it and try again.',
    INVALID_EMAIL: 'Please enter a valid email address.',
    FORM_NOT_OPEN: 'This form is not accepting submissions yet.',
    FIELD_REQUIRED: 'A required field is empty. Please fill in every field marked with *.',
    BUYER_TYPE_REQUIRED: 'Please choose whether you are an individual or a company.',
    COMPANY_NAME_REQUIRED: 'Please fill in your company name.',
    VAT_REQUIRED: 'Please fill in your VAT number.',
    ID_UNAVAILABLE: 'Identity verification is temporarily unavailable. Please try again later.',
    ID_REQUIRED: 'Please complete the identity verification step.',
    ID_EXPIRED: 'Your identity verification expired or was already used. Please start it again.',
    ID_UNCONFIRMED: 'Your identity verification could not be confirmed. Please try again.',
    ID_UNFINISHED: 'Your identity verification is not finished yet. Please complete it and try again.',
    ID_DOCUMENT_TYPE: 'Only passports and identity cards are accepted.',
    /** LEGAL */
    UNDER_AGE: 'You must be at least 18 years old to submit an end-user statement.',
    BOT_CHECK_MISSING: 'Please complete the anti-robot check and try again.',
    BOT_CHECK_ERROR: 'The anti-robot check could not be completed. Please try again.',
    BOT_CHECK_FAILED: 'The anti-robot check did not pass. Please try again.',
  },

  // ── Page Didit returns the buyer to ────────────────────────────────────
  vcDocTitle: 'Verification complete',
  vcTitle: 'Verification finished',
  vcBody: 'You can close this window and go back to the form. It updates by itself.',
};

export type Messages = typeof en;
export type ServerErrorCode = keyof Messages['server'];

/** Keys whose translation should be checked by a native speaker before going live. */
export const LEGAL_KEYS = ['agree', 'defaultTerms', 'footer', 'server.UNDER_AGE'] as const;

export default en;
