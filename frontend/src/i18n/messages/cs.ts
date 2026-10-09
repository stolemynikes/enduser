// Čeština. Výrazy ANNEX IV doslovně z české verze nařízení (EU) 2019/1148,
// příloha IV. Pravidla: viz en.ts.
import type { Messages } from './en.ts';

const cs: Messages = {
  docTitle: 'Prohlášení konečného uživatele',
  docTitleCompany: (company) => `${company} — Prohlášení`,
  badge: 'Úřední dokument',
  title: 'Prohlášení konečného uživatele',
  subtitle: 'Chemické látky — prohlášení o regulovaném použití',
  submittedTo: (company) => `Předkládá se: ${company}`,
  themeToggle: 'Světlý nebo tmavý',

  language: 'Jazyk',
  languageSearch: 'Hledat jazyk',
  languageNone: 'Žádný jazyk nenalezen',
  languageSuggested: 'Navrhované',
  languageAll: 'Všechny jazyky',

  secBuyerType: 'Typ kupujícího',
  secContact: 'Kontaktní údaje',
  secCompany: 'Údaje o společnosti',
  secAddress: 'Adresa',
  secSubstance: 'Údaje o látce',
  secIdentity: 'Ověření totožnosti',
  secTerms: 'Podmínky',

  buyerTypeQuestion: 'Objednáváte jako soukromá osoba, nebo jménem společnosti?',
  buyerIndividual: 'Soukromá osoba',
  buyerCompany: 'Společnost',

  optional: '(nepovinné)',
  email: 'E-mail',
  orderNumber: 'Číslo objednávky',
  firstName: 'Jméno',
  lastName: 'Příjmení',
  companyName: 'Název společnosti',
  vatNumber: 'DIČ',
  vatHint: 'Potřebné pro ověření v systému EU VIES, např. CZ12345678',
  street: 'Ulice a číslo',
  zipCode: 'PSČ',
  place: 'Obec',
  country: 'Země',
  countrySelect: '— Vyberte —',
  substanceName: 'Název látky (látek)',
  casNo: 'Číslo CAS',
  concentration: 'Koncentrace',
  concentrationHint: 'Jak je uvedeno na etiketě, např. 15 % hm. Zákonné limity pro prekursory na ní závisí.',
  intendedUse: 'Zamýšlené použití',
  intendedUseHint: 'Popište, k čemu budete látku používat.',

  idNote:
    'Váš cestovní pas nebo občanský průkaz ověřuje Didit, náš poskytovatel ověření totožnosti. '
    + 'Otevře se zabezpečené okno, ve kterém vyfotografujete svůj doklad a pořídíte krátké selfie. '
    + 'Fotografie zůstávají u společnosti Didit — tento formulář je nikdy nepřijímá ani neukládá. Uchovává se pouze '
    + 'výsledek a údaje vytištěné na vašem dokladu.',
  idUnavailableTitle: 'Ověření totožnosti je dočasně nedostupné',
  idUnavailableNote: (seller) =>
    `Tento formulář je vyžaduje, a proto jej nyní nelze odeslat. Zkuste to prosím později nebo kontaktujte prodejce${seller ? ` (${seller})` : ''}.`,
  fillFirst: (list) => `Nejprve vyplňte zbytek formuláře a poté ověřte svou totožnost. Chybí: ${list}.`,
  verifyButton: 'Ověřit mou totožnost',
  verifyOpening: 'Otevírá se zabezpečené ověření…',
  verifyWaiting: 'Čeká se na dokončení ověření…',
  verifyWaitingHint: 'Dokončete kroky v okně ověření a poté se sem vraťte. Tato stránka se aktualizuje sama.',
  verifyBlocked: 'Váš prohlížeč zablokoval okno ověření.',
  verifyBlockedLink: 'Otevřít na nové kartě',
  verifyRestart: 'Zavřeli jste okno? Začít znovu',
  verified: 'Totožnost ověřena',
  verifyInReview: 'Váš doklad se kontroluje ručně. Formulář už můžete odeslat — prodejce uvidí výsledek.',
  verifyFailedTitle: 'Ověření neprošlo',
  verifyFailedNote: 'Formulář můžete přesto odeslat. Prodejce jej pak posoudí ručně.',
  verifyTryAgain: 'Zkusit znovu',

  termsIntro: (seller) => `Podmínky prodejce${seller ? ` (${seller})` : ''}:`,
  termsReadLink: (seller) => `Přečíst podmínky prodejce${seller ? ` (${seller})` : ''}`,
  termsAsWritten: () => 'Tyto podmínky stanovil prodejce a zobrazují se v původním znění.',
  agree: 'Přečetl(a) jsem si výše uvedené podmínky a souhlasím s nimi',
  defaultTerms: `Tímto potvrzuji, že:
— Látky, přípravky a výrobky se používají pouze povoleným způsobem (v souladu s evropskými a vnitrostátními právními předpisy) a pouze pro výzkumné, vědecké a vzdělávací účely.

Objednaná látka (látky):
— Se nepoužívá k výrobě omamných a/nebo psychotropních látek ani jako jejich složka či meziprodukt.
— Se nepoužívá v humánních ani veterinárních léčivých přípravcích, v zemědělství, potravinách ani kosmetice, s výjimkou použití jako surovina, pomocný nebo provozní materiál a/nebo jako výzkumné a analytické činidlo.
— Se nepoužívá k vývoji ani výrobě chemických zbraní.
— Nebude použita pro vojenské ani nezákonné účely.
— Nebude zpětně vyvezena do třetích zemí bez předchozího souhlasu orgánů pro kontrolu vývozu.
— Nebude zpětně vyvezena/vyvezena, dále prodána v tuzemsku ani v zahraničí ani převedena do místa určení, na které se vztahuje embargo EU, OSN nebo USA, pokud by to bylo v rozporu s podmínkami tohoto embarga.
— Je dodávána pouze zákazníkům, kteří rovněž mohou předložit takové prohlášení konečného uživatele. Všechna přijatá prohlášení pečlivě uchováváme a na požádání je předložíme.
— Je mi více než 18 let.`,

  requiredNote: 'Povinná pole',
  stillToComplete: (list) => `Zbývá vyplnit: ${list}.`,
  submitting: 'Odesílá se…',
  submit: 'Odeslat prohlášení',
  footer: 'Tento dokument je právně závazný. Všechny poskytnuté údaje mohou být ověřeny.',

  missing: {
    email: 'platná e-mailová adresa',
    firstName: 'jméno',
    lastName: 'příjmení',
    orderNumber: 'číslo objednávky',
    buyerType: 'zda jste soukromá osoba, nebo společnost',
    companyName: 'název společnosti',
    vatNumber: 'DIČ',
    street: 'ulice',
    zipCode: 'PSČ',
    place: 'obec',
    country: 'země',
    substance: 'název látky',
    cas: 'číslo CAS',
    concentration: 'koncentrace',
    intendedUse: 'zamýšlené použití',
    identity: 'ověření totožnosti',
    terms: 'souhlas s podmínkami',
    robot: 'kontrola proti robotům',
  },

  successTitle: 'Prohlášení přijato',
  successBody: 'Vaše prohlášení konečného uživatele bylo odesláno. E-mailem obdržíte potvrzení a další zprávu, jakmile bude posouzeno.',
  successNote: 'Toto potvrzení si uschovejte.',
  notFoundTitle: 'Formulář nenalezen',
  notFoundBody: 'Na této adrese není žádný formulář. Zkontrolujte prosím odkaz.',
  notReadyTitle: 'Formulář zatím není k dispozici',
  notReadyBody: 'Tento formulář zatím nepřijímá prohlášení. Zkuste to prosím později.',
  contactSupplier: 'Pokud jste odkaz dostali od dodavatele, obraťte se na něj s žádostí o pomoc.',

  errVerifyExpired: 'Vaše relace ověření vypršela. Spusťte ji prosím znovu.',
  errVerifyStart: 'Ověření totožnosti se nepodařilo spustit. Zkuste to prosím znovu.',
  errIncomplete: (list) => `Nejprve prosím vyplňte formulář. Chybí: ${list}.`,
  errIdUnavailable: 'Ověření totožnosti je dočasně nedostupné, a proto tento formulář nyní nelze odeslat.',
  errRateLimited: 'Z tohoto připojení bylo příliš mnoho pokusů. Počkejte několik minut a zkuste to znovu.',
  errGeneric: 'Něco se nepovedlo. Zkuste to prosím znovu.',

  server: {
    TERMS_REQUIRED: 'Musíte souhlasit s podmínkami.',
    FIELD_TOO_LONG: 'Jedno z polí je příliš dlouhé. Zkraťte je a zkuste to znovu.',
    INVALID_EMAIL: 'Zadejte prosím platnou e-mailovou adresu.',
    FORM_NOT_OPEN: 'Tento formulář zatím nepřijímá prohlášení.',
    FIELD_REQUIRED: 'Povinné pole je prázdné. Vyplňte všechna pole označená *.',
    BUYER_TYPE_REQUIRED: 'Zvolte prosím, zda jste soukromá osoba, nebo společnost.',
    COMPANY_NAME_REQUIRED: 'Zadejte prosím název své společnosti.',
    VAT_REQUIRED: 'Zadejte prosím své DIČ.',
    ID_UNAVAILABLE: 'Ověření totožnosti je dočasně nedostupné. Zkuste to prosím později.',
    ID_REQUIRED: 'Nejprve prosím dokončete ověření totožnosti.',
    ID_EXPIRED: 'Vaše ověření totožnosti vypršelo nebo již bylo použito. Spusťte je prosím znovu.',
    ID_UNCONFIRMED: 'Vaše ověření totožnosti se nepodařilo potvrdit. Zkuste to prosím znovu.',
    ID_UNFINISHED: 'Vaše ověření totožnosti ještě není dokončeno. Dokončete je a zkuste to znovu.',
    ID_DOCUMENT_TYPE: 'Přijímají se pouze cestovní pasy a občanské průkazy.',
    UNDER_AGE: 'K podání prohlášení konečného uživatele vám musí být alespoň 18 let.',
    BOT_CHECK_MISSING: 'Dokončete prosím kontrolu proti robotům a zkuste to znovu.',
    BOT_CHECK_ERROR: 'Kontrolu proti robotům se nepodařilo dokončit. Zkuste to prosím znovu.',
    BOT_CHECK_FAILED: 'Kontrola proti robotům neprošla. Zkuste to prosím znovu.',
  },

  poweredBy: 'Provozuje',
  howItWorksLink: 'Jak to funguje?',

  vcDocTitle: 'Ověření dokončeno',
  vcTitle: 'Ověření skončilo',
  vcBody: 'Toto okno můžete zavřít a vrátit se k formuláři. Aktualizuje se sám.',
};

export default cs;
