// Română. Termenii ANNEX IV sunt preluați întocmai din versiunea în limba română
// a Regulamentului (UE) 2019/1148, anexa IV. Reguli: vezi en.ts.
import type { Messages } from './en.ts';

const ro: Messages = {
  docTitle: 'Declarația utilizatorului final',
  docTitleCompany: (company) => `${company} — Declarație`,
  badge: 'Document oficial',
  title: 'Declarația utilizatorului final',
  subtitle: 'Substanțe chimice — declarație privind utilizarea reglementată',
  submittedTo: (company) => `Depusă la: ${company}`,
  themeToggle: 'Luminos sau întunecat',

  language: 'Limbă',
  languageSearch: 'Căutați o limbă',
  languageNone: 'Nicio limbă găsită',
  languageSuggested: 'Sugerate',
  languageAll: 'Toate limbile',

  secBuyerType: 'Tipul cumpărătorului',
  secContact: 'Date de contact',
  secCompany: 'Datele societății',
  secAddress: 'Adresă',
  secSubstance: 'Informații despre substanță',
  secIdentity: 'Verificarea identității',
  secTerms: 'Termeni și condiții',

  buyerTypeQuestion: 'Comandați ca persoană fizică sau în numele unei societăți?',
  buyerIndividual: 'Persoană fizică',
  buyerCompany: 'Societate',

  optional: '(opțional)',
  email: 'E-mail',
  orderNumber: 'Numărul comenzii',
  firstName: 'Prenume',
  lastName: 'Nume',
  companyName: 'Denumirea societății',
  vatNumber: 'Cod de TVA',
  vatHint: 'Necesar pentru verificarea UE în VIES, de ex. RO1234567890',
  street: 'Strada și numărul',
  zipCode: 'Cod poștal',
  place: 'Localitate',
  country: 'Țară',
  countrySelect: '— Selectați —',
  substanceName: 'Denumirea substanței (substanțelor)',
  casNo: 'Nr. CAS',
  concentration: 'Concentrație',
  concentrationHint: 'Așa cum este indicată pe etichetă, de ex. 15 % w/w. De ea depind limitele legale pentru precursori.',
  intendedUse: 'Utilizarea preconizată',
  intendedUseHint: 'Descrieți pentru ce veți folosi substanța.',

  idNote:
    'Pașaportul sau cartea dumneavoastră de identitate este verificat(ă) de Didit, furnizorul nostru de verificare a identității. '
    + 'Se deschide o fereastră securizată în care fotografiați documentul și faceți un scurt selfie. '
    + 'Fotografiile rămân la Didit — acest formular nu le primește și nu le stochează niciodată. Se păstrează doar '
    + 'rezultatul și datele tipărite pe documentul dumneavoastră.',
  idUnavailableTitle: 'Verificarea identității este temporar indisponibilă',
  idUnavailableNote: (seller) =>
    `Acest formular o impune, așa că nu poate fi trimis acum. Încercați din nou mai târziu sau contactați vânzătorul${seller ? ` (${seller})` : ''}.`,
  fillFirst: (list) => `Completați mai întâi restul formularului, apoi confirmați-vă identitatea. Lipsește: ${list}.`,
  verifyButton: 'Confirmă-mi identitatea',
  verifyOpening: 'Se deschide verificarea securizată…',
  verifyWaiting: 'Se așteaptă finalizarea verificării…',
  verifyWaitingHint: 'Parcurgeți pașii din fereastra de verificare, apoi reveniți aici. Pagina se actualizează singură.',
  verifyBlocked: 'Browserul a blocat fereastra de verificare.',
  verifyBlockedLink: 'Deschideți-o într-o filă nouă',
  verifyRestart: 'Ați închis fereastra? Începeți din nou',
  verified: 'Identitate confirmată',
  verifyInReview: 'Documentul dumneavoastră este verificat manual. Puteți trimite deja formularul — vânzătorul va vedea rezultatul.',
  verifyFailedTitle: 'Verificarea nu a reușit',
  verifyFailedNote: 'Puteți totuși să trimiteți formularul. Vânzătorul îl va examina manual.',
  verifyTryAgain: 'Încercați din nou',

  termsIntro: (seller) => `Termenii și condițiile vânzătorului${seller ? ` (${seller})` : ''}:`,
  termsReadLink: (seller) => `Citiți termenii și condițiile vânzătorului${seller ? ` (${seller})` : ''}`,
  termsAsWritten: () => 'Acești termeni sunt stabiliți de vânzător și sunt afișați așa cum au fost redactați.',
  agree: 'Am citit termenii și condițiile de mai sus și sunt de acord cu ele',
  defaultTerms: `Prin prezenta confirm că:
— Substanțele, preparatele și produsele sunt utilizate numai în mod autorizat (în conformitate cu legislația europeană și națională) și numai în scopuri de cercetare, științifice și educaționale.

Substanța (substanțele) comandată (comandate):
— Nu este (sunt) utilizată (utilizate) pentru fabricarea de stupefiante și/sau substanțe psihotrope ori ca element constitutiv sau intermediar al acestora.
— Nu este (sunt) utilizată (utilizate) în medicamente de uz uman sau veterinar, în agricultură, în alimente sau în cosmetice, cu excepția utilizării ca materie primă, material auxiliar sau de proces și/sau ca reactiv de cercetare și analiză.
— Nu este (sunt) utilizată (utilizate) pentru dezvoltarea sau producerea de arme chimice.
— Nu va (vor) fi utilizată (utilizate) în scopuri militare sau ilegale.
— Nu este (sunt) reexportată (reexportate) în țări terțe fără acordul prealabil al autorităților de control al exporturilor.
— Nu va (vor) fi reexportată (reexportate)/exportată (exportate), revândută (revândute) pe plan național sau internațional ori transferată (transferate) către o destinație supusă unui embargo al UE, al ONU sau al SUA, dacă acest lucru ar contraveni condițiilor embargoului respectiv.
— Este (sunt) livrată (livrate) numai clienților care pot prezenta, de asemenea, o astfel de declarație a utilizatorului final. Păstrăm cu grijă toate declarațiile primite și le prezentăm la cerere.
— Am peste 18 ani.`,

  requiredNote: 'Câmpuri obligatorii',
  stillToComplete: (list) => `Mai trebuie completat: ${list}.`,
  submitting: 'Se trimite…',
  submit: 'Trimiteți declarația',
  footer: 'Acest document este obligatoriu din punct de vedere juridic. Toate informațiile furnizate pot fi verificate.',

  missing: {
    email: 'o adresă de e-mail validă',
    firstName: 'prenume',
    lastName: 'nume',
    orderNumber: 'numărul comenzii',
    buyerType: 'dacă sunteți persoană fizică sau societate',
    companyName: 'denumirea societății',
    vatNumber: 'cod de TVA',
    street: 'strada',
    zipCode: 'cod poștal',
    place: 'localitate',
    country: 'țară',
    substance: 'denumirea substanței',
    cas: 'numărul CAS',
    concentration: 'concentrație',
    intendedUse: 'utilizarea preconizată',
    identity: 'verificarea identității',
    terms: 'acceptarea termenilor',
    robot: 'verificarea anti-robot',
  },

  successTitle: 'Declarație primită',
  successBody: 'Declarația utilizatorului final a fost trimisă. Veți primi o confirmare prin e-mail și un alt mesaj după ce va fi examinată.',
  successNote: 'Păstrați această confirmare.',
  notFoundTitle: 'Formularul nu a fost găsit',
  notFoundBody: 'Nu există niciun formular la această adresă. Verificați linkul.',
  notReadyTitle: 'Formularul nu este încă disponibil',
  notReadyBody: 'Acest formular nu acceptă încă declarații. Încercați din nou mai târziu.',
  contactSupplier: 'Dacă ați primit acest link de la un furnizor, contactați-l pentru ajutor.',

  errVerifyExpired: 'Sesiunea de verificare a expirat. Începeți-o din nou.',
  errVerifyStart: 'Verificarea identității nu a putut fi pornită. Încercați din nou.',
  errIncomplete: (list) => `Completați mai întâi formularul. Lipsește: ${list}.`,
  errIdUnavailable: 'Verificarea identității este temporar indisponibilă, așa că formularul nu poate fi trimis acum.',
  errRateLimited: 'Prea multe încercări de pe această conexiune. Așteptați câteva minute și încercați din nou.',
  errGeneric: 'Ceva nu a funcționat. Încercați din nou.',

  server: {
    TERMS_REQUIRED: 'Trebuie să acceptați termenii și condițiile.',
    FIELD_TOO_LONG: 'Unul dintre câmpuri este prea lung. Scurtați-l și încercați din nou.',
    INVALID_EMAIL: 'Introduceți o adresă de e-mail validă.',
    FORM_NOT_OPEN: 'Acest formular nu acceptă încă declarații.',
    FIELD_REQUIRED: 'Un câmp obligatoriu este gol. Completați toate câmpurile marcate cu *.',
    BUYER_TYPE_REQUIRED: 'Alegeți dacă sunteți persoană fizică sau societate.',
    COMPANY_NAME_REQUIRED: 'Introduceți denumirea societății.',
    VAT_REQUIRED: 'Introduceți codul de TVA.',
    ID_UNAVAILABLE: 'Verificarea identității este temporar indisponibilă. Încercați din nou mai târziu.',
    ID_REQUIRED: 'Finalizați mai întâi verificarea identității.',
    ID_EXPIRED: 'Verificarea identității a expirat sau a fost deja folosită. Începeți-o din nou.',
    ID_UNCONFIRMED: 'Verificarea identității nu a putut fi confirmată. Încercați din nou.',
    ID_UNFINISHED: 'Verificarea identității nu este încă finalizată. Finalizați-o și încercați din nou.',
    ID_DOCUMENT_TYPE: 'Se acceptă numai pașapoarte și cărți de identitate.',
    UNDER_AGE: 'Trebuie să aveți cel puțin 18 ani pentru a depune o declarație a utilizatorului final.',
    BOT_CHECK_MISSING: 'Finalizați verificarea anti-robot și încercați din nou.',
    BOT_CHECK_ERROR: 'Verificarea anti-robot nu a putut fi finalizată. Încercați din nou.',
    BOT_CHECK_FAILED: 'Verificarea anti-robot nu a reușit. Încercați din nou.',
  },

  poweredBy: 'Furnizat de',
  howItWorksLink: 'Cum funcționează?',

  vcDocTitle: 'Verificare finalizată',
  vcTitle: 'Verificarea s-a încheiat',
  vcBody: 'Puteți închide această fereastră și reveni la formular. Se actualizează singur.',
};

export default ro;
