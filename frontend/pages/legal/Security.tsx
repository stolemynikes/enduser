// Security overview: the technical and organisational measures (TOMs) a
// customer's security questionnaire asks about, in one place. Every line is a
// description of the code or the deployment as it is — when a measure changes,
// this page changes in the same commit. Claims about the deployment hold only
// when DEPLOY.md is followed; those are named as such.
import { Link } from 'react-router-dom';
import { DocLayout, Clause } from '../../src/components/DocLayout.tsx';
import { CONTACT_EMAIL, RETENTION_MONTHS } from '../../src/lib/legal.ts';

export default function Security() {
  return (
    <DocLayout title="Security overview" intro={
      <p>
        The technical and organisational measures that protect the statements on eustatement, for your own
        records and for security questionnaires. They expand on section 6 of the{' '}
        <Link to="/dpa#security">Data Processing Agreement</Link>. To report a weakness, see the <a href="/security-policy.txt">disclosure policy</a>.
      </p>
    }>
      <Clause n={1} id="storage" title="Where data is, and how it is stored">
        <ul>
          <li>Servers and the database are hosted by Hetzner in Germany, in the European Union.</li>
          <li>Buyers’ personal data in statements — names, contact and address details, order numbers, company and VAT details, substances, the stated use, and the identity-document name and number — is encrypted field by field with AES-256-GCM, in addition to disk encryption. Each value is bound to its column, so a value moved to another field does not decrypt.</li>
          <li>Notifications that name a buyer are encrypted the same way.</li>
          <li>Identity-document photos and selfies never reach our servers: the check runs in the verification provider’s own window, and the session, photos included, is deleted at the provider once its outcome is stored, when a buyer is refused, or when a buyer leaves without submitting.</li>
          <li>Passwords are stored as bcrypt hashes; recovery codes as hashes; passkeys as public keys only.</li>
        </ul>
      </Clause>

      <Clause n={2} id="access" title="Who can reach what">
        <ul>
          <li>Each seller’s statements are separated by a tenant filter applied in one place in the code, and tested by automated cross-tenant tests on every change.</li>
          <li>Roles: owners manage the team and settings; reviewers decide; viewers read. Every approval and denial records who made it and when.</li>
          <li>Identity-document numbers are hidden in every list and view. Showing one requires a current code from an authenticator app (or a passkey sign-in), and every look-up is logged for the owner.</li>
          <li>Exporting or erasing a buyer’s data, and downloading the decision log, likewise require a current code and are logged.</li>
          <li>Two-factor authentication — an authenticator app or a passkey — is available to every account, and the platform can require it for every sign-in.</li>
          <li>Sign-in locks for 15 minutes after 8 failed attempts. Company sessions end after 60 minutes unless renewed; platform-staff sessions after 8 hours.</li>
          <li>Platform support can open a seller’s account only through a support session, which lasts at most 2 hours, is logged, and is announced to the seller in their activity list. A support session cannot export or erase buyers’ data or accept terms.</li>
        </ul>
      </Clause>

      <Clause n={3} id="transport" title="In transit and at the edge">
        <ul>
          <li>All traffic is HTTPS, with HSTS, and encrypted again between the edge and the server with a certificate the edge verifies.</li>
          <li>A strict Content-Security-Policy, framing denied except for the embeddable form, and no third-party scripts besides the anti-robot check and the identity-verification window. Fonts are served from our own origin.</li>
          <li>Public forms and sign-in are protected by an anti-robot check and per-address rate limits.</li>
          <li>Incoming webhooks from the verification provider are checked by signature, and their content is never trusted: the result is fetched again from the provider.</li>
          <li>Each statement PDF carries a reference and a code that anyone holding it can check at <a href="/statement-check">/statement-check</a>. The check shows only the date, the seller and the status; the code cannot be derived without the server, and guesses are rate-limited.</li>
        </ul>
      </Clause>

      <Clause n={4} id="lifecycle" title="Retention and deletion">
        <ul>
          <li>Every statement is deleted automatically {RETENTION_MONTHS} months after it was submitted, with its check results and the notifications about it. Access logs about statements are kept no longer.</li>
          <li>A closed account is deleted completely after a 30-day grace period.</li>
          <li>Backups are encrypted to a key kept off the server and are kept for at most 30 days (when the deployment follows the runbook).</li>
        </ul>
      </Clause>

      <Clause n={5} id="operations" title="Operations">
        <ul>
          <li>The code is covered by automated test suites for cross-tenant access, injection, authentication, two-factor checks and data deletion, and the release procedure runs them, and a check of all dependencies against known vulnerabilities, before every update.</li>
          <li>The state of every outside service and failed emails or checks are monitored, and the operator is alerted when a nightly check finds something to act on.</li>
          <li>A written procedure covers personal-data breaches: assessment, notification of affected sellers without undue delay, and notification of the supervisory authority within 72 hours where required.</li>
          <li>Questions about security: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</li>
        </ul>
      </Clause>
    </DocLayout>
  );
}
