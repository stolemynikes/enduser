// Substance check tests.
//
// The check gates approval, so the cases that matter are the ones where a wrong
// answer is expensive: a restricted precursor waved through, a CAS that does not
// match the name it was declared under, and an outage being mistaken for "clean".
//
// Hits the live PubChem API (free, no key). Run: npx tsx scripts/substanceCheckTest.ts
import { checkSubstanceUse } from '../services/substanceCheck.ts';
import { PRECURSORS, findByCas, findByCid, findByName, normalizeCas } from '../lib/precursors.ts';

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

console.log('— Annex list integrity —');
check('18 substances vendored (9 Annex I + 9 Annex II)', PRECURSORS.length === 18, `got ${PRECURSORS.length}`);
check('every entry has a CAS, a CID and an annex',
  PRECURSORS.every(e => /^\d{2,7}-\d{2}-\d$/.test(e.cas) && e.cid > 0 && (e.annex === 'I' || e.annex === 'II')));
check('every Annex I entry carries a limit value',
  PRECURSORS.filter(e => e.annex === 'I').every(e => !!e.limitValue && !!e.licensingUpperLimit));
check('no duplicate CAS numbers', new Set(PRECURSORS.map(e => e.cas)).size === PRECURSORS.length);
check('no duplicate CIDs', new Set(PRECURSORS.map(e => e.cid)).size === PRECURSORS.length);

console.log('— CAS normalisation —');
check('accepts a plain CAS', normalizeCas('67-64-1') === '67-64-1');
check('strips whitespace', normalizeCas('  67-64-1 ') === '67-64-1');
check('normalises a unicode dash', normalizeCas('67‐64‐1') === '67-64-1');
check('rejects free text', normalizeCas('acetone') === null);
check('rejects a partial number', normalizeCas('67-64') === null);

console.log('— Annex lookup —');
check('sulphuric acid CAS resolves to Annex I', findByCas('7664-93-9')?.annex === 'I');
check('acetone CAS resolves to Annex II', findByCas('67-64-1')?.annex === 'II');
check('an unlisted CAS resolves to nothing', findByCas('108-88-3') === null);
check('lookup by CID works', findByCid(1118)?.name === 'Sulphuric acid');
check('American spelling matches ("sulfuric acid")', findByName('sulfuric acid')?.cas === '7664-93-9');
check('a qualified name still matches ("70% nitric acid solution")', findByName('70% nitric acid solution')?.cas === '7697-37-2');
check('"calcium ammonium nitrate" does not collapse to "ammonium nitrate"',
  findByName('calcium ammonium nitrate')?.cas === '15245-12-2', findByName('calcium ammonium nitrate')?.name);
check('an unlisted name resolves to nothing', findByName('toluene') === null);

console.log('— End-to-end (live PubChem) —');

// The statement field is required on every form, so cases probing the substance
// logic still have to supply one — otherwise they trip the missing-statement
// rule and stop testing what they were written to test.
const OK_USE = 'Cleaning precision optical components in our workshop';

