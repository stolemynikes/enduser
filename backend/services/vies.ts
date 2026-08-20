// Real EU VAT validation via the official VIES REST API (free, no key):
//   GET https://ec.europa.eu/taxation_customs/vies/rest-api/ms/{COUNTRY}/vat/{NUMBER}
//   -> JSON { isValid: boolean, userError: string, name: string, address: string, ... }
// The country code comes from the VAT number's own prefix (e.g. NL…). Note VIES
// expects "EL" for Greece (not the ISO "GR"), which the prefix already provides.
// Transient EU/member-state outages map to ERROR so a submission is never wrongly
// auto-denied — only a definitive isValid:false counts as INVALID.
//
// For valid VATs most member states also return the registered company name and
// address; some (e.g. Germany) return nothing or masked "---". We surface those so
// the submitted address can be compared (matchViesAddress) — for review, never to
// auto-deny.

export type ViesResult = 'VALID' | 'INVALID' | 'ERROR';
export type ViesLookup = { status: ViesResult; name: string | null; address: string | null };
export type ViesAddressMatch = 'NOT_CHECKED' | 'UNAVAILABLE' | 'MATCH' | 'PARTIAL' | 'MISMATCH';

const ENDPOINT = 'https://ec.europa.eu/taxation_customs/vies/rest-api/ms';
const TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// userError values that mean "the service couldn't answer", not "invalid VAT".
const SERVICE_ERRORS = new Set([
  'MS_UNAVAILABLE', 'MS_MAX_CONCURRENT_REQ', 'GLOBAL_MAX_CONCURRENT_REQ',
  'SERVICE_UNAVAILABLE', 'TIMEOUT', 'IP_BLOCKED', 'SERVER_BUSY',
]);

const cache = new Map<string, { result: ViesLookup; expiresAt: number }>();

/** Returns [country, number] parsed from the VAT (prefix wins), or null. */
function parseVat(countryCode: string, vatNumber: string): [string, string] | null {
  const clean = (vatNumber ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (/^[A-Z]{2}/.test(clean)) {
    const country = clean.slice(0, 2);
    const number = clean.slice(2);
    if (number) return [country, number];
    return null;
  }
  // No prefix on the number — fall back to a valid 2-letter countryCode if given.
  const cc = (countryCode ?? '').toUpperCase().replace(/[^A-Z]/g, '');
  if (cc.length === 2 && clean) return [cc, clean];
  return null;
}

// VIES returns "---" (or a blob of only dashes/whitespace) when an address is
// withheld; treat that as "no address on file".
function cleanField(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;
  if (/^[-\s]+$/.test(trimmed)) return null;
  return trimmed;
}

export async function checkVies(countryCode: string, vatNumber: string): Promise<ViesLookup> {
  const parsed = parseVat(countryCode, vatNumber);
  if (!parsed) return { status: 'ERROR', name: null, address: null };
  const [country, number] = parsed;
  const key = `${country}${number}`;

  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.result;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${ENDPOINT}/${country}/vat/${number}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'enduser-statements/1.0' },
      signal: controller.signal,
    });
    if (!res.ok) return { status: 'ERROR', name: null, address: null };
    const data = (await res.json()) as { isValid?: boolean; userError?: string; name?: string; address?: string };

    let status: ViesResult;
    if (data.userError && SERVICE_ERRORS.has(data.userError)) status = 'ERROR';
    else if (data.isValid === true) status = 'VALID';
    else if (data.isValid === false) status = 'INVALID';
    else status = 'ERROR';

    const result: ViesLookup = {
      status,
      name: status === 'VALID' ? cleanField(data.name) : null,
      address: status === 'VALID' ? cleanField(data.address) : null,
    };

    // Only cache definitive verdicts; let transient errors retry next time.
    if (status !== 'ERROR') cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch {
    return { status: 'ERROR', name: null, address: null };
  } finally {
    clearTimeout(timer);
  }
}

// --- Address matching ---------------------------------------------------------
// Heuristic comparison of the buyer-entered address against the address VIES has
// registered for the VAT. Deliberately lenient (registered addresses are often
// HQ-only, abbreviated, or stale) — a MISMATCH flags for human review, it never
// auto-denies.

function normalize(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Tokens for fuzzy overlap: words of length >= 3, with numeric tokens reduced to
// their integer value so "664" matches "00664".
function tokenize(s: string): Set<string> {
  const out = new Set<string>();
  for (const raw of normalize(s).split(' ')) {
    if (!raw) continue;
    if (/^\d+$/.test(raw)) out.add(String(parseInt(raw, 10)));
    else if (raw.length >= 3) out.add(raw);
  }
  return out;
}

// Postal codes compared with all spaces removed: "3012 CN" == "3012CN".
function postalKey(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function matchViesAddress(
  submitted: { street?: string | null; zipCode?: string | null; place?: string | null },
  viesAddress: string | null,
): ViesAddressMatch {
  if (!viesAddress || !cleanField(viesAddress)) return 'UNAVAILABLE';

  const haveSubmitted = [submitted.street, submitted.zipCode, submitted.place]
    .some(v => typeof v === 'string' && v.trim());
  if (!haveSubmitted) return 'NOT_CHECKED';

  const viesNorm = normalize(viesAddress);
  const viesNoSpace = postalKey(viesAddress);
  const viesTokens = tokenize(viesAddress);

  const zip = (submitted.zipCode ?? '').trim();
  const postalMatch = !!zip && viesNoSpace.includes(postalKey(zip));

  const subTokens = new Set<string>([
    ...tokenize(submitted.street ?? ''),
    ...tokenize(submitted.place ?? ''),
  ]);
  let hits = 0;
  for (const t of subTokens) {
    // Token-set membership on both sides; substring fallback only for longer
    // word tokens (street names), never short/numeric ones that match by accident
    // (e.g. "1" inside a postal code).
    if (viesTokens.has(t) || (t.length >= 5 && viesNorm.includes(t))) hits++;
  }
  const overlap = subTokens.size ? hits / subTokens.size : 0;

  if (postalMatch && overlap >= 0.6) return 'MATCH';
  if (postalMatch || overlap >= 0.5) return 'PARTIAL';
  return 'MISMATCH';
}
