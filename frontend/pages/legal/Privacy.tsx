// Privacy Policy. Every claim here is checked against the code it describes;
// when retention, verification or sub-processors change, this page and
// LAST_UPDATED in src/lib/legal.ts change in the same commit.
import { Link } from 'react-router-dom';
import { DocLayout, Clause } from '../../src/components/DocLayout.tsx';
import { CLOSURE_GRACE_DAYS, CONTACT_EMAIL, OPERATOR, RETENTION_MONTHS, SUB_PROCESSORS } from '../../src/lib/legal.ts';

export default function Privacy() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <DocLayout title="Privacy Policy" intro={
      <p>
        This policy explains how eustatement, a service operated by <strong>{OPERATOR.name}</strong>,
        {' '}{OPERATOR.description} (“I”, “me”), handles personal data. I am the <strong>controller</strong> for
        the accounts of the companies that use eustatement. For the end-user statements their buyers submit, I am
        a <strong>processor</strong> acting for the selling company, under the{' '}
        <Link to="/dpa">Data Processing Agreement</Link>. Buyers will find the same information in plain words
        on <Link to="/how-it-works">How this works</Link>, in their own language. You can reach me at {mail}.
      </p>
    }>
      <Clause n={1} id="accounts" title="Data I collect about company users">
        <ul>
          <li><strong>Account data</strong> — your name, email address and a securely hashed password.</li>
          <li><strong>Sign-in factors</strong> — if you enable them: an authenticator-app secret, passkeys (public keys only) and hashed recovery codes.</li>
          <li><strong>Company data</strong> — the company name, its form address and form settings, the team members and their roles, and what you wrote when requesting access.</li>
          <li><strong>Activity records</strong> — who decided on a statement and when, who looked up an identity document number and when, who exported or erased a buyer’s data or downloaded the decision log and when, and when platform staff accessed your account for support.</li>
          <li><strong>Agreements</strong> — which version of these terms and the DPA you accepted for your company, when, with your name and email address.</li>
          <li><strong>Security tokens</strong> — short-lived tokens for email confirmation, password resets and invitations, deleted once used or expired.</li>
          <li><strong>Technical data</strong> — IP addresses, used in pseudonymised form to limit abuse, and kept only as long as the limit they count towards.</li>
        </ul>
      </Clause>

      <Clause n={2} id="statements" title="Data I process for sellers">
        <p>
          When a buyer fills in a company’s form, I store on that company’s behalf: the details they enter (name,
          email address, and — where the form asks — address, order number, company name and VAT number), the
          substances, CAS numbers and concentration, and the stated use; the result of the identity check and the
          name, document type and document number printed on the document; and the results of the automatic
          checks.
        </p>
        <p>
          Photos of the identity document and the selfie are taken and checked by the identity provider and never
          reach me; the verification there, photos included, is deleted as soon as its result is stored. The date
          of birth is used once to check the buyer is 18 or older and is not kept.
        </p>
        <p>
          The selling company decides what is collected and decides on every statement. Its responsibilities and
          mine are set out in the <Link to="/dpa">DPA</Link>.
        </p>
      </Clause>

      <Clause n={3} id="storage" title="Browser storage">
        <p>
          eustatement uses no advertising or tracking cookies. It keeps a few items in your browser’s local storage:
          your session token (so you stay signed in — strictly necessary), and your theme and form language
          preferences. Because these are strictly necessary or preference-only, no consent banner is required; this
          section is the disclosure of them. Public forms and sign-in may run Cloudflare Turnstile to tell people
          from scripts.
        </p>
      </Clause>

      <Clause n={4} id="use" title="How I use the data">
        <ul>
          <li>To provide the service: accounts, forms, the review dashboard, emails about decisions.</li>
          <li>To keep it secure: authentication, rate limiting, abuse prevention and audit records.</li>
          <li>To decide on access requests, and to contact you about your account or material changes.</li>
        </ul>
        <p>I do not sell data, use it for advertising, or use statements to train anything.</p>
      </Clause>

      <Clause n={5} id="basis" title="Legal basis (GDPR)">
        <p>
          Account data is processed to perform the agreement with you (Art. 6(1)(b)), to meet legal obligations
          (Art. 6(1)(c)), and on the basis of a legitimate interest in keeping the service secure (Art. 6(1)(f)).
          For buyers’ statements the legal basis is the selling company’s, as controller — typically its own legal
          obligations under rules such as Regulation (EU) 2019/1148.
        </p>
      </Clause>

      <Clause n={6} id="sub-processors" title="Sub-processors">
        <p>Each of these processes data on my behalf under an appropriate data-processing agreement:</p>
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead><tr><th scope="col">Who</th><th scope="col">What for</th><th scope="col">What they see</th></tr></thead>
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
          Statements in a language other than English or Dutch may be machine-translated for the reviewer. That runs
          on my own server; the text is not sent to a translation service.
        </p>
      </Clause>

      <Clause n={7} id="retention" title="Data retention">
        <ul>
          <li><strong>Statements</strong> are deleted automatically {RETENTION_MONTHS} months after they were submitted, with their translation and check results.</li>
          <li><strong>Records of document-number look-ups</strong> are kept for the same {RETENTION_MONTHS} months.</li>
          <li><strong>Company accounts</strong> are kept while they are in use. When a company closes its account, everything belonging to it is erased {CLOSURE_GRACE_DAYS} days later; until then the closure can be undone.</li>
          <li><strong>Backups</strong> are encrypted and rotate out within 30 days.</li>
        </ul>
      </Clause>

      <Clause n={8} id="location" title="Data location">
        <p>
          Data is stored on servers in the European Union. Cloudflare, which carries traffic, is based in the
          United States and relies on the EU–US Data Privacy Framework. PubChem and Wikidata, also in the United
          States, receive substance names and CAS numbers only — no personal data.
        </p>
      </Clause>

      <Clause n={9} id="rights" title="Your rights">
        <p>
          You can ask for access to, correction or deletion of your personal data, object to or restrict its
          processing, and ask for a copy in a portable format. Write to {mail}. You can also lodge a complaint with
          a data protection authority — in the Netherlands, the Autoriteit Persoonsgegevens.
        </p>
        <p>
          If you are a buyer, the selling company is responsible for your statement; send your request to them.
          If you cannot reach them, write to me and I will pass it on.
        </p>
      </Clause>

      <Clause n={10} id="security" title="Security">
        <p>
          Personal data in statements is encrypted at the field level (AES-256-GCM) in addition to encryption in
          transit (TLS). Company accounts can be protected with an authenticator app or a passkey, and the platform
          can require one. Identity document numbers are hidden by default and every look-up needs a fresh second
          factor and is recorded. Requests are rate-limited, and public forms are protected against automated
          submission.
        </p>
      </Clause>

      <Clause n={11} id="changes" title="Changes">
        <p>
          This policy may be updated. Material changes will be announced in the dashboard or by email, and the date
          at the top of this page always shows the current version.
        </p>
      </Clause>

      <Clause n={12} id="contact" title="Contact">
        <p>{OPERATOR.name}, {OPERATOR.country} — {mail}</p>
      </Clause>
    </DocLayout>
  );
}
