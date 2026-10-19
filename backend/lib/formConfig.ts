// Per-company form field configuration.
// Companies choose which fields their public form (/<slug>) collects; the core fields
// (email, firstName, lastName, substances, statement) are always required.

export type FieldMode = 'REQUIRED' | 'OPTIONAL' | 'HIDDEN';

// Which kinds of buyer the form accepts. When BOTH, the form shows an
// Individual/Company toggle; a Company buyer must provide company name + VAT
// (verified via VIES), an Individual provides neither.
export type BuyerPolicy = 'COMPANY_ONLY' | 'INDIVIDUAL_ONLY' | 'BOTH';

export type FormConfig = {
  orderNumber: FieldMode;
  address: FieldMode; // street, zipCode, place, country as one block
  buyerTypes: BuyerPolicy; // governs the company name + VAT fields and the VIES check
  casNumbers: FieldMode;
  /**
   * Declared strength of the substance. A CAS number identifies what it is, not
   * how strong it is, and every Annex I limit is a concentration — without this
   * the substance check can quote the limit but never apply it.
   */
  concentration: FieldMode;
  idVerification: 'REQUIRED' | 'HIDDEN'; // whole ID section — no "optional"
  // The terms & conditions shown on the company's form — either as text OR as
  // a link to their own terms page. Defaults to the standard end-user
  // statement terms until the company edits them.
  customTermsMode: CustomTermsMode;
  customTermsText: string;
  customTermsUrl: string;
};

export type CustomTermsMode = 'TEXT' | 'LINK';
const TERMS_MODES: CustomTermsMode[] = ['TEXT', 'LINK'];

export const DEFAULT_TERMS_TEXT = `I hereby confirm that:
— The substances, preparations and products are only used in an authorized manner (in accordance with European and national legislation), used only for research, scientific and educational purposes.

The ordered substance(s):
— Not used to manufacture or serve as a constituent or intermediate of narcotics and/or psychotropic substances.
— Not used in medicinal products for human or veterinary use, agriculture, food or cosmetics, except as a raw material, auxiliary or operating material and/or as a research and analytical reagent.
— Not used to develop or produce chemical weapons.
— Not to be used for military or illegal purposes.
— Do not re-export the item(s) to third countries without the prior consent of the export control authorities.
— Will not be re-exported/exported or otherwise nationally or resold internationally or transferred to a destination subject to an EU, UN or US embargo, if such act would conflict with the terms of that embargo.
— Supplies the mentioned products only to customers who can also submit such an End-use certificate. We will carefully keep all received certificates and submit them on request.
— I am over 18 years old.`;

export const DEFAULT_CONFIG: FormConfig = {
  orderNumber: 'REQUIRED',
  address: 'REQUIRED',
  buyerTypes: 'COMPANY_ONLY',
  casNumbers: 'REQUIRED',
  // Optional by default so existing forms keep working unchanged; a seller who
  // handles restricted precursors should make it required.
  concentration: 'OPTIONAL',
  idVerification: 'REQUIRED',
  customTermsMode: 'TEXT',
  customTermsText: DEFAULT_TERMS_TEXT,
  customTermsUrl: '',
};

const MODES: FieldMode[] = ['REQUIRED', 'OPTIONAL', 'HIDDEN'];
const BUYER_POLICIES: BuyerPolicy[] = ['COMPANY_ONLY', 'INDIVIDUAL_ONLY', 'BOTH'];
const FIELD_MODE_KEYS = ['orderNumber', 'address', 'casNumbers', 'concentration', 'idVerification'] as const;
const TERMS_TEXT_MAX = 8000;
const TERMS_URL_MAX = 300;

// Merge stored JSON over defaults; drop unknown keys, coerce invalid values back to default.
export function resolveConfig(json: unknown): FormConfig {
  const out: FormConfig = { ...DEFAULT_CONFIG };
  if (json && typeof json === 'object') {
    const src = json as Record<string, unknown>;
    for (const key of FIELD_MODE_KEYS) {
      const val = src[key];
      if (typeof val === 'string' && MODES.includes(val as FieldMode)) {
        if (key === 'idVerification' && val === 'OPTIONAL') continue;
        out[key] = val as never;
      }
    }
    if (typeof src.buyerTypes === 'string' && BUYER_POLICIES.includes(src.buyerTypes as BuyerPolicy)) {
      out.buyerTypes = src.buyerTypes as BuyerPolicy;
    }
    if (typeof src.customTermsMode === 'string' && TERMS_MODES.includes(src.customTermsMode as CustomTermsMode)) {
      out.customTermsMode = src.customTermsMode as CustomTermsMode;
    }
    // Empty stored text falls back to the default terms — the form must never
    // render an empty terms box.
    if (typeof src.customTermsText === 'string' && src.customTermsText.trim()) {
      out.customTermsText = src.customTermsText.trim().slice(0, TERMS_TEXT_MAX);
    }
    if (typeof src.customTermsUrl === 'string') {
      const url = src.customTermsUrl.trim().slice(0, TERMS_URL_MAX);
      // https only: the buyer agrees to what this link shows, and a plain-http
      // page can be altered on the way to them.
      out.customTermsUrl = /^https:\/\//i.test(url) ? url : '';
    }
  }
  return out;
}
