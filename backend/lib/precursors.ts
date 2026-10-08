// Explosives precursors listed in Regulation (EU) 2019/1148.
//
// Transcribed verbatim from the official consolidated text served by the EU
// Publications Office:
//   http://publications.europa.eu/resource/celex/02019R1148-20190711
//   (Accept: application/xhtml+xml)
//
// The annexes have never been amended — 2019-07-11 is still the only
// consolidated version — so this list is stable. Article 15 lets the Commission
// add substances to Annex II and change the Annex I limit values by delegated
// act, so `scripts/checkPrecursorList.ts` re-fetches the official text and
// diffs it against this file. Run it periodically; if it reports a difference,
// the regulation changed and this file must be updated.
//
// Vendored rather than fetched at request time on purpose: the legal basis for
// the check must not depend on a third party being reachable, and a silent
// upstream change must show up as a diff someone reviews, not as a behaviour
// change in production.

import { PRECURSOR_NAMES, type NameSource } from './precursorNames.ts';

export type Annex = 'I' | 'II';

export type PrecursorEntry = {
  /** Substance name as printed in the annex. */
  name: string;
  /** CAS RN as printed in the annex. */
  cas: string;
  /**
   * PubChem compound id for that CAS, resolved once and vendored here. Lets the
   * check catch a listed substance declared under an alternate registry number,
   * which a literal CAS comparison would miss.
   */
  cid: number;
  annex: Annex;
  /**
   * Annex I column 2 — the concentration at or below which the substance may be
   * made available to the general public. Above it, supply to a member of the
   * general public is prohibited without a licence.
   */
  limitValue?: string;
  /** Annex I column 3 — upper limit for the purpose of licensing under Article 5(3). */
  licensingUpperLimit?: string;
  /** Footnoted conditions that narrow the entry (particle size, mixture strength). */
  condition?: string;
};

/** ANNEX I — restricted explosives precursors. */
const ANNEX_I: PrecursorEntry[] = [
  { name: 'Nitric acid', cas: '7697-37-2', cid: 944, annex: 'I', limitValue: '3 % w/w', licensingUpperLimit: '10 % w/w' },
  { name: 'Hydrogen peroxide', cas: '7722-84-1', cid: 784, annex: 'I', limitValue: '12 % w/w', licensingUpperLimit: '35 % w/w' },
  { name: 'Sulphuric acid', cas: '7664-93-9', cid: 1118, annex: 'I', limitValue: '15 % w/w', licensingUpperLimit: '40 % w/w' },
  { name: 'Nitromethane', cas: '75-52-5', cid: 6375, annex: 'I', limitValue: '16 % w/w', licensingUpperLimit: '100 % w/w' },
  {
    name: 'Ammonium nitrate', cas: '6484-52-2', cid: 22985, annex: 'I',
    limitValue: '16 % w/w of nitrogen in relation to ammonium nitrate',
    licensingUpperLimit: 'No licensing permitted',
    condition: '16 % w/w of nitrogen corresponds to 45,7 % ammonium nitrate, discarding impurities.',
  },
  { name: 'Potassium chlorate', cas: '3811-04-9', cid: 6426889, annex: 'I', limitValue: '40 % w/w', licensingUpperLimit: 'No licensing permitted' },
  { name: 'Potassium perchlorate', cas: '7778-74-7', cid: 516900, annex: 'I', limitValue: '40 % w/w', licensingUpperLimit: 'No licensing permitted' },
  { name: 'Sodium chlorate', cas: '7775-09-9', cid: 516902, annex: 'I', limitValue: '40 % w/w', licensingUpperLimit: 'No licensing permitted' },
  { name: 'Sodium perchlorate', cas: '7601-89-0', cid: 522606, annex: 'I', limitValue: '40 % w/w', licensingUpperLimit: 'No licensing permitted' },
];

/** ANNEX II — reportable explosives precursors. No concentration limit applies. */
const ANNEX_II: PrecursorEntry[] = [
  { name: 'Hexamine', cas: '100-97-0', cid: 4101, annex: 'II' },
  { name: 'Acetone', cas: '67-64-1', cid: 180, annex: 'II' },
  { name: 'Potassium nitrate', cas: '7757-79-1', cid: 24434, annex: 'II' },
  { name: 'Sodium nitrate', cas: '7631-99-4', cid: 24268, annex: 'II' },
  { name: 'Calcium nitrate', cas: '10124-37-5', cid: 24963, annex: 'II' },
  { name: 'Calcium ammonium nitrate', cas: '15245-12-2', cid: 3080697, annex: 'II' },
  {
    name: 'Magnesium, powders', cas: '7439-95-4', cid: 5462224, annex: 'II',
    condition: 'With a particle size less than 200 μm, as a substance or in mixtures containing 70 % w/w or more of aluminium or magnesium.',
  },
  { name: 'Magnesium nitrate hexahydrate', cas: '13446-18-9', cid: 202877, annex: 'II' },
  {
    name: 'Aluminium, powders', cas: '7429-90-5', cid: 5359268, annex: 'II',
    condition: 'With a particle size less than 200 μm, as a substance or in mixtures containing 70 % w/w or more of aluminium or magnesium.',
  },
];

