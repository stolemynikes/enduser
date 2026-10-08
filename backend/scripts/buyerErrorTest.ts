// Buyer-facing errors carry a stable code.
//
// The public form shows errors in the buyer's language by looking the code up
// in its own translations (frontend/src/i18n). If a code stops arriving — a
// refactor back to `new Error(...)`, or error masking that drops extensions —
// every buyer silently gets the generic "something went wrong" in their
// language instead of what actually went wrong. Nothing else would notice.
//
// Needs a running server. Run: npx tsx scripts/buyerErrorTest.ts
import { readFileSync } from 'node:fs';

const API = 'http://localhost:3000/graphql';
let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};

const SUBMIT = 'mutation($i: SubmitInput!){ submitEndUserStatement(input:$i){ id } }';
async function submit(input: object) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: SUBMIT, variables: { i: input } }),
  });
  return res.json() as Promise<{ errors?: { message: string; extensions?: { code?: string } }[] }>;
}

const base = { email: 'buyer@example.com', firstName: 'A', lastName: 'B', substances: 'acetone', statement: 'cleaning' };

console.log('— Codes reach the client —');
// Two requests only: the submit route is rate-limited and this runs in the suite.
const terms = await submit({ ...base, agreedToTerms: false });
check('terms not agreed → TERMS_REQUIRED', terms.errors?.[0]?.extensions?.code === 'TERMS_REQUIRED', JSON.stringify(terms.errors?.[0]));
const email = await submit({ ...base, email: 'not-an-email', agreedToTerms: true });
check('bad email → INVALID_EMAIL', email.errors?.[0]?.extensions?.code === 'INVALID_EMAIL', JSON.stringify(email.errors?.[0]));
check('the English message is still there as a fallback', !!email.errors?.[0]?.message);

console.log('— Every code the server can send has a sentence in the form —');
const codes = [...readFileSync(new URL('../lib/buyerError.ts', import.meta.url), 'utf8')
  .matchAll(/\|\s*'([A-Z_]+)'/g)].map(m => m[1]);
const en = readFileSync(new URL('../../frontend/src/i18n/messages/en.ts', import.meta.url), 'utf8');
const server = en.slice(en.indexOf('server: {'));
const missing = codes.filter(c => !new RegExp(`\\b${c}:`).test(server));
check(`${codes.length} codes, all translated`, codes.length > 0 && missing.length === 0, `missing: ${missing.join(', ')}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
