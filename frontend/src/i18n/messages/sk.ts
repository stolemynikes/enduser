// Slovenčina. Výrazy ANNEX IV doslovne zo slovenskej verzie nariadenia (EÚ)
// 2019/1148, príloha IV. Pravidlá: pozri en.ts.
import type { Messages } from './en.ts';

const sk: Messages = {
  docTitle: 'Vyhlásenie konečného používateľa',
  docTitleCompany: (company) => `${company} — Vyhlásenie`,
  badge: 'Úradný dokument',
  title: 'Vyhlásenie konečného používateľa',
  subtitle: 'Chemické látky — vyhlásenie o regulovanom použití',
  submittedTo: (company) => `Predkladá sa: ${company}`,
  themeToggle: 'Svetlý alebo tmavý',

  language: 'Jazyk',
  languageSearch: 'Hľadať jazyk',
  languageNone: 'Nenašiel sa žiadny jazyk',
  languageSuggested: 'Navrhované',
  languageAll: 'Všetky jazyky',

  secBuyerType: 'Typ kupujúceho',
  secContact: 'Kontaktné údaje',
  secCompany: 'Údaje o spoločnosti',
  secAddress: 'Adresa',
  secSubstance: 'Údaje o látke',
  secIdentity: 'Overenie totožnosti',
  secTerms: 'Podmienky',

  buyerTypeQuestion: 'Objednávate ako súkromná osoba, alebo v mene spoločnosti?',
  buyerIndividual: 'Súkromná osoba',
  buyerCompany: 'Spoločnosť',

  optional: '(nepovinné)',
  email: 'E-mail',
  orderNumber: 'Číslo objednávky',
  firstName: 'Meno',
  lastName: 'Priezvisko',
  companyName: 'Názov spoločnosti',
  vatNumber: 'IČ DPH',
  vatHint: 'Potrebné na overenie v systéme EÚ VIES, napr. SK1234567890',
  street: 'Ulica a číslo',
  zipCode: 'PSČ',
  place: 'Obec',
  country: 'Krajina',
  countrySelect: '— Vyberte —',
  substanceName: 'Názov látky (látok)',
  casNo: 'Číslo CAS',
  concentration: 'Koncentrácia',
  concentrationHint: 'Ako je uvedené na etikete, napr. 15 % hm. Zákonné limity pre prekurzory od nej závisia.',
  intendedUse: 'Zamýšľané použitie',
  intendedUseHint: 'Opíšte, na čo budete látku používať.',

  idNote:
    'Váš cestovný pas alebo občiansky preukaz overuje Didit, náš poskytovateľ overenia totožnosti. '
    + 'Otvorí sa zabezpečené okno, v ktorom odfotíte svoj doklad a urobíte krátke selfie. '
    + 'Fotografie zostávajú v spoločnosti Didit — tento formulár ich nikdy neprijíma ani neukladá. Uchováva sa len '
    + 'výsledok a údaje vytlačené na vašom doklade.',
  idUnavailableTitle: 'Overenie totožnosti je dočasne nedostupné',
  idUnavailableNote: (seller) =>
    `Tento formulár ho vyžaduje, preto ho teraz nie je možné odoslať. Skúste to neskôr alebo kontaktujte predajcu${seller ? ` (${seller})` : ''}.`,
  fillFirst: (list) => `Najprv vyplňte zvyšok formulára a potom overte svoju totožnosť. Chýba: ${list}.`,
  verifyButton: 'Overiť moju totožnosť',
  verifyOpening: 'Otvára sa zabezpečené overenie…',
  verifyWaiting: 'Čaká sa na dokončenie overenia…',
  verifyWaitingHint: 'Dokončite kroky v okne overenia a potom sa sem vráťte. Táto stránka sa aktualizuje sama.',
  verifyBlocked: 'Váš prehliadač zablokoval okno overenia.',
  verifyBlockedLink: 'Otvoriť na novej karte',
  verifyRestart: 'Zavreli ste okno? Začať znova',
  verified: 'Totožnosť overená',
  verifyInReview: 'Váš doklad sa kontroluje ručne. Formulár už môžete odoslať — predajca uvidí výsledok.',
  verifyFailedTitle: 'Overenie neprešlo',
  verifyFailedNote: 'Formulár môžete aj tak odoslať. Predajca ho potom posúdi ručne.',
  verifyTryAgain: 'Skúsiť znova',

  termsIntro: (seller) => `Podmienky predajcu${seller ? ` (${seller})` : ''}:`,
  termsReadLink: (seller) => `Prečítať podmienky predajcu${seller ? ` (${seller})` : ''}`,
  termsAsWritten: () => 'Tieto podmienky stanovil predajca a zobrazujú sa v pôvodnom znení.',
  agree: 'Prečítal(a) som si uvedené podmienky a súhlasím s nimi',
  defaultTerms: `Týmto potvrdzujem, že:
— Látky, prípravky a výrobky sa používajú len povoleným spôsobom (v súlade s európskymi a vnútroštátnymi právnymi predpismi) a len na výskumné, vedecké a vzdelávacie účely.

Objednaná látka (látky):
— Sa nepoužíva na výrobu omamných a/alebo psychotropných látok ani ako ich zložka či medziprodukt.
— Sa nepoužíva v humánnych ani veterinárnych liekoch, v poľnohospodárstve, potravinách ani kozmetike, s výnimkou použitia ako surovina, pomocný alebo prevádzkový materiál a/alebo ako výskumné a analytické činidlo.
— Sa nepoužíva na vývoj ani výrobu chemických zbraní.
— Nebude použitá na vojenské ani nezákonné účely.
— Nebude spätne vyvezená do tretích krajín bez predchádzajúceho súhlasu orgánov kontroly vývozu.
— Nebude spätne vyvezená/vyvezená, ďalej predaná v tuzemsku ani v zahraničí ani prevedená do miesta určenia, na ktoré sa vzťahuje embargo EÚ, OSN alebo USA, ak by to bolo v rozpore s podmienkami tohto embarga.
— Dodáva sa len zákazníkom, ktorí tiež môžu predložiť takéto vyhlásenie konečného používateľa. Všetky prijaté vyhlásenia starostlivo uchovávame a na požiadanie ich predložíme.
— Mám viac ako 18 rokov.`,

  requiredNote: 'Povinné polia',
  stillToComplete: (list) => `Zostáva vyplniť: ${list}.`,
  submitting: 'Odosiela sa…',
  submit: 'Odoslať vyhlásenie',
  footer: 'Tento dokument je právne záväzný. Všetky poskytnuté údaje môžu byť overené.',

  missing: {
    email: 'platná e-mailová adresa',
    firstName: 'meno',
    lastName: 'priezvisko',
    orderNumber: 'číslo objednávky',
    buyerType: 'či ste súkromná osoba, alebo spoločnosť',
    companyName: 'názov spoločnosti',
    vatNumber: 'IČ DPH',
    street: 'ulica',
    zipCode: 'PSČ',
    place: 'obec',
    country: 'krajina',
    substance: 'názov látky',
    cas: 'číslo CAS',
    concentration: 'koncentrácia',
    intendedUse: 'zamýšľané použitie',
    identity: 'overenie totožnosti',
    terms: 'súhlas s podmienkami',
    robot: 'kontrola proti robotom',
  },

  successTitle: 'Vyhlásenie prijaté',
  successBody: 'Vaše vyhlásenie konečného používateľa bolo odoslané. E-mailom dostanete potvrdenie a ďalšiu správu, keď bude posúdené.',
  successNote: 'Toto potvrdenie si uschovajte.',
  notFoundTitle: 'Formulár sa nenašiel',
  notFoundBody: 'Na tejto adrese nie je žiadny formulár. Skontrolujte odkaz.',
  notReadyTitle: 'Formulár zatiaľ nie je k dispozícii',
  notReadyBody: 'Tento formulár zatiaľ neprijíma vyhlásenia. Skúste to neskôr.',
  contactSupplier: 'Ak ste odkaz dostali od dodávateľa, obráťte sa naň so žiadosťou o pomoc.',

  errVerifyExpired: 'Vaša relácia overenia vypršala. Spustite ju znova.',
  errVerifyStart: 'Overenie totožnosti sa nepodarilo spustiť. Skúste to znova.',
  errIncomplete: (list) => `Najprv vyplňte formulár. Chýba: ${list}.`,
  errIdUnavailable: 'Overenie totožnosti je dočasne nedostupné, preto tento formulár teraz nie je možné odoslať.',
  errRateLimited: 'Z tohto pripojenia bolo príliš veľa pokusov. Počkajte niekoľko minút a skúste to znova.',
  errGeneric: 'Niečo sa pokazilo. Skúste to znova.',

  server: {
    TERMS_REQUIRED: 'Musíte súhlasiť s podmienkami.',
    FIELD_TOO_LONG: 'Jedno z polí je príliš dlhé. Skráťte ho a skúste to znova.',
    INVALID_EMAIL: 'Zadajte platnú e-mailovú adresu.',
    FORM_NOT_OPEN: 'Tento formulár zatiaľ neprijíma vyhlásenia.',
    FIELD_REQUIRED: 'Povinné pole je prázdne. Vyplňte všetky polia označené *.',
    BUYER_TYPE_REQUIRED: 'Zvoľte, či ste súkromná osoba, alebo spoločnosť.',
    COMPANY_NAME_REQUIRED: 'Zadajte názov svojej spoločnosti.',
    VAT_REQUIRED: 'Zadajte svoje IČ DPH.',
    ID_UNAVAILABLE: 'Overenie totožnosti je dočasne nedostupné. Skúste to neskôr.',
    ID_REQUIRED: 'Najprv dokončite overenie totožnosti.',
    ID_EXPIRED: 'Vaše overenie totožnosti vypršalo alebo už bolo použité. Spustite ho znova.',
    ID_UNCONFIRMED: 'Vaše overenie totožnosti sa nepodarilo potvrdiť. Skúste to znova.',
    ID_UNFINISHED: 'Vaše overenie totožnosti ešte nie je dokončené. Dokončite ho a skúste to znova.',
    ID_DOCUMENT_TYPE: 'Prijímajú sa len cestovné pasy a občianske preukazy.',
    UNDER_AGE: 'Na podanie vyhlásenia konečného používateľa musíte mať aspoň 18 rokov.',
    BOT_CHECK_MISSING: 'Dokončite kontrolu proti robotom a skúste to znova.',
    BOT_CHECK_ERROR: 'Kontrolu proti robotom sa nepodarilo dokončiť. Skúste to znova.',
    BOT_CHECK_FAILED: 'Kontrola proti robotom neprešla. Skúste to znova.',
  },

  poweredBy: 'Prevádzkuje',
  howItWorksLink: 'Ako to funguje?',

  vcDocTitle: 'Overenie dokončené',
  vcTitle: 'Overenie skončilo',
  vcBody: 'Toto okno môžete zavrieť a vrátiť sa k formuláru. Aktualizuje sa sám.',
};

export default sk;
