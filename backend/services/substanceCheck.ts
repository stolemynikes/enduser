// Automatic substance / use compliance check.
//
// Deterministic, free, and citable. Two questions are answered:
//
//   1. Does each declared CAS number actually correspond to the declared
//      substance? Answered by resolving both to a PubChem compound id.
//   2. Is the substance an explosives precursor under Regulation (EU)
//      2019/1148? Answered against the annexes vendored in lib/precursors.ts.
//
// The result only ever FLAGS for human review — it never auto-approves or
// auto-denies. Annex II ("reportable") substances are not flagged on their own:
// the regulation's duty there is to report *suspicious* transactions, not every
// transaction, and acetone is an ordinary laboratory solvent. Flagging it every
// time would train reviewers to ignore the colour. The listing is spelled out
// in the note instead, so the reviewer makes that judgement with the rule in
// front of them.
//
// This replaced an LLM-backed check. The old version paraphrased the regulation
// from search results; this one quotes it.
import { findByCas, findByCid, identifyName, normalizeCas, type NameMatch, type PrecursorEntry } from '../lib/precursors.ts';
import { PubChemUnavailable, resolveCompound, type Compound } from './pubchem.ts';
import { WikidataUnavailable, matchDeclaredName, namesForCas } from './wikidata.ts';
import { screenStatement } from './statementScreen.ts';

export type SubstanceCheckResult = {
  status: 'OK' | 'FLAGGED' | 'ERROR';
  note: string;
};

// No API key, no account, no quota — the check is always available.
export const SUBSTANCE_CHECK_ENABLED = true;

const NOTE_MAX = 1500;
const MAX_ITEMS = 10;

const REG = 'Reg. (EU) 2019/1148';

// For the reviewer-facing note, which is written in English.
const LANGUAGE_NAMES: Record<string, string> = {
  bg: 'Bulgarian', cs: 'Czech', da: 'Danish', de: 'German', el: 'Greek', en: 'English',
  et: 'Estonian', fi: 'Finnish', fr: 'French', ga: 'Irish', hr: 'Croatian', hu: 'Hungarian',
  it: 'Italian', lv: 'Latvian', lt: 'Lithuanian', mt: 'Maltese', nl: 'Dutch', pl: 'Polish',
  pt: 'Portuguese', ro: 'Romanian', sk: 'Slovak', sl: 'Slovenian', es: 'Spanish', sv: 'Swedish',
};
const languageName = (iso: string) => LANGUAGE_NAMES[iso] ?? iso;

/** "the Dutch name in Reg. (EU) 2019/1148", or "a German name Wikidata records". */
function describeNameMatch(m: NameMatch): string {
  const names = m.langs.map(languageName);
  const which = names.length === 1 ? names[0]
    : names.length <= 3 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
    : `${names.length}-language`;
  return m.source === 'regulation'
    ? names.length > 3
      ? `the name ${m.entry.name} has in ${names.length} language versions of ${REG}`
      : `the ${which} name for ${m.entry.name} in ${REG}`
    : `a ${which} name for ${m.entry.name} (per Wikidata)`;
}

/** Splits a free-text list field into trimmed items. */
function splitList(raw: string): string[] {
  return raw
    .split(/[,;\n\r/]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, MAX_ITEMS);
}

/**
 * Pulls a percentage out of free text: "15%", "15 % w/w", "max. 15 percent",
 * "0,15" is *not* read as 15%. Returns null when the text does not state one
 * plainly — a guess here would decide a compliance question wrongly.
 */
function parsePercentage(raw: string | null | undefined): number | null {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:%|percent|per\s?cent|pct)/i);
  if (!m) return null;
  const value = Number(m[1].replace(',', '.'));
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

/**
 * Compares the declared strength against an Annex I limit value. Only decides
 * when both sides state a plain percentage; anything conditional (the ammonium
 * nitrate entry, which is a nitrogen fraction) is left to the reviewer.
 */
