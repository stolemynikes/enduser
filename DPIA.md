# Information for your DPIA — eustatement

**DRAFT for legal review. Not published.** Once reviewed, this becomes a page
or a PDF that sellers can download from their dashboard.

A seller using eustatement with identity verification switched on processes
biometric data to identify buyers (a face match between a selfie and the
document photo). Under GDPR Article 35 that very likely requires a data
protection impact assessment (DPIA) by the seller, as controller. This
document gives the seller the processor's half of the facts, so their DPIA can
be completed without a questionnaire round.

Every statement below describes the software as built; the file or setting it
rests on is named, so a reviewer can check it.

## 1. The processing

| | |
|---|---|
| Purpose | Verifying end-user statements for substances in Annexes I and II of Regulation (EU) 2019/1148 before supply; deciding whether to supply; reporting suspicious transactions where required. |
| Controller | The seller. |
| Processor | eustatement (operator: see the Privacy Policy). |
| Data subjects | Buyers (private individuals and people acting for companies); the seller's own staff. |
| Personal data | Name, email, postal address, order number, company name and VAT number, substances and stated use; where identity verification is on: document type, number, name and expiry, and the outcome of liveness and face-match checks. |
| Special categories | Biometric data (Art. 9) — the face match — processed by the identity-verification provider only. |
| Scale | Per seller: every buyer who orders a listed substance through the seller's form. |
| Retention | 18 months from submission, then deleted automatically (`backend/lib/retention.ts`). |

## 2. Necessity and proportionality

Points for the seller to assess; the facts that bear on them:

- **Legal basis.** Usually Art. 6(1)(c) (the seller's obligations under
  Regulation 2019/1148, notably verifying identity and use for Annex I
  substances supplied to members of the general public, Art. 5(4)) and
  Art. 6(1)(f). *For the reviewer: confirm the Art. 9 condition for the
  biometric face match — explicit consent (9(2)(a)) or substantial public
  interest under national law (9(2)(g)) — and whether the seller may make
  identity verification optional for company buyers.*
- **Data minimisation.** The form's fields can be switched off per seller
  (order number, address, CAS number, concentration; identity verification
  as a whole). Driving licences are not accepted; only passports and identity
  cards (`backend/services/didit.ts`).
- **No photos kept.** Document photos and the selfie never reach the
  platform's servers; the provider's session, photos included, is deleted
  once the outcome is stored, when a buyer is refused, or when a buyer leaves
  (`backend/lib/diditReconcile.ts`, `backend/services/diditSessionStore.ts`).
- **No automated decisions.** The checks only flag; a person at the seller
  approves or denies, and approval is blocked while a check is red unless a
  reviewer overrides it with a written reason (Art. 22 does not apply).
- **Transparency.** Buyers get a plain-language explanation in their own
  language before submitting (`/how-it-works`, 24 languages), and a PDF copy of
  what they declared.

## 3. Risks to buyers, and the measures against them

| Risk | Likelihood without measures | Measures | Residual |
|---|---|---|---|
| Identity documents leaked from the platform | Medium | Document number and name encrypted per field (AES-256-GCM); photos never stored; number hidden in every view, shown only with a fresh second-factor code and logged | Low |
| A seller's staff account taken over | Medium | Two-factor authentication or passkeys; sign-in lock after 8 failures; 60-minute sessions; exports and erasures need a fresh code | Low |
| One seller seeing another's buyers | Low | Tenant filter in one place; automated cross-tenant tests | Very low |
| Phishing using the platform's domain | Medium | Every company is approved by hand before its form goes live | Low |
| Data kept too long | Medium | Automatic deletion at 18 months, including notifications and access logs; backups at most 30 days | Low |
| Transfer outside the EU | — | Hosting in Germany; the providers outside the EU are listed with their transfer basis on the DPA page | Seller to assess |
| Buyer cannot exercise rights | Low | One-step access export and erasure in the dashboard (Art. 15, 17) | Very low |
| Wrongful refusal of a buyer | Medium | No automated decisions; denial reasons given to the buyer | Low |

The full list of technical and organisational measures is at `/security`.

## 4. For the seller to complete

- The Art. 9 condition for the face match, and whether identity verification
  is needed for every buyer or only for private individuals ordering Annex I
  substances above the limit values.
- Consultation of the seller's DPO, if any.
- Whether the residual risk is acceptable, or prior consultation with the
  supervisory authority (Art. 36) is needed.
- Sign-off and review date.

## Open points for the legal review

1. Art. 9 condition for biometric data, and the buyer-facing consent wording
   if consent is the basis.
2. Whether the processor may offer this document as "information for your
   DPIA" without that being read as advice.
3. Didit's legal entity, location and transfer basis — still to be copied from
   the signed Didit DPA into `frontend/src/lib/legal.ts`.
