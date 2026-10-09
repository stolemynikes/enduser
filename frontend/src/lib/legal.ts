// The facts every legal and explanatory page states, in one place.
//
// The Privacy Policy, the DPA, the Terms and the buyers' "how this works" page
// all name the operator, the contact address and the sub-processors. Written
// out four times, they drift — and a privacy page that contradicts the DPA is
// worse than either alone. So they read from here.
//
// BEFORE LAUNCH: replace CONTACT_EMAIL, and EMAIL_PROVIDER once one is chosen.
// Then bump LAST_UPDATED. Any change to who processes data, or to how long it
// is kept, is a change to this file and to that date.

export const OPERATOR = {
  name: 'Pepijn Scheer',
  description: 'an individual based in the Netherlands',
  country: 'the Netherlands',
} as const;

export const PRODUCT = 'eustatement';

/** TODO before launch: create this mailbox on the production domain. */
export const CONTACT_EMAIL = 'privacy@eustatement.example';

/** The date shown on every legal page. Change it whenever their content changes. */
export const LAST_UPDATED = '2026-10-09';

/** Must match backend/lib/retention.ts. */
export const RETENTION_MONTHS = 18;
/** Must match backend/lib/retention.ts. */
export const CLOSURE_GRACE_DAYS = 30;

export type SubProcessor = {
  name: string;
  /** Where the entity sits, and where it processes when that differs. */
  location: string;
  /** What it does, in a phrase. */
  purpose: string;
  /** What personal data it sees. Be exact; this is what a DPA reader checks. */
  data: string;
  /** Only involved in some cases — say which. */
  when?: string;
};

export const SUB_PROCESSORS: SubProcessor[] = [
  {
    name: 'Hetzner Online GmbH',
    location: 'Germany (servers in the EU)',
    purpose: 'Server and database hosting',
    data: 'All stored data, encrypted at the field level where described in the Privacy Policy.',
  },
  {
    name: 'Cloudflare, Inc.',
    location: 'United States (EU–US Data Privacy Framework)',
    purpose: 'DNS, TLS, protection against attacks, and the anti-robot check (Turnstile) on public forms and sign-in',
    data: 'Traffic in transit, including IP addresses, and the technical signals Turnstile uses to tell people from scripts.',
  },
  {
    // TODO before launch: copy the exact legal entity and location from the
    // DPA you sign with Didit; this line must match it.
    name: 'Didit',
    location: 'European Union (confirm against the Didit DPA)',
    purpose: 'Identity document and liveness verification',
    data: 'Photos of the identity document and a selfie, and the data on the document. The verification session, including the photos, is deleted once its result is stored.',
    when: 'Only when the seller requires identity verification.',
  },
  {
    name: 'European Commission (VIES)',
    location: 'European Union',
    purpose: 'Checking a company VAT number',
    data: 'The VAT number entered.',
    when: 'Only when the buyer orders on behalf of a company.',
  },
  {
    name: 'U.S. National Library of Medicine (PubChem)',
    location: 'United States',
    purpose: 'Identifying the substance from its name and CAS number',
    data: 'The substance names and CAS numbers entered — no personal data.',
  },
  {
    name: 'Wikimedia Foundation (Wikidata)',
    location: 'United States',
    purpose: 'Recognising substance names in other languages',
    data: 'A CAS number only — no names, no personal data.',
  },
  {
    // TODO before launch: name the provider once chosen.
    name: 'Email provider (to be confirmed)',
    location: 'To be confirmed',
    purpose: 'Sending account and confirmation emails',
    data: 'Recipient address, name and the content of the email.',
  },
];

/** Formats LAST_UPDATED for an English page: "9 October 2026". */
export function lastUpdatedLabel(locale = 'en-GB'): string {
  return new Date(`${LAST_UPDATED}T12:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}
