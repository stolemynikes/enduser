// Builds lib/precursorNames.ts: what each listed precursor is called in every
// official EU language.
//
// The annex names in lib/precursors.ts are English, so a Dutch buyer who writes
// "salpeterzuur" without a CAS number, or a German one who writes
// "Salpetersäure" next to one, was not recognised. PubChem's synonym lists are
// overwhelmingly English and do not close that gap.
//
// Two sources, kept apart because they carry different weight:
//
//   regulation — the annex as published in each language version of Reg. (EU)
//                2019/1148. Authoritative and citable: it is the law's own name.
//   wikidata   — labels and aliases for the same CAS number. Not law; catches
//                what people actually type ("Wasserstoffperoxid", "H2O2",
//                "methenamine"). Used only for exact matches, never containment,
//                because aliases include short formulas that would otherwise
//                match inside unrelated words.
//
// Neither is consulted at request time. The output is vendored and reviewed as
// a diff, for the same reason as the annex list itself: what decides a
// compliance flag must not change silently because a third party changed.
//
// Run:   npx tsx scripts/fetchPrecursorNames.ts           rewrites the file
//        npx tsx scripts/fetchPrecursorNames.ts --check   exits 1 on a difference
//
// Wikimedia asks automated clients to identify themselves. Set WIKIDATA_CONTACT
// to a URL or address you are happy to send them; nothing is sent otherwise.
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PRECURSORS, normalizeCas } from '../lib/precursors.ts';

const CELEX = 'http://publications.europa.eu/resource/celex/02019R1148-20190711';
// The consolidated text is missing in some language versions (Spanish, at the
// time of writing). The annexes have never been amended — checkPrecursorList.ts
// verifies that — so the act as originally published carries the same names.
const CELEX_ORIGINAL = 'http://publications.europa.eu/resource/celex/32019R1148';

// Defects in the published text itself, corrected here rather than by loosening
// the parser. Each is a CAS number as printed, mapped to what the row means.
const ERRATA: Record<string, Record<string, string>> = {
  // The Greek annex prints sodium chlorate's number as a date.
  ell: { '9/9/7775': '7775-09-9' },
};
const OUT = fileURLToPath(new URL('../lib/precursorNames.ts', import.meta.url));

// The Publications Office negotiates on ISO 639-2/B codes; Wikidata labels use
// ISO 639-1. Every official EU language.
const LANGUAGES: [cellar: string, iso: string][] = [
  ['bul', 'bg'], ['ces', 'cs'], ['dan', 'da'], ['deu', 'de'], ['ell', 'el'],
  ['eng', 'en'], ['est', 'et'], ['fin', 'fi'], ['fra', 'fr'], ['gle', 'ga'],
  ['hrv', 'hr'], ['hun', 'hu'], ['ita', 'it'], ['lav', 'lv'], ['lit', 'lt'],
  ['mlt', 'mt'], ['nld', 'nl'], ['pol', 'pl'], ['por', 'pt'], ['ron', 'ro'],
  ['slk', 'sk'], ['slv', 'sl'], ['spa', 'es'], ['swe', 'sv'],
];

type Name = { cas: string; lang: string; name: string; source: 'regulation' | 'wikidata' };

const decode = (s: string) => s
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;|&#160;/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

async function regulationNames(cellar: string, iso: string): Promise<Name[]> {
  const get = (url: string) => fetch(url, {
    headers: { Accept: 'application/xhtml+xml', 'Accept-Language': cellar },
    signal: AbortSignal.timeout(60_000),
    redirect: 'follow',
  });
  let res = await get(CELEX);
  if (res.status === 404) res = await get(CELEX_ORIGINAL);
  if (!res.ok) throw new Error(`${cellar}: HTTP ${res.status}`);
  const html = await res.text();

  // Every annex row opens with "<name> (<label> <number>)", followed in two
  // entries by footnote markers. The label is translated — "CAS RN",
  // "CAS-Nr.", "no CAS" — so only the parenthesis is relied on. Cells
  // elsewhere in the act never cite a registry number.
  const errata = ERRATA[cellar] ?? {};
  const out: Name[] = [];
  for (const [, cell] of html.matchAll(/<p class="(?:tbl-norm|oj-tbl-txt)">([\s\S]*?)<\/p>/g)) {
    const text = decode(cell);
    const m = text.match(/^(.+?)\s*\(([^()]*?CAS[^()\d]*)([^()]+)\)/i);
    if (!m) continue;
    const printed = m[3].trim();
    const cas = normalizeCas(errata[printed] ?? printed);
    if (!cas) continue;
    out.push({ cas, lang: iso, name: m[1].trim(), source: 'regulation' });
  }
  return out;
}

