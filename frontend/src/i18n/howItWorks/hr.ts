import type { HowItWorks } from './en.ts';

const hr: HowItWorks = {
  docTitle: 'Kako ovo funkcionira',
  badge: 'Za kupce',
  title: 'Kako ovo funkcionira',
  lede: 'Prije kupnje kemikalije zamoljeni ste da ispunite izjavu krajnjeg korisnika. Ova stranica objašnjava zašto, što se događa s vašim podacima i što možete učiniti.',
  sentBy: (seller) => `Došli ste s obrasca prodavatelja ${seller}.`,
  backToForm: 'Natrag na obrazac',
  contents: 'Na ovoj stranici',

  shortTitle: 'Ukratko',
  short: [
    'Prodavatelj mora provjeriti tko kupuje određene kemikalije i za što. To nalaže zakon, a ne trgovina.',
    'Vašu identifikacijsku ispravu provjerava Didit. Njezine fotografije nikada ne dolaze do prodavatelja ni do nas.',
    'Vašu izjavu čita tim prodavatelja. Broj isprave ostaje skriven osim ako ga netko namjerno ne otvori, a svako otvaranje se bilježi.',
    'Nakon 18 mjeseci sve se automatski briše.',
  ],

  whyTitle: 'Zašto me se to pita?',
  why: [
    'Neke se kemikalije mogu zloupotrijebiti za izradu eksploziva, droga ili oružja. Propisi EU-a — među njima Uredba (EU) 2019/1148 o prekursorima eksploziva — obvezuju prodavatelje da znaju kome i u koju svrhu prodaju te tvari, da to evidentiraju i da prijavljuju sumnjive transakcije.',
    'Izjava koju ispunjavate jest ta evidencija. eustatement je usluga kojom je prodavatelj prikuplja.',
  ],

  idTitle: 'Što se događa s mojom identifikacijskom ispravom?',
  id: [
    'Ako prodavatelj zahtijeva provjeru identiteta, otvara se sigurni prozor Didita, našeg pružatelja usluge provjere identiteta. Fotografirate putovnicu ili osobnu iskaznicu i snimite kratki selfie. Didit provjerava je li isprava vjerodostojna i pripada li vama.',
    'Fotografije idu samo Diditu — nikada ne dolaze do prodavatelja ni do nas. Čim se ishod pohrani, provjera kod Didita, uključujući fotografije, briše se.',
    'Čuvaju se ishod i ono što je otisnuto na ispravi: vaše ime, vrsta isprave i njezin broj. Datum rođenja koristi se jednom, kako bi se provjerilo imate li najmanje 18 godina, i ne čuva se.',
  ],

  storedTitle: 'Što se pohranjuje i tko to može vidjeti?',
  stored: [
    'Podaci koje unesete u obrazac, ishod provjere identiteta i rezultat automatskih provjera tvari. Vaši osobni podaci pohranjuju se šifrirano, na poslužiteljima u EU-u.',
    'Nijedan drugi prodavatelj ne vidi vašu izjavu — samo prodavatelj kod kojeg kupujete i njegov tim. Broj isprave ostaje skriven čak i od njih: član tima mora ga potvrditi drugim korakom prijave da bi ga vidio, i svaki put se to bilježi.',
    'Naši zaposlenici mogu otvoriti izjave kada je to potrebno za rad i podršku usluge. I oni vide broj isprave samo ako ga namjerno otvore, a to otvaranje vidljivo je u evidenciji prodavatelja.',
  ],

  decideTitle: 'Tko odlučuje?',
  decide: [
    'Svaku izjavu čita i o njoj odlučuje osoba kod prodavatelja. Automatske provjere — je li tvar na popisu ograničenih tvari, sadržava li navedena uporaba znakove upozorenja, je li PDV identifikacijski broj tvrtke valjan — samo upućuju ocjenjivača na ono što zaslužuje pomniji pogled. One nikada same ništa ne odobravaju ni ne odbijaju.',
    'Jedina iznimka je dob: ako vaša isprava pokazuje da imate manje od 18 godina, izjavu nije moguće poslati.',
    'Ako vaša izjava nije na engleskom ili nizozemskom, može se strojno prevesti za ocjenjivača. To se događa na našem vlastitom poslužitelju; vaš se tekst ne šalje nijednoj usluzi prevođenja.',
  ],

  keptTitle: 'Koliko se dugo čuva?',
  kept: [
    '18 mjeseci od dana slanja. Nakon toga se automatski briše, zajedno sa svime opisanim gore. Ako prodavatelj ranije zatvori račun, briše se 30 dana nakon toga.',
  ],

  othersTitle: 'Tko je još uključen?',
  othersIntro: 'Osim prodavatelja i nas, ulogu imaju ove strane:',
  others: [
    ['Didit', 'provjerava vašu identifikacijsku ispravu — samo ako to zahtijeva prodavatelj.'],
    ['Europska komisija (VIES)', 'provjerava PDV identifikacijski broj — samo ako naručujete za tvrtku.'],
    ['PubChem i Wikidata', 'pomažu prepoznati tvar. Primaju naziv tvari i CAS broj, nikada ništa o vama.'],
    ['Naš pružatelj e-pošte', 'dostavlja potvrdu i odluku u vaš sandučić.'],
    ['Cloudflare', 'štiti web-stranicu od napada i vidi vašu IP adresu dok promet prolazi.'],
    ['Hetzner', 'udomljuje naše poslužitelje u EU-u.'],
  ],
  othersMore: 'Potpuni popis s lokacijama nalazi se u našim pravilima o privatnosti (na engleskom).',

  rightsTitle: 'Koja su moja prava?',
  rights: [
    'Možete zatražiti uvid u podatke o sebi, njihov ispravak ili brisanje ako to zakon dopušta — prodavatelj može biti dužan čuvati evidenciju onoliko dugo koliko to propisi zahtijevaju.',
  ],
  controller: (seller) => seller
    ? `Za vaše podatke odgovoran je ${seller} („voditelj obrade“); eustatement ih obrađuje u njegovo ime. Zahtjev pošaljite prodavatelju ${seller}.`
    : 'Za vaše podatke odgovoran je prodavatelj („voditelj obrade“); eustatement ih obrađuje u njegovo ime. Zahtjev pošaljite prodavatelju.',
  fallback: (email) => `Ako ga ne možete kontaktirati, pišite na ${email}; proslijedit ćemo vaš zahtjev.`,
  complaint: 'Pritužbu možete podnijeti i tijelu za zaštitu podataka u svojoj zemlji.',

  questionsTitle: 'Pitanja?',
  questionsOrder: 'O narudžbi ili odluci: obratite se prodavatelju.',
  questionsData: (email) => `O ovoj stranici ili postupanju s vašim podacima: ${email}.`,

  lastUpdated: (date) => `Zadnje ažuriranje: ${date}`,
  privacyPolicy: 'Pravila o privatnosti',
};

export default hr;
