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
//
// LANGUAGES. Written by hand for English, Dutch, German and French — the
// languages most buyers of a Dutch seller write in. By hand because slang is
// exactly what machine translation mangles: "een batch koken" or "Ich will es
// sniffen" does not reliably come back as something the English list knows.
// Statements in other languages are screened through their machine
// translation instead (services/translate.ts).
//
// Each language's list applies only to text in that language, plus English,
// whose loanwords turn up everywhere ("meth", "high"). The scoping is not
// tidiness: "bom" is a bomb in Dutch and "good" in Portuguese, "arme" is a
// weapon in French and "poor" in German. When the language is not known, every
// list applies and the occasional false flag is the price.
//
// Matching runs on folded text — lower case, accents removed, ß as ss — so
// "Explosivstoff", "ingérer" and "Sprengstoff" need no accented variants, and
// whole-word boundaries work for every letter rather than ASCII only.

export type StatementConcern = {
  /** Which indicator group fired — shown to the reviewer so the flag is explicable. */
  category: string;
  detail: string;
};

type Lang = 'en' | 'nl' | 'de' | 'fr';
const LISTED: ReadonlySet<string> = new Set<Lang>(['en', 'nl', 'de', 'fr']);

function fold(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}+/gu, '').replace(/ß/g, 'ss').toLowerCase();
}

// Whole words, for any script. Fragments are regex source, written folded.
const B = '(?<![\\p{L}\\p{N}])';
const E = '(?![\\p{L}\\p{N}])';
const words = (...alternatives: string[]) => new RegExp(`${B}(?:${alternatives.join('|')})${E}`, 'u');
const phrase = (...alternatives: string[]) => new RegExp(`${B}(?:${alternatives.join('|')})${E}`, 'gu');

// Phrases that legitimately contain an indicator word. Removed before matching
// so ordinary laboratory and safety-sheet language does not raise noise:
// "drinking water analysis" and "bei Verschlucken" (the H-phrase wording) are
// the commonest legitimate reasons the ingestion group would otherwise fire.
const SAFE_PHRASES: Record<Lang, RegExp[]> = {
  en: [
    phrase('drinking[- ]water', 'potable[- ]water', 'food[- ]grade'),
    phrase('smoke[- ](?:test|point|detector)\\p{L}*'),
    phrase('inhalation'),                                  // "inhalation hazard" is safety language
    phrase('consumed?\\s+(?:in|by|during)\\s+the\\s+reaction'),
    phrase('explosion[- ]proof', 'explosive\\s+limits?', 'non[- ]explosive'),
  ],
  nl: [
    phrase('drinkwater\\p{L}*', 'levensmiddelenkwaliteit', 'food[- ]grade'),
    phrase('inhalatie\\p{L}*', 'bij\\s+(?:inslikken|inademing)'),
    phrase('explosiegrens\\p{L}*', 'explosieveilig\\p{L}*', 'explosiegevaar\\p{L}*', 'niet[- ]explosie[fv]\\p{L}*'),
    phrase('rookmelder\\p{L}*', 'rooktest\\p{L}*'),
  ],
  de: [
    phrase('trinkwasser\\p{L}*', 'lebensmittelqualitat', 'food[- ]grade'),
    phrase('bei\\s+(?:verschlucken|einatmen|inhalation)', 'inhalation\\p{L}*'),
    phrase('explosionsgrenze\\p{L}*', 'explosionsgeschutzt\\p{L}*', 'explosionsgefahr\\p{L}*', 'ex[- ]schutz', 'nicht\\s+explosiv\\p{L}*'),
    phrase('rauchmelder\\p{L}*'),
  ],
  fr: [
    phrase('eau\\s+potable', 'qualite\\s+alimentaire', 'food[- ]grade'),
    phrase('en\\s+cas\\s+d.(?:ingestion|inhalation)', 'inhalation'),
    phrase('limites?\\s+d.explosivite', 'antideflagrant\\p{L}*', 'non\\s+explosi[fv]\\p{L}*', 'atmospheres?\\s+explosives?'),
    phrase('detecteurs?\\s+de\\s+fumee'),
  ],
};

type Group = { category: string; detail: string; patterns: Record<Lang, RegExp[]> };

