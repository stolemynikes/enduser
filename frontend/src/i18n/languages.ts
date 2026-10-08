// The languages the public form is offered in: every official EU language.
//
// That set is not arbitrary. The field labels that carry legal weight —
// "Intended use", "CAS No.", "Concentration" — are taken from Annex IV of
// Reg. (EU) 2019/1148, which exists in exactly these 24 language versions.
// A language outside it would have no official wording to stand on.

export const LANGUAGES = [
  { code: 'bg', name: 'Български' },
  { code: 'cs', name: 'Čeština' },
  { code: 'da', name: 'Dansk' },
  { code: 'de', name: 'Deutsch' },
  { code: 'el', name: 'Ελληνικά' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'et', name: 'Eesti' },
  { code: 'fi', name: 'Suomi' },
  { code: 'fr', name: 'Français' },
  { code: 'ga', name: 'Gaeilge' },
  { code: 'hr', name: 'Hrvatski' },
  { code: 'hu', name: 'Magyar' },
  { code: 'it', name: 'Italiano' },
  { code: 'lt', name: 'Lietuvių' },
  { code: 'lv', name: 'Latviešu' },
  { code: 'mt', name: 'Malti' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'pl', name: 'Polski' },
  { code: 'pt', name: 'Português' },
  { code: 'ro', name: 'Română' },
  { code: 'sk', name: 'Slovenčina' },
  { code: 'sl', name: 'Slovenščina' },
  { code: 'sv', name: 'Svenska' },
] as const;

export type Lang = typeof LANGUAGES[number]['code'];

const CODES = new Set<string>(LANGUAGES.map(l => l.code));

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && CODES.has(value);
}

/** "nl-BE" → "nl"; anything outside the 24 → null. */
export function toLang(tag: string | null | undefined): Lang | null {
  const base = String(tag ?? '').trim().toLowerCase().split(/[-_]/)[0];
  return isLang(base) ? base : null;
}

/** The browser's preferred languages that we offer, best first, without repeats. */
export function browserLangs(): Lang[] {
  const tags = typeof navigator !== 'undefined'
    ? (navigator.languages?.length ? navigator.languages : [navigator.language])
    : [];
  const out: Lang[] = [];
  for (const tag of tags) {
    const l = toLang(tag);
    if (l && !out.includes(l)) out.push(l);
  }
  return out;
}

export function endonym(code: Lang): string {
  return LANGUAGES.find(l => l.code === code)?.name ?? code;
}
