// The public statement check.
//
// Anyone may ask, so the cases that matter are what it refuses to say. Pinned:
// a correct reference and code confirm the statement with date, seller and
// status and nothing about the buyer; a wrong code, a guessed reference or
// garbage all get the same "not recognised"; a deleted statement is told
// apart only by someone holding the right code; and guessing is rate-limited.
//
// Run: npx tsx scripts/statementCheckTest.ts   (needs the API on :3000 and the database)
import 'dotenv/config';
import { prisma } from '../lib/prisma.ts';
import { statementCheckCode } from '../lib/statementCheck.ts';

const API = 'http://localhost:3000/graphql';
let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}
async function ask(reference: string, code: string, extra = '') {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apollo-require-preflight': '1' },
    body: JSON.stringify({
      query: `query($r:String!,$c:String!){ checkStatement(reference:$r, code:$c){ result submittedAt sellerName status ${extra} } }`,
      variables: { r: reference, c: code },
    }),
  });
  return { status: res.status, body: await res.json().catch(() => null) as any };
}

const run = Date.now().toString(36);
await prisma.rateLimitHit.deleteMany({ where: { key: { contains: 'statement-check' } } });
const company = await prisma.company.create({ data: { name: `Check Seller ${run}`, slug: `check-${run}` } });
const s = await prisma.submission.create({
  data: {
    companyId: company.id, email: `check-${run}@test.local`, orderNumber: 'ORD-C', firstName: 'Carla', lastName: 'Checked',
    street: '', zipCode: '', place: '', country: '', companyName: '', vatNumber: '', buyerType: 'INDIVIDUAL',
    substances: 'Acetone', casNumbers: '', statement: 'x', viesStatus: 'NOT_CHECKED', status: 'APPROVED',
  },
});

try {
  const code = statementCheckCode(s.id);
  console.log('— A genuine copy —');
  const ok = await ask(s.id, code);
  const r = ok.body?.data?.checkStatement;
  check('is confirmed', r?.result === 'GENUINE', JSON.stringify(ok.body));
  check('with the date, the seller and the status', r?.sellerName === company.name && r?.status === 'Approved' && !!r?.submittedAt);
  check('and nothing about the buyer', !JSON.stringify(ok.body).includes('Carla') && !JSON.stringify(ok.body).includes('@'));
  check('the code may be typed in lower case with dashes', (await ask(s.id, code.toLowerCase().replace(/(.{5})(?=.)/g, '$1-'))).body?.data?.checkStatement?.result === 'GENUINE');
  check('the buyer\'s fields cannot be asked for', !!(await ask(s.id, code, 'email')).body?.errors?.length);

  console.log('— Everything else looks the same —');
  const flipped = code.slice(0, -1) + (code.endsWith('A') ? 'B' : 'A');
  const answers = [
    (await ask(s.id, flipped)).body?.data?.checkStatement,
    (await ask(s.id, '')).body?.data?.checkStatement,
    (await ask('not-a-reference', code)).body?.data?.checkStatement,
    (await ask(crypto.randomUUID(), code)).body?.data?.checkStatement,
  ];
  check('a wrong code, no code, a malformed or another reference: "not recognised"',
    answers.every(a => a?.result === 'UNKNOWN' && !a.sellerName && !a.status && !a.submittedAt), JSON.stringify(answers));

  console.log('— After deletion —');
  await prisma.submission.delete({ where: { id: s.id } });
  check('the right code says it existed but is no longer held', (await ask(s.id, code)).body?.data?.checkStatement?.result === 'GENUINE_NOT_HELD');
  check('a wrong one still says nothing', (await ask(s.id, flipped)).body?.data?.checkStatement?.result === 'UNKNOWN');

  console.log('— Guessing —');
  let limited = false;
  for (let i = 0; i < 30 && !limited; i++) limited = (await ask(s.id, flipped)).status === 429;
  check('repeated guesses are rate-limited', limited);
} finally {
  await prisma.rateLimitHit.deleteMany({ where: { key: { contains: 'statement-check' } } });
  await prisma.submission.deleteMany({ where: { companyId: company.id } });
  await prisma.company.delete({ where: { id: company.id } });
  await prisma.$disconnect();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
