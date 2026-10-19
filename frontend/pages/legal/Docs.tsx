// Documentation for companies using eustatement. Written from the code: roles,
// timings and URL parameters here are the ones the app enforces.
import { Link } from 'react-router-dom';
import { DocLayout, Clause } from '../../src/components/DocLayout.tsx';
import { CLOSURE_GRACE_DAYS, CONTACT_EMAIL, RETENTION_MONTHS } from '../../src/lib/legal.ts';

export default function Docs() {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain';
  return (
    <DocLayout title="Documentation" intro={
      <p>
        eustatement collects end-user statements for regulated chemicals: who is buying, for what, and proof of who
        they are. This page walks through it from requesting access to deciding on a statement.
      </p>
    }>
      <Clause id="access" title="Getting access">
        <ol>
          <li><Link to="/register">Request access</Link> with your company name and your own details. A short note about your business — website, what you sell — speeds up the review.</li>
          <li>Confirm your email address with the link you receive.</li>
          <li>Sign in and set up your form while you wait. A banner tells you the request is being reviewed.</li>
          <li>Once it is approved you get an email, and your form starts accepting statements.</li>
        </ol>
        <p>Until all three — approval, confirmed address, a configured form — are in place, your form tells visitors it is not available yet, and the server refuses submissions to it.</p>
      </Clause>

      <Clause id="form" title="Setting up your form">
        <p>The setup wizard, and later <strong>Form settings</strong> in the dashboard, decide what your form asks:</p>
        <ul>
          <li><strong>Fields</strong> — order number, address, CAS numbers and concentration can each be required, optional or hidden. Email, name, substance and intended use are always asked.</li>
          <li><strong>Buyers</strong> — companies only, private individuals only, or both. Company buyers give a company name and a VAT number, which is checked against the EU VIES register.</li>
          <li><strong>Identity verification</strong> — required or off. When required, the buyer photographs their passport or identity card and takes a selfie in a secure window from our identity-verification provider (named in the <Link to="/dpa#sub-processors">DPA</Link>). The photos never reach you or us, and are deleted at the provider after the check.</li>
          <li><strong>Terms</strong> — the platform’s default declaration, your own text, or a link to your terms.</li>
        </ul>
      </Clause>

      <Clause id="sharing" title="Sharing the form">
        <p>Your form lives at its own address — share the link, for example in your order confirmation:</p>
        <pre><code>{`${origin}/your-company`}</code></pre>
        <p>Or embed it on your own site. The dashboard gives you the exact code; it looks like this:</p>
        <pre><code>{`<iframe src="${origin}/embed/your-company"
        style="width:100%;border:0" title="End-user statement"></iframe>`}</code></pre>
        <p>The embedded form reports its height to your page so the frame can grow with it. Two optional parameters on the frame address:</p>
        <ul>
          <li><code>?theme=dark</code> — the dark version.</li>
          <li><code>?lang=de</code> — open in a language; any of the 24 official EU language codes. Buyers can still switch language in the form. Without it, the form follows the buyer’s browser.</li>
        </ul>
        <p>Combine them as <code>?theme=dark&amp;lang=de</code>. Under every form is a line linking to eustatement and to <Link to="/how-it-works">How this works</Link>, the page that tells buyers — in their language and naming your company — what happens to their data.</p>
      </Clause>

      <Clause id="checks" title="What happens when a buyer submits">
        <ul>
          <li><strong>Age</strong> — if the identity document shows the buyer is under 18, the statement cannot be sent at all.</li>
          <li><strong>Identity</strong> — the outcome of the identity check, and the name, document type and number printed on the document. A failed check is flagged, never an automatic refusal.</li>
          <li><strong>VAT</strong> — company buyers’ VAT numbers are checked in VIES, including whether the registered address matches.</li>
          <li><strong>Substance</strong> — CAS numbers are confirmed in PubChem and checked against Annexes I and II of Regulation (EU) 2019/1148. Names are recognised in every official EU language, so “Salpetersäure” is nitric acid. Without a CAS number the substance is identified by name, and the check says so.</li>
          <li><strong>Intended use</strong> — screened for warning signs in English, Dutch, German and French. Statements in other languages are machine-translated on our own server and the translation is screened too; the reviewer sees the original with the translation under it.</li>
          <li><strong>Earlier approvals</strong> — if the same buyer, document or substances were approved before in your company, the statement says so, so a repeat order is quick to check.</li>
        </ul>
        <div className="doc-note">
          <p>Checks point at what deserves a closer look. They never approve or refuse a statement — a person on your team does.</p>
        </div>
      </Clause>

      <Clause id="review" title="Reviewing statements">
        <ul>
          <li>The queue shows every statement with its status and the outcome of each check. Open one to see everything the buyer entered and every check result.</li>
          <li><strong>Approve</strong> or <strong>deny</strong> with a reason. The buyer is emailed the decision; an approval includes a PDF copy of their statement.</li>
          <li>A failed check blocks approval until someone with the right role overrides it — with a reason, recorded with their name.</li>
          <li><strong>Report</strong> opens an email with the full details of a suspicious statement, ready to forward to the competent authority.</li>
          <li>New statements and flags appear under the bell in the dashboard.</li>
        </ul>
      </Clause>

      <Clause id="team" title="Your team and roles">
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead><tr><th scope="col">Role</th><th scope="col">Can</th></tr></thead>
            <tbody>
              <tr><td>Owner</td><td>Everything below, plus form settings, inviting and removing team members, changing roles, the record of document-number look-ups, and closing the account.</td></tr>
              <tr><td>Reviewer</td><td>Approve and deny statements, override a failed check with a reason, re-run checks, and look up identity document numbers.</td></tr>
              <tr><td>Viewer</td><td>Read statements and their check results.</td></tr>
            </tbody>
          </table>
        </div>
      </Clause>

      <Clause id="security" title="Security">
        <ul>
          <li><strong>Second sign-in factor</strong> — an authenticator app, a passkey, or both, under <strong>Account</strong>. Keep the recovery codes somewhere safe. The platform can require a second factor for everyone.</li>
          <li><strong>Document numbers</strong> are hidden by default. Showing one asks for a fresh second factor, shows it briefly, and records who looked and when; the Owner can see that record.</li>
          <li><strong>Sessions</strong> end after 60 minutes without activity.</li>
        </ul>
      </Clause>

      <Clause id="data" title="Data and retention">
        <ul>
          <li>Statements are deleted automatically {RETENTION_MONTHS} months after they were submitted.</li>
          <li>Closing your account erases everything belonging to your company {CLOSURE_GRACE_DAYS} days later. Until then you can still sign in, retrieve what you need, or undo the closure.</li>
          <li>You are the controller of your buyers’ data; see the <Link to="/dpa">DPA</Link> and the <Link to="/privacy">Privacy Policy</Link>.</li>
        </ul>
      </Clause>

      <Clause id="help" title="Help">
        <p>Questions, or something not working as described here: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </Clause>
    </DocLayout>
  );
}
