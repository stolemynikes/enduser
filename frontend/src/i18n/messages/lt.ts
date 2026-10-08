// Lietuvių. ANNEX IV terminai pažodžiui iš Reglamento (ES) 2019/1148 lietuvių
// kalbos versijos IV priedo. Taisyklės: žr. en.ts.
import type { Messages } from './en.ts';

const lt: Messages = {
  docTitle: 'Galutinio naudotojo deklaracija',
  docTitleCompany: (company) => `${company} — Deklaracija`,
  badge: 'Oficialus dokumentas',
  title: 'Galutinio naudotojo deklaracija',
  subtitle: 'Cheminės medžiagos — reglamentuojamo naudojimo deklaracija',
  submittedTo: (company) => `Teikiama: ${company}`,
  themeToggle: 'Šviesus ar tamsus',

  language: 'Kalba',
  languageSearch: 'Ieškoti kalbos',
  languageNone: 'Kalba nerasta',
  languageSuggested: 'Siūlomos',
  languageAll: 'Visos kalbos',

  secBuyerType: 'Pirkėjo tipas',
  secContact: 'Kontaktiniai duomenys',
  secCompany: 'Įmonės duomenys',
  secAddress: 'Adresas',
  secSubstance: 'Medžiagos duomenys',
  secIdentity: 'Tapatybės patikrinimas',
  secTerms: 'Sąlygos',

  buyerTypeQuestion: 'Užsakote kaip fizinis asmuo ar įmonės vardu?',
  buyerIndividual: 'Fizinis asmuo',
  buyerCompany: 'Įmonė',

  optional: '(neprivaloma)',
  email: 'El. paštas',
  orderNumber: 'Užsakymo numeris',
  firstName: 'Vardas',
  lastName: 'Pavardė',
  companyName: 'Įmonės pavadinimas',
  vatNumber: 'PVM mokėtojo kodas',
  vatHint: 'Reikalingas ES VIES patikrai, pvz., LT123456789',
  street: 'Gatvė ir namo numeris',
  zipCode: 'Pašto kodas',
  place: 'Miestas ar gyvenvietė',
  country: 'Šalis',
  countrySelect: '— Pasirinkite —',
  substanceName: 'Medžiagos (-ų) pavadinimas',
  casNo: 'CAS Nr.',
  concentration: 'Koncentracija',
  concentrationHint: 'Kaip nurodyta etiketėje, pvz., 15 % w/w. Nuo jos priklauso teisės aktuose nustatytos pirmtakų ribos.',
  intendedUse: 'Planuojamas naudojimas',
  intendedUseHint: 'Aprašykite, kam naudosite medžiagą.',

  idNote:
    'Jūsų pasą ar asmens tapatybės kortelę tikrina „Didit“ — mūsų tapatybės patikrinimo paslaugų teikėjas. '
    + 'Atsidaro saugus langas, kuriame nufotografuojate dokumentą ir trumpai nusifotografuojate. '
    + 'Nuotraukos lieka „Didit“ — ši forma niekada jų negauna ir nesaugo. Saugomas tik '
    + 'rezultatas ir jūsų dokumente išspausdinti duomenys.',
  idUnavailableTitle: 'Tapatybės patikrinimas laikinai neprieinamas',
  idUnavailableNote: (seller) =>
    `Ši forma jo reikalauja, todėl dabar jos išsiųsti negalima. Bandykite vėliau arba kreipkitės į pardavėją${seller ? ` (${seller})` : ''}.`,
  fillFirst: (list) => `Pirmiausia užpildykite likusią formos dalį, tada patvirtinkite tapatybę. Trūksta: ${list}.`,
  verifyButton: 'Patvirtinti mano tapatybę',
  verifyOpening: 'Atidaromas saugus patikrinimas…',
  verifyWaiting: 'Laukiama, kol baigsite patikrinimą…',
  verifyWaitingHint: 'Atlikite veiksmus patikrinimo lange ir grįžkite čia. Šis puslapis atsinaujina pats.',
  verifyBlocked: 'Jūsų naršyklė užblokavo patikrinimo langą.',
  verifyBlockedLink: 'Atidaryti naujame skirtuke',
  verifyRestart: 'Uždarėte langą? Pradėti iš naujo',
  verified: 'Tapatybė patvirtinta',
  verifyInReview: 'Jūsų dokumentas tikrinamas rankiniu būdu. Formą jau galite išsiųsti — pardavėjas matys rezultatą.',
  verifyFailedTitle: 'Patikrinimas nepavyko',
  verifyFailedNote: 'Formą vis tiek galite išsiųsti. Pardavėjas ją peržiūrės rankiniu būdu.',
  verifyTryAgain: 'Bandyti dar kartą',

  termsIntro: (seller) => `Pardavėjo sąlygos${seller ? ` (${seller})` : ''}:`,
  termsReadLink: (seller) => `Skaityti pardavėjo sąlygas${seller ? ` (${seller})` : ''}`,
  termsAsWritten: () => 'Šias sąlygas nustatė pardavėjas, jos rodomos originalia redakcija.',
  agree: 'Perskaičiau pirmiau pateiktas sąlygas ir su jomis sutinku',
  defaultTerms: `Šiuo patvirtinu, kad:
— Medžiagos, preparatai ir produktai naudojami tik leistinu būdu (laikantis Europos ir nacionalinės teisės aktų) ir tik moksliniais tyrimų, mokslo ir švietimo tikslais.

Užsakyta (-os) medžiaga (-os):
— Nenaudojama (-os) narkotinėms ir (arba) psichotropinėms medžiagoms gaminti, taip pat kaip jų sudedamoji dalis ar tarpinis produktas.
— Nenaudojama (-os) žmonėms ar gyvūnams skirtuose vaistuose, žemės ūkyje, maisto produktuose ar kosmetikoje, išskyrus kaip žaliava, pagalbinė ar technologinė medžiaga ir (arba) kaip tyrimų ir analizės reagentas.
— Nenaudojama (-os) cheminiams ginklams kurti ar gaminti.
— Nebus naudojama (-os) kariniais ar neteisėtais tikslais.
— Be išankstinio eksporto kontrolės institucijų sutikimo nereeksportuojama (-os) į trečiąsias šalis.
— Nebus reeksportuojama (-os) / eksportuojama (-os), perparduodama (-os) šalies viduje ar tarptautiniu mastu ar perduodama (-os) į paskirties vietą, kuriai taikomas ES, JT ar JAV embargas, jei tai prieštarautų to embargo sąlygoms.
— Tiekiama (-os) tik klientams, kurie taip pat gali pateikti tokią galutinio naudotojo deklaraciją. Visas gautas deklaracijas kruopščiai saugome ir pateikiame paprašius.
— Man yra daugiau nei 18 metų.`,

  requiredNote: 'Privalomi laukai',
  stillToComplete: (list) => `Dar reikia užpildyti: ${list}.`,
  submitting: 'Siunčiama…',
  submit: 'Siųsti deklaraciją',
  footer: 'Šis dokumentas yra teisiškai privalomas. Visi pateikti duomenys gali būti patikrinti.',

  missing: {
    email: 'galiojantis el. pašto adresas',
    firstName: 'vardas',
    lastName: 'pavardė',
    orderNumber: 'užsakymo numeris',
    buyerType: 'ar esate fizinis asmuo, ar įmonė',
    companyName: 'įmonės pavadinimas',
    vatNumber: 'PVM mokėtojo kodas',
    street: 'gatvė',
    zipCode: 'pašto kodas',
    place: 'miestas ar gyvenvietė',
    country: 'šalis',
    substance: 'medžiagos pavadinimas',
    cas: 'CAS numeris',
    concentration: 'koncentracija',
    intendedUse: 'planuojamas naudojimas',
    identity: 'tapatybės patikrinimas',
    terms: 'sutikimas su sąlygomis',
    robot: 'apsaugos nuo robotų patikra',
  },

  successTitle: 'Deklaracija gauta',
  successBody: 'Jūsų galutinio naudotojo deklaracija išsiųsta. El. paštu gausite patvirtinimą ir dar vieną pranešimą, kai ji bus peržiūrėta.',
  successNote: 'Išsaugokite šį patvirtinimą.',
  notFoundTitle: 'Forma nerasta',
  notFoundBody: 'Šiuo adresu formos nėra. Patikrinkite nuorodą.',
  notReadyTitle: 'Forma dar neprieinama',
  notReadyBody: 'Ši forma dar nepriima deklaracijų. Bandykite vėliau.',
  contactSupplier: 'Jei šią nuorodą gavote iš tiekėjo, kreipkitės į jį pagalbos.',

  errVerifyExpired: 'Jūsų patikrinimo sesija baigėsi. Pradėkite iš naujo.',
  errVerifyStart: 'Nepavyko pradėti tapatybės patikrinimo. Bandykite dar kartą.',
  errIncomplete: (list) => `Pirmiausia užpildykite formą. Trūksta: ${list}.`,
  errIdUnavailable: 'Tapatybės patikrinimas laikinai neprieinamas, todėl šios formos dabar išsiųsti negalima.',
  errRateLimited: 'Per daug bandymų iš šio ryšio. Palaukite kelias minutes ir bandykite dar kartą.',
  errGeneric: 'Kažkas nepavyko. Bandykite dar kartą.',

  server: {
    TERMS_REQUIRED: 'Turite sutikti su sąlygomis.',
    FIELD_TOO_LONG: 'Vienas iš laukų per ilgas. Sutrumpinkite jį ir bandykite dar kartą.',
    INVALID_EMAIL: 'Įveskite galiojantį el. pašto adresą.',
    FORM_NOT_OPEN: 'Ši forma dar nepriima deklaracijų.',
    FIELD_REQUIRED: 'Privalomas laukas tuščias. Užpildykite visus * pažymėtus laukus.',
    BUYER_TYPE_REQUIRED: 'Pasirinkite, ar esate fizinis asmuo, ar įmonė.',
    COMPANY_NAME_REQUIRED: 'Įveskite savo įmonės pavadinimą.',
    VAT_REQUIRED: 'Įveskite savo PVM mokėtojo kodą.',
    ID_UNAVAILABLE: 'Tapatybės patikrinimas laikinai neprieinamas. Bandykite vėliau.',
    ID_REQUIRED: 'Pirmiausia užbaikite tapatybės patikrinimą.',
    ID_EXPIRED: 'Jūsų tapatybės patikrinimas baigėsi arba jau buvo panaudotas. Pradėkite iš naujo.',
    ID_UNCONFIRMED: 'Nepavyko patvirtinti jūsų tapatybės patikrinimo. Bandykite dar kartą.',
    ID_UNFINISHED: 'Jūsų tapatybės patikrinimas dar nebaigtas. Užbaikite jį ir bandykite dar kartą.',
    ID_DOCUMENT_TYPE: 'Priimami tik pasai ir asmens tapatybės kortelės.',
    UNDER_AGE: 'Norėdami pateikti galutinio naudotojo deklaraciją, turite būti ne jaunesni kaip 18 metų.',
    BOT_CHECK_MISSING: 'Užbaikite apsaugos nuo robotų patikrą ir bandykite dar kartą.',
    BOT_CHECK_ERROR: 'Nepavyko užbaigti apsaugos nuo robotų patikros. Bandykite dar kartą.',
    BOT_CHECK_FAILED: 'Apsaugos nuo robotų patikra nepavyko. Bandykite dar kartą.',
  },

  vcDocTitle: 'Patikrinimas atliktas',
  vcTitle: 'Patikrinimas baigtas',
  vcBody: 'Galite uždaryti šį langą ir grįžti prie formos. Ji atsinaujina pati.',
};

export default lt;
