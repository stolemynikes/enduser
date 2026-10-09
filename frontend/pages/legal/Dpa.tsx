// Data Processing Agreement (Art. 28 GDPR). The seller is the controller of
// their buyers' data; the operator processes it. Security measures and the
// sub-processor list must match the code and src/lib/legal.ts.
import { Link } from 'react-router-dom';
import { DocLayout, Clause } from '../../src/components/DocLayout.tsx';
import { CLOSURE_GRACE_DAYS, CONTACT_EMAIL, OPERATOR, RETENTION_MONTHS, SUB_PROCESSORS } from '../../src/lib/legal.ts';

export default function Dpa() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <DocLayout title="Data Processing Agreement" intro={
      <p>
        This Data Processing Agreement (“DPA”) forms part of the <Link to="/terms">Terms of Service</Link> between
        you (the “Controller”) and <strong>{OPERATOR.name}</strong>, {OPERATOR.description}, operating eustatement
        (the “Processor”, “I”, “me”). It applies whenever you use eustatement to collect end-user statements, and
        implements Article 28 of the GDPR. No signature is required — it takes effect when you accept the Terms.
      </p>
    }>
      <Clause n={1} id="roles" title="Roles">
        <p>
          You are the <strong>controller</strong> of the personal data your buyers submit through your form and of
          the data your team adds while reviewing. I act solely as your <strong>processor</strong> for that data.
          Separately, I am the controller of your own account data, which the <Link to="/privacy">Privacy Policy</Link>{' '}
          covers rather than this DPA.
        </p>
      </Clause>

      <Clause n={2} id="subject" title="Subject matter, nature and duration">
        <p>
          I process the data to provide eustatement: collecting statements through your form, having the buyer’s
          identity verified, running automatic checks, storing the statements, presenting them to your team, and
          sending the emails the process involves. Processing lasts for as long as you use the Service and ends as
          described in section 11.
        </p>
      </Clause>

      <Clause n={3} id="categories" title="Categories of data and data subjects">
        <ul>
          <li><strong>Data subjects</strong> — your buyers, the people acting for buyer companies, and your own team members.</li>
          <li><strong>Categories of data</strong> — name and email address; where your form asks: postal address, order number, company name and VAT number; substances, CAS numbers, concentration and the stated use; the outcome of the identity check with the name, document type and document number printed on the identity document; check results, review decisions and notes.</li>
          <li><strong>Identity document numbers</strong> are national identification numbers in the sense of Article 87 GDPR. They are hidden by default and every look-up is recorded.</li>
          <li>No special categories of data (Article 9 GDPR) are intended to be processed. Biometric data used for the liveness and face check stays with the identity provider and is deleted there once the result is stored.</li>
        </ul>
      </Clause>

      <Clause n={4} id="my-obligations" title="My obligations">
        <ul>
          <li>I process the data only on your documented instructions, which are these Terms, this DPA and your configuration of the Service — unless the law requires otherwise, in which case I tell you first where allowed.</li>
          <li>Anyone authorised to process the data is bound to confidentiality.</li>
          <li>I take the security measures in section 6.</li>
          <li>I help you answer data-subject requests and meet your obligations under Articles 32 to 36 GDPR, taking into account the nature of the processing.</li>
          <li>I make available the information needed to demonstrate compliance with this DPA (section 8).</li>
        </ul>
      </Clause>

      <Clause n={5} id="your-obligations" title="Your obligations">
        <ul>
          <li>You have a legal basis for collecting what your form asks for, and you inform your buyers. The “How does this work?” link under every form leads to a page doing that in the buyer’s language, naming you as controller; you remain responsible for its fit with your own processing.</li>
          <li>You configure the form to ask for no more than you need, and keep your team’s access appropriate to their role.</li>
          <li>You decide on statements yourself and remain responsible for those decisions and for reporting to the authorities.</li>
        </ul>
      </Clause>

      <Clause n={6} id="security" title="Security measures">
        <ul>
          <li>Personal data in statements is encrypted at the field level (AES-256-GCM, bound to the field it belongs to) and in transit (TLS).</li>
          <li>Each company’s data is separated by tenant; one company’s team cannot reach another’s statements.</li>
          <li>Identity document numbers are hidden by default; each look-up requires a fresh second factor and is recorded with who and when.</li>
          <li>Accounts can be protected by an authenticator app or passkey, and a second factor can be required platform-wide. Sessions expire after 60 minutes of inactivity.</li>
          <li>Requests are rate-limited, public forms are protected against automated submission, and sign-in is locked after repeated failures.</li>
          <li>Platform staff can open statements where needed to run and support the Service. Support sessions are recorded, and a document-number look-up by platform staff appears in the company’s own look-up record, marked as such.</li>
          <li>Statements are deleted automatically {RETENTION_MONTHS} months after submission.</li>
        </ul>
      </Clause>

      <Clause n={7} id="sub-processors" title="Sub-processors">
        <p>You give general authorisation for the sub-processors below. Each is bound by data-protection terms no less protective than this DPA.</p>
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead><tr><th scope="col">Sub-processor</th><th scope="col">Purpose</th><th scope="col">Data</th></tr></thead>
            <tbody>
              {SUB_PROCESSORS.map(s => (
                <tr key={s.name}>
                  <td>{s.name}<br /><span style={{ fontWeight: 400, color: 'var(--text-mid)' }}>{s.location}</span></td>
                  <td>{s.purpose}{s.when && <><br /><span style={{ color: 'var(--text-mid)' }}>{s.when}</span></>}</td>
                  <td>{s.data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          I will announce any new or replaced sub-processor at least 30 days in advance, by email or in the dashboard.
          You may object on reasonable grounds; if we cannot resolve it, you may close your account before the
          change takes effect.
        </p>
      </Clause>

      <Clause n={8} id="audits" title="Audits">
        <p>
          On reasonable written request, and no more than once a year unless a supervisory authority requires it, I
          will provide the information reasonably needed to verify compliance with this DPA. On-site audits are
          available where legally required, at your cost, subject to reasonable notice and confidentiality.
        </p>
      </Clause>

      <Clause n={9} id="transfers" title="International transfers">
        <p>
          Statements are stored within the European Union. Where a sub-processor processes personal data outside
          the European Economic Area, that transfer relies on an adequacy decision — such as the EU–US Data Privacy
          Framework — or the European Commission’s Standard Contractual Clauses.
        </p>
      </Clause>

      <Clause n={10} id="breaches" title="Personal data breaches">
        <p>
          If I become aware of a personal data breach affecting your buyers’ data, I will notify you without undue
          delay and in any event within 48 hours, with the information available at the time, so you can meet your
          own 72-hour obligation under Article 33 GDPR. Notification goes to your company owner’s email address —
          keep it current.
        </p>
      </Clause>

      <Clause n={11} id="deletion" title="Return and deletion">
        <p>
          Statements are deleted automatically {RETENTION_MONTHS} months after submission. When you close your
          account, all data belonging to your company is erased {CLOSURE_GRACE_DAYS} days later; during that period
          you can still open the dashboard and retrieve what you need. Residual copies may persist in encrypted
          backups for up to 30 days before rotating out.
        </p>
      </Clause>

      <Clause n={12} id="precedence" title="Liability and precedence">
        <p>
          Liability under this DPA is subject to the limitations in the Terms of Service. Where this DPA conflicts
          with the Terms on the processing of personal data, this DPA prevails.
        </p>
      </Clause>

      <Clause n={13} id="contact" title="Contact">
        <p>{OPERATOR.name}, {OPERATOR.country} — {mail}</p>
      </Clause>
    </DocLayout>
  );
}
