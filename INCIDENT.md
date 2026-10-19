# When something goes wrong

The procedure for a security incident or a personal-data breach. Read it once
now; follow it step by step when it happens. The Security overview
(`/security`) says this procedure exists, and the DPA promises sellers are told
"without undue delay" — this is how that promise is kept.

Write everything down as you go, with times: a text file per incident is
enough. GDPR Article 33(5) requires a record of every breach, including the
ones you decide not to report.

## 1. Contain (first hour)

Stop it getting worse before working out what happened.

- **A leaked secret** (`.env`, an API key, the Cloudflare origin key): rotate it
  at the provider, put the new value in `.env`, `docker compose up -d`.
  Rotating `JWT_SECRET` or `COMPANY_JWT_SECRET` signs everyone out, which is
  what you want if a session might be stolen.
- **`ENCRYPTION_KEY` leaked together with a database copy**: treat every
  encrypted field as readable. This is the worst case; go straight to step 3.
- **An account taken over**: lock it (set a random password with
  `scripts/setAdminPassword.ts` for the admin; for a company user, reset their
  password and remove their passkeys and second factor in the database), then
  look at the reveal log, the buyer-data log and the decision log for what the
  account did.
- **The server compromised**: take it off the internet (Cloudflare: pause the
  zone, or stop the `web` container), keep the disk as it is for analysis, and
  rebuild from the repository and the last good backup on a fresh server.
- **A bug that exposes data**: deploy the fix, or take the affected route down,
  before anything else.

## 2. Assess (same day)

Answer, in writing:

1. What happened, and from when to when?
2. Whose data: which sellers (companies), roughly how many buyers?
3. Which data: contact details, identity-document numbers, stated uses,
   account data? Was it encrypted, and was the key exposed too?
4. Is it still going on?
5. What is the likely harm to the people concerned? Identity-document numbers
   and names together are high risk (identity fraud).

The logs that help: `docker compose logs api` (sign-ins, `[support]`,
`[reveal]`, `[didit]` lines), the admin Health page, and in the database the
`RevealLog`, `BuyerDataAction`, `SupportAccess` and `SubmissionOverride` tables.

## 3. Tell the sellers (without undue delay — aim for 24 hours)

For their buyers' data you are the **processor**; the sellers are the
controllers and they decide whether to tell their buyers and the authority.
They can only do that if you tell them first.

Admin dashboard → **Legal** → **Notify owners of an incident**. Choose all
companies or list the affected ones by form address. Say, in plain words:

- what happened and when, and that it is contained (or not yet);
- which of their data is affected, as precisely as you know;
- what you have done and will do;
- what they may need to do: their own assessment, telling their buyers, and
  reporting to their supervisory authority within 72 hours of *their* becoming
  aware;
- that you will send an update, and when.

Every message is stored with the time and how many owners it reached; that is
your proof of when they were told. Send updates the same way as you learn more.

## 4. Tell the authority (within 72 hours, where required)

For data you control yourself — company accounts, their users, the platform's
own records — you are the **controller**. A breach that is likely to result in
a risk to people must be reported to the Autoriteit Persoonsgegevens within 72
hours of becoming aware of it: autoriteitpersoonsgegevens.nl → "Datalek
melden". If you are unsure whether it is required, report: a report can be
withdrawn, a late one cannot be undone.

If the risk to the people affected is high, they must be told directly too.

## 5. Afterwards

- Fix the cause, add a test that would have caught it, and run every suite.
- Update the incident record: cause, impact, timeline, what changed.
- If a measure on `/security` or in the DPA changed, update the page and
  `LAST_UPDATED` in the same commit.