export const PRECURSORS: PrecursorEntry[] = [...ANNEX_I, ...ANNEX_II];

/**
 * Normalise a CAS RN for comparison. Buyers type these with stray spaces and
 * various dash characters; everything else is rejected so a free-text blob is
 * never treated as a registry number.
 */
export function normalizeCas(raw: string): string | null {
  const v = raw.trim().replace(/[‐-―−]/g, '-').replace(/\s+/g, '');
  return /^\d{2,7}-\d{2}-\d$/.test(v) ? v : null;
}

/**
 * Names are matched loosely — "sulfuric acid" must hit "Sulphuric acid", and
 * "Salpetersäure" must survive the trip. Letters of every script are kept
 * (Greek and Bulgarian names are in the table); accents are folded away
 * because buyers drop them as often as not.
 */
export function normalizeName(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/sulph/g, 'sulf')          // British/American spelling
    .replace(/aluminium/g, 'aluminum')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const BY_CAS = new Map(PRECURSORS.map(e => [e.cas, e]));
const BY_CID = new Map(PRECURSORS.map(e => [e.cid, e]));

export type NameMatch = {
  entry: PrecursorEntry;
  /** ISO 639-1 language of the name that matched — the first, when several share it. */
  lang: string;
  /**
   * Every language whose version uses this exact name. "acetona" is both the
   * Spanish and the Portuguese name; naming only one of them would tell a
   * Portuguese buyer's reviewer something untrue.
   */
  langs: string[];
  /** Whether the regulation itself uses that name, or only Wikidata does. */
  source: NameSource;
};

// Annex names in every language version may match inside a longer phrase
// ("70% nitric acid solution"). Wikidata aliases only match whole: they include
// formulas and E-numbers that are not names in any language a buyer writes in.
const PHRASE = new Map<string, NameMatch>();
const EXACT = new Map<string, NameMatch>();
for (const e of PRECURSORS) PHRASE.set(normalizeName(e.name), { entry: e, lang: 'en', langs: ['en'], source: 'regulation' });
for (const [cas, lang, name, source] of PRECURSOR_NAMES) {
  const entry = BY_CAS.get(cas);
  const key = normalizeName(name);
  if (!entry || !key) continue;
  const target = source === 'regulation' ? PHRASE : EXACT;
  const existing = target.get(key);
  if (!existing) target.set(key, { entry, lang, langs: [lang], source });
  else if (existing.entry === entry && !existing.langs.includes(lang)) existing.langs.push(lang);
}

export function findByCas(cas: string): PrecursorEntry | null {
  const n = normalizeCas(cas);
  return n ? BY_CAS.get(n) ?? null : null;
}

export function findByCid(cid: number): PrecursorEntry | null {
  return BY_CID.get(cid) ?? null;
}

/**
 * Identify a free-text substance name against the annexes, in any official EU
 * language. An annex name also matches as a whole-word phrase inside a longer
 * text, so "70% nitric acid solution" still matches "Nitric acid"; the longest
 * such phrase wins, so "calcium ammonium nitrate" does not collapse to
 * "ammonium nitrate".
 *
 * Whole words, not substrings: once "aceton" (Dutch, German) is in the table, a
 * plain substring test would read "acetonitrile" as acetone.
 */
export function identifyName(name: string): NameMatch | null {
  const n = normalizeName(name);
  if (!n) return null;
  const exact = PHRASE.get(n) ?? EXACT.get(n);
  if (exact) return exact;

  const padded = ` ${n} `;
  let best: { key: string; match: NameMatch } | null = null;
  for (const [key, match] of PHRASE) {
    if (padded.includes(` ${key} `) && (!best || key.length > best.key.length)) best = { key, match };
  }
  return best?.match ?? null;
}

export function findByName(name: string): PrecursorEntry | null {
  return identifyName(name)?.entry ?? null;
}
