// Fingerprints that let equal values be found without storing a readable one.
//
// Every personal field on a submission is encrypted with a random IV, which is
// what stops a stolen database from revealing which rows belong together — and
// also stops us from asking "has this buyer been here before". A deterministic
// HMAC alongside the ciphertext answers that one question and nothing else:
// the same input always yields the same code, and the code cannot be turned
// back into the input.
//
// The trade-off is honest and worth stating: a deterministic code is weaker
// than the encryption around it. Someone holding both the database and the key
// can test a guess ("is this row passport X?") — not by reversing the code, but
// by computing codes forward until one matches, which works on short values in
// a predictable format. They could already read the plaintext if they held the
// key, so this costs little against that attacker and buys the reviewer a real
// signal.
//
// Every fingerprint is scoped to one tenant. Without that the codes were
// comparable platform-wide, so the same person submitting to two different
// sellers produced the same code in both queues. No seller could see it — the
// lookup has always been tenant-scoped — but anyone with raw database access
// could have linked one buyer across sellers without decrypting anything. That
// is a capability the feature did not need and no longer grants.
import crypto from 'node:crypto';
import { normalizeCas, splitList } from './precursors.ts';

/**
 * Key material is separated per purpose *and* per tenant, so a code cannot be
 * replayed as a different kind of code, nor compared between sellers.
 */
function fingerprint(domain: string, scope: string, value: string): string {
  return crypto
    .createHmac('sha256', `${process.env.ENCRYPTION_KEY ?? 'unset'}:match:${domain}:${scope}`)
    .update(value)
    .digest('hex');
}

/**
 * Identity document number. Case and punctuation vary between how a document
 * prints a number and how a provider reports it, so both are stripped first —
 * otherwise "X1234567" and "x 1234567" would be two different people.
 */
export function documentKey(scope: string, documentNumber: string | null | undefined): string | null {
  const clean = String(documentNumber ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean.length >= 4 ? fingerprint('document', scope, clean) : null;
}

/** VAT number, normalised the same way the VIES client normalises it. */
export function vatKey(scope: string, vatNumber: string | null | undefined): string | null {
  const clean = String(vatNumber ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean.length >= 6 ? fingerprint('vat', scope, clean) : null;
}

/**
 * What was ordered, as one comparable key.
 *
 * CAS numbers are the reliable half: they are codes, so they normalise cleanly
 * and "Acetone", "acetone" and "aceton" all arrive at the same place through
 * 67-64-1. The set is sorted, so the same two substances entered in a different
 * order still match. Substance names are the fallback for a form that does not
 * collect CAS at all — weaker, but better than no key.
 */
export function substanceKey(
  scope: string,
  casNumbers: string | null | undefined,
  substances: string | null | undefined,
): string | null {
  const cas = [...new Set(splitList(casNumbers).map(normalizeCas).filter((c): c is string => !!c))].sort();
  if (cas.length > 0) return fingerprint('cas', scope, cas.join(','));

  const names = [...new Set(
    splitList(substances).map(s => s.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean),
  )].sort();
  return names.length > 0 ? fingerprint('substance', scope, names.join(',')) : null;
}

type MatchKeyFields = {
  idDocumentNumberHash: string | null;
  vatNumberHash: string | null;
  substanceKeyHash: string | null;
};

const NO_KEYS: MatchKeyFields = {
  idDocumentNumberHash: null, vatNumberHash: null, substanceKeyHash: null,
};

/**
 * Every fingerprint for one submission's values, ready to spread into a write.
 *
 * A submission that belongs to no company gets none: there is no tenant to
 * scope the codes to, and a row outside every queue can never be matched
 * against one anyway.
 */
export function matchKeys(
  companyId: string | null | undefined,
  input: {
    idDocumentNumber?: string | null;
    vatNumber?: string | null;
    casNumbers?: string | null;
    substances?: string | null;
  },
): MatchKeyFields {
  if (!companyId) return NO_KEYS;
  return {
    idDocumentNumberHash: documentKey(companyId, input.idDocumentNumber),
    vatNumberHash: vatKey(companyId, input.vatNumber),
    substanceKeyHash: substanceKey(companyId, input.casNumbers, input.substances),
  };
}

/**
 * How alike two stated uses are, 0 to 1.
 *
 * A fingerprint is useless here — two statements differing by one word produce
 * unrelated codes — so this compares the words themselves, in memory, over the
 * handful of rows a fingerprint match already narrowed it down to. Deliberately
 * crude: it exists to say "this reads like the one you approved in March", not
 * to decide anything.
 */
export function statementSimilarity(a: string | null | undefined, b: string | null | undefined): number {
  const words = (text: string | null | undefined) =>
    new Set(
      String(text ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2),
    );
  const left = words(a);
  const right = words(b);
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared++;
  // Jaccard: shared words over the combined vocabulary.
  return shared / (left.size + right.size - shared);
}
