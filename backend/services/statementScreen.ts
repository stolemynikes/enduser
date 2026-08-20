// Screens the buyer's stated use for suspicion indicators.
//
// Article 9 of Reg. (EU) 2019/1148 obliges economic operators to report
// suspicious transactions involving Annex I *or* Annex II substances within 24
// hours. Identifying the substance correctly does nothing for that duty — the
// duty is about the transaction. A check that confirms "this is acetone" and
// then reports no concerns against a stated intent to drink it has answered a
// question nobody asked.
//
// WHAT THIS IS NOT: this does not understand the statement. It matches phrases
// against the indicator groups in the Commission's guidance on suspicious
// transactions. A buyer who writes "for cleaning" instead of the truth sails
// straight through, and that is not a defect to be patched with a longer word
// list — free-text intent is not decidable by pattern matching. The control
// that catches a competent bad actor is the human reviewer reading the
// statement, which is why the statement is shown in full in the dashboard and
// why nothing here auto-denies.
//
// What it does buy: the blatant cases stop reading as "✓ No concerns", and a
// reviewer skimming a queue gets pointed at the row worth reading.

export type StatementConcern = {
  /** Which indicator group fired — shown to the reviewer so the flag is explicable. */
  category: string;
  detail: string;
};

// Phrases that legitimately contain an indicator word. Stripped before matching
// so ordinary laboratory language does not generate noise: "drinking water
// analysis" is the single most likely legitimate use of acetone to trip the
// ingestion group.
const SAFE_PHRASES = [
  /\bdrinking[- ]water\b/gi,
  /\bpotable[- ]water\b/gi,
  /\bfood[- ]grade\b/gi,
  /\bsmoke[- ](test|point|detector)\w*/gi,
  /\binhalation\b/gi,          // "inhalation hazard" is safety language
  /\bconsumed?\s+(in|by|during)\s+the\s+reaction\b/gi,
  /\bexplosion[- ]proof\b/gi,  // a spec for lab equipment
  /\bexplosive\s+limits?\b/gi, // "lower explosive limit" is a safety datum
  /\bnon[- ]explosive\b/gi,
];

const GROUPS: { category: string; detail: string; patterns: RegExp[] }[] = [
  {
    category: 'Ingestion',
    detail: 'The stated use describes ingesting or inhaling the substance, which is not a use any listed precursor has.',
    patterns: [/\bdrink\b/i, /\bdrinking\b/i, /\bswallow/i, /\bingest/i, /\beat\b/i, /\beating\b/i, /\binhale\b/i, /\bsnort/i, /\bhuff\b/i, /\bget\s+high\b/i],
  },
  {
    category: 'Explosive or pyrotechnic intent',
    detail: 'The stated use refers to explosives, propellants or pyrotechnics — the exact risk the regulation exists to control.',
    patterns: [/\bexplosi\w*/i, /\bbomb\w*/i, /\bdetonat\w*/i, /\bblow\s+(it|things?|stuff)?\s*up\b/i, /\bfirework/i, /\bpyrotechnic/i, /\bthermite\b/i, /\bgun\s?powder\b/i, /\bflash\s?powder\b/i, /\bpropellant/i, /\bammunition\b/i, /\bIED\b/],
  },
  {
    category: 'Weapon intent',
    detail: 'The stated use refers to weapons or causing harm.',
    patterns: [/\bweapon/i, /\bkill\b/i, /\bhurt\s+(someone|people|him|her|them)\b/i, /\bpoison\b/i, /\brevenge\b/i, /\battack\b/i],
  },
  {
    category: 'Illicit drug manufacture',
    detail: 'The stated use suggests drug manufacture or extraction, a common diversion route for solvents.',
    patterns: [/\bmeth\b/i, /\bmethamphetamine\b/i, /\bcocaine\b/i, /\bcook(ing)?\s+(up\s+)?(a\s+)?batch\b/i, /\bnarcotic/i, /\bdrug\s+(lab|manufactur)/i],
  },
  {
    category: 'Avoiding scrutiny',
    detail: 'The buyer signalled a wish to avoid records, identification or questions — a listed suspicion indicator.',
    patterns: [/\bno\s+questions?\b/i, /\bdon'?t\s+ask\b/i, /\boff\s+the\s+books\b/i, /\bno\s+(invoice|paperwork|records?|receipt)\b/i, /\banonymous/i, /\bdiscree?t/i, /\buntraceable\b/i, /\bcash\s+only\b/i, /\bnone\s+of\s+your\s+business\b/i],
  },
];

// A stated use that says nothing cannot be assessed, and "the buyer would not
// say what it is for" is itself an indicator in the guidance.
const PLACEHOLDER = /^(n\.?\/?a\.?|none|-+|\.+|test(ing)?|asdf\w*|xxx+|\?+|personal|personal use|private|secret)$/i;
const MIN_MEANINGFUL_LENGTH = 8;

/**
 * Returns the concerns raised by a stated use. An empty array means nothing
 * matched — which is not the same as "the stated use is legitimate".
 */
export function screenStatement(statement: string): StatementConcern[] {
  const raw = (statement ?? '').trim();
  const concerns: StatementConcern[] = [];

  if (!raw) {
    return [{ category: 'No stated use', detail: 'No use was stated, so the transaction could not be assessed against Article 9.' }];
  }
  if (PLACEHOLDER.test(raw) || raw.length < MIN_MEANINGFUL_LENGTH) {
    concerns.push({
      category: 'Stated use not meaningful',
      detail: `The stated use ("${raw.slice(0, 60)}") is too vague to assess. Reluctance to explain the intended use is itself a suspicion indicator.`,
    });
  }

  let text = raw;
  for (const safe of SAFE_PHRASES) text = text.replace(safe, ' ');

  for (const group of GROUPS) {
    if (group.patterns.some(p => p.test(text))) {
      concerns.push({ category: group.category, detail: group.detail });
    }
  }

  return concerns;
}
