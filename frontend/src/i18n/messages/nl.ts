// Nederlands. ANNEX IV-teksten letterlijk uit de Nederlandse versie van
// Verordening (EU) 2019/1148, bijlage IV. Zie en.ts voor de regels.
import type { Messages } from './en.ts';

const nl: Messages = {
  docTitle: 'Eindgebruikersverklaring',
  docTitleCompany: (company) => `${company} — Verklaring`,
  badge: 'Officieel document',
  title: 'Eindgebruikersverklaring',
  subtitle: 'Chemische stoffen — verklaring van gereguleerd gebruik',
  submittedTo: (company) => `Ingediend bij ${company}`,
  themeToggle: 'Licht of donker',

  language: 'Taal',
  languageSearch: 'Zoek een taal',
  languageNone: 'Geen taal gevonden',
  languageSuggested: 'Voorgesteld',
  languageAll: 'Alle talen',

  secBuyerType: 'Type koper',
  secContact: 'Contactgegevens',
  secCompany: 'Bedrijfsgegevens',
  secAddress: 'Adres',
  secSubstance: 'Gegevens van de stof',
  secIdentity: 'Identiteitscontrole',
  secTerms: 'Voorwaarden',

  buyerTypeQuestion: 'Bestelt u als particulier of namens een bedrijf?',
  buyerIndividual: 'Particulier',
  buyerCompany: 'Bedrijf',

  optional: '(optioneel)',
  email: 'E-mail',
  orderNumber: 'Ordernummer',
  firstName: 'Voornaam',
  lastName: 'Achternaam',
  companyName: 'Bedrijfsnaam',
  vatNumber: 'Btw-nummer',
  vatHint: 'Nodig voor de Europese VIES-controle, bijv. NL123456789B01',
  street: 'Straat en huisnummer',
  zipCode: 'Postcode',
  place: 'Plaats',
  country: 'Land',
  countrySelect: '— Kies —',
  substanceName: 'Naam van de stof(fen)',
  casNo: 'CAS-nr.',
  concentration: 'Concentratie',
  concentrationHint: 'Zoals op het etiket staat, bijv. 15% g/g. De wettelijke grenzen voor precursoren hangen hiervan af.',
  intendedUse: 'Beoogd gebruik',
  intendedUseHint: 'Beschrijf waarvoor u de stof gaat gebruiken.',

  idNote:
    'Uw paspoort of identiteitskaart wordt gecontroleerd door Didit, onze aanbieder van identiteitscontrole. '
    + 'Er opent een beveiligd venster waarin u uw document fotografeert en een korte selfie maakt. '
    + 'De foto’s blijven bij Didit — dit formulier ontvangt of bewaart ze nooit. Alleen de uitkomst '
    + 'en de gegevens die op uw document staan, worden bewaard.',
  idUnavailableTitle: 'Identiteitscontrole is tijdelijk niet beschikbaar',
  idUnavailableNote: (seller) =>
    `Dit formulier vereist die controle en kan daarom nu niet worden verzonden. Probeer het later opnieuw of neem contact op met ${seller ?? 'de verkoper'}.`,
  fillFirst: (list) => `Vul eerst de rest van het formulier in en verifieer daarna. Nog niet ingevuld: ${list}.`,
  verifyButton: 'Mijn identiteit verifiëren',
  verifyOpening: 'Beveiligde controle wordt geopend…',
  verifyWaiting: 'Wachten tot u de controle hebt afgerond…',
  verifyWaitingHint: 'Doorloop de stappen in het controlevenster en kom daarna hier terug. Deze pagina werkt zichzelf bij.',
  verifyBlocked: 'Uw browser heeft het controlevenster geblokkeerd.',
  verifyBlockedLink: 'Open het in een nieuw tabblad',
  verifyRestart: 'Venster gesloten? Opnieuw beginnen',
  verified: 'Identiteit geverifieerd',
  verifyInReview: 'Uw document wordt handmatig gecontroleerd. U kunt het formulier nu al verzenden — de verkoper ziet de uitkomst.',
  verifyFailedTitle: 'Controle niet geslaagd',
  verifyFailedNote: 'U kunt dit formulier toch verzenden. De verkoper beoordeelt het dan handmatig.',
  verifyTryAgain: 'Opnieuw proberen',

  termsIntro: (seller) => `Voorwaarden van ${seller ?? 'de verkoper'}:`,
  termsReadLink: (seller) => `Lees de voorwaarden van ${seller ?? 'de verkoper'}`,
  termsAsWritten: (seller) => `Deze voorwaarden zijn opgesteld door ${seller ?? 'de verkoper'} en worden getoond zoals ze zijn geschreven.`,
  agree: 'Ik heb de bovenstaande voorwaarden gelezen en ga ermee akkoord',
  defaultTerms: `Hierbij bevestig ik dat:
— De stoffen, preparaten en producten uitsluitend op een toegestane wijze worden gebruikt (in overeenstemming met de Europese en nationale wetgeving), en uitsluitend voor onderzoeks-, wetenschappelijke en onderwijsdoeleinden.

De bestelde stof(fen):
— Niet worden gebruikt voor de vervaardiging van, of als bestanddeel of tussenproduct van, verdovende middelen en/of psychotrope stoffen.
— Niet worden gebruikt in geneesmiddelen voor menselijk of diergeneeskundig gebruik, in de landbouw, in levensmiddelen of in cosmetica, behalve als grondstof, hulp- of verwerkingsmiddel en/of als onderzoeks- en analysereagens.
— Niet worden gebruikt voor de ontwikkeling of productie van chemische wapens.
— Niet zullen worden gebruikt voor militaire of illegale doeleinden.
— Niet zonder voorafgaande toestemming van de exportcontroleautoriteiten opnieuw worden uitgevoerd naar derde landen.
— Niet opnieuw worden uitgevoerd/uitgevoerd, of anderszins nationaal of internationaal worden doorverkocht of overgedragen naar een bestemming waarvoor een embargo van de EU, de VN of de VS geldt, indien dat in strijd zou zijn met de voorwaarden van dat embargo.
— Uitsluitend worden geleverd aan klanten die eveneens een dergelijke eindgebruikersverklaring kunnen overleggen. Wij bewaren alle ontvangen verklaringen zorgvuldig en leggen ze op verzoek over.
— Ik 18 jaar of ouder ben.`,

  requiredNote: 'Verplichte velden',
  stillToComplete: (list) => `Nog in te vullen: ${list}.`,
  submitting: 'Bezig met verzenden…',
  submit: 'Verklaring verzenden',
  footer: 'Dit document is juridisch bindend. Alle verstrekte gegevens kunnen worden gecontroleerd.',

  missing: {
    email: 'een geldig e-mailadres',
    firstName: 'voornaam',
    lastName: 'achternaam',
    orderNumber: 'ordernummer',
    buyerType: 'of u particulier of bedrijf bent',
    companyName: 'bedrijfsnaam',
    vatNumber: 'btw-nummer',
    street: 'straat',
    zipCode: 'postcode',
    place: 'plaats',
    country: 'land',
    substance: 'naam van de stof',
    cas: 'CAS-nummer',
    concentration: 'concentratie',
    intendedUse: 'beoogd gebruik',
    identity: 'identiteitscontrole',
    terms: 'akkoord met de voorwaarden',
    robot: 'de controle tegen robots',
  },

  successTitle: 'Verklaring ontvangen',
  successBody: 'Uw eindgebruikersverklaring is verzonden. U ontvangt een bevestiging per e-mail, en nog een bericht zodra de verklaring is beoordeeld.',
  successNote: 'Bewaar deze bevestiging voor uw administratie.',
  notFoundTitle: 'Formulier niet gevonden',
  notFoundBody: 'Op dit adres staat geen formulier. Controleer de link.',
  notReadyTitle: 'Formulier nog niet beschikbaar',
  notReadyBody: 'Dit formulier neemt nog geen verklaringen aan. Probeer het later opnieuw.',
  contactSupplier: 'Hebt u deze link van een leverancier gekregen? Neem dan contact met hen op.',

  errVerifyExpired: 'Uw controlesessie is verlopen. Start de controle opnieuw.',
  errVerifyStart: 'De identiteitscontrole kon niet worden gestart. Probeer het opnieuw.',
  errIncomplete: (list) => `Vul eerst het formulier volledig in. Nog niet ingevuld: ${list}.`,
  errIdUnavailable: 'De identiteitscontrole is tijdelijk niet beschikbaar, daarom kan dit formulier nu niet worden verzonden.',
  errRateLimited: 'Te veel pogingen vanaf deze verbinding. Wacht een paar minuten en probeer het opnieuw.',
  errGeneric: 'Er ging iets mis. Probeer het opnieuw.',

  server: {
    TERMS_REQUIRED: 'U moet akkoord gaan met de voorwaarden.',
    FIELD_TOO_LONG: 'Een van de velden is te lang. Maak het korter en probeer het opnieuw.',
    INVALID_EMAIL: 'Vul een geldig e-mailadres in.',
    FORM_NOT_OPEN: 'Dit formulier neemt nog geen verklaringen aan.',
    FIELD_REQUIRED: 'Een verplicht veld is leeg. Vul alle velden met een * in.',
    BUYER_TYPE_REQUIRED: 'Kies of u particulier of bedrijf bent.',
    COMPANY_NAME_REQUIRED: 'Vul uw bedrijfsnaam in.',
    VAT_REQUIRED: 'Vul uw btw-nummer in.',
    ID_UNAVAILABLE: 'De identiteitscontrole is tijdelijk niet beschikbaar. Probeer het later opnieuw.',
    ID_REQUIRED: 'Rond eerst de identiteitscontrole af.',
    ID_EXPIRED: 'Uw identiteitscontrole is verlopen of al gebruikt. Start de controle opnieuw.',
    ID_UNCONFIRMED: 'Uw identiteitscontrole kon niet worden bevestigd. Probeer het opnieuw.',
    ID_UNFINISHED: 'Uw identiteitscontrole is nog niet afgerond. Rond deze af en probeer het opnieuw.',
    ID_DOCUMENT_TYPE: 'Alleen paspoorten en identiteitskaarten worden geaccepteerd.',
    UNDER_AGE: 'U moet minimaal 18 jaar oud zijn om een eindgebruikersverklaring in te dienen.',
    BOT_CHECK_MISSING: 'Rond de controle tegen robots af en probeer het opnieuw.',
    BOT_CHECK_ERROR: 'De controle tegen robots kon niet worden afgerond. Probeer het opnieuw.',
    BOT_CHECK_FAILED: 'De controle tegen robots is niet geslaagd. Probeer het opnieuw.',
  },

  poweredBy: 'Mogelijk gemaakt door',
  howItWorksLink: 'Hoe werkt dit?',

  vcDocTitle: 'Controle voltooid',
  vcTitle: 'Controle afgerond',
  vcBody: 'U kunt dit venster sluiten en teruggaan naar het formulier. Het werkt zichzelf bij.',
};

export default nl;