const GROUPS: Group[] = [
  {
    category: 'Ingestion',
    detail: 'The stated use describes ingesting or inhaling the substance, which is not a use any listed precursor has.',
    patterns: {
      en: [words('drink', 'drinking', 'swallow\\p{L}*', 'ingest\\p{L}*', 'eat', 'eating', 'inhale', 'snort\\p{L}*', 'huff', 'get\\s+high', 'getting\\s+high')],
      nl: [words('drinken', 'opdrinken', 'drink', 'inslikken', 'slikken', 'opeten', 'eten', 'inhaleren', 'snuiven', 'sniffen',
        'high\\s+worden', 'high\\s+te\\s+worden', 'stoned\\s+worden')],
      // Not "essen": it is also the city.
      de: [words('trinken', 'austrinken', 'schlucken', 'verschlucken', 'aufessen', 'inhalieren', 'schnuffeln', 'sniffen',
        'high\\s+werden', 'high\\s+zu\\s+werden', 'berauschen', 'rausch')],
      fr: [words('boire', 'avaler', 'ingerer', 'manger', 'inhaler', 'sniffer', 'snifer', 'se\\s+droguer', 'pour\\s+planer')],
    },
  },
  {
    category: 'Explosive or pyrotechnic intent',
    detail: 'The stated use refers to explosives, propellants or pyrotechnics — the exact risk the regulation exists to control.',
    patterns: {
      en: [words('explosi\\p{L}*', 'bomb\\p{L}*', 'detonat\\p{L}*', 'blow\\s+(?:it|things?|stuff)?\\s*up', 'firework\\p{L}*',
        'pyrotechnic\\p{L}*', 'thermite', 'gun\\s?powder', 'flash\\s?powder', 'propellant\\p{L}*', 'ammunition'), /\bIED\b/],
      nl: [words('explosie\\p{L}*', 'explosief', 'explosieve', 'explosieven', 'ontploff\\p{L}*', 'opblazen', 'opgeblazen', 'bom', 'bommen',
        'bommetje\\p{L}*', 'springstof\\p{L}*', 'vuurwerk\\p{L}*', 'pyrotechni\\p{L}*', 'flitspoeder', 'knalpoeder', 'buskruit',
        'zwart\\s+kruit', 'thermiet', 'ontsteker\\p{L}*', 'detonator\\p{L}*', 'laten\\s+knallen')],
      de: [words('sprengstoff\\p{L}*', 'sprengen', 'sprengung', 'gesprengt', 'explosion\\p{L}*', 'explodier\\p{L}*', 'explosiv\\p{L}*',
        'bombe', 'bomben', 'feuerwerk\\p{L}*', 'pyrotechni\\p{L}*', 'boller', 'knallkorper\\p{L}*', 'schwarzpulver', 'blitzknall\\p{L}*',
        'thermit', 'zunder', 'detonator\\p{L}*', 'in\\s+die\\s+luft\\s+(?:jagen|sprengen)')],
      fr: [words('explosi\\p{L}*', 'exploser', 'faire\\s+sauter', 'bombe\\p{L}*', 'detonat\\p{L}*', 'feux?\\s+d.artifice',
        'pyrotechni\\p{L}*', 'petard\\p{L}*', 'poudre\\s+noire', 'poudre\\s+eclair', 'thermite', 'engin\\s+explosif')],
    },
  },
  {
    category: 'Weapon intent',
    detail: 'The stated use refers to weapons or causing harm.',
    patterns: {
      en: [words('weapon\\p{L}*', 'kill', 'hurt\\s+(?:someone|people|him|her|them)', 'poison', 'revenge', 'attack')],
      nl: [words('wapen', 'wapens', 'doden', 'vermoorden', 'vergiftig\\p{L}*', 'vergif', 'iemand\\s+pijn\\s+doen', 'wraak', 'aanslag', 'afrekenen\\s+met')],
      de: [words('waffe', 'waffen', 'toten', 'umbringen', 'ermorden', 'vergiften', 'giftgas', 'jemandem\\s+schaden', 'rache', 'anschlag')],
      fr: [words('arme', 'armes', 'tuer', 'assassiner', 'empoisonner', 'poison', 'faire\\s+du\\s+mal', 'vengeance', 'me\\s+venger', 'attentat')],
    },
  },
  {
    category: 'Illicit drug manufacture',
    detail: 'The stated use suggests drug manufacture or extraction, a common diversion route for solvents.',
    patterns: {
      en: [words('meth', 'methamphetamine', 'cocaine', 'cook(?:ing)?\\s+(?:up\\s+)?(?:a\\s+)?batch', 'narcotic\\p{L}*', 'drug\\s+(?:lab|manufactur\\p{L}*)')],
      nl: [words('drugs\\s+(?:maken|koken|produceren)', 'drugslab\\p{L}*', 'xtc', 'mdma', 'amfetamine', 'methamfetamine', 'cocaine',
        'ghb', '(?:een\\s+)?batch\\s+koken', 'wiet\\s+(?:extraheren|olie\\s+maken)')],
      de: [words('drogen\\s+(?:herstellen|kochen|machen|produzieren)', 'drogenlabor\\p{L}*', 'amphetamin', 'methamphetamin', 'kokain',
        'mdma', 'ecstasy', 'ghb', 'betaubungsmittel\\s+herstellen')],
      // "drogues?" exactly: "droguerie" is a hardware shop.
      fr: [words('drogues?', 'stupefiant\\p{L}*', 'laboratoire\\s+clandestin', 'amphetamine', 'methamphetamine', 'cocaine',
        'mdma', 'ecstasy', 'ghb')],
    },
  },
  {
    category: 'Avoiding scrutiny',
    detail: 'The buyer signalled a wish to avoid records, identification or questions — a listed suspicion indicator.',
    patterns: {
      en: [words('no\\s+questions?', 'don.?t\\s+ask', 'off\\s+the\\s+books', 'no\\s+(?:invoice|paperwork|records?|receipt)',
        'anonymous\\p{L}*', 'discree?t\\p{L}*', 'untraceable', 'cash\\s+only', 'none\\s+of\\s+your\\s+business')],
      nl: [words('geen\\s+vragen', 'niet\\s+vragen', 'geen\\s+(?:factuur|bon|administratie)', 'zonder\\s+(?:factuur|bon)', 'zwart\\s+betalen',
        'alleen\\s+contant', 'anoniem\\p{L}*', 'discreet', 'discrete', 'niet\\s+traceerbaar', 'gaat\\s+(?:je|jou|u)\\s+(?:niks|niets)\\s+aan')],
      de: [words('keine\\s+fragen', 'nicht\\s+fragen', '(?:ohne|keine)\\s+rechnung', 'ohne\\s+beleg', 'nur\\s+bar(?:zahlung)?', 'anonym\\p{L}*',
        'diskret\\p{L}*', 'nicht\\s+nachverfolgbar', 'unauffallig\\p{L}*', 'geht\\s+(?:sie|dich)\\s+nichts\\s+an')],
      fr: [words('pas\\s+de\\s+questions?', 'sans\\s+(?:facture|recu)', 'pas\\s+de\\s+facture', '(?:en\\s+)?(?:liquide|especes)\\s+uniquement',
        'anonym\\p{L}*', 'discret\\p{L}*', 'intracable', 'ca\\s+ne\\s+vous\\s+regarde\\s+pas')],
    },
  },
];

