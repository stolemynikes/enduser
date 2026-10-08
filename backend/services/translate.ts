// Machine translation of the buyer's stated use, for the reviewer.
//
// Runs on this server: LibreTranslate in its own container, reached over the
// compose network. The statement never leaves the machine, which is the reason
// this was chosen over a hosted service — the text is tied to a verified
// identity.
//
// What it is for, and what it is not:
//   - A reading aid. The reviewer sees the original with the translation under
//     it, labelled as a machine translation. The original stays the record.
//   - A second pass for the keyword screen, which only knows a few languages
//     by hand. A flag that only fired on the translation says so.
//   - Never a basis for refusing anyone. Nothing here decides.
//
// Only some languages are loaded (each costs ~200 MB of memory on a 4 GB
// host). Which ones is LibreTranslate's own configuration, read from its
// /languages endpoint, so changing LT_LOAD_ONLY in compose is the only edit.
// A statement in any other language is detected where possible and left for
// the reviewer, with the language named.
//
// Unset LIBRETRANSLATE_URL, or the service being down, means no translation —
// never a failed submission or a failed check.

const URL_BASE = process.env.LIBRETRANSLATE_URL?.replace(/\/+$/, '') || '';
export const TRANSLATION_ENABLED = !!URL_BASE;

/** What the reviewer reads. The dashboard is English. */
const TARGET = 'en';
/** Languages a reviewer reads without help; no translation is made for these. */
const READABLE = new Set(['en', 'nl']);
/** Below this (0–100) a detection is a guess, and the buyer's form language decides instead. */
const MIN_CONFIDENCE = 50;
// Translation is CPU-bound on a small box. The first request after a restart
// also loads the model, which is the slow one.
const TIMEOUT_MS = 30_000;
const LANGUAGES_TTL_MS = 10 * 60_000;

export type TranslationResult = {
  /** ISO 639-1, or null when it could not be told. */
  lang: string | null;
  /** English text, or null when none was made (readable already, unsupported, or unavailable). */
  translation: string | null;
  /** True when the service could not be asked — worth trying again later. */
  unavailable?: boolean;
};

// One translation at a time. Two CPUs serve the API, Postgres and this; a
// burst of submissions should queue, not compete.
let chain: Promise<unknown> = Promise.resolve();
function queued<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn);
  chain = run.catch(() => {});
  return run;
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${URL_BASE}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`LibreTranslate ${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

let languages: { set: Set<string>; at: number } | null = null;

/** The source languages this instance can translate into English. */
async function loadedLanguages(): Promise<Set<string>> {
  if (languages && Date.now() - languages.at < LANGUAGES_TTL_MS) return languages.set;
  const list = await call<{ code: string; targets?: string[] }[]>('/languages');
  const set = new Set(list.filter(l => !l.targets || l.targets.includes(TARGET)).map(l => l.code));
  languages = { set, at: Date.now() };
  return set;
}

/**
 * Scripts that settle the language on their own. LibreTranslate can only
 * detect what it has loaded, so a Greek statement on an instance without
 * Greek would come back as a low-confidence guess at something else.
 */
function languageFromScript(text: string): string | null {
  const letters = text.replace(/[^\p{L}]/gu, '');
  if (letters.length < 4) return null;
  const share = (re: RegExp) => (letters.match(re)?.length ?? 0) / letters.length;
  if (share(/\p{Script=Greek}/gu) > 0.5) return 'el';
  if (share(/\p{Script=Cyrillic}/gu) > 0.5) return 'bg';
  return null;
}

/**
 * Detects the language of a stated use and, when it is one the reviewer
 * cannot be assumed to read and one this server has loaded, translates it.
 *
 * `hint` is the language the buyer chose on the form: used when detection is
 * unsure, never over a confident detection.
 */
export async function translateStatement(text: string, hint?: string | null): Promise<TranslationResult> {
  const q = (text ?? '').trim();
  if (!q) return { lang: null, translation: null };

  const byScript = languageFromScript(q);
  if (!TRANSLATION_ENABLED) return { lang: byScript ?? hint ?? null, translation: null };

  try {
    return await queued(async () => {
      const loaded = await loadedLanguages();

      let lang = byScript;
      if (!lang) {
        const [best] = await call<{ language: string; confidence: number }[]>('/detect', { q });
        if (best && best.confidence >= MIN_CONFIDENCE) lang = best.language;
        else lang = hint ?? best?.language ?? null;
      }

      if (!lang || READABLE.has(lang) || !loaded.has(lang)) return { lang, translation: null };

      const out = await call<{ translatedText?: string }>('/translate', {
        q, source: lang, target: TARGET, format: 'text',
      });
      const translation = out.translatedText?.trim() || null;
      // A "translation" identical to the input means the engine passed it
      // through — showing it again under the original would only mislead.
      return { lang, translation: translation && translation !== q ? translation : null };
    });
  } catch (err: any) {
    console.warn(`[translate] skipped: ${err?.message ?? err}`);
    return { lang: byScript ?? hint ?? null, translation: null, unavailable: true };
  }
}

/** Forget the cached language list. For tests. */
export function resetTranslationCache() {
  languages = null;
}
