// Webhook signature tests.
//
// The Didit webhook route is public and unauthenticated — the HMAC is the only
// thing stopping an attacker from forging an "Approved" identity check. These
// cases pin the properties that matter: bytes are authenticated, stale requests
// are refused, the envelope-only header is not accepted, and retries are
// processed once.
//
// Run: npx tsx scripts/diditWebhookTest.ts   (no server or API key needed)
import crypto from 'node:crypto';

const SECRET = 'test-secret-for-signature-checks';
process.env.DIDIT_WEBHOOK_SECRET = SECRET;

// Imported after the env var is set — the module reads the secret at load.
const { verifyWebhook, claimEvent } = await import('../services/diditWebhook.ts');
const { prisma } = await import('../lib/prisma.ts');

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const sign = (payload: string | Buffer) =>
  crypto.createHmac('sha256', SECRET).update(payload).digest('hex');

const body = Buffer.from(JSON.stringify({
  session_id: '11111111-2222-3333-4444-555555555555',
  status: 'Approved',
  event_id: 'evt_1',
  webhook_type: 'status.updated',
}));
const now = () => Math.floor(Date.now() / 1000);

console.log('— Raw-bytes signature —');
check(
  'valid x-signature accepted',
  verifyWebhook(body, { 'x-timestamp': String(now()), 'x-signature': sign(body) }).ok,
);

const tampered = Buffer.from(body.toString().replace('Approved', 'Declined'));
check(
  'signature does not carry over to a modified body',
  !verifyWebhook(tampered, { 'x-timestamp': String(now()), 'x-signature': sign(body) }).ok,
);

check(
  'signature from a different secret rejected',
  !verifyWebhook(body, {
    'x-timestamp': String(now()),
    'x-signature': crypto.createHmac('sha256', 'other-secret').update(body).digest('hex'),
  }).ok,
);

console.log('— Replay window —');
check(
  'timestamp 400s in the past rejected',
  !verifyWebhook(body, { 'x-timestamp': String(now() - 400), 'x-signature': sign(body) }).ok,
);
check(
  'timestamp 400s in the future rejected',
  !verifyWebhook(body, { 'x-timestamp': String(now() + 400), 'x-signature': sign(body) }).ok,
);
check(
  'missing timestamp rejected',
  !verifyWebhook(body, { 'x-signature': sign(body) }).ok,
);

console.log('— Header selection —');
check(
  'no signature header rejected',
  !verifyWebhook(body, { 'x-timestamp': String(now()) }).ok,
);
check(
  'x-signature-simple alone rejected (envelope-only)',
  !verifyWebhook(body, {
    'x-timestamp': String(now()),
    'x-signature-simple': sign(`${now()}:11111111-2222-3333-4444-555555555555:Approved:status.updated`),
  }).ok,
);

// V2 signs the payload re-serialised with sorted keys, so it survives a
// re-encode that would break the raw-bytes signature.
const sortKeys = (v: any): any =>
  Array.isArray(v) ? v.map(sortKeys)
  : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])]))
    : v;
const reordered = Buffer.from(JSON.stringify({
  webhook_type: 'status.updated',
  event_id: 'evt_1',
  status: 'Approved',
  session_id: '11111111-2222-3333-4444-555555555555',
}));
check(
  'valid x-signature-v2 accepted despite reordered keys',
  verifyWebhook(reordered, {
    'x-timestamp': String(now()),
    'x-signature-v2': sign(JSON.stringify(sortKeys(JSON.parse(body.toString())))),
  }).ok,
);
check(
  'bad x-signature-v2 rejected',
  !verifyWebhook(reordered, { 'x-timestamp': String(now()), 'x-signature-v2': sign('nonsense') }).ok,
);

console.log('— Replay of a valid delivery —');
// Dedupe now lives in Postgres, so the ids are unique per run and cleaned up.
const evtA = `evt_dedupe_a_${Date.now()}`;
const evtB = `evt_dedupe_b_${Date.now()}`;
check('first delivery of an event is processed', await claimEvent(evtA));
check('retry of the same event is dropped', !(await claimEvent(evtA)));
check('a different event is still processed', await claimEvent(evtB));
await prisma.webhookEvent.deleteMany({ where: { eventId: { in: [evtA, evtB] } } });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
