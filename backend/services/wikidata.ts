// Wikidata names for a CAS number, in every official EU language.
//
// PubChem answers "which compound is this name?" well for English and poorly
// for anything else: "Essigsäure" and "azijnzuur" come back as unknown. When
// the buyer declared both a name and a CAS number, the question can be turned
// round — "is this one of the names of that CAS number?" — and Wikidata
// answers that in every language with a single lookup.
//
// This only ever confirms that a name and a number agree. It is never the
// basis for an annex listing: listed substances are identified from the
// regulation's own text (lib/precursorNames.ts), which does not depend on this
// service being reachable or correct.
//
// Free, no key. Wikimedia asks automated clients to identify themselves;
// WIKIDATA_CONTACT is added to the User-Agent when set, and nothing else is.
import { normalizeName } from '../lib/precursors.ts';

const ENDPOINT = 'https://query.wikidata.org/sparql';
const TIMEOUT_MS = 8_000;
const CACHE_MAX = 2000;
// Checks run in the background after every submission, and on startup for any
// left pending, so without a brake a burst of submissions becomes a burst of
// parallel queries — enough for Wikimedia to rate-limit or block this server's
// address. One query in flight, spaced out, as with PubChem.
const MIN_GAP_MS = 500;

const LANGS = ['bg', 'cs', 'da', 'de', 'el', 'en', 'et', 'fi', 'fr', 'ga', 'hr', 'hu',
  'it', 'lv', 'lt', 'mt', 'nl', 'pl', 'pt', 'ro', 'sk', 'sl', 'es', 'sv'];

export class WikidataUnavailable extends Error {}

export type WikidataName = { lang: string; name: string };

const cache = new Map<string, WikidataName[]>();
// Concurrent checks for the same CAS share one query instead of queueing two.
const inFlight = new Map<string, Promise<WikidataName[]>>();

let chain: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;

function queued<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = MIN_GAP_MS - (Date.now() - lastCallAt);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    try {
      return await fn();
    } finally {
      lastCallAt = Date.now();
    }
  });
  chain = run.catch(() => {});
  return run;
}

/**
 * Every label and alias Wikidata holds for the substance with this CAS number.
 * An empty array is an answer (no such item). Throws WikidataUnavailable when
 * the service could not be asked, which must not be read as "no names".
 */
export async function namesForCas(cas: string): Promise<WikidataName[]> {
  if (cache.has(cas)) return cache.get(cas)!;

  // The CAS is interpolated into the query, so it must be exactly a registry
  // number. Callers pass normalised values; this is the backstop.
  if (!/^\d{2,7}-\d{2}-\d$/.test(cas)) return [];

  const pending = inFlight.get(cas);
  if (pending) return pending;
  const p = queued(() => lookup(cas)).finally(() => inFlight.delete(cas));
  inFlight.set(cas, p);
  return p;
}

async function lookup(cas: string): Promise<WikidataName[]> {
  const sparql = `
    SELECT ?name WHERE {
      ?item wdt:P231 "${cas}" .
      { ?item rdfs:label ?name } UNION { ?item skos:altLabel ?name }
      FILTER(LANG(?name) IN (${LANGS.map(l => `"${l}"`).join(',')}))
    }`;
  const contact = process.env.WIKIDATA_CONTACT?.trim();

  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(sparql)}`, {
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': `eustatement-substance-check/1.0${contact ? ` (${contact})` : ''}`,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err: any) {
    throw new WikidataUnavailable(err?.name === 'TimeoutError' ? 'timed out' : 'network error');
  }
  if (!res.ok) throw new WikidataUnavailable(`HTTP ${res.status}`);

  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new WikidataUnavailable('malformed response');
  }

  const names: WikidataName[] = (json?.results?.bindings ?? []).map((b: any) => ({
    lang: String(b.name?.['xml:lang'] ?? ''),
    name: String(b.name?.value ?? '').trim(),
  })).filter((n: WikidataName) => n.name);

  // Only answers are cached; an outage must not poison the cache.
  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(cas, names);
  return names;
}

/**
 * Whether the declared name is one of the names Wikidata gives for this CAS.
 * Whole match, or a whole-word phrase inside the declared text ("aceton 99%"),
 * and only for names long enough not to be an abbreviation — "AN" must not
 * confirm anything.
 */
export function matchDeclaredName(declared: string, names: WikidataName[]): WikidataName | null {
  const d = normalizeName(declared);
  if (!d) return null;
  const padded = ` ${d} `;
  let best: { key: string; name: WikidataName } | null = null;
  for (const n of names) {
    const key = normalizeName(n.name);
    if (!key) continue;
    const hit = key === d || (key.length >= 5 && padded.includes(` ${key} `));
    if (hit && (!best || key.length > best.key.length)) best = { key, name: n };
  }
  return best?.name ?? null;
}
