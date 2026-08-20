import { gql } from '@apollo/client';

// Form-config types, constants and gql documents shared between the
// CompanyDashboard Form Settings tab and the first-time SetupWizard.

export type FieldMode = 'REQUIRED' | 'OPTIONAL' | 'HIDDEN';
export type CustomTermsMode = 'TEXT' | 'LINK';
export type BuyerPolicy = 'COMPANY_ONLY' | 'INDIVIDUAL_ONLY' | 'BOTH';
export type FormConfigT = {
  orderNumber: FieldMode; address: FieldMode; buyerTypes: BuyerPolicy;
  casNumbers: FieldMode; concentration: FieldMode; idVerification: FieldMode;
  customTermsMode: CustomTermsMode; customTermsText: string; customTermsUrl: string;
};

export const CONFIG_KEYS: (keyof FormConfigT)[] = ['orderNumber', 'address', 'buyerTypes', 'casNumbers', 'concentration', 'idVerification', 'customTermsMode', 'customTermsText', 'customTermsUrl'];

export const TERMS_MODES: { value: CustomTermsMode; label: string }[] = [
  { value: 'TEXT', label: 'Text' }, { value: 'LINK', label: 'Link' },
];

export const CONFIG_ROWS: { key: keyof FormConfigT; label: string; desc: string; modes: FieldMode[] }[] = [
  { key: 'orderNumber', label: 'Order number', desc: 'Reference to the customer\'s order', modes: ['REQUIRED', 'OPTIONAL', 'HIDDEN'] },
  { key: 'address', label: 'Address', desc: 'Street, zip code, city and country', modes: ['REQUIRED', 'OPTIONAL', 'HIDDEN'] },
  { key: 'casNumbers', label: 'CAS number', desc: 'Chemical Abstracts Service registry number', modes: ['REQUIRED', 'OPTIONAL', 'HIDDEN'] },
  { key: 'concentration', label: 'Concentration', desc: 'Strength of the substance, e.g. 15% w/w. A CAS number says what it is, not how strong — and every Annex I limit is a concentration, so without this the check cannot apply them.', modes: ['REQUIRED', 'OPTIONAL', 'HIDDEN'] },
  { key: 'idVerification', label: 'Identity verification', desc: 'Passport or ID card checked by Didit — hosted capture, liveness and face match. The document photos never reach this platform.', modes: ['REQUIRED', 'HIDDEN'] },
];

// Buyer-type policy is its own control (not a Required/Optional/Hidden field).
export const BUYER_TYPE_LABEL = 'Buyer type';
export const BUYER_TYPE_DESC = 'Companies must give a VAT number (verified via VIES); individuals don\'t.';
export const BUYER_TYPE_OPTIONS: { value: BuyerPolicy; label: string }[] = [
  { value: 'COMPANY_ONLY', label: 'Companies only' },
  { value: 'INDIVIDUAL_ONLY', label: 'Individuals only' },
  { value: 'BOTH', label: 'Both' },
];

export const modeLabels: Record<FieldMode, string> = { REQUIRED: 'Required', OPTIONAL: 'Optional', HIDDEN: 'Hidden' };

export const ID_HIDDEN_WARNING =
  '⚠ Identity verification is legally required when selling restricted explosives ' +
  'precursors (EU Reg. 2019/1148). Disable only if you don\'t sell restricted substances.';

// Shown when identity verification is switched on while the platform has no
// verification provider configured — the form would refuse every submission.
export const ID_UNAVAILABLE_WARNING =
  '⚠ No identity verification provider is configured on this platform right now. ' +
  'Leave this on and your form will refuse submissions until it is available again.';

export const IDENTITY_AVAILABILITY = gql`
  query IdentityVerificationAvailable { identityVerificationAvailable }
`;

export const MY_FORM_CONFIG = gql`
  query MyFormConfig {
    myFormConfig { orderNumber address buyerTypes casNumbers concentration idVerification customTermsMode customTermsText customTermsUrl }
  }
`;

export const UPDATE_FORM_CONFIG = gql`
  mutation UpdateFormConfig($config: FormFieldConfigInput!) {
    updateFormConfig(config: $config) { orderNumber address buyerTypes casNumbers concentration idVerification customTermsMode customTermsText customTermsUrl }
  }
`;

export function draftFromConfig(c: Partial<FormConfigT>): FormConfigT {
  return {
    orderNumber: c.orderNumber ?? 'REQUIRED', address: c.address ?? 'REQUIRED',
    buyerTypes: c.buyerTypes ?? 'COMPANY_ONLY',
    casNumbers: c.casNumbers ?? 'REQUIRED', concentration: c.concentration ?? 'OPTIONAL',
    idVerification: c.idVerification ?? 'REQUIRED',
    customTermsMode: c.customTermsMode ?? 'TEXT',
    customTermsText: c.customTermsText ?? '', customTermsUrl: c.customTermsUrl ?? '',
  };
}

// The snippet a seller pastes into their own website. The form itself stays on
// this origin inside an iframe: the host page can size it and nothing more —
// it cannot read the buyer's input, and the buyer's data never passes through
// the seller's site. Identity verification opens in its own window, so the
// frame needs no camera permission.
export function embedSnippet(slug: string, origin: string = window.location.origin): string {
  const src = `${origin}/embed/${slug}`;
  return `<!-- End-user statement form -->
<iframe
  src="${src}"
  title="End-user statement"
  loading="lazy"
  referrerpolicy="strict-origin-when-cross-origin"
  style="width:100%;min-height:900px;border:0;display:block"
></iframe>
<script>
  // Sizes the frame to the form. The origin check is what keeps any other
  // frame on the page from resizing it.
  window.addEventListener('message', function (event) {
    if (event.origin !== '${origin}') return;
    var data = event.data;
    if (!data || data.type !== 'eustatement:height') return;
    var frame = document.querySelector('iframe[src^="${src}"]');
    if (frame) frame.style.height = data.height + 'px';
  });
</script>`;
}
