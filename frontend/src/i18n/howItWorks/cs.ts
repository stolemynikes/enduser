import type { HowItWorks } from './en.ts';

const cs: HowItWorks = {
  docTitle: 'Jak to funguje',
  badge: 'Pro kupující',
  title: 'Jak to funguje',
  lede: 'Před nákupem chemické látky jste byli požádáni o vyplnění prohlášení konečného uživatele. Tato stránka vysvětluje proč, co se děje s vašimi údaji a co můžete udělat.',
  sentBy: (seller) => `Přišli jste z formuláře prodejce ${seller}.`,
  backToForm: 'Zpět na formulář',
  contents: 'Na této stránce',

  shortTitle: 'Stručně',
  short: [
    'Prodejce musí ověřit, kdo kupuje určité chemické látky a k čemu. Vyžaduje to zákon, není to volba obchodu.',
    'Váš doklad totožnosti ověřuje Didit. Jeho fotografie se nikdy nedostanou k prodejci ani k nám.',
    'Vaše prohlášení čte tým prodejce. Číslo dokladu zůstává skryté, dokud si ho někdo záměrně nezobrazí, a každé zobrazení se zaznamenává.',
    'Po 18 měsících se vše automaticky smaže.',
  ],

  whyTitle: 'Proč se mě na to ptáte?',
  why: [
    'Některé chemické látky lze zneužít k výrobě výbušnin, drog nebo zbraní. Předpisy EU — mimo jiné nařízení (EU) 2019/1148 o prekursorech výbušnin — ukládají prodejcům povinnost vědět, komu a k jakému účelu tyto látky prodávají, vést o tom záznam a hlásit podezřelé transakce.',
    'Prohlášení, které vyplňujete, je tímto záznamem. eustatement je služba, kterou prodejce používá k jeho shromažďování.',
  ],

  idTitle: 'Co se stane s mým dokladem totožnosti?',
  id: [
    'Pokud prodejce vyžaduje ověření totožnosti, otevře se zabezpečené okno společnosti Didit, našeho poskytovatele ověření totožnosti. Vyfotografujete svůj cestovní pas nebo občanský průkaz a pořídíte krátké selfie. Didit ověří, že je doklad pravý a že patří vám.',
    'Fotografie jdou pouze do Didit — nikdy se nedostanou k prodejci ani k nám. Jakmile je výsledek uložen, ověření u Didit včetně fotografií se smaže.',
    'Uchovává se výsledek a to, co je na dokladu vytištěno: vaše jméno, druh dokladu a jeho číslo. Datum narození se použije jednou, k ověření, že vám je alespoň 18 let, a neuchovává se.',
  ],

  storedTitle: 'Co se ukládá a kdo to může vidět?',
  stored: [
    'Údaje, které zadáte do formuláře, výsledek ověření totožnosti a výsledek automatických kontrol látky. Vaše osobní údaje se ukládají šifrovaně, na serverech v EU.',
    'Žádný jiný prodejce vaše prohlášení nevidí — pouze prodejce, u kterého nakupujete, a jeho tým. Číslo dokladu zůstává skryté i před nimi: člen týmu musí pro jeho zobrazení potvrdit druhým krokem přihlášení a pokaždé se to zaznamená.',
    'Naši zaměstnanci mohou prohlášení otevřít, pokud je to nutné pro provoz a podporu služby. I oni vidí číslo dokladu jen tehdy, když si ho záměrně zobrazí, a toto zobrazení se objeví v záznamech prodejce.',
  ],

  decideTitle: 'Kdo rozhoduje?',
  decide: [
    'Každé prohlášení čte a rozhoduje o něm člověk na straně prodejce. Automatické kontroly — zda je látka na seznamu omezených látek, zda uvedené použití obsahuje varovné signály, zda je DIČ firmy platné — pouze upozorňují posuzovatele na to, co si zaslouží bližší pohled. Nikdy samy nic neschvalují ani nezamítají.',
    'Jedinou výjimkou je věk: pokud z vašeho dokladu vyplývá, že je vám méně než 18 let, prohlášení nelze odeslat.',
    'Pokud vaše prohlášení není v angličtině ani v nizozemštině, může být pro posuzovatele strojově přeloženo. Děje se tak na našem vlastním serveru; váš text se neodesílá žádné překladatelské službě.',
  ],

  keptTitle: 'Jak dlouho se údaje uchovávají?',
  kept: [
    '18 měsíců ode dne odeslání. Poté se prohlášení automaticky smaže spolu se vším výše popsaným. Pokud prodejce zruší svůj účet dříve, smaže se 30 dní poté.',
  ],

  othersTitle: 'Kdo další je zapojen?',
  othersIntro: 'Kromě prodejce a nás hrají roli tyto strany:',
  others: [
    ['Didit', 'ověřuje váš doklad totožnosti — pouze pokud to prodejce vyžaduje.'],
    ['Evropská komise (VIES)', 'ověřuje DIČ — pouze pokud objednáváte pro firmu.'],
    ['PubChem a Wikidata', 'pomáhají látku identifikovat. Dostávají název látky a číslo CAS, nikdy nic o vás.'],
    ['Náš poskytovatel e-mailu', 'doručuje potvrzení a rozhodnutí do vaší schránky.'],
    ['Cloudflare', 'chrání web před útoky a vidí vaši IP adresu při průchodu provozu.'],
    ['Hetzner', 'provozuje naše servery v EU.'],
  ],
  othersMore: 'Úplný seznam včetně umístění najdete v našich zásadách ochrany osobních údajů (v angličtině).',

  rightsTitle: 'Jaká mám práva?',
  rights: [
    'Můžete požádat o přístup k údajům, které se vás týkají, o jejich opravu nebo výmaz, pokud to zákon dovoluje — prodejce může být povinen záznam uchovávat tak dlouho, jak předpisy vyžadují.',
  ],
  controller: (seller) => seller
    ? `Za vaše údaje odpovídá ${seller} („správce“); eustatement je zpracovává jeho jménem. Svou žádost zašlete prodejci ${seller}.`
    : 'Za vaše údaje odpovídá prodejce („správce“); eustatement je zpracovává jeho jménem. Svou žádost zašlete prodejci.',
  fallback: (email) => `Pokud se vám ho nepodaří kontaktovat, napište na ${email}; vaši žádost předáme.`,
  complaint: 'Můžete také podat stížnost u úřadu pro ochranu osobních údajů ve své zemi.',

  questionsTitle: 'Dotazy?',
  questionsOrder: 'K objednávce nebo rozhodnutí: obraťte se na prodejce.',
  questionsData: (email) => `K této stránce nebo nakládání s vašimi údaji: ${email}.`,

  lastUpdated: (date) => `Naposledy aktualizováno: ${date}`,
  privacyPolicy: 'Zásady ochrany osobních údajů',
};

export default cs;
