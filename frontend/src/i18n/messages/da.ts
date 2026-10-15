// Dansk. ANNEX IV-udtryk ordret fra den danske udgave af forordning (EU)
// 2019/1148, bilag IV. Regler: se en.ts.
import type { Messages } from './en.ts';

const da: Messages = {
  docTitle: 'Slutbrugererklæring',
  docTitleCompany: (company) => `${company} — Erklæring`,
  badge: 'Officielt dokument',
  title: 'Slutbrugererklæring',
  subtitle: 'Kemiske stoffer — erklæring om reguleret anvendelse',
  submittedTo: (company) => `Indsendes til ${company}`,
  themeToggle: 'Lyst eller mørkt',

  language: 'Sprog',
  languageSearch: 'Søg efter sprog',
  languageNone: 'Intet sprog fundet',
  languageSuggested: 'Forslag',
  languageAll: 'Alle sprog',

  secBuyerType: 'Type køber',
  secContact: 'Kontaktoplysninger',
  secCompany: 'Virksomhedsoplysninger',
  secAddress: 'Adresse',
  secSubstance: 'Oplysninger om stoffet',
  secIdentity: 'Identitetskontrol',
  secTerms: 'Vilkår',

  buyerTypeQuestion: 'Bestiller du som privatperson eller på vegne af en virksomhed?',
  buyerIndividual: 'Privatperson',
  buyerCompany: 'Virksomhed',

  optional: '(valgfrit)',
  email: 'E-mail',
  orderNumber: 'Ordrenummer',
  firstName: 'Fornavn',
  lastName: 'Efternavn',
  companyName: 'Virksomhedens navn',
  vatNumber: 'Momsnummer',
  vatHint: 'Kræves til EU’s VIES-kontrol, f.eks. DK12345678',
  street: 'Vej og husnummer',
  zipCode: 'Postnummer',
  place: 'By',
  country: 'Land',
  countrySelect: '— Vælg —',
  substanceName: 'Stoffets/stoffernes navn',
  casNo: 'CAS-nr.',
  concentration: 'Koncentration',
  concentrationHint: 'Som angivet på etiketten, f.eks. 15 % w/w. De lovbestemte grænser for prækursorer afhænger af den.',
  intendedUse: 'Påtænkt anvendelse',
  intendedUseHint: 'Beskriv, hvad du vil bruge stoffet til.',

  idNote:
    'Dit pas eller identitetskort kontrolleres af Didit, vores udbyder af identitetskontrol. '
    + 'Der åbnes et sikkert vindue, hvor du fotograferer dit dokument og tager en kort selfie. '
    + 'Billederne bliver hos Didit — denne formular modtager eller gemmer dem aldrig. Kun resultatet '
    + 'og oplysningerne, der står trykt på dit dokument, gemmes.',
  idUnavailableTitle: 'Identitetskontrollen er midlertidigt utilgængelig',
  idUnavailableNote: (seller) =>
    `Formularen kræver den og kan derfor ikke sendes lige nu. Prøv igen senere, eller kontakt sælgeren${seller ? ` (${seller})` : ''}.`,
  fillFirst: (list) => `Udfyld først resten af formularen, og bekræft derefter din identitet. Mangler: ${list}.`,
  verifyButton: 'Bekræft min identitet',
  verifyOpening: 'Åbner sikker kontrol…',
  verifyWaiting: 'Venter på, at du gennemfører kontrollen…',
  verifyWaitingHint: 'Gennemfør trinene i kontrolvinduet, og vend derefter tilbage hertil. Siden opdaterer sig selv.',
  verifyBlocked: 'Din browser blokerede kontrolvinduet.',
  verifyBlockedLink: 'Åbn det i en ny fane',
  verifyRestart: 'Lukket vinduet? Start forfra',
  verified: 'Identitet bekræftet',
  verifyInReview: 'Dit dokument kontrolleres manuelt. Du kan allerede sende formularen — sælgeren ser resultatet.',
  verifyFailedTitle: 'Kontrollen blev ikke bestået',
  verifyFailedNote: 'Du kan stadig sende formularen. Sælgeren gennemgår den så manuelt.',
  verifyTryAgain: 'Prøv igen',

  termsIntro: (seller) => `Sælgerens vilkår${seller ? ` (${seller})` : ''}:`,
  termsReadLink: (seller) => `Læs sælgerens vilkår${seller ? ` (${seller})` : ''}`,
  termsAsWritten: () => 'Vilkårene er fastsat af sælgeren og vises, som de er skrevet.',
  agree: 'Jeg har læst og accepterer ovenstående vilkår',
  defaultTerms: `Jeg bekræfter hermed, at:
— Stofferne, præparaterne og produkterne kun anvendes på en tilladt måde (i overensstemmelse med europæisk og national lovgivning) og kun til forsknings-, videnskabelige og undervisningsformål.

Det eller de bestilte stoffer:
— Ikke anvendes til fremstilling af narkotika og/eller psykotrope stoffer eller som bestanddel eller mellemprodukt heraf.
— Ikke anvendes i lægemidler til mennesker eller dyr, i landbrug, fødevarer eller kosmetik, undtagen som råstof, hjælpe- eller driftsmiddel og/eller som forsknings- og analysereagens.
— Ikke anvendes til udvikling eller fremstilling af kemiske våben.
— Ikke vil blive anvendt til militære eller ulovlige formål.
— Ikke reeksporteres til tredjelande uden forudgående samtykke fra eksportkontrolmyndighederne.
— Ikke vil blive reeksporteret/eksporteret, videresolgt nationalt eller internationalt eller overført til en destination, der er omfattet af en embargo fra EU, FN eller USA, hvis dette ville stride mod betingelserne for denne embargo.
— Kun leveres til kunder, der ligeledes kan fremlægge en sådan slutbrugererklæring. Vi opbevarer alle modtagne erklæringer omhyggeligt og fremlægger dem efter anmodning.
— Jeg er fyldt 18 år.`,

  requiredNote: 'Obligatoriske felter',
  stillToComplete: (list) => `Mangler at blive udfyldt: ${list}.`,
  submitting: 'Sender…',
  submit: 'Send erklæringen',
  footer: 'Dette dokument er juridisk bindende. Alle afgivne oplysninger kan blive kontrolleret.',

  missing: {
    email: 'en gyldig e-mailadresse',
    firstName: 'fornavn',
    lastName: 'efternavn',
    orderNumber: 'ordrenummer',
    buyerType: 'om du er privatperson eller virksomhed',
    companyName: 'virksomhedens navn',
    vatNumber: 'momsnummer',
    street: 'vej',
    zipCode: 'postnummer',
    place: 'by',
    country: 'land',
    substance: 'stoffets navn',
    cas: 'CAS-nummer',
    concentration: 'koncentration',
    intendedUse: 'påtænkt anvendelse',
    identity: 'identitetskontrol',
    terms: 'accept af vilkårene',
    robot: 'robotkontrollen',
  },

  successTitle: 'Erklæringen er modtaget',
  successBody: 'Din slutbrugererklæring er sendt. Du modtager en bekræftelse pr. e-mail og en ny besked, når den er gennemgået.',
  successNote: 'Gem denne bekræftelse.',
  notFoundTitle: 'Formularen blev ikke fundet',
  notFoundBody: 'Der er ingen formular på denne adresse. Kontrollér linket.',
  notReadyTitle: 'Formularen er ikke tilgængelig endnu',
  notReadyBody: 'Formularen modtager ikke erklæringer endnu. Prøv igen senere.',
  contactSupplier: 'Hvis du har fået linket fra en leverandør, så kontakt dem for hjælp.',
  notFoundHome: 'Gå til forsiden',

  errVerifyExpired: 'Din kontrolsession er udløbet. Start den igen.',
  errVerifyStart: 'Identitetskontrollen kunne ikke startes. Prøv igen.',
  errIncomplete: (list) => `Udfyld først formularen. Mangler: ${list}.`,
  errIdUnavailable: 'Identitetskontrollen er midlertidigt utilgængelig, så formularen kan ikke sendes lige nu.',
  errRateLimited: 'For mange forsøg fra denne forbindelse. Vent et par minutter, og prøv igen.',
  errGeneric: 'Noget gik galt. Prøv igen.',

  server: {
    TERMS_REQUIRED: 'Du skal acceptere vilkårene.',
    FIELD_TOO_LONG: 'Et af felterne er for langt. Gør det kortere, og prøv igen.',
    INVALID_EMAIL: 'Angiv en gyldig e-mailadresse.',
    FORM_NOT_OPEN: 'Formularen modtager ikke erklæringer endnu.',
    FIELD_REQUIRED: 'Et obligatorisk felt er tomt. Udfyld alle felter markeret med *.',
    BUYER_TYPE_REQUIRED: 'Vælg, om du er privatperson eller virksomhed.',
    COMPANY_NAME_REQUIRED: 'Angiv virksomhedens navn.',
    VAT_REQUIRED: 'Angiv dit momsnummer.',
    ID_UNAVAILABLE: 'Identitetskontrollen er midlertidigt utilgængelig. Prøv igen senere.',
    ID_REQUIRED: 'Gennemfør først identitetskontrollen.',
    ID_EXPIRED: 'Din identitetskontrol er udløbet eller allerede brugt. Start den igen.',
    ID_UNCONFIRMED: 'Din identitetskontrol kunne ikke bekræftes. Prøv igen.',
    ID_UNFINISHED: 'Din identitetskontrol er ikke færdig endnu. Gennemfør den, og prøv igen.',
    ID_DOCUMENT_TYPE: 'Kun pas og identitetskort accepteres.',
    UNDER_AGE: 'Du skal være mindst 18 år for at indsende en slutbrugererklæring.',
    BOT_CHECK_MISSING: 'Gennemfør robotkontrollen, og prøv igen.',
    BOT_CHECK_ERROR: 'Robotkontrollen kunne ikke gennemføres. Prøv igen.',
    BOT_CHECK_FAILED: 'Robotkontrollen blev ikke bestået. Prøv igen.',
  },

  poweredBy: 'Leveret af',
  howItWorksLink: 'Hvordan fungerer det?',

  vcDocTitle: 'Kontrol gennemført',
  vcTitle: 'Kontrollen er afsluttet',
  vcBody: 'Du kan lukke dette vindue og gå tilbage til formularen. Den opdaterer sig selv.',
};

export default da;