// A stated use that says nothing cannot be assessed, and "the buyer would not
// say what it is for" is itself an indicator in the guidance.
const PLACEHOLDER = new RegExp(
  '^(?:n\\.?/?a\\.?|none|-+|\\.+|test(?:ing)?|asdf\\p{L}*|xxx+|\\?+|personal|personal use|private|secret'
  + '|nvt|n\\.v\\.t\\.?|geen|prive|prive\\s*gebruik|eigen\\s+gebruik|persoonlijk(?:\\s+gebruik)?|geheim'
  + '|keine|k\\.\\s?a\\.?|privat|privatgebrauch|eigenbedarf|personlich'
  + '|aucun|aucune|personnel|usage personnel)$',
  'u',
);
const MIN_MEANINGFUL_LENGTH = 8;

/**
 * Returns the concerns raised by a stated use. An empty array means nothing
 * matched — which is not the same as "the stated use is legitimate".
 *
 * `lang` is the language the statement was detected in. Known and listed:
 * that language's words and English. Known but not listed: English only — the
 * translation pass covers the rest. Unknown: every list.
 */
export function screenStatement(statement: string, lang?: string | null): StatementConcern[] {
  const raw = (statement ?? '').trim();
  const concerns: StatementConcern[] = [];

  if (!raw) {
    return [{ category: 'No stated use', detail: 'No use was stated, so the transaction could not be assessed against Article 9.' }];
  }

  const folded = fold(raw);
  if (PLACEHOLDER.test(folded) || raw.length < MIN_MEANINGFUL_LENGTH) {
    concerns.push({
      category: 'Stated use not meaningful',
      detail: `The stated use ("${raw.slice(0, 60)}") is too vague to assess. Reluctance to explain the intended use is itself a suspicion indicator.`,
    });
  }

  const langs: Lang[] = !lang ? ['en', 'nl', 'de', 'fr']
    : LISTED.has(lang) ? Array.from(new Set<Lang>(['en', lang as Lang]))
    : ['en'];

  let text = folded;
  for (const l of langs) for (const safe of SAFE_PHRASES[l]) text = text.replace(safe, ' ');

  for (const group of GROUPS) {
    // The IED pattern is case-sensitive on purpose ("ied" is too common a
    // fragment), so it is tested against the unfolded text.
    if (langs.some(l => group.patterns[l].some(p => p.test(p.flags.includes('u') ? text : raw)))) {
      concerns.push({ category: group.category, detail: group.detail });
    }
  }

  return concerns;
}
