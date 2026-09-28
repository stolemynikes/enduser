// The field encryption's own guarantees, including the one added after the
// audit: a ciphertext is bound to its column.
import { encryptField, decryptField } from '../lib/cipher.ts';

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};

const secret = 'NYHBBH4L8';
const bound = encryptField(secret, 'idDocumentNumber');

check('round-trips within its own column', decryptField(bound, 'idDocumentNumber') === secret);
check('ciphertext differs every time (random IV)',
  encryptField(secret, 'idDocumentNumber') !== encryptField(secret, 'idDocumentNumber'));
check('the plaintext does not appear in the ciphertext', !bound.includes(secret));

let moved = false;
try { decryptField(bound, 'street'); moved = true; } catch { /* rejected */ }
check('a value moved to another column will not decrypt', !moved);

let tampered = false;
const flipped = bound.slice(0, -2) + (bound.endsWith('A') ? 'B' : 'A') + '=';
try { decryptField(flipped, 'idDocumentNumber'); tampered = true; } catch { /* rejected */ }
check('a tampered ciphertext is rejected by the auth tag', !tampered);

const legacy = encryptField(secret);                       // v1, no column binding
check('values written before the change still decrypt', decryptField(legacy, 'idDocumentNumber') === secret);
check('plaintext rows are passed through untouched', decryptField('not encrypted', 'street') === 'not encrypted');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
