// Verifies the vendored precursor list against the official regulation.
//
// lib/precursors.ts is a transcription of Annexes I and II of Regulation (EU)
// 2019/1148. Article 15 lets the Commission add substances to Annex II and
// change the Annex I limit values by delegated act, so the transcription can go
// stale. This re-fetches the consolidated text from the EU Publications Office
// and diffs the CAS numbers it finds against what we have.
//
// Note EUR-Lex's own HTML endpoint is bot-blocked; the Publications Office
// CELLAR service serves the same text over content negotiation and is not.
//
// Run: npx tsx scripts/checkPrecursorList.ts   (exits non-zero on a difference)
import { PRECURSORS } from '../lib/precursors.ts';

const URL = 'http://publications.europa.eu/resource/celex/02019R1148-20190711';

const res = await fetch(URL, {
  headers: { Accept: 'application/xhtml+xml', 'Accept-Language': 'eng' },
  signal: AbortSignal.timeout(30_000),
  redirect: 'follow',
});
if (!res.ok) {
  console.error(`Could not fetch the regulation (HTTP ${res.status}). Check the URL or try again later.`);
  process.exit(2);
}

const text = (await res.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

// Isolate the annexes so CAS numbers cited elsewhere in the act are not counted.
const start = text.lastIndexOf('ANNEX I ');
const end = text.lastIndexOf('ANNEX III');
if (start === -1 || end === -1 || end <= start) {
  console.error('Could not locate the annexes in the fetched text — the document layout may have changed.');
  process.exit(2);
}
const annexes = text.slice(start, end);

// The annexes cite each substance as "(CAS RN 7664-93-9)".
const official = new Set(
  [...annexes.matchAll(/CAS\s*RN\s*(\d{2,7}-\d{2}-\d)/gi)].map(m => m[1]),
);
const vendored = new Set(PRECURSORS.map(e => e.cas));

const missing = [...official].filter(c => !vendored.has(c));
const extra = [...vendored].filter(c => !official.has(c));

console.log(`official: ${official.size} CAS numbers · vendored: ${vendored.size}`);

if (!official.size) {
  console.error('No CAS numbers found in the annexes — the parser needs updating, not the list.');
  process.exit(2);
}

for (const cas of missing) console.log(`  + ${cas} is in the regulation but NOT in lib/precursors.ts`);
for (const cas of extra) console.log(`  - ${cas} is in lib/precursors.ts but NOT in the regulation`);

// Limit values are what the delegated acts are most likely to touch, so spot
// check that each vendored Annex I value still appears near its substance.
const valueDrift: string[] = [];
for (const e of PRECURSORS) {
  if (e.annex !== 'I' || !e.limitValue) continue;
  const at = annexes.indexOf(e.cas);
  if (at === -1) continue;
  const window = annexes.slice(at, at + 220);
  // Compare the leading number, e.g. "15 %" out of "15 % w/w".
  const value = e.limitValue.match(/^[\d,.]+\s*%/)?.[0].replace(/\s+/g, '');
  if (value && !window.replace(/\s+/g, '').includes(value)) {
    valueDrift.push(`  ! ${e.name} (${e.cas}): vendored limit "${e.limitValue}" not found near the entry`);
  }
}
for (const line of valueDrift) console.log(line);

if (missing.length || extra.length || valueDrift.length) {
  console.log('\nThe regulation and lib/precursors.ts disagree — review and update the vendored list.');
  process.exit(1);
}
console.log('\nVendored list matches the official annexes.');