const cases: { label: string; args: Parameters<typeof checkSubstanceUse>[0]; expect: 'OK' | 'FLAGGED' | 'ERROR'; mustSay?: string; mustNotSay?: string }[] = [
  {
    label: 'unlisted substance, matching CAS → OK',
    args: { substances: 'Toluene', casNumbers: '108-88-3', statement: OK_USE, buyerType: 'COMPANY' },
    expect: 'OK', mustSay: 'Not listed',
  },
  {
    label: 'acetone (Annex II) stays OK but the listing is stated',
    args: { substances: 'Acetone', casNumbers: '67-64-1', statement: OK_USE, buyerType: 'COMPANY' },
    expect: 'OK', mustSay: 'Annex II',
  },
  {
    label: 'sulphuric acid (Annex I) to an individual → FLAGGED',
    args: { substances: 'Sulphuric acid', casNumbers: '7664-93-9', statement: OK_USE, buyerType: 'INDIVIDUAL' },
    expect: 'FLAGGED', mustSay: 'private individual',
  },
  {
    label: 'sulphuric acid (Annex I) to a company → still FLAGGED',
    args: { substances: 'Sulphuric acid', casNumbers: '7664-93-9', statement: OK_USE, buyerType: 'COMPANY' },
    expect: 'FLAGGED', mustSay: 'Annex I',
  },
  {
    label: 'name/CAS mismatch → FLAGGED',
    args: { substances: 'Acetone', casNumbers: '7664-93-9', statement: OK_USE, buyerType: 'COMPANY' },
    expect: 'FLAGGED', mustSay: 'not the declared substance',
  },

  // PubChem knows almost no non-English names. Before the multilingual table a
  // German buyer writing "Essigsäure" next to the right CAS was flagged as
  // unidentifiable, and every listed substance in Dutch read as unchecked.
  {
    label: 'Dutch annex name with its CAS → recognised from the regulation, not "unidentified"',
    args: { substances: 'salpeterzuur', casNumbers: '7697-37-2', statement: OK_USE, buyerType: 'COMPANY' },
    expect: 'FLAGGED', mustSay: 'Dutch name for Nitric acid', mustNotSay: 'could not be identified',
  },
  {
    label: 'German annex name with umlaut and its CAS → recognised',
    args: { substances: 'Salpetersäure', casNumbers: '7697-37-2', statement: OK_USE, buyerType: 'COMPANY' },
    expect: 'FLAGGED', mustSay: 'German name', mustNotSay: 'could not be identified',
  },
  {
    label: 'unlisted substance in German with its CAS → OK via Wikidata',
    args: { substances: 'Essigsäure', casNumbers: '64-19-7', statement: OK_USE, buyerType: 'COMPANY' },
    expect: 'OK', mustSay: 'Wikidata',
  },
  {
    label: 'a listed name in Polish under an unrelated CAS → FLAGGED as a mismatch',
    args: { substances: 'kwas azotowy', casNumbers: '67-64-1', statement: OK_USE, buyerType: 'COMPANY' },
    expect: 'FLAGGED', mustSay: 'Polish name for Nitric acid',
  },
  {
    label: 'unpaired Dutch name is still checked against the annexes',
    args: { substances: 'waterstofperoxide, tolueen', casNumbers: '108-88-3', statement: OK_USE, buyerType: 'INDIVIDUAL' },
    expect: 'FLAGGED', mustSay: 'Dutch name for Hydrogen peroxide',
  },
  {
    label: 'an invented CAS → FLAGGED, not silently OK',
    args: { substances: 'Acetone', casNumbers: '9999-99-9', statement: OK_USE, buyerType: 'COMPANY' },
    expect: 'FLAGGED', mustSay: 'could not be found',
  },
  {
    label: 'a non-CAS blob in the CAS field → FLAGGED',
    args: { substances: 'Acetone', casNumbers: 'n/a', statement: OK_USE, buyerType: 'COMPANY' },
    expect: 'FLAGGED', mustSay: 'not a valid CAS',
  },
  // Without a CAS the check used to stop — and "not checked" is green at
  // approval, so a form with the CAS field hidden was approvable with nothing
  // screened. It now identifies by name and always screens the statement.
  {
    label: 'no CAS, unlisted name → checked by name, says so',
    args: { substances: 'Toluene', casNumbers: '', statement: OK_USE, buyerType: 'COMPANY' },
    expect: 'OK', mustSay: 'identified by name only',
  },
  {
    label: 'no CAS, listed name in Dutch → FLAGGED from the annex',
    args: { substances: 'salpeterzuur', casNumbers: '', statement: OK_USE, buyerType: 'INDIVIDUAL' },
    expect: 'FLAGGED', mustSay: 'Dutch name for Nitric acid',
  },
  {
    label: 'no CAS, suspicious stated use → FLAGGED (the statement is screened regardless)',
    args: { substances: 'Toluene', casNumbers: '', statement: 'to make a bomb', buyerType: 'COMPANY' },
    expect: 'FLAGGED', mustSay: 'Explosive',
  },
  {
    label: 'no CAS, a name nothing knows → FLAGGED, not silently OK',
    args: { substances: 'Blorbium extract', casNumbers: '', statement: OK_USE, buyerType: 'COMPANY' },
    expect: 'FLAGGED', mustSay: 'could not be identified',
  },
  {
    label: 'multiple substances, one restricted → FLAGGED',
    args: { substances: 'Toluene, Nitric acid', casNumbers: '108-88-3, 7697-37-2', statement: OK_USE, buyerType: 'INDIVIDUAL' },
    expect: 'FLAGGED', mustSay: 'Annex I',
  },

  // Article 9 attaches the reporting duty to suspicious *transactions*, not to
  // substance identity, so a correctly identified substance with a suspicious
  // stated use must not come back green.
  {
    label: 'suspicious stated use on an Annex II substance → FLAGGED',
    args: { substances: 'Aceton', casNumbers: '67-64-1', statement: 'I want to drink it.', buyerType: 'INDIVIDUAL' },
    expect: 'FLAGGED', mustSay: 'Ingestion',
  },
  {
    label: 'suspicious stated use on an unlisted substance → FLAGGED',
    args: { substances: 'Toluene', casNumbers: '108-88-3', statement: 'to make a bomb', buyerType: 'INDIVIDUAL' },
    expect: 'FLAGGED', mustSay: 'Explosive',
  },
  {
    label: 'the statement is required, so a missing one → FLAGGED',
    args: { substances: 'Toluene', casNumbers: '108-88-3', statement: '', buyerType: 'COMPANY' },
    expect: 'FLAGGED', mustSay: 'No stated use',
  },
  {
    label: 'lab language merely containing an indicator word → OK',
    args: { substances: 'Acetone', casNumbers: '67-64-1', statement: 'Solvent for drinking water analysis by GC-MS', buyerType: 'COMPANY' },
    expect: 'OK',
  },
  {
    // Only the first ten items are looked up. An eleventh — here an Annex I
    // precursor — must not vanish into a clean result.
    label: 'more than ten substances → FLAGGED, saying the rest went unchecked',
    args: {
      substances: [...Array(10).fill('Toluene'), 'Sulphuric acid'].join(', '),
      casNumbers: [...Array(10).fill('108-88-3'), '7664-93-9'].join(', '),
      statement: OK_USE, buyerType: 'COMPANY',
    },
    expect: 'FLAGGED', mustSay: 'only the first 10 were checked',
  },
  {
    label: 'a clean screen is not reported as an endorsement',
    args: { substances: 'Toluene', casNumbers: '108-88-3', statement: OK_USE, buyerType: 'COMPANY' },
    expect: 'OK', mustSay: 'not an assessment that the use is legitimate',
  },
];

for (const c of cases) {
  const r = await checkSubstanceUse(c.args);
  const statusOk = r.status === c.expect;
  const textOk = (!c.mustSay || r.note.toLowerCase().includes(c.mustSay.toLowerCase()))
    && (!c.mustNotSay || !r.note.toLowerCase().includes(c.mustNotSay.toLowerCase()));
  check(c.label, statusOk && textOk, `got ${r.status}: ${r.note.slice(0, 160)}`);
}

console.log('\n— Sample reviewer notes —');
for (const args of [
  { substances: 'Acetone', casNumbers: '67-64-1', statement: OK_USE, buyerType: 'COMPANY' as const },
  { substances: 'Sulphuric acid', casNumbers: '7664-93-9', statement: OK_USE, buyerType: 'INDIVIDUAL' as const },
]) {
  const r = await checkSubstanceUse(args);
  console.log(`\n  [${r.status}] ${args.substances} / ${args.casNumbers} / ${args.buyerType}`);
  console.log(`  ${r.note}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
