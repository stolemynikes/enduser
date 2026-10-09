import type { HowItWorks } from './en.ts';

const sk: HowItWorks = {
  docTitle: 'Ako to funguje',
  badge: 'Pre kupujúcich',
  title: 'Ako to funguje',
  lede: 'Pred nákupom chemickej látky ste boli požiadaní o vyplnenie vyhlásenia konečného používateľa. Táto stránka vysvetľuje prečo, čo sa deje s vašimi údajmi a čo môžete urobiť.',
  sentBy: (seller) => `Prišli ste z formulára predajcu ${seller}.`,
  backToForm: 'Späť na formulár',
  contents: 'Na tejto stránke',

  shortTitle: 'Stručne',
  short: [
    'Predajca musí overiť, kto kupuje určité chemické látky a na čo. Vyžaduje to zákon, nie je to voľba obchodu.',
    'Váš doklad totožnosti overuje Didit. Jeho fotografie sa nikdy nedostanú k predajcovi ani k nám.',
    'Vaše vyhlásenie číta tím predajcu. Číslo dokladu zostáva skryté, kým si ho niekto zámerne nezobrazí, a každé zobrazenie sa zaznamenáva.',
    'Po 18 mesiacoch sa všetko automaticky vymaže.',
  ],

  whyTitle: 'Prečo sa ma na to pýtate?',
  why: [
    'Niektoré chemické látky sa dajú zneužiť na výrobu výbušnín, drog alebo zbraní. Predpisy EÚ — okrem iného nariadenie (EÚ) 2019/1148 o prekurzoroch výbušnín — ukladajú predajcom povinnosť vedieť, komu a na aký účel tieto látky predávajú, viesť o tom záznam a hlásiť podozrivé transakcie.',
    'Vyhlásenie, ktoré vypĺňate, je týmto záznamom. eustatement je služba, ktorú predajca používa na jeho zhromažďovanie.',
  ],

  idTitle: 'Čo sa stane s mojím dokladom totožnosti?',
  id: [
    'Ak predajca vyžaduje overenie totožnosti, otvorí sa zabezpečené okno spoločnosti Didit, nášho poskytovateľa overenia totožnosti. Odfotíte svoj cestovný pas alebo občiansky preukaz a urobíte krátke selfie. Didit overí, že doklad je pravý a patrí vám.',
    'Fotografie idú len do Didit — nikdy sa nedostanú k predajcovi ani k nám. Hneď ako sa výsledok uloží, overenie v Didit vrátane fotografií sa vymaže.',
    'Uchováva sa výsledok a to, čo je na doklade vytlačené: vaše meno, druh dokladu a jeho číslo. Dátum narodenia sa použije raz, na overenie, že máte aspoň 18 rokov, a neuchováva sa.',
  ],

  storedTitle: 'Čo sa ukladá a kto to môže vidieť?',
  stored: [
    'Údaje, ktoré zadáte do formulára, výsledok overenia totožnosti a výsledok automatických kontrol látky. Vaše osobné údaje sa ukladajú šifrovane, na serveroch v EÚ.',
    'Žiadny iný predajca vaše vyhlásenie nevidí — len predajca, u ktorého nakupujete, a jeho tím. Číslo dokladu zostáva skryté aj pred nimi: člen tímu musí na jeho zobrazenie potvrdiť druhým krokom prihlásenia a zakaždým sa to zaznamená.',
    'Naši zamestnanci môžu vyhlásenia otvoriť, ak je to potrebné na prevádzku a podporu služby. Aj oni vidia číslo dokladu len vtedy, keď si ho zámerne zobrazia, a toto zobrazenie sa objaví v záznamoch predajcu.',
  ],

  decideTitle: 'Kto rozhoduje?',
  decide: [
    'Každé vyhlásenie číta a rozhoduje o ňom človek na strane predajcu. Automatické kontroly — či je látka na zozname obmedzených látok, či uvedené použitie obsahuje varovné signály, či je IČ DPH firmy platné — len upozorňujú posudzovateľa na to, čo si zaslúži bližší pohľad. Nikdy samy nič neschvaľujú ani nezamietajú.',
    'Jedinou výnimkou je vek: ak z vášho dokladu vyplýva, že máte menej ako 18 rokov, vyhlásenie nemožno odoslať.',
    'Ak vaše vyhlásenie nie je v angličtine ani v holandčine, môže byť pre posudzovateľa strojovo preložené. Deje sa tak na našom vlastnom serveri; váš text sa neodosiela žiadnej prekladateľskej službe.',
  ],

  keptTitle: 'Ako dlho sa údaje uchovávajú?',
  kept: [
    '18 mesiacov odo dňa odoslania. Potom sa vyhlásenie automaticky vymaže spolu so všetkým, čo je opísané vyššie. Ak predajca zruší svoj účet skôr, vymaže sa 30 dní potom.',
  ],

  othersTitle: 'Kto ďalší je zapojený?',
  othersIntro: 'Okrem predajcu a nás zohrávajú úlohu tieto strany:',
  others: [
    ['Didit', 'overuje váš doklad totožnosti — len ak to predajca vyžaduje.'],
    ['Európska komisia (VIES)', 'overuje IČ DPH — len ak objednávate pre firmu.'],
    ['PubChem a Wikidata', 'pomáhajú látku identifikovať. Dostávajú názov látky a číslo CAS, nikdy nič o vás.'],
    ['Náš poskytovateľ e-mailu', 'doručuje potvrdenie a rozhodnutie do vašej schránky.'],
    ['Cloudflare', 'chráni web pred útokmi a vidí vašu IP adresu pri prechode prevádzky.'],
    ['Hetzner', 'prevádzkuje naše servery v EÚ.'],
  ],
  othersMore: 'Úplný zoznam vrátane umiestnení nájdete v našich zásadách ochrany osobných údajov (v angličtine).',

  rightsTitle: 'Aké mám práva?',
  rights: [
    'Môžete požiadať o prístup k údajom, ktoré sa vás týkajú, o ich opravu alebo vymazanie, ak to zákon dovoľuje — predajca môže byť povinný záznam uchovávať tak dlho, ako to vyžadujú predpisy.',
  ],
  controller: (seller) => seller
    ? `Za vaše údaje zodpovedá ${seller} („prevádzkovateľ“); eustatement ich spracúva v jeho mene. Svoju žiadosť pošlite predajcovi ${seller}.`
    : 'Za vaše údaje zodpovedá predajca („prevádzkovateľ“); eustatement ich spracúva v jeho mene. Svoju žiadosť pošlite predajcovi.',
  fallback: (email) => `Ak sa vám ho nepodarí kontaktovať, napíšte na ${email}; vašu žiadosť postúpime.`,
  complaint: 'Môžete tiež podať sťažnosť na úrad na ochranu osobných údajov vo svojej krajine.',

  questionsTitle: 'Otázky?',
  questionsOrder: 'K objednávke alebo rozhodnutiu: obráťte sa na predajcu.',
  questionsData: (email) => `K tejto stránke alebo k spracúvaniu vašich údajov: ${email}.`,

  lastUpdated: (date) => `Naposledy aktualizované: ${date}`,
  privacyPolicy: 'Zásady ochrany osobných údajov',
};

export default sk;
