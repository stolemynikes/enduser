// Latviešu. ANNEX IV termini burtiski no Regulas (ES) 2019/1148 latviešu
// valodas versijas IV pielikuma. Noteikumi: sk. en.ts.
import type { Messages } from './en.ts';

const lv: Messages = {
  docTitle: 'Galalietotāja deklarācija',
  docTitleCompany: (company) => `${company} — Deklarācija`,
  badge: 'Oficiāls dokuments',
  title: 'Galalietotāja deklarācija',
  subtitle: 'Ķīmiskās vielas — deklarācija par regulētu lietošanu',
  submittedTo: (company) => `Iesniedz: ${company}`,
  themeToggle: 'Gaišs vai tumšs',

  language: 'Valoda',
  languageSearch: 'Meklēt valodu',
  languageNone: 'Valoda nav atrasta',
  languageSuggested: 'Ieteiktās',
  languageAll: 'Visas valodas',

  secBuyerType: 'Pircēja veids',
  secContact: 'Kontaktinformācija',
  secCompany: 'Uzņēmuma dati',
  secAddress: 'Adrese',
  secSubstance: 'Informācija par vielu',
  secIdentity: 'Identitātes pārbaude',
  secTerms: 'Noteikumi',

  buyerTypeQuestion: 'Vai pasūtāt kā privātpersona vai uzņēmuma vārdā?',
  buyerIndividual: 'Privātpersona',
  buyerCompany: 'Uzņēmums',

  optional: '(nav obligāti)',
  email: 'E-pasts',
  orderNumber: 'Pasūtījuma numurs',
  firstName: 'Vārds',
  lastName: 'Uzvārds',
  companyName: 'Uzņēmuma nosaukums',
  vatNumber: 'PVN reģistrācijas numurs',
  vatHint: 'Nepieciešams ES VIES pārbaudei, piem., LV12345678901',
  street: 'Iela un mājas numurs',
  zipCode: 'Pasta indekss',
  place: 'Pilsēta vai apdzīvota vieta',
  country: 'Valsts',
  countrySelect: '— Izvēlieties —',
  substanceName: 'Vielas (vielu) nosaukums',
  casNo: 'CAS Nr.',
  concentration: 'Koncentrācija',
  concentrationHint: 'Kā norādīts etiķetē, piem., 15 % w/w. No tās atkarīgi likumā noteiktie prekursoru ierobežojumi.',
  intendedUse: 'Paredzētais lietojums',
  intendedUseHint: 'Aprakstiet, kam izmantosiet vielu.',

  idNote:
    'Jūsu pasi vai personas apliecību pārbauda Didit — mūsu identitātes pārbaudes pakalpojumu sniedzējs. '
    + 'Atveras droši logs, kurā nofotografējat savu dokumentu un uzņemat īsu pašbildi. '
    + 'Fotoattēli paliek pie Didit — šī veidlapa tos nekad nesaņem un neglabā. Tiek glabāts tikai '
    + 'rezultāts un jūsu dokumentā uzdrukātie dati.',
  idUnavailableTitle: 'Identitātes pārbaude īslaicīgi nav pieejama',
  idUnavailableNote: (seller) =>
    `Šī veidlapa to pieprasa, tāpēc to pašlaik nevar nosūtīt. Mēģiniet vēlāk vai sazinieties ar pārdevēju${seller ? ` (${seller})` : ''}.`,
  fillFirst: (list) => `Vispirms aizpildiet pārējo veidlapu, pēc tam apstipriniet savu identitāti. Trūkst: ${list}.`,
  verifyButton: 'Apstiprināt manu identitāti',
  verifyOpening: 'Tiek atvērta droša pārbaude…',
  verifyWaiting: 'Gaida, līdz pabeigsiet pārbaudi…',
  verifyWaitingHint: 'Izpildiet darbības pārbaudes logā un pēc tam atgriezieties šeit. Šī lapa atjaunojas pati.',
  verifyBlocked: 'Jūsu pārlūks bloķēja pārbaudes logu.',
  verifyBlockedLink: 'Atvērt jaunā cilnē',
  verifyRestart: 'Aizvērāt logu? Sākt no jauna',
  verified: 'Identitāte apstiprināta',
  verifyInReview: 'Jūsu dokuments tiek pārbaudīts manuāli. Veidlapu jau varat nosūtīt — pārdevējs redzēs rezultātu.',
  verifyFailedTitle: 'Pārbaude nebija sekmīga',
  verifyFailedNote: 'Veidlapu tomēr varat nosūtīt. Pārdevējs to izskatīs manuāli.',
  verifyTryAgain: 'Mēģināt vēlreiz',

  termsIntro: (seller) => `Pārdevēja noteikumi${seller ? ` (${seller})` : ''}:`,
  termsReadLink: (seller) => `Lasīt pārdevēja noteikumus${seller ? ` (${seller})` : ''}`,
  termsAsWritten: () => 'Šos noteikumus ir noteicis pārdevējs, un tie tiek rādīti oriģinālajā redakcijā.',
  agree: 'Esmu izlasījis(-usi) iepriekš minētos noteikumus un tiem piekrītu',
  defaultTerms: `Ar šo apstiprinu, ka:
— Vielas, preparātus un produktus izmanto tikai atļautā veidā (saskaņā ar Eiropas un valsts tiesību aktiem) un tikai pētniecības, zinātnes un izglītības nolūkos.

Pasūtīto vielu (vielas):
— Neizmanto narkotisko un/vai psihotropo vielu ražošanai, kā arī kā to sastāvdaļu vai starpproduktu.
— Neizmanto cilvēkiem vai dzīvniekiem paredzētās zālēs, lauksaimniecībā, pārtikā vai kosmētikā, izņemot kā izejvielu, palīgvielu vai tehnoloģisko materiālu un/vai kā pētniecības un analīzes reaģentu.
— Neizmanto ķīmisko ieroču izstrādei vai ražošanai.
— Neizmantos militāriem vai nelikumīgiem mērķiem.
— Bez eksporta kontroles iestāžu iepriekšējas piekrišanas neeksportē atkārtoti uz trešām valstīm.
— Neeksportēs atkārtoti/neeksportēs, nepārdos tālāk valsts vai starptautiskā mērogā un nenodos uz galamērķi, uz kuru attiecas ES, ANO vai ASV embargo, ja tas būtu pretrunā ar šā embargo noteikumiem.
— Piegādā tikai klientiem, kuri arī var iesniegt šādu galalietotāja deklarāciju. Visas saņemtās deklarācijas rūpīgi glabājam un pēc pieprasījuma iesniedzam.
— Man ir vairāk nekā 18 gadu.`,

  requiredNote: 'Obligātie lauki',
  stillToComplete: (list) => `Vēl jāaizpilda: ${list}.`,
  submitting: 'Notiek sūtīšana…',
  submit: 'Nosūtīt deklarāciju',
  footer: 'Šis dokuments ir juridiski saistošs. Visa sniegtā informācija var tikt pārbaudīta.',

  missing: {
    email: 'derīga e-pasta adrese',
    firstName: 'vārds',
    lastName: 'uzvārds',
    orderNumber: 'pasūtījuma numurs',
    buyerType: 'vai esat privātpersona vai uzņēmums',
    companyName: 'uzņēmuma nosaukums',
    vatNumber: 'PVN reģistrācijas numurs',
    street: 'iela',
    zipCode: 'pasta indekss',
    place: 'pilsēta vai apdzīvota vieta',
    country: 'valsts',
    substance: 'vielas nosaukums',
    cas: 'CAS numurs',
    concentration: 'koncentrācija',
    intendedUse: 'paredzētais lietojums',
    identity: 'identitātes pārbaude',
    terms: 'piekrišana noteikumiem',
    robot: 'pretrobotu pārbaude',
  },

  successTitle: 'Deklarācija saņemta',
  successBody: 'Jūsu galalietotāja deklarācija ir nosūtīta. Jūs saņemsiet apstiprinājumu e-pastā un vēl vienu ziņu, kad tā būs izskatīta.',
  successNote: 'Saglabājiet šo apstiprinājumu.',
  notFoundTitle: 'Veidlapa nav atrasta',
  notFoundBody: 'Šajā adresē nav veidlapas. Pārbaudiet saiti.',
  notReadyTitle: 'Veidlapa vēl nav pieejama',
  notReadyBody: 'Šī veidlapa vēl nepieņem deklarācijas. Mēģiniet vēlāk.',
  contactSupplier: 'Ja šo saiti saņēmāt no piegādātāja, sazinieties ar viņu, lai saņemtu palīdzību.',
  notFoundHome: 'Uz sākumlapu',

  errVerifyExpired: 'Jūsu pārbaudes sesija ir beigusies. Sāciet no jauna.',
  errVerifyStart: 'Neizdevās sākt identitātes pārbaudi. Mēģiniet vēlreiz.',
  errIncomplete: (list) => `Vispirms aizpildiet veidlapu. Trūkst: ${list}.`,
  errIdUnavailable: 'Identitātes pārbaude īslaicīgi nav pieejama, tāpēc šo veidlapu pašlaik nevar nosūtīt.',
  errRateLimited: 'Pārāk daudz mēģinājumu no šī savienojuma. Uzgaidiet dažas minūtes un mēģiniet vēlreiz.',
  errGeneric: 'Kaut kas nogāja greizi. Mēģiniet vēlreiz.',

  server: {
    TERMS_REQUIRED: 'Jums jāpiekrīt noteikumiem.',
    FIELD_TOO_LONG: 'Viens no laukiem ir pārāk garš. Saīsiniet to un mēģiniet vēlreiz.',
    INVALID_EMAIL: 'Ievadiet derīgu e-pasta adresi.',
    FORM_NOT_OPEN: 'Šī veidlapa vēl nepieņem deklarācijas.',
    FIELD_REQUIRED: 'Obligāts lauks ir tukšs. Aizpildiet visus ar * atzīmētos laukus.',
    BUYER_TYPE_REQUIRED: 'Izvēlieties, vai esat privātpersona vai uzņēmums.',
    COMPANY_NAME_REQUIRED: 'Ievadiet sava uzņēmuma nosaukumu.',
    VAT_REQUIRED: 'Ievadiet savu PVN reģistrācijas numuru.',
    ID_UNAVAILABLE: 'Identitātes pārbaude īslaicīgi nav pieejama. Mēģiniet vēlāk.',
    ID_REQUIRED: 'Vispirms pabeidziet identitātes pārbaudi.',
    ID_EXPIRED: 'Jūsu identitātes pārbaude ir beigusies vai jau izmantota. Sāciet no jauna.',
    ID_UNCONFIRMED: 'Neizdevās apstiprināt jūsu identitātes pārbaudi. Mēģiniet vēlreiz.',
    ID_UNFINISHED: 'Jūsu identitātes pārbaude vēl nav pabeigta. Pabeidziet to un mēģiniet vēlreiz.',
    ID_DOCUMENT_TYPE: 'Tiek pieņemtas tikai pases un personas apliecības.',
    UNDER_AGE: 'Lai iesniegtu galalietotāja deklarāciju, jums jābūt vismaz 18 gadus vecam.',
    BOT_CHECK_MISSING: 'Pabeidziet pretrobotu pārbaudi un mēģiniet vēlreiz.',
    BOT_CHECK_ERROR: 'Neizdevās pabeigt pretrobotu pārbaudi. Mēģiniet vēlreiz.',
    BOT_CHECK_FAILED: 'Pretrobotu pārbaude nebija sekmīga. Mēģiniet vēlreiz.',
  },

  poweredBy: 'Nodrošina',
  howItWorksLink: 'Kā tas darbojas?',

  vcDocTitle: 'Pārbaude pabeigta',
  vcTitle: 'Pārbaude ir beigusies',
  vcBody: 'Varat aizvērt šo logu un atgriezties pie veidlapas. Tā atjaunojas pati.',
};

export default lv;
