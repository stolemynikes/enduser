// Svenska. ANNEX IV-termer ordagrant ur den svenska versionen av
// förordning (EU) 2019/1148, bilaga IV. Regler: se en.ts.
import type { Messages } from './en.ts';

const sv: Messages = {
  docTitle: 'Slutanvändarintyg',
  docTitleCompany: (company) => `${company} — Intyg`,
  badge: 'Officiellt dokument',
  title: 'Slutanvändarintyg',
  subtitle: 'Kemiska ämnen — intyg om reglerad användning',
  submittedTo: (company) => `Lämnas till ${company}`,
  themeToggle: 'Ljust eller mörkt',

  language: 'Språk',
  languageSearch: 'Sök språk',
  languageNone: 'Inget språk hittades',
  languageSuggested: 'Förslag',
  languageAll: 'Alla språk',

  secBuyerType: 'Typ av köpare',
  secContact: 'Kontaktuppgifter',
  secCompany: 'Företagsuppgifter',
  secAddress: 'Adress',
  secSubstance: 'Uppgifter om ämnet',
  secIdentity: 'Identitetskontroll',
  secTerms: 'Villkor',

  buyerTypeQuestion: 'Beställer du som privatperson eller för ett företags räkning?',
  buyerIndividual: 'Privatperson',
  buyerCompany: 'Företag',

  optional: '(valfritt)',
  email: 'E-post',
  orderNumber: 'Ordernummer',
  firstName: 'Förnamn',
  lastName: 'Efternamn',
  companyName: 'Företagsnamn',
  vatNumber: 'Momsregistreringsnummer',
  vatHint: 'Behövs för EU-kontrollen i VIES, t.ex. SE123456789001',
  street: 'Gatuadress',
  zipCode: 'Postnummer',
  place: 'Ort',
  country: 'Land',
  countrySelect: '— Välj —',
  substanceName: 'Ämnets/ämnenas namn',
  casNo: 'CAS-nr',
  concentration: 'Koncentration',
  concentrationHint: 'Som det står på etiketten, t.ex. 15 % w/w. De lagliga gränserna för prekursorer beror på den.',
  intendedUse: 'Avsedd användning',
  intendedUseHint: 'Beskriv vad du ska använda ämnet till.',

  idNote:
    'Ditt pass eller id-kort kontrolleras av Didit, vår leverantör av identitetskontroll. '
    + 'Ett säkert fönster öppnas där du fotograferar ditt dokument och tar en kort selfie. '
    + 'Bilderna stannar hos Didit — det här formuläret tar aldrig emot eller sparar dem. Endast resultatet '
    + 'och uppgifterna som står tryckta på ditt dokument sparas.',
  idUnavailableTitle: 'Identitetskontrollen är tillfälligt otillgänglig',
  idUnavailableNote: (seller) =>
    `Formuläret kräver den och kan därför inte skickas just nu. Försök igen senare eller kontakta säljaren${seller ? ` (${seller})` : ''}.`,
  fillFirst: (list) => `Fyll först i resten av formuläret och verifiera sedan din identitet. Saknas: ${list}.`,
  verifyButton: 'Verifiera min identitet',
  verifyOpening: 'Öppnar säker kontroll…',
  verifyWaiting: 'Väntar på att du ska slutföra kontrollen…',
  verifyWaitingHint: 'Slutför stegen i kontrollfönstret och kom sedan tillbaka hit. Sidan uppdateras av sig själv.',
  verifyBlocked: 'Din webbläsare blockerade kontrollfönstret.',
  verifyBlockedLink: 'Öppna i en ny flik',
  verifyRestart: 'Stängt fönstret? Börja om',
  verified: 'Identitet verifierad',
  verifyInReview: 'Ditt dokument granskas manuellt. Du kan redan skicka formuläret — säljaren ser resultatet.',
  verifyFailedTitle: 'Kontrollen godkändes inte',
  verifyFailedNote: 'Du kan ändå skicka formuläret. Säljaren granskar det då manuellt.',
  verifyTryAgain: 'Försök igen',

  termsIntro: (seller) => `Säljarens villkor${seller ? ` (${seller})` : ''}:`,
  termsReadLink: (seller) => `Läs säljarens villkor${seller ? ` (${seller})` : ''}`,
  termsAsWritten: () => 'Villkoren är fastställda av säljaren och visas så som de skrivits.',
  agree: 'Jag har läst och godkänner villkoren ovan',
  defaultTerms: `Härmed bekräftar jag att:
— Ämnena, beredningarna och produkterna endast används på ett tillåtet sätt (i enlighet med europeisk och nationell lagstiftning) och endast för forsknings-, vetenskapliga och utbildningsändamål.

Det eller de beställda ämnena:
— Inte används för att tillverka narkotika och/eller psykotropa ämnen eller som beståndsdel eller mellanprodukt i sådana.
— Inte används i läkemedel för människor eller djur, inom jordbruk, i livsmedel eller i kosmetika, utom som råvara, hjälp- eller processmaterial och/eller som forsknings- och analysreagens.
— Inte används för att utveckla eller framställa kemiska vapen.
— Inte kommer att användas för militära eller olagliga ändamål.
— Inte återexporteras till tredjeländer utan föregående medgivande från exportkontrollmyndigheterna.
— Inte kommer att återexporteras/exporteras, säljas vidare nationellt eller internationellt eller överlåtas till en destination som omfattas av ett embargo från EU, FN eller USA, om detta skulle strida mot villkoren för embargot.
— Endast levereras till kunder som också kan lämna ett sådant slutanvändarintyg. Vi förvarar alla mottagna intyg omsorgsfullt och lämnar ut dem på begäran.
— Jag har fyllt 18 år.`,

  requiredNote: 'Obligatoriska fält',
  stillToComplete: (list) => `Återstår att fylla i: ${list}.`,
  submitting: 'Skickar…',
  submit: 'Skicka intyget',
  footer: 'Detta dokument är juridiskt bindande. Alla lämnade uppgifter kan komma att kontrolleras.',

  missing: {
    email: 'en giltig e-postadress',
    firstName: 'förnamn',
    lastName: 'efternamn',
    orderNumber: 'ordernummer',
    buyerType: 'om du är privatperson eller företag',
    companyName: 'företagsnamn',
    vatNumber: 'momsregistreringsnummer',
    street: 'gatuadress',
    zipCode: 'postnummer',
    place: 'ort',
    country: 'land',
    substance: 'ämnets namn',
    cas: 'CAS-nummer',
    concentration: 'koncentration',
    intendedUse: 'avsedd användning',
    identity: 'identitetskontroll',
    terms: 'godkännande av villkoren',
    robot: 'robotkontrollen',
  },

  successTitle: 'Intyget har tagits emot',
  successBody: 'Ditt slutanvändarintyg har skickats. Du får en bekräftelse via e-post och ett nytt meddelande när det har granskats.',
  successNote: 'Spara denna bekräftelse.',
  notFoundTitle: 'Formuläret hittades inte',
  notFoundBody: 'Det finns inget formulär på den här adressen. Kontrollera länken.',
  notReadyTitle: 'Formuläret är inte tillgängligt än',
  notReadyBody: 'Formuläret tar inte emot intyg än. Försök igen senare.',
  contactSupplier: 'Om du fick länken från en leverantör, kontakta dem för hjälp.',

  errVerifyExpired: 'Din kontrollsession har gått ut. Starta den igen.',
  errVerifyStart: 'Identitetskontrollen kunde inte startas. Försök igen.',
  errIncomplete: (list) => `Fyll först i formuläret. Saknas: ${list}.`,
  errIdUnavailable: 'Identitetskontrollen är tillfälligt otillgänglig, så formuläret kan inte skickas just nu.',
  errRateLimited: 'För många försök från den här anslutningen. Vänta några minuter och försök igen.',
  errGeneric: 'Något gick fel. Försök igen.',

  server: {
    TERMS_REQUIRED: 'Du måste godkänna villkoren.',
    FIELD_TOO_LONG: 'Ett av fälten är för långt. Korta det och försök igen.',
    INVALID_EMAIL: 'Ange en giltig e-postadress.',
    FORM_NOT_OPEN: 'Formuläret tar inte emot intyg än.',
    FIELD_REQUIRED: 'Ett obligatoriskt fält är tomt. Fyll i alla fält markerade med *.',
    BUYER_TYPE_REQUIRED: 'Välj om du är privatperson eller företag.',
    COMPANY_NAME_REQUIRED: 'Ange ditt företagsnamn.',
    VAT_REQUIRED: 'Ange ditt momsregistreringsnummer.',
    ID_UNAVAILABLE: 'Identitetskontrollen är tillfälligt otillgänglig. Försök igen senare.',
    ID_REQUIRED: 'Slutför först identitetskontrollen.',
    ID_EXPIRED: 'Din identitetskontroll har gått ut eller redan använts. Starta den igen.',
    ID_UNCONFIRMED: 'Din identitetskontroll kunde inte bekräftas. Försök igen.',
    ID_UNFINISHED: 'Din identitetskontroll är inte klar än. Slutför den och försök igen.',
    ID_DOCUMENT_TYPE: 'Endast pass och id-kort godtas.',
    UNDER_AGE: 'Du måste ha fyllt 18 år för att lämna ett slutanvändarintyg.',
    BOT_CHECK_MISSING: 'Slutför robotkontrollen och försök igen.',
    BOT_CHECK_ERROR: 'Robotkontrollen kunde inte slutföras. Försök igen.',
    BOT_CHECK_FAILED: 'Robotkontrollen godkändes inte. Försök igen.',
  },

  poweredBy: 'Drivs av',
  howItWorksLink: 'Hur fungerar det?',

  vcDocTitle: 'Kontrollen är klar',
  vcTitle: 'Kontrollen är slutförd',
  vcBody: 'Du kan stänga det här fönstret och gå tillbaka till formuläret. Det uppdateras av sig självt.',
};

export default sv;