function compareToLimit(entry: PrecursorEntry, declared: string | null | undefined): string | null {
  const limit = parsePercentage(entry.limitValue);
  const value = parsePercentage(declared);
  if (limit == null || value == null) return null;
  if (/nitrogen/i.test(entry.limitValue ?? '')) return null;
  return value > limit
    ? `DECLARED STRENGTH IS ABOVE THE LIMIT: ${value}% exceeds the ${entry.limitValue} limit value — supply to the general public is restricted and a licence is required.`
    : `Declared strength ${value}% is at or below the ${entry.limitValue} limit value.`;
}

function describeListing(entry: PrecursorEntry, buyerType: 'INDIVIDUAL' | 'COMPANY'): string {
  if (entry.annex === 'II') {
    const cond = entry.condition ? ` Entry applies only: ${entry.condition}` : '';
    return `Listed in Annex II of ${REG} — reportable explosives precursor. No concentration limit applies; `
      + `suspicious transactions, disappearances and thefts must be reported within 24 hours.${cond}`;
  }

  const licensing = entry.licensingUpperLimit === 'No licensing permitted'
    ? 'No licensing is permitted above the limit value.'
    : `Upper limit for licensing under Article 5(3): ${entry.licensingUpperLimit}.`;
  const audience = buyerType === 'INDIVIDUAL'
    ? 'The buyer declared themselves a private individual (member of the general public), so supply above the limit value is prohibited without a licence.'
    : 'The buyer declared a professional/company use, which is outside the general-public restriction — confirm the professional use is genuine.';

  return `Listed in Annex I of ${REG} — RESTRICTED explosives precursor. `
    + `Limit value: ${entry.limitValue}. ${licensing} ${audience}`
    + (entry.condition ? ` ${entry.condition}` : '');
}

type Recognition =
  | { kind: 'same'; note: string }
  | { kind: 'listed-other'; match: NameMatch }
  | { kind: 'unknown'; wikidataDown: boolean };

/**
 * A declared name PubChem did not know, checked against the declared CAS:
 * first against the annex in every language version of the regulation, then
 * against the names Wikidata records for that CAS number.
 */
async function recogniseForeignName(name: string, cas: string, compound: Compound): Promise<Recognition> {
  const listed = identifyName(name);
  if (listed) {
    return listed.entry.cas === cas || listed.entry.cid === compound.cid
      ? { kind: 'same', note: `The declared name "${name}" is ${describeNameMatch(listed)}, matching CAS ${cas}.` }
      : { kind: 'listed-other', match: listed };
  }
  try {
    const hit = matchDeclaredName(name, await namesForCas(cas));
    if (hit) {
      return {
        kind: 'same',
        note: `The declared name "${name}" matches "${hit.name}", a ${languageName(hit.lang)} name Wikidata records for CAS ${cas} (${compound.title}).`,
      };
    }
    return { kind: 'unknown', wikidataDown: false };
  } catch (err) {
    if (err instanceof WikidataUnavailable) return { kind: 'unknown', wikidataDown: true };
    throw err;
  }
}

/**
 * `statement` is screened for suspicion indicators, not comprehended — see
 * statementScreen.ts for what that does and does not buy. A clean screen means
 * "nothing matched", never "this use is legitimate", and the note says so.
 */
