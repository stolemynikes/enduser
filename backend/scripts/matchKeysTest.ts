// The duplicate-detection fingerprints, as assertions.
//
// Two properties have to hold at once and they pull against each other: a
// fingerprint must be stable enough that the same buyer is recognised however
// their details were typed, and scoped tightly enough that it cannot be used to
// follow one person from one seller's queue into another's. The second property
// was missing when the feature shipped on 2026-10-02 and is what most of this
// file exists to hold in place.
//
// Run: npx tsx scripts/matchKeysTest.ts   (no server needed)
import { documentKey, matchKeys, statementSimilarity, substanceKey, vatKey } from '../lib/matchKeys.ts';
import { ageFrom } from '../services/didit.ts';

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};

const A = 'company-aaaaaaaaaaaaaaaa';
const B = 'company-bbbbbbbbbbbbbbbb';

console.log('— A fingerprint survives how the value was typed —');
check('document number ignores case and spacing',
  documentKey(A, 'X 1234567') === documentKey(A, 'x1234567'));
check('document number ignores punctuation',
  documentKey(A, 'XI-234567') === documentKey(A, 'xi234567'));
check('VAT number ignores case and spacing',
  vatKey(A, 'NL861234567B01') === vatKey(A, 'nl 861234567 b01'));
check('CAS set is order-independent',
  substanceKey(A, '7664-93-9, 67-64-1', '') === substanceKey(A, '67-64-1,7664-93-9', ''));
check('CAS set ignores duplicates',
  substanceKey(A, '67-64-1, 67-64-1', '') === substanceKey(A, '67-64-1', ''));
check('substance names are the fallback when no CAS was collected',
  substanceKey(A, '', 'Acetone') === substanceKey(A, '', 'acetone'));
check('a CAS number wins over the name it was given',
  substanceKey(A, '67-64-1', 'Acetone') !== substanceKey(A, '', 'Acetone'));

console.log('— Different values stay different —');
check('two document numbers do not collide',
  documentKey(A, 'X1234567') !== documentKey(A, 'X1234568'));
check('a document number is not reusable as a VAT fingerprint',
  documentKey(A, 'NL861234567B01') !== vatKey(A, 'NL861234567B01'));
check('too short to be a document number yields nothing',
  documentKey(A, 'X1') === null);
check('too short to be a VAT number yields nothing',
  vatKey(A, 'NL12') === null);
check('nothing in, nothing out', substanceKey(A, '', '') === null);

console.log('— A fingerprint cannot follow a buyer between sellers —');
check('the same document in two companies gives two codes',
  documentKey(A, 'X1234567') !== documentKey(B, 'X1234567'));
check('the same VAT in two companies gives two codes',
  vatKey(A, 'NL861234567B01') !== vatKey(B, 'NL861234567B01'));
check('the same substances in two companies give two codes',
  substanceKey(A, '67-64-1', 'Acetone') !== substanceKey(B, '67-64-1', 'Acetone'));
check('but the same document in the same company still matches',
  documentKey(A, 'X1234567') === documentKey(A, 'X1234567'));

console.log('— A submission outside every queue carries no fingerprint —');
const orphan = matchKeys(null, {
  idDocumentNumber: 'X1234567', vatNumber: 'NL861234567B01',
  casNumbers: '67-64-1', substances: 'Acetone',
});
check('no company, no document fingerprint', orphan.idDocumentNumberHash === null);
check('no company, no VAT fingerprint', orphan.vatNumberHash === null);
check('no company, no substance fingerprint', orphan.substanceKeyHash === null);

console.log('— Statement similarity —');
const used = 'Solvent for HPLC sample preparation in our water-analysis laboratory';
check('identical text scores 100', Math.round(statementSimilarity(used, used) * 100) === 100);
check('unrelated text scores low',
  statementSimilarity(used, 'making fireworks for new year') < 0.2);
check('a reworded version of the same use still scores high',
  statementSimilarity(used, 'Solvent for HPLC sample preparation in our laboratory') > 0.7,
  String(Math.round(statementSimilarity(used, 'Solvent for HPLC sample preparation in our laboratory') * 100)));
check('empty text scores nothing', statementSimilarity('', used) === 0);

console.log('— Age from a date of birth —');
const now = new Date('2026-10-05T12:00:00Z');
check('a birthday already passed this year counts', ageFrom('2008-01-01', now) === 18);
check('a birthday still to come this year does not',
  ageFrom('2008-12-31', now) === 17, String(ageFrom('2008-12-31', now)));
check('the birthday itself counts', ageFrom('2008-10-05', now) === 18);
check('the day before the birthday does not', ageFrom('2008-10-06', now) === 17);
check('no date of birth is not an age', ageFrom(null, now) === null);
check('nonsense is not an age', ageFrom('not-a-date', now) === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
