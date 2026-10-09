// The one-time password implementation, against the RFCs' own test vectors.
//
// This is why the algorithm was written out instead of installed: the standards
// publish known-answer tests, so correctness here is demonstrated rather than
// assumed. If any vector below fails, the authentication path is wrong and no
// amount of surrounding code makes up for it.
//
// Run: npx tsx scripts/totpTest.ts   (no server needed)
import {
  base32Decode, base32Encode, counterFor, formatSecretForTyping,
  generateSecret, hotp, otpauthUri, totp, verifyTotp,
} from '../lib/totp.ts';

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};

console.log('— RFC 4648 base32 —');
// The standard's own examples.
const base32Vectors: [string, string][] = [
  ['f', 'MY'], ['fo', 'MZXQ'], ['foo', 'MZXW6'],
  ['foob', 'MZXW6YQ'], ['fooba', 'MZXW6YTB'], ['foobar', 'MZXW6YTBOI'],
];
for (const [plain, encoded] of base32Vectors) {
  check(`"${plain}" encodes to ${encoded}`, base32Encode(Buffer.from(plain)) === encoded,
    base32Encode(Buffer.from(plain)));
}
for (const [plain, encoded] of base32Vectors) {
  check(`${encoded} decodes back to "${plain}"`, base32Decode(encoded).toString() === plain);
}
check('padding is tolerated', base32Decode('MZXW6===').toString() === 'foo');
check('spacing is tolerated', base32Decode('MZXW 6YTB OI').toString() === 'foobar');
check('lower case is tolerated', base32Decode('mzxw6ytboi').toString() === 'foobar');
check('a bad character is refused', (() => {
  try { base32Decode('MZXW1'); return false; } catch { return true; }
})());

console.log('— RFC 4226 appendix D: HOTP with the secret "12345678901234567890" —');
// The RFC's published values for counters 0 through 9.
const hotpVectors = [
  '755224', '287082', '359152', '969429', '338314',
  '254676', '287922', '162583', '399871', '520489',
];
const hotpSecret = Buffer.from('12345678901234567890');
hotpVectors.forEach((expected, counter) => {
  const got = hotp(hotpSecret, counter);
  check(`counter ${counter} gives ${expected}`, got === expected, got);
});

console.log('— RFC 6238 appendix B: TOTP at the published timestamps —');
// The RFC's SHA-1 column. Its secret is the 20-byte ASCII string above.
const totpSecret = base32Encode(Buffer.from('12345678901234567890'));
const totpVectors: [number, string][] = [
  [59, '94287082'],
  [1111111109, '07081804'],
  [1111111111, '14050471'],
  [1234567890, '89005924'],
  [2000000000, '69279037'],
  [20000000000, '65353130'],
];
for (const [seconds, eightDigits] of totpVectors) {
  // The RFC tabulates 8 digits; this implementation issues the 6 an
  // authenticator app expects, which are the last six of the same number.
  const expected = eightDigits.slice(-6);
  const got = totp(totpSecret, seconds * 1000);
  check(`t=${seconds} gives ${expected}`, got === expected, got);
}

console.log('— The drift window —');
const now = 1_700_000_000_000;
const secret = generateSecret();
const current = totp(secret, now);
check('the current code is accepted', verifyTotp(secret, current, { atMs: now }).ok);
check('the previous step is accepted',
  verifyTotp(secret, totp(secret, now - 30_000), { atMs: now }).ok);
check('the next step is accepted',
  verifyTotp(secret, totp(secret, now + 30_000), { atMs: now }).ok);
check('two steps back is refused',
  !verifyTotp(secret, totp(secret, now - 60_000), { atMs: now }).ok);
check('two steps forward is refused',
  !verifyTotp(secret, totp(secret, now + 60_000), { atMs: now }).ok);
check('spacing in the typed code is tolerated',
  verifyTotp(secret, `${current.slice(0, 3)} ${current.slice(3)}`, { atMs: now }).ok);

console.log('— Malformed input is refused before any comparison —');
for (const bad of ['', '12345', '1234567', 'abcdef', '12 34', '١٢٣٤٥٦']) {
  const r = verifyTotp(secret, bad, { atMs: now });
  check(`"${bad}" is refused as malformed`, !r.ok && r.reason === 'malformed',
    r.ok ? 'accepted' : (r as { reason: string }).reason);
}
check('a wrong six-digit code is a mismatch, not malformed', (() => {
  const wrong = String((Number(current) + 1) % 1_000_000).padStart(6, '0');
  const r = verifyTotp(secret, wrong, { atMs: now });
  return !r.ok && r.reason === 'mismatch';
})());

console.log('— A code cannot be used twice —');
const first = verifyTotp(secret, current, { atMs: now });
check('the first use reports which step it matched', first.ok && typeof first.counter === 'number');
const counter = first.ok ? first.counter : 0;
check('the same code is refused once that step is recorded',
  (() => {
    const r = verifyTotp(secret, current, { atMs: now, lastCounter: counter });
    return !r.ok && r.reason === 'reused';
  })());
check('an older step is refused too',
  (() => {
    const r = verifyTotp(secret, totp(secret, now - 30_000), { atMs: now, lastCounter: counter });
    return !r.ok && r.reason === 'reused';
  })());
check('the next step still works after that',
  verifyTotp(secret, totp(secret, now + 30_000), { atMs: now, lastCounter: counter }).ok);

console.log('— Secrets and enrolment —');
check('a generated secret is 32 base32 characters', /^[A-Z2-7]{32}$/.test(generateSecret()));
check('two generated secrets differ', generateSecret() !== generateSecret());
check('a code for one secret does not fit another',
  !verifyTotp(generateSecret(), totp(generateSecret(), now), { atMs: now }).ok);
check('steps are 30 seconds', counterFor(60_000) - counterFor(30_000) === 1);

const uri = otpauthUri({ secret: 'JBSWY3DPEHPK3PXP', account: 'owner@example.com', issuer: 'eustatement' });
check('the otpauth URI names the issuer and the account',
  uri.startsWith('otpauth://totp/eustatement%3Aowner%40example.com?')
  && uri.includes('secret=JBSWY3DPEHPK3PXP')
  && uri.includes('issuer=eustatement')
  && uri.includes('period=30')
  && uri.includes('digits=6'), uri);
check('the typed form is grouped in fours',
  formatSecretForTyping('JBSWY3DPEHPK3PXP') === 'JBSW Y3DP EHPK 3PXP');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
