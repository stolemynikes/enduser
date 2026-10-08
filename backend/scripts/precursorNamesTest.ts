// Multilingual precursor name tests. Offline: exercises the vendored table only.
//
// What matters here is in both directions. A listed substance written in any
// official language must be recognised, because a miss waves a restricted
// precursor through as "no listing". And an unlisted substance must not be
// recognised as a listed one, because once Dutch and German names are in the
// table the obvious failure is "aceton" matching inside "acetonitrile".
//
// Run: npx tsx scripts/precursorNamesTest.ts
import { PRECURSORS, identifyName, findByName, normalizeName } from '../lib/precursors.ts';
import { PRECURSOR_NAMES } from '../lib/precursorNames.ts';
import { matchDeclaredName } from '../services/wikidata.ts';

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const EU_LANGUAGES = ['bg', 'cs', 'da', 'de', 'el', 'en', 'et', 'fi', 'fr', 'ga', 'hr', 'hu',
  'it', 'lv', 'lt', 'mt', 'nl', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv'];
const regulation = PRECURSOR_NAMES.filter(([, , , source]) => source === 'regulation');

console.log('— Table integrity —');
check('every official language has a regulation name for every substance',
  EU_LANGUAGES.every(lang => PRECURSORS.every(p =>
    regulation.some(([cas, l]) => cas === p.cas && l === lang))),
  EU_LANGUAGES.flatMap(lang => PRECURSORS.filter(p => !regulation.some(([cas, l]) => cas === p.cas && l === lang))
    .map(p => `${lang}:${p.cas}`)).slice(0, 5).join(', '));
check('432 regulation names (24 languages × 18 substances)', regulation.length === 432, `got ${regulation.length}`);
check('every row names a vendored CAS',
  PRECURSOR_NAMES.every(([cas]) => PRECURSORS.some(p => p.cas === cas)));
check('the Greek erratum is applied (sodium chlorate present in el)',
  regulation.some(([cas, lang]) => cas === '7775-09-9' && lang === 'el'));

console.log('— Every official name identifies its own substance —');
const wrong = regulation.filter(([cas, , name]) => identifyName(name)?.entry.cas !== cas);
check(`all ${regulation.length} official names round-trip`, wrong.length === 0,
  wrong.slice(0, 5).map(([cas, lang, name]) => `${lang} "${name}" → ${identifyName(name)?.entry.cas ?? 'none'} (want ${cas})`).join('; '));

console.log('— Recognised in other languages —');
const cases: [string, string, string][] = [
  ['salpeterzuur', '7697-37-2', 'Dutch'],
  ['Salpetersäure', '7697-37-2', 'German, with umlaut'],
  ['Salpetersaure', '7697-37-2', 'German, umlaut dropped'],
  ['acide nitrique', '7697-37-2', 'French'],
  ['Waterstofperoxide 30%', '7722-84-1', 'Dutch, with strength'],
  ['peróxido de hidrógeno', '7722-84-1', 'Spanish'],
  ['kwas azotowy', '7697-37-2', 'Polish'],
  ['Υπεροξείδιο του υδρογόνου', '7722-84-1', 'Greek'],
  ['Азотна киселина', '7697-37-2', 'Bulgarian'],
  ['Kalziumammoniumnitrat', '15245-12-2', 'German compound, not ammonium nitrate'],
  ['nitrate d’ammonium calcique', '15245-12-2', 'French, longest phrase wins'],
  ['H2O2', '7722-84-1', 'formula alias, exact'],
  ['aceton', '67-64-1', 'Dutch/German acetone'],
];
for (const [input, cas, why] of cases) {
  const got = identifyName(input);
  check(`"${input}" → ${cas} (${why})`, got?.entry.cas === cas, `got ${got?.entry.cas ?? 'none'}`);
}

console.log('— Not recognised as a listed substance —');
const negatives: [string, string][] = [
  ['acetonitrile', 'contains "aceton" but is a different solvent'],
  ['Acetonitril', 'German acetonitrile'],
  ['toluene', 'unlisted'],
  ['ethanol', 'unlisted'],
  ['buy some H2O2 please', 'formula aliases match whole, not inside text'],
  ['E2390', 'E-number alias must not match a longer code'],
];
for (const [input, why] of negatives) {
  const got = findByName(input);
  check(`"${input}" → none (${why})`, got === null, `got ${got?.name}`);
}

console.log('— Existing English behaviour unchanged —');
check('"sulfuric acid" still matches Sulphuric acid', findByName('sulfuric acid')?.cas === '7664-93-9');
check('"70% nitric acid solution" still matches', findByName('70% nitric acid solution')?.cas === '7697-37-2');
check('"calcium ammonium nitrate" still not ammonium nitrate', findByName('calcium ammonium nitrate')?.cas === '15245-12-2');
check('an English annex match reports the regulation as source', identifyName('Nitric acid')?.source === 'regulation');

console.log('— Normalisation —');
check('accents fold', normalizeName('Acétone') === 'acetone');
check('Greek letters survive', normalizeName('Ακετόνη').length > 0 && /\p{Script=Greek}/u.test(normalizeName('Ακετόνη')));
check('punctuation becomes space', normalizeName('Magnesium, Pulver') === 'magnesium pulver');

console.log('— Wikidata name matching (no network) —');
const essig = [{ lang: 'de', name: 'Essigsäure' }, { lang: 'nl', name: 'azijnzuur' }, { lang: 'en', name: 'AcOH' }];
check('a German name matches', matchDeclaredName('Essigsäure', essig)?.lang === 'de');
check('a Dutch name with strength matches', matchDeclaredName('azijnzuur 80%', essig)?.lang === 'nl');
check('a short alias does not match inside text', matchDeclaredName('AcOH reagent', essig) === null);
check('a short alias matches whole', matchDeclaredName('AcOH', essig)?.name === 'AcOH');
check('an unrelated name does not match', matchDeclaredName('ethanol', essig) === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
