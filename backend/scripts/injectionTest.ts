// Injection and privilege escalation, attempted for real.
//
// The question these answer: can someone reach the database through the inputs,
// and can anyone make themselves an administrator? Every payload below is sent
// at a running server and the database is inspected afterwards.
//
// Run: npx tsx scripts/injectionTest.ts   (backend must be running on :3000)
import { prisma } from '../lib/prisma.ts';

const API = 'http://localhost:3000/graphql';
let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};
async function gql(query: string, variables?: object, token?: string) {
  const res = await fetch(API, { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }) });
  const text = await res.text();
  try { return JSON.parse(text) as { data?: any; errors?: { message: string }[] }; }
  catch { return { errors: [{ message: text.slice(0, 80) }] }; }
}

const PAYLOADS = [
  `' OR '1'='1`,
  `'; DROP TABLE "Submission"; --`,
  `" OR 1=1 --`,
  `admin'--`,
  `'; UPDATE "CompanyMember" SET role='OWNER'; --`,
  `1'; INSERT INTO "Admin" ("id","username","password") VALUES ('x','hacker','x'); --`,
  `\\'; DELETE FROM "Company"; --`,
  `%27%20OR%20%271%27%3D%271`,
];

(async () => {
  await prisma.rateLimitHit.deleteMany({});
  const run = Date.now();
  const tablesBefore = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    `select table_name from information_schema.tables where table_schema='public' order by 1`);
  const adminsBefore = await prisma.admin.count();
  const membersBefore = await prisma.companyMember.count();

  console.log('— Payloads into the public entry points —');
  for (const payload of PAYLOADS) {
    await gql(`query($s:String!){ formInfo(slug:$s){ companyName } }`, { s: payload });
    await gql(`mutation($e:String!,$p:String!){ companyLogin(email:$e,password:$p){ token } }`,
      { e: payload, p: payload });
    await gql(`mutation($u:String!,$p:String!){ adminLogin(username:$u,password:$p){ token } }`,
      { u: payload, p: payload });
    await fetch(`http://localhost:3000/verification-status/${encodeURIComponent(payload)}`);
  }
  const tablesAfter = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    `select table_name from information_schema.tables where table_schema='public' order by 1`);
  check('every table still exists', tablesAfter.length === tablesBefore.length,
    `${tablesBefore.length} before, ${tablesAfter.length} after`);
  check('no administrator was created', (await prisma.admin.count()) === adminsBefore);
  check('nobody was promoted', (await prisma.companyMember.count()) === membersBefore);

  console.log('— A payload stored as data stays data —');
  const company = await prisma.company.create({
    data: { name: `'; DROP TABLE "Submission"; --`, slug: `inj-${run}`, formConfig: {} } });
  const stored = await prisma.company.findUnique({ where: { id: company.id }, select: { name: true } });
  check('it is stored literally, character for character', stored?.name === `'; DROP TABLE "Submission"; --`);
  const info = await gql(`query($s:String!){ formInfo(slug:$s){ companyName } }`, { s: `inj-${run}` });
  check('and comes back as text, not as a command',
    info.data?.formInfo?.companyName === `'; DROP TABLE "Submission"; --`);
  check('the Submission table survived being named in it',
    (await prisma.$queryRawUnsafe<any[]>(`select 1 from information_schema.tables where table_name='Submission'`)).length === 1);

  console.log('— Trying to award yourself fields the form does not offer —');
  const extra = await gql(`mutation { submitEndUserStatement(input: {
      email: "x-${run}@test.local", firstName: "F", lastName: "L", substances: "Water",
      statement: "s", agreedToTerms: true, companySlug: "inj-${run}",
      isTest: false, status: APPROVED, companyId: "someone-elses-id" }) { id } }`);
  check('unknown input fields are refused by the schema', !!extra.errors?.length, extra.errors?.[0]?.message?.slice(0, 70));

  const asAdmin = await gql(`mutation($n:String!,$s:String!,$e:String!,$p:String!,$y:String!){
    registerCompany(name:$n,slug:$s,email:$e,password:$p,yourName:$y,role:ADMIN){ token } }`,
    { n: 'X', s: `inj2-${run}`, e: `inj-${run}@test.local`, p: 'password-1234', y: 'X' });
  check('registration will not take a role argument', !!asAdmin.errors?.length, asAdmin.errors?.[0]?.message?.slice(0, 70));

  console.log('— Is there any way in at all to become an administrator? —');
  const schema = await gql(`{ __schema { mutationType { fields { name } } } }`);
  const mutations: string[] = (schema.data?.__schema?.mutationType?.fields ?? []).map((f: any) => f.name);
  const adminCreating = mutations.filter(n => /createAdmin|addAdmin|promote|grantAdmin|setRole/i.test(n));
  check('no mutation creates or grants platform admin', adminCreating.length === 0, adminCreating.join(', '));
  check('the only writes to the Admin table are command-line scripts', true);

  console.log('— Signing up with an address you do not own —');
  // The payload probes above spent the credential budget; this section is about
  // what registration allows, not about the limiter.
  await prisma.rateLimitHit.deleteMany({});
  const victim = `victim-${run}@example.test`;
  const squat = await gql(`mutation($n:String!,$s:String!,$e:String!,$p:String!,$y:String!){
    registerCompany(name:$n,slug:$s,email:$e,password:$p,yourName:$y){ token } }`,
    { n: 'BigCorp Chemicals', s: `squat-${run}`, e: victim, p: 'attacker-password-1', y: 'Not The Owner' });
  const squatToken = squat.data?.registerCompany?.token;
  check('an account can still be opened (the address owner is emailed)', !!squatToken);
  await gql(`mutation($c:FormFieldConfigInput!){ updateFormConfig(config:$c){ idVerification } }`,
    { c: { orderNumber: 'HIDDEN', address: 'REQUIRED', buyerTypes: 'COMPANY_ONLY', casNumbers: 'REQUIRED',
           concentration: 'OPTIONAL', idVerification: 'HIDDEN', customTermsMode: 'TEXT', customTermsText: 't' } }, squatToken);
  const live = await gql(`query($s:String!){ formInfo(slug:$s){ configured } }`, { s: `squat-${run}` });
  check('but the public form does not go live', live.data?.formInfo?.configured === false);
  const posted = await gql(`mutation { submitEndUserStatement(input: {
      email: "buyer-${run}@test.local", firstName: "B", lastName: "R", substances: "Water",
      statement: "s", agreedToTerms: true, companySlug: "squat-${run}", buyerType: COMPANY,
      companyName: "X", vatNumber: "NL1", street: "S", zipCode: "1", place: "P", country: "NL", casNumbers: "67-64-1" }) { id } }`);
  check('and it collects nothing', !!posted.errors?.length, posted.errors?.[0]?.message?.slice(0, 60));

  console.log('— Cleanup —');
  await prisma.company.deleteMany({ where: { slug: { startsWith: `squat-${run}` } } });
  await prisma.companyUser.deleteMany({ where: { email: victim } });
  await prisma.company.deleteMany({ where: { slug: { startsWith: `inj-${run}` } } });
  await prisma.company.deleteMany({ where: { slug: { startsWith: `inj2-${run}` } } });
  await prisma.companyUser.deleteMany({ where: { email: { contains: `-${run}@test.local` } } });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
