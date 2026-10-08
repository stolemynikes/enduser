// Italiano. Termini ANNEX IV ripresi alla lettera dalla versione italiana del
// regolamento (UE) 2019/1148, allegato IV. Regole: vedi en.ts.
import type { Messages } from './en.ts';

const it: Messages = {
  docTitle: 'Dichiarazione di utilizzatore finale',
  docTitleCompany: (company) => `${company} — Dichiarazione`,
  badge: 'Documento ufficiale',
  title: 'Dichiarazione di utilizzatore finale',
  subtitle: 'Sostanze chimiche — dichiarazione di uso regolamentato',
  submittedTo: (company) => `Presentata a ${company}`,
  themeToggle: 'Chiaro o scuro',

  language: 'Lingua',
  languageSearch: 'Cerca una lingua',
  languageNone: 'Nessuna lingua trovata',
  languageSuggested: 'Suggerite',
  languageAll: 'Tutte le lingue',

  secBuyerType: 'Tipo di acquirente',
  secContact: 'Dati di contatto',
  secCompany: 'Dati dell’azienda',
  secAddress: 'Indirizzo',
  secSubstance: 'Informazioni sulla sostanza',
  secIdentity: 'Verifica dell’identità',
  secTerms: 'Termini e condizioni',

  buyerTypeQuestion: 'Ordina come privato o per conto di un’azienda?',
  buyerIndividual: 'Privato',
  buyerCompany: 'Azienda',

  optional: '(facoltativo)',
  email: 'E-mail',
  orderNumber: 'Numero d’ordine',
  firstName: 'Nome',
  lastName: 'Cognome',
  companyName: 'Nome dell’azienda',
  vatNumber: 'Partita IVA',
  vatHint: 'Necessaria per il controllo europeo VIES, ad es. IT12345678901',
  street: 'Via e numero civico',
  zipCode: 'CAP',
  place: 'Città',
  country: 'Paese',
  countrySelect: '— Seleziona —',
  substanceName: 'Nome della/e sostanza/e',
  casNo: 'N. CAS',
  concentration: 'Concentrazione',
  concentrationHint: 'Come indicata sull’etichetta, ad es. 15% p/p. Da essa dipendono i limiti di legge per i precursori.',
  intendedUse: 'Uso previsto',
  intendedUseHint: 'Descriva per cosa utilizzerà la sostanza.',

  idNote:
    'Il suo passaporto o la sua carta d’identità vengono verificati da Didit, il nostro fornitore di verifica dell’identità. '
    + 'Si apre una finestra sicura in cui fotografa il documento e scatta un breve selfie. '
    + 'Le foto restano presso Didit: questo modulo non le riceve né le conserva mai. Vengono conservati solo '
    + 'l’esito e i dati stampati sul documento.',
  idUnavailableTitle: 'La verifica dell’identità è temporaneamente non disponibile',
  idUnavailableNote: (seller) =>
    `Questo modulo la richiede, quindi al momento non può essere inviato. Riprovi più tardi o contatti ${seller ?? 'il venditore'}.`,
  fillFirst: (list) => `Compili prima il resto del modulo, poi verifichi l’identità. Manca ancora: ${list}.`,
  verifyButton: 'Verifica la mia identità',
  verifyOpening: 'Apertura della verifica sicura…',
  verifyWaiting: 'In attesa che completi la verifica…',
  verifyWaitingHint: 'Completi i passaggi nella finestra di verifica, poi torni qui. Questa pagina si aggiorna da sola.',
  verifyBlocked: 'Il browser ha bloccato la finestra di verifica.',
  verifyBlockedLink: 'Aprila in una nuova scheda',
  verifyRestart: 'Finestra chiusa? Ricomincia',
  verified: 'Identità verificata',
  verifyInReview: 'Il suo documento è in fase di controllo manuale. Può già inviare il modulo: il venditore vedrà l’esito.',
  verifyFailedTitle: 'Verifica non superata',
  verifyFailedNote: 'Può comunque inviare questo modulo. Il venditore lo esaminerà manualmente.',
  verifyTryAgain: 'Riprova',

  termsIntro: (seller) => seller ? `Termini e condizioni di ${seller}:` : 'Termini e condizioni del venditore:',
  termsReadLink: (seller) => seller ? `Leggi i termini e condizioni di ${seller}` : 'Leggi i termini e condizioni del venditore',
  termsAsWritten: (seller) => `Questi termini sono stabiliti da ${seller ?? 'il venditore'} e sono mostrati così come sono stati scritti.`,
  agree: 'Ho letto e accetto i termini e condizioni sopra riportati',
  defaultTerms: `Con la presente confermo che:
— Le sostanze, i preparati e i prodotti sono utilizzati esclusivamente in modo autorizzato (in conformità con la legislazione europea e nazionale) e solo per scopi di ricerca, scientifici e didattici.

La/le sostanza/e ordinata/e:
— Non è/sono utilizzata/e per fabbricare stupefacenti e/o sostanze psicotrope, né come loro componente o intermedio.
— Non è/sono utilizzata/e in medicinali per uso umano o veterinario, in agricoltura, negli alimenti o nei cosmetici, se non come materia prima, materiale ausiliario o di processo e/o come reagente di ricerca e di analisi.
— Non è/sono utilizzata/e per sviluppare o produrre armi chimiche.
— Non sarà/saranno utilizzata/e per scopi militari o illegali.
— Non è/sono riesportata/e verso paesi terzi senza il previo consenso delle autorità di controllo delle esportazioni.
— Non sarà/saranno riesportata/e/esportata/e, né rivenduta/e a livello nazionale o internazionale, né trasferita/e verso una destinazione soggetta a embargo dell’UE, dell’ONU o degli USA, qualora ciò contrasti con i termini di tale embargo.
— È/sono fornita/e solo a clienti in grado di presentare anch’essi un certificato di uso finale di questo tipo. Conserveremo con cura tutti i certificati ricevuti e li presenteremo su richiesta.
— Ho più di 18 anni.`,

  requiredNote: 'Campi obbligatori',
  stillToComplete: (list) => `Ancora da compilare: ${list}.`,
  submitting: 'Invio in corso…',
  submit: 'Invia la dichiarazione',
  footer: 'Il presente documento è giuridicamente vincolante. Tutte le informazioni fornite possono essere verificate.',

  missing: {
    email: 'un indirizzo e-mail valido',
    firstName: 'nome',
    lastName: 'cognome',
    orderNumber: 'numero d’ordine',
    buyerType: 'se è un privato o un’azienda',
    companyName: 'nome dell’azienda',
    vatNumber: 'partita IVA',
    street: 'via',
    zipCode: 'CAP',
    place: 'città',
    country: 'paese',
    substance: 'nome della sostanza',
    cas: 'numero CAS',
    concentration: 'concentrazione',
    intendedUse: 'uso previsto',
    identity: 'verifica dell’identità',
    terms: 'accettazione dei termini',
    robot: 'il controllo anti-robot',
  },

  successTitle: 'Dichiarazione ricevuta',
  successBody: 'La sua dichiarazione di utilizzatore finale è stata inviata. Riceverà una conferma via e-mail e un altro messaggio quando sarà stata esaminata.',
  successNote: 'Conservi questa conferma per i suoi archivi.',
  notFoundTitle: 'Modulo non trovato',
  notFoundBody: 'A questo indirizzo non c’è alcun modulo. Controlli il link.',
  notReadyTitle: 'Modulo non ancora disponibile',
  notReadyBody: 'Questo modulo non accetta ancora dichiarazioni. Riprovi più tardi.',
  contactSupplier: 'Se ha ricevuto questo link da un fornitore, lo contatti per assistenza.',

  errVerifyExpired: 'La sessione di verifica è scaduta. La avvii di nuovo.',
  errVerifyStart: 'Non è stato possibile avviare la verifica dell’identità. Riprovi.',
  errIncomplete: (list) => `Compili prima il modulo. Manca ancora: ${list}.`,
  errIdUnavailable: 'La verifica dell’identità è temporaneamente non disponibile, quindi al momento questo modulo non può essere inviato.',
  errRateLimited: 'Troppi tentativi da questa connessione. Attenda qualche minuto e riprovi.',
  errGeneric: 'Qualcosa è andato storto. Riprovi.',

  server: {
    TERMS_REQUIRED: 'Deve accettare i termini e condizioni.',
    FIELD_TOO_LONG: 'Uno dei campi è troppo lungo. Lo accorci e riprovi.',
    INVALID_EMAIL: 'Inserisca un indirizzo e-mail valido.',
    FORM_NOT_OPEN: 'Questo modulo non accetta ancora dichiarazioni.',
    FIELD_REQUIRED: 'Un campo obbligatorio è vuoto. Compili tutti i campi contrassegnati da *.',
    BUYER_TYPE_REQUIRED: 'Indichi se è un privato o un’azienda.',
    COMPANY_NAME_REQUIRED: 'Indichi il nome della sua azienda.',
    VAT_REQUIRED: 'Indichi la sua partita IVA.',
    ID_UNAVAILABLE: 'La verifica dell’identità è temporaneamente non disponibile. Riprovi più tardi.',
    ID_REQUIRED: 'Completi prima la verifica dell’identità.',
    ID_EXPIRED: 'La verifica dell’identità è scaduta o è già stata utilizzata. La avvii di nuovo.',
    ID_UNCONFIRMED: 'Non è stato possibile confermare la verifica dell’identità. Riprovi.',
    ID_UNFINISHED: 'La verifica dell’identità non è ancora conclusa. La completi e riprovi.',
    ID_DOCUMENT_TYPE: 'Sono accettati solo passaporti e carte d’identità.',
    UNDER_AGE: 'Deve avere almeno 18 anni per presentare una dichiarazione di utilizzatore finale.',
    BOT_CHECK_MISSING: 'Completi il controllo anti-robot e riprovi.',
    BOT_CHECK_ERROR: 'Non è stato possibile completare il controllo anti-robot. Riprovi.',
    BOT_CHECK_FAILED: 'Il controllo anti-robot non è stato superato. Riprovi.',
  },

  vcDocTitle: 'Verifica completata',
  vcTitle: 'Verifica terminata',
  vcBody: 'Può chiudere questa finestra e tornare al modulo. Si aggiorna da solo.',
};

export default it;