async function wikidataNames(): Promise<Name[]> {
  const cas = PRECURSORS.map(p => JSON.stringify(p.cas)).join(' ');
  const langs = LANGUAGES.map(([, iso]) => JSON.stringify(iso)).join(',');
  const query = `
    SELECT ?cas ?name WHERE {
      VALUES ?cas { ${cas} }
      ?item wdt:P231 ?cas .
      { ?item rdfs:label ?name } UNION { ?item skos:altLabel ?name }
      FILTER(LANG(?name) IN (${langs}))
    }`;
  const contact = process.env.WIKIDATA_CONTACT?.trim();
  const res = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`, {
    headers: {
      Accept: 'application/sparql-results+json',
      'User-Agent': `eustatement-precursor-names/1.0${contact ? ` (${contact})` : ''}`,
    },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`wikidata: HTTP ${res.status}`);
  const json: any = await res.json();
  return json.results.bindings.map((b: any) => ({
    cas: b.cas.value,
    lang: b.name['xml:lang'],
    name: String(b.name.value).trim(),
    source: 'wikidata' as const,
  }));
}

function render(names: Name[]): string {
  const rows = names.map(n =>
    `  [${JSON.stringify(n.cas)}, ${JSON.stringify(n.lang)}, ${JSON.stringify(n.name)}, ${JSON.stringify(n.source)}],`);
  return `// GENERATED by scripts/fetchPrecursorNames.ts — do not edit by hand.
//
// What each substance in lib/precursors.ts is called in every official EU
// language. 'regulation' rows are the annex of Reg. (EU) 2019/1148 in that
// language version; 'wikidata' rows are labels and aliases for the same CAS
// number. See the script for why both exist and how they are used differently.

export type NameSource = 'regulation' | 'wikidata';

export const PRECURSOR_NAMES: readonly (readonly [cas: string, lang: string, name: string, source: NameSource])[] = [
${rows.join('\n')}
];
`;
}

const all: Name[] = [];
const failures: string[] = [];

for (const [cellar, iso] of LANGUAGES) {
  try {
    const found = await regulationNames(cellar, iso);
    const known = new Set(PRECURSORS.map(p => p.cas));
    const cas = new Set(found.map(n => n.cas));
    // A language version that does not list exactly our substances is a parse
    // failure or an amendment; either way a human looks before it is written.
    if (cas.size !== known.size || [...cas].some(c => !known.has(c))) {
      failures.push(`${cellar}: found ${cas.size} substances, expected ${known.size}`);
    }
    all.push(...found);
    console.log(`  ${cellar}  ${found.length} names`);
  } catch (err: any) {
    failures.push(`${cellar}: ${err.message}`);
  }
}

try {
  const wd = await wikidataNames();
  // Drop what the regulation already says, and anything too short to be a
  // name rather than an abbreviation that collides ("AN", "HMT").
  const seen = new Set(all.map(n => `${n.cas}|${n.name.toLowerCase()}`));
  const extra = wd.filter(n => n.name.length >= 4 && !seen.has(`${n.cas}|${n.name.toLowerCase()}`));
  const dedup = new Map(extra.map(n => [`${n.cas}|${n.lang}|${n.name.toLowerCase()}`, n]));
  all.push(...dedup.values());
  console.log(`  wikidata  ${dedup.size} additional names`);
} catch (err: any) {
  failures.push(err.message);
}

if (failures.length) {
  console.error('Not written:');
  for (const f of failures) console.error(`  ${f}`);
  process.exit(2);
}

all.sort((a, b) =>
  a.cas.localeCompare(b.cas) || a.source.localeCompare(b.source)
  || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
const output = render(all);

if (process.argv.includes('--check')) {
  let current = '';
  try { current = readFileSync(OUT, 'utf8'); } catch { /* missing counts as different */ }
  if (current !== output) {
    console.error('lib/precursorNames.ts differs from the sources. Re-run without --check and review the diff.');
    process.exit(1);
  }
  console.log('lib/precursorNames.ts matches the sources.');
} else {
  writeFileSync(OUT, output);
  console.log(`wrote ${all.length} names to lib/precursorNames.ts`);
}
