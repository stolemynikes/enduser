// Slovenščina. Izrazi ANNEX IV dobesedno iz slovenske različice Uredbe (EU)
// 2019/1148, Priloga IV. Pravila: glej en.ts.
import type { Messages } from './en.ts';

const sl: Messages = {
  docTitle: 'Izjava končnega uporabnika',
  docTitleCompany: (company) => `${company} — Izjava`,
  badge: 'Uradni dokument',
  title: 'Izjava končnega uporabnika',
  subtitle: 'Kemične snovi — izjava o regulirani uporabi',
  submittedTo: (company) => `Predloženo: ${company}`,
  themeToggle: 'Svetlo ali temno',

  language: 'Jezik',
  languageSearch: 'Iskanje jezika',
  languageNone: 'Ni najdenega jezika',
  languageSuggested: 'Predlagani',
  languageAll: 'Vsi jeziki',

  secBuyerType: 'Vrsta kupca',
  secContact: 'Kontaktni podatki',
  secCompany: 'Podatki o podjetju',
  secAddress: 'Naslov',
  secSubstance: 'Podatki o snovi',
  secIdentity: 'Preverjanje istovetnosti',
  secTerms: 'Pogoji',

  buyerTypeQuestion: 'Ali naročate kot zasebnik ali v imenu podjetja?',
  buyerIndividual: 'Zasebnik',
  buyerCompany: 'Podjetje',

  optional: '(neobvezno)',
  email: 'E-pošta',
  orderNumber: 'Številka naročila',
  firstName: 'Ime',
  lastName: 'Priimek',
  companyName: 'Ime podjetja',
  vatNumber: 'Identifikacijska številka za DDV',
  vatHint: 'Potrebna za preverjanje v sistemu EU VIES, npr. SI12345678',
  street: 'Ulica in hišna številka',
  zipCode: 'Poštna številka',
  place: 'Kraj',
  country: 'Država',
  countrySelect: '— Izberite —',
  substanceName: 'Ime snovi',
  casNo: 'Št. CAS',
  concentration: 'Koncentracija',
  concentrationHint: 'Kot je navedena na etiketi, npr. 15 % m/m. Od nje so odvisne zakonske mejne vrednosti za predhodne sestavine.',
  intendedUse: 'Namen uporabe',
  intendedUseHint: 'Opišite, za kaj boste snov uporabljali.',

  idNote:
    'Vaš potni list ali osebno izkaznico preveri Didit, naš ponudnik preverjanja istovetnosti. '
    + 'Odpre se varno okno, v katerem fotografirate svoj dokument in posnamete kratek selfi. '
    + 'Fotografije ostanejo pri Diditu — ta obrazec jih nikoli ne prejme ali shrani. Hranita se le '
    + 'izid in podatki, natisnjeni na vašem dokumentu.',
  idUnavailableTitle: 'Preverjanje istovetnosti začasno ni na voljo',
  idUnavailableNote: (seller) =>
    `Ta obrazec ga zahteva, zato ga trenutno ni mogoče poslati. Poskusite znova pozneje ali se obrnite na prodajalca${seller ? ` (${seller})` : ''}.`,
  fillFirst: (list) => `Najprej izpolnite preostanek obrazca, nato potrdite svojo istovetnost. Manjka: ${list}.`,
  verifyButton: 'Potrdi mojo istovetnost',
  verifyOpening: 'Odpiranje varnega preverjanja…',
  verifyWaiting: 'Čakanje, da zaključite preverjanje…',
  verifyWaitingHint: 'Opravite korake v oknu za preverjanje in se nato vrnite sem. Ta stran se posodobi sama.',
  verifyBlocked: 'Vaš brskalnik je blokiral okno za preverjanje.',
  verifyBlockedLink: 'Odpri v novem zavihku',
  verifyRestart: 'Ste zaprli okno? Začni znova',
  verified: 'Istovetnost potrjena',
  verifyInReview: 'Vaš dokument se preverja ročno. Obrazec lahko že pošljete — prodajalec bo videl izid.',
  verifyFailedTitle: 'Preverjanje ni uspelo',
  verifyFailedNote: 'Obrazec lahko kljub temu pošljete. Prodajalec ga bo nato pregledal ročno.',
  verifyTryAgain: 'Poskusi znova',

  termsIntro: (seller) => `Pogoji prodajalca${seller ? ` (${seller})` : ''}:`,
  termsReadLink: (seller) => `Preberite pogoje prodajalca${seller ? ` (${seller})` : ''}`,
  termsAsWritten: () => 'Te pogoje je določil prodajalec in so prikazani v izvirnem besedilu.',
  agree: 'Prebral(-a) sem zgornje pogoje in se z njimi strinjam',
  defaultTerms: `S tem potrjujem, da:
— Se snovi, pripravki in izdelki uporabljajo le na dovoljen način (v skladu z evropsko in nacionalno zakonodajo) in le za raziskovalne, znanstvene in izobraževalne namene.

Naročena snov oziroma snovi:
— Se ne uporabljajo za proizvodnjo prepovedanih drog in/ali psihotropnih snovi ali kot njihova sestavina ali vmesni proizvod.
— Se ne uporabljajo v zdravilih za uporabo v humani ali veterinarski medicini, v kmetijstvu, živilih ali kozmetiki, razen kot surovina, pomožni ali procesni material in/ali kot raziskovalni in analitski reagent.
— Se ne uporabljajo za razvoj ali proizvodnjo kemičnega orožja.
— Se ne bodo uporabljale v vojaške ali nezakonite namene.
— Se brez predhodnega soglasja organov za nadzor izvoza ne ponovno izvažajo v tretje države.
— Se ne bodo ponovno izvažale/izvažale, nadalje prodajale doma ali v tujini ali prenašale v namembni kraj, za katerega velja embargo EU, OZN ali ZDA, če bi bilo to v nasprotju s pogoji tega embarga.
— Se dobavljajo le strankam, ki lahko prav tako predložijo takšno izjavo končnega uporabnika. Vse prejete izjave skrbno hranimo in jih na zahtevo predložimo.
— Sem starejši (-a) od 18 let.`,

  requiredNote: 'Obvezna polja',
  stillToComplete: (list) => `Še za izpolniti: ${list}.`,
  submitting: 'Pošiljanje…',
  submit: 'Pošlji izjavo',
  footer: 'Ta dokument je pravno zavezujoč. Vsi navedeni podatki se lahko preverijo.',

  missing: {
    email: 'veljaven e-poštni naslov',
    firstName: 'ime',
    lastName: 'priimek',
    orderNumber: 'številka naročila',
    buyerType: 'ali ste zasebnik ali podjetje',
    companyName: 'ime podjetja',
    vatNumber: 'identifikacijska številka za DDV',
    street: 'ulica',
    zipCode: 'poštna številka',
    place: 'kraj',
    country: 'država',
    substance: 'ime snovi',
    cas: 'številka CAS',
    concentration: 'koncentracija',
    intendedUse: 'namen uporabe',
    identity: 'preverjanje istovetnosti',
    terms: 'strinjanje s pogoji',
    robot: 'preverjanje proti robotom',
  },

  successTitle: 'Izjava prejeta',
  successBody: 'Vaša izjava končnega uporabnika je bila poslana. Po e-pošti boste prejeli potrditev in še eno sporočilo, ko bo pregledana.',
  successNote: 'To potrditev shranite.',
  notFoundTitle: 'Obrazca ni mogoče najti',
  notFoundBody: 'Na tem naslovu ni obrazca. Preverite povezavo.',
  notReadyTitle: 'Obrazec še ni na voljo',
  notReadyBody: 'Ta obrazec še ne sprejema izjav. Poskusite znova pozneje.',
  contactSupplier: 'Če ste povezavo prejeli od dobavitelja, se za pomoč obrnite nanj.',
  notFoundHome: 'Na domačo stran',

  errVerifyExpired: 'Vaša seja preverjanja je potekla. Začnite znova.',
  errVerifyStart: 'Preverjanja istovetnosti ni bilo mogoče začeti. Poskusite znova.',
  errIncomplete: (list) => `Najprej izpolnite obrazec. Manjka: ${list}.`,
  errIdUnavailable: 'Preverjanje istovetnosti začasno ni na voljo, zato tega obrazca trenutno ni mogoče poslati.',
  errRateLimited: 'Iz te povezave je bilo preveč poskusov. Počakajte nekaj minut in poskusite znova.',
  errGeneric: 'Prišlo je do napake. Poskusite znova.',

  server: {
    TERMS_REQUIRED: 'Strinjati se morate s pogoji.',
    FIELD_TOO_LONG: 'Eno od polj je predolgo. Skrajšajte ga in poskusite znova.',
    INVALID_EMAIL: 'Vnesite veljaven e-poštni naslov.',
    FORM_NOT_OPEN: 'Ta obrazec še ne sprejema izjav.',
    FIELD_REQUIRED: 'Obvezno polje je prazno. Izpolnite vsa polja, označena z *.',
    BUYER_TYPE_REQUIRED: 'Izberite, ali ste zasebnik ali podjetje.',
    COMPANY_NAME_REQUIRED: 'Vnesite ime svojega podjetja.',
    VAT_REQUIRED: 'Vnesite svojo identifikacijsko številko za DDV.',
    ID_UNAVAILABLE: 'Preverjanje istovetnosti začasno ni na voljo. Poskusite znova pozneje.',
    ID_REQUIRED: 'Najprej zaključite preverjanje istovetnosti.',
    ID_EXPIRED: 'Vaše preverjanje istovetnosti je poteklo ali je bilo že uporabljeno. Začnite znova.',
    ID_UNCONFIRMED: 'Vašega preverjanja istovetnosti ni bilo mogoče potrditi. Poskusite znova.',
    ID_UNFINISHED: 'Vaše preverjanje istovetnosti še ni zaključeno. Zaključite ga in poskusite znova.',
    ID_DOCUMENT_TYPE: 'Sprejemamo le potne liste in osebne izkaznice.',
    UNDER_AGE: 'Za predložitev izjave končnega uporabnika morate imeti vsaj 18 let.',
    BOT_CHECK_MISSING: 'Zaključite preverjanje proti robotom in poskusite znova.',
    BOT_CHECK_ERROR: 'Preverjanja proti robotom ni bilo mogoče zaključiti. Poskusite znova.',
    BOT_CHECK_FAILED: 'Preverjanje proti robotom ni uspelo. Poskusite znova.',
  },

  poweredBy: 'Omogoča',
  howItWorksLink: 'Kako to deluje?',

  vcDocTitle: 'Preverjanje zaključeno',
  vcTitle: 'Preverjanje je končano',
  vcBody: 'To okno lahko zaprete in se vrnete na obrazec. Posodobi se sam.',
};

export default sl;
