// PubChem PUG-REST client.
//
// Used to verify that a declared CAS number actually is the declared substance.
// PubChem resolves both a CAS RN and a chemical name to the same compound id
// (CID), so the check is an integer comparison rather than fuzzy string
// matching against synonym lists.
//
// Free, public, and needs no API key. NCBI's usage policy caps callers at 5
// requests per second, so every call goes through a serialised queue.

const BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const TIMEOUT_MS = 10_000;
// NCBI allows 5 req/s. Stay under it with a single in-flight request and a gap.
const MIN_GAP_MS = 250;
const CACHE_MAX = 2000;

export type Compound = { cid: number; title: string };

/** Distinguishes "PubChem says no such substance" from "PubChem is unreachable". */
export class PubChemUnavailable extends Error {}

const cache = new Map<string, Compound | null>();

let chain: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;

/** Serialises calls and spaces them out, so a burst of submissions cannot exceed the rate cap. */
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
  // Keep the chain alive regardless of this call's outcome.
  chain = run.catch(() => {});
  return run;
}

/**
 * Resolve a CAS number or chemical name to a PubChem compound.
 *
 * Returns null when PubChem has no such compound (a real answer — the buyer
 * gave something that does not exist). Throws PubChemUnavailable when the
 * service could not be reached, which the caller must not read as "no match".
 */
export async function resolveCompound(term: string): Promise<Compound | null> {
  const key = term.trim().toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;

  const result = await queued(async () => {
    const url = `${BASE_URL}/compound/name/${encodeURIComponent(term.trim())}/property/Title/JSON`;
    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (err: any) {
      throw new PubChemUnavailable(err?.name === 'TimeoutError' ? 'timed out' : 'network error');
    }

    // 404 is PubChem's "no such compound" — an answer, not a failure.
    if (res.status === 404) return null;
    if (!res.ok) throw new PubChemUnavailable(`HTTP ${res.status}`);

    let json: any;
    try {
      json = await res.json();
    } catch {
      throw new PubChemUnavailable('malformed response');
    }

    const prop = json?.PropertyTable?.Properties?.[0];
    if (!prop?.CID) return null;
    return { cid: Number(prop.CID), title: String(prop.Title ?? '').trim() };
  });

  // Only successful lookups are cached; an outage must not poison the cache.
  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(key, result);
  return result;
}