export async function checkSubstanceUse(
  { substances, casNumbers, concentration, statement, statementTranslation, statementLang, translationUnavailable, buyerType }:
    {
      substances: string; casNumbers: string; concentration?: string | null; statement?: string;
      /** English machine translation of `statement`, when one was made. Screened as a second pass. */
      statementTranslation?: string | null;
      statementLang?: string | null;
      /** The translator was unreachable, so a statement in another language was screened as written only. */
      translationUnavailable?: boolean;
      buyerType: 'INDIVIDUAL' | 'COMPANY';
    }
): Promise<SubstanceCheckResult> {
  const names = splitList(substances ?? '');
  const casList = splitList(casNumbers ?? '');

  const problems: string[] = [];   // drive FLAGGED
  const findings: string[] = [];   // context for the reviewer
  let restricted = false;

  // No CAS number: the seller hides the field, or left it optional and the
  // buyer skipped it. This used to end the check — and a check that never ran
  // counts as green, so those forms were approvable with the stated use never
  // screened at all. Now the names are checked against the annexes (every
  // language version) and PubChem, and the statement is screened as always.
  // Weaker than a CAS match, and the note says so.
  if (!casList.length) {
    findings.push(
      'No CAS number was given, so the substance was identified by name only — a name can be '
      + 'ambiguous or misspelled where a CAS number is not.',
    );
    for (const name of names) {
      const match = identifyName(name);
      if (match) {
        if (match.entry.annex === 'I') restricted = true;
        findings.push(`The declared name "${name}" is ${describeNameMatch(match)}. ${describeListing(match.entry, buyerType)}`);
        continue;
      }
      try {
        const compound = await resolveCompound(name);
        const entry = compound ? findByCid(compound.cid) : null;
        if (entry) {
          if (entry.annex === 'I') restricted = true;
          findings.push(`"${name}" resolves to ${compound!.title} (PubChem CID ${compound!.cid}). ${describeListing(entry, buyerType)}`);
        } else if (compound) {
          findings.push(`"${name}" resolves to ${compound.title} (PubChem CID ${compound.cid}). Not listed in Annex I or II of ${REG}.`);
        } else {
          problems.push(`"${name}" could not be identified, and no CAS number was given to identify it by.`);
        }
      } catch (err) {
        if (!(err instanceof PubChemUnavailable)) throw err;
        findings.push(`"${name}" could not be looked up — PubChem was unreachable. Identify it by hand before approving.`);
      }
    }
  }

  try {
    // Pair names to CAS numbers by position only when the counts line up. A
    // mismatched count means we cannot tell which name belongs to which number,
    // so each is checked independently instead of guessing.
    const paired = names.length === casList.length && names.length > 0;
    if (!paired && names.length > 0 && casList.length > 0) {
      findings.push(
        `${names.length} substance name(s) were declared against ${casList.length} CAS number(s), `
        + 'so they could not be matched up one-to-one — each was checked separately.',
      );
    }

    for (let i = 0; i < casList.length; i++) {
      const rawCas = casList[i];
      const cas = normalizeCas(rawCas);

      if (!cas) {
        problems.push(`"${rawCas}" is not a valid CAS registry number.`);
        continue;
      }

      const compound = await resolveCompound(cas);
      if (!compound) {
        problems.push(`CAS ${cas} could not be found in PubChem — the number may be mistyped or invented.`);
        continue;
      }

      // Annex membership: literal CAS first, then the resolved compound, which
      // catches a listed substance declared under an alternate registry number.
      const entry = findByCas(cas) ?? findByCid(compound.cid);
      if (entry) {
        if (entry.annex === 'I') restricted = true;
        findings.push(`CAS ${cas} confirmed as ${compound.title} (PubChem CID ${compound.cid}). ${describeListing(entry, buyerType)}`);
        if (entry.annex === 'I') {
          const verdict = compareToLimit(entry, concentration);
          if (verdict == null) {
            findings.push(
              parsePercentage(concentration) == null
                ? 'No concentration was declared in a form this check can read, so the limit value could not be applied — read the statement.'
                : 'The limit value for this entry is conditional, so it was not applied automatically — read the statement.',
            );
          } else if (verdict.startsWith('DECLARED')) {
            // Above the limit is a reviewer decision, not an automatic refusal —
            // a licensed buyer may legitimately order above it.
            problems.push(verdict);
          } else {
            findings.push(verdict);
          }
        }
      } else {
        findings.push(`CAS ${cas} confirmed as ${compound.title} (PubChem CID ${compound.cid}). Not listed in Annex I or II of ${REG}.`);
      }

      if (!paired) continue;

      // Does the declared name describe the same compound as the declared CAS?
      const declaredName = names[i];
      const named = await resolveCompound(declaredName);
      if (!named) {
        // PubChem's names are overwhelmingly English, so a name it does not
        // know is often just a name in another language.
        const r = await recogniseForeignName(declaredName, cas, compound);
        if (r.kind === 'same') {
          findings.push(r.note);
        } else if (r.kind === 'listed-other') {
          if (r.match.entry.annex === 'I') restricted = true;
          problems.push(
            `CAS ${cas} is ${compound.title} (CID ${compound.cid}), but the declared name "${declaredName}" is `
            + `${describeNameMatch(r.match)}.`,
          );
          findings.push(`The declared name "${declaredName}" is itself ${describeListing(r.match.entry, buyerType)}`);
        } else {
          problems.push(
            `"${declaredName}" could not be identified in PubChem${r.wikidataDown ? ' (and Wikidata could not be reached)' : ' or Wikidata'}, `
            + `so it could not be checked against CAS ${cas}.`,
          );
        }
      } else if (named.cid !== compound.cid) {
        problems.push(
          `CAS ${cas} is ${compound.title} (CID ${compound.cid}), not the declared substance `
          + `"${declaredName}" (${named.title}, CID ${named.cid}).`,
        );
        // A mismatch may be an attempt to order a listed substance under an
        // innocuous CAS, so check what the *name* is too.
        const namedEntry = findByCid(named.cid) ?? identifyName(declaredName)?.entry ?? null;
        if (namedEntry) {
          if (namedEntry.annex === 'I') restricted = true;
          findings.push(`The declared name "${declaredName}" is itself ${describeListing(namedEntry, buyerType)}`);
        }
      }
    }

    // Names that were never paired still deserve an annex check. (Without any
    // CAS they were checked above, more thoroughly.)
    if (!paired && casList.length > 0) {
      for (const name of names) {
        const match = identifyName(name);
        if (match) {
          if (match.entry.annex === 'I') restricted = true;
          findings.push(`The declared name "${name}" is ${describeNameMatch(match)}. ${describeListing(match.entry, buyerType)}`);
        }
      }
    }
  } catch (err: any) {
    if (err instanceof PubChemUnavailable) {
      return {
        status: 'ERROR',
        note: `The substance could not be verified — PubChem was unreachable (${err.message}). `
          + 'Re-run the check, or review the substance manually before approving.',
      };
    }
    return { status: 'ERROR', note: `Compliance check failed: ${err?.message ?? 'unknown error'}` };
  }

  // Article 9 attaches the reporting duty to *suspicious transactions* in both
  // annexes, so the stated use is screened whenever a listed substance is
  // involved — and for unlisted ones too, since a statement like "I want to
  // drink it" is worth a look whatever the CAS resolves to.
  const concerns = screenStatement(statement ?? '', statementLang);
  for (const c of concerns) problems.push(`${c.category}: ${c.detail}`);

  if (translationUnavailable) {
    // First among the findings, so the length cap on the note never cuts it.
    findings.unshift(
      'The stated use has not been translated yet — the on-server translator could not be reached. '
      + 'If it is not in a language you read, it was only screened as written: re-run the check later to translate it.',
    );
  }

  // The word lists only know some languages. The translation catches the
  // rest — less reliably, since slang does not survive machine translation
  // well, so a flag that fired only here says where it came from and the
  // reviewer reads the original before deciding anything.
  if (statementTranslation) {
    const seen = new Set(concerns.map(c => c.category));
    const via = statementLang ? `the machine translation from ${languageName(statementLang)}` : 'the machine translation';
    for (const c of screenStatement(statementTranslation, 'en')) {
      if (seen.has(c.category) || c.category === 'Stated use not meaningful' || c.category === 'No stated use') continue;
      seen.add(c.category);
      concerns.push(c);
      problems.push(`${c.category} (found in ${via} — check the original): ${c.detail}`);
    }
  }

  const flagged = problems.length > 0 || restricted;
  const screenNote = concerns.length
    ? ''
    : ' The stated use was screened for suspicion indicators and none matched — this is a keyword screen, not an assessment that the use is legitimate; read the statement before approving.';
  const note = ([...problems, ...findings].join(' ') + screenNote).slice(0, NOTE_MAX)
    || 'No substance information to check.';

  return { status: flagged ? 'FLAGGED' : 'OK', note };
}
