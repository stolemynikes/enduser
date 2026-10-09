// Terms of Service for the companies using eustatement.
import { Link } from 'react-router-dom';
import { DocLayout, Clause } from '../../src/components/DocLayout.tsx';
import { CLOSURE_GRACE_DAYS, CONTACT_EMAIL, OPERATOR } from '../../src/lib/legal.ts';

export default function Terms() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <DocLayout title="Terms of Service" intro={
      <p>
        These Terms govern your use of eustatement (the “Service”), operated by <strong>{OPERATOR.name}</strong>,
        {' '}{OPERATOR.description} (“I”, “me”). By requesting access or using the Service on behalf of a company,
        you accept these Terms, the <Link to="/dpa">Data Processing Agreement</Link> and the{' '}
        <Link to="/privacy">Privacy Policy</Link>, and confirm you may bind that company to them.
      </p>
    }>
      <Clause n={1} id="service" title="The Service">
        <p>
          eustatement lets a company collect end-user statements from its buyers — through a public form at its own
          address or embedded on its website — verify the buyer’s identity through an identity provider, run
          automatic checks on the substance and the stated use, and review and decide on each statement.
        </p>
      </Clause>

      <Clause n={2} id="access" title="Access and accounts">
        <ul>
          <li>Access is granted on request. I review each request and may decline it without giving more than a short reason. Until access is approved, your form does not accept submissions.</li>
          <li>Keep your sign-in details secure and enable a second sign-in factor. You are responsible for what happens under your company’s accounts and for who you invite to your team.</li>
          <li>Give accurate information about your company, and keep the owner’s email address current — notices about your account and about personal data breaches go there.</li>
        </ul>
      </Clause>

      <Clause n={3} id="responsibility" title="Your responsibilities">
        <ul>
          <li><strong>Your decisions are yours.</strong> Every approval or refusal is made by your team. The automatic checks — substance identification, listing against the annexes of Regulation (EU) 2019/1148, keyword screening of the stated use, VAT validation, machine translation — are aids that point at what deserves attention. They are not legal advice, they can be wrong or incomplete, and they do not decide.</li>
          <li><strong>Your legal obligations stay yours.</strong> Including reporting suspicious transactions to the competent authority, keeping records for as long as your rules require, and respecting licensing requirements.</li>
          <li><strong>Your buyers’ data.</strong> You are the controller of the personal data your buyers submit. You decide what your form asks for and must have a legal basis for it.</li>
        </ul>
      </Clause>

      <Clause n={4} id="acceptable-use" title="Acceptable use">
        <p>You must not use the Service to:</p>
        <ul>
          <li>collect identity documents or other personal data for any purpose other than end-user statements for your own sales;</li>
          <li>present a form under a name, brand or company that is not yours;</li>
          <li>attempt to access data of another company, interfere with the Service, or test its security without written permission;</li>
          <li>send unlawful content, or use the Service in breach of export-control, sanctions or chemical-precursor rules.</li>
        </ul>
      </Clause>

      <Clause n={5} id="data" title="Personal data">
        <p>
          The <Link to="/dpa">Data Processing Agreement</Link> forms part of these Terms and governs how I process
          your buyers’ personal data on your behalf. Your own account data is handled as described in the{' '}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </Clause>

      <Clause n={6} id="availability" title="Availability and warranties">
        <p>
          The Service is provided “as is” and “as available”, without warranties of any kind to the maximum extent
          permitted by law. It is not guaranteed to be uninterrupted or error-free, and it depends on third-party
          services — the identity provider, the EU VIES service, PubChem — that may be unavailable. When a check
          cannot run, the Service says so rather than reporting a result. The Service may be provided free of charge
          and without any service-level commitment.
        </p>
      </Clause>

      <Clause n={7} id="liability" title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, I am not liable for indirect, incidental or consequential damages,
          for loss of data or profits, or for fines, penalties or claims arising from your decisions on statements or
          from your compliance with the rules that apply to your sales. My total liability is limited to the amount
          you paid for the Service in the 12 months before the claim (which may be zero for a free service). Nothing
          in these Terms limits liability that cannot be limited by law.
        </p>
      </Clause>

      <Clause n={8} id="termination" title="Suspension and termination">
        <ul>
          <li>You can close your company’s account at any time from the dashboard. Everything belonging to it is erased {CLOSURE_GRACE_DAYS} days later; until then the closure can be undone.</li>
          <li>I may suspend a form or account that breaches these Terms or creates a security or legal risk, and close it if the breach is not resolved. Where possible I will tell you first.</li>
        </ul>
      </Clause>

      <Clause n={9} id="law" title="Governing law">
        <p>These Terms are governed by the laws of the Netherlands, and disputes are subject to the competent Dutch courts.</p>
      </Clause>

      <Clause n={10} id="changes" title="Changes">
        <p>
          These Terms may be updated. Material changes will be communicated in the dashboard or by email at least 30
          days before they take effect. Continued use after that constitutes acceptance.
        </p>
      </Clause>

      <Clause n={11} id="contact" title="Contact">
        <p>{OPERATOR.name}, {OPERATOR.country} — {mail}</p>
      </Clause>
    </DocLayout>
  );
}
