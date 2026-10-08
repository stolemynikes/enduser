// Magyar. Az ANNEX IV kifejezések szó szerint a 2019/1148/EU rendelet magyar
// nyelvű változatának IV. mellékletéből származnak. Szabályok: lásd en.ts.
import type { Messages } from './en.ts';

const hu: Messages = {
  docTitle: 'Végfelhasználói nyilatkozat',
  docTitleCompany: (company) => `${company} — Nyilatkozat`,
  badge: 'Hivatalos dokumentum',
  title: 'Végfelhasználói nyilatkozat',
  subtitle: 'Vegyi anyagok — nyilatkozat szabályozott felhasználásról',
  submittedTo: (company) => `Címzett: ${company}`,
  themeToggle: 'Világos vagy sötét',

  language: 'Nyelv',
  languageSearch: 'Nyelv keresése',
  languageNone: 'Nincs találat',
  languageSuggested: 'Javasolt',
  languageAll: 'Minden nyelv',

  secBuyerType: 'Vevő típusa',
  secContact: 'Elérhetőségek',
  secCompany: 'Cégadatok',
  secAddress: 'Cím',
  secSubstance: 'Az anyag adatai',
  secIdentity: 'Személyazonosság ellenőrzése',
  secTerms: 'Feltételek',

  buyerTypeQuestion: 'Magánszemélyként vagy egy cég nevében rendel?',
  buyerIndividual: 'Magánszemély',
  buyerCompany: 'Cég',

  optional: '(nem kötelező)',
  email: 'E-mail',
  orderNumber: 'Rendelésszám',
  firstName: 'Utónév',
  lastName: 'Vezetéknév',
  companyName: 'Cégnév',
  vatNumber: 'Közösségi adószám',
  vatHint: 'Az uniós VIES-ellenőrzéshez szükséges, pl. HU12345678',
  street: 'Utca, házszám',
  zipCode: 'Irányítószám',
  place: 'Település',
  country: 'Ország',
  countrySelect: '— Válasszon —',
  substanceName: 'Az anyag(ok) neve',
  casNo: 'CAS-szám',
  concentration: 'Koncentráció',
  concentrationHint: 'Ahogy a címkén szerepel, pl. 15 tömeg%. A prekurzorokra vonatkozó jogszabályi határértékek ettől függenek.',
  intendedUse: 'Tervezett felhasználás',
  intendedUseHint: 'Írja le, mire fogja használni az anyagot.',

  idNote:
    'Útlevelét vagy személyi igazolványát a Didit, a személyazonosság-ellenőrzési szolgáltatónk ellenőrzi. '
    + 'Megnyílik egy biztonságos ablak, ahol lefényképezi az okmányát, és készít egy rövid szelfit. '
    + 'A fényképek a Diditnél maradnak — ez az űrlap soha nem kapja meg és nem tárolja őket. Csak az eredményt '
    + 'és az okmányára nyomtatott adatokat őrizzük meg.',
  idUnavailableTitle: 'A személyazonosság ellenőrzése átmenetileg nem érhető el',
  idUnavailableNote: (seller) =>
    `Ez az űrlap megköveteli, ezért most nem küldhető el. Próbálja újra később, vagy forduljon az eladóhoz${seller ? ` (${seller})` : ''}.`,
  fillFirst: (list) => `Először töltse ki az űrlap többi részét, majd igazolja személyazonosságát. Hiányzik: ${list}.`,
  verifyButton: 'Személyazonosságom igazolása',
  verifyOpening: 'A biztonságos ellenőrzés megnyitása…',
  verifyWaiting: 'Várakozás az ellenőrzés befejezésére…',
  verifyWaitingHint: 'Végezze el a lépéseket az ellenőrző ablakban, majd térjen vissza ide. Ez az oldal magától frissül.',
  verifyBlocked: 'A böngészője letiltotta az ellenőrző ablakot.',
  verifyBlockedLink: 'Megnyitás új lapon',
  verifyRestart: 'Bezárta az ablakot? Kezdje újra',
  verified: 'Személyazonosság igazolva',
  verifyInReview: 'Okmányát kézzel ellenőrzik. Az űrlapot már elküldheti — az eladó látni fogja az eredményt.',
  verifyFailedTitle: 'Az ellenőrzés nem sikerült',
  verifyFailedNote: 'Az űrlapot így is elküldheti. Az eladó ekkor kézzel bírálja el.',
  verifyTryAgain: 'Újrapróbálkozás',

  termsIntro: (seller) => `Az eladó feltételei${seller ? ` (${seller})` : ''}:`,
  termsReadLink: (seller) => `Az eladó feltételeinek elolvasása${seller ? ` (${seller})` : ''}`,
  termsAsWritten: () => 'Ezeket a feltételeket az eladó határozta meg, és eredeti szövegükben jelennek meg.',
  agree: 'Elolvastam a fenti feltételeket, és elfogadom azokat',
  defaultTerms: `Ezennel megerősítem, hogy:
— Az anyagokat, készítményeket és termékeket kizárólag engedélyezett módon (az európai és a nemzeti jogszabályokkal összhangban) és kizárólag kutatási, tudományos és oktatási célokra használják.

A megrendelt anyag(ok)at:
— Nem használják kábítószerek és/vagy pszichotróp anyagok előállítására, illetve azok összetevőjeként vagy köztes termékeként.
— Nem használják emberi vagy állatgyógyászati készítményekben, a mezőgazdaságban, élelmiszerekben vagy kozmetikumokban, kivéve nyersanyagként, segéd- vagy üzemanyagként és/vagy kutatási és analitikai reagensként.
— Nem használják vegyi fegyverek fejlesztésére vagy előállítására.
— Nem fogják katonai vagy jogellenes célokra használni.
— Nem exportálják újra harmadik országokba az exportellenőrzési hatóságok előzetes hozzájárulása nélkül.
— Nem exportálják újra/exportálják, nem értékesítik tovább belföldön vagy nemzetközi szinten, és nem adják át olyan rendeltetési helyre, amelyre az EU, az ENSZ vagy az USA embargója vonatkozik, ha ez ellentétes lenne az embargó feltételeivel.
— Kizárólag olyan vevőknek szállítják, akik szintén be tudnak nyújtani ilyen végfelhasználói nyilatkozatot. Minden beérkezett nyilatkozatot gondosan megőrzünk, és kérésre bemutatunk.
— Elmúltam 18 éves.`,

  requiredNote: 'Kötelező mezők',
  stillToComplete: (list) => `Még kitöltendő: ${list}.`,
  submitting: 'Küldés…',
  submit: 'Nyilatkozat elküldése',
  footer: 'Ez a dokumentum jogilag kötelező erejű. Minden megadott adat ellenőrizhető.',

  missing: {
    email: 'érvényes e-mail-cím',
    firstName: 'utónév',
    lastName: 'vezetéknév',
    orderNumber: 'rendelésszám',
    buyerType: 'hogy magánszemély vagy cég',
    companyName: 'cégnév',
    vatNumber: 'közösségi adószám',
    street: 'utca',
    zipCode: 'irányítószám',
    place: 'település',
    country: 'ország',
    substance: 'az anyag neve',
    cas: 'CAS-szám',
    concentration: 'koncentráció',
    intendedUse: 'tervezett felhasználás',
    identity: 'személyazonosság ellenőrzése',
    terms: 'a feltételek elfogadása',
    robot: 'a robotszűrés',
  },

  successTitle: 'A nyilatkozat megérkezett',
  successBody: 'Végfelhasználói nyilatkozatát elküldtük. E-mailben visszaigazolást kap, és egy újabb üzenetet, amint elbírálták.',
  successNote: 'Őrizze meg ezt a visszaigazolást.',
  notFoundTitle: 'Az űrlap nem található',
  notFoundBody: 'Ezen a címen nincs űrlap. Ellenőrizze a hivatkozást.',
  notReadyTitle: 'Az űrlap még nem érhető el',
  notReadyBody: 'Ez az űrlap még nem fogad nyilatkozatokat. Próbálja újra később.',
  contactSupplier: 'Ha a hivatkozást egy beszállítótól kapta, segítségért forduljon hozzá.',

  errVerifyExpired: 'Az ellenőrzési munkamenet lejárt. Indítsa újra.',
  errVerifyStart: 'A személyazonosság ellenőrzését nem sikerült elindítani. Próbálja újra.',
  errIncomplete: (list) => `Először töltse ki az űrlapot. Hiányzik: ${list}.`,
  errIdUnavailable: 'A személyazonosság ellenőrzése átmenetileg nem érhető el, ezért az űrlap most nem küldhető el.',
  errRateLimited: 'Túl sok próbálkozás erről a kapcsolatról. Várjon néhány percet, majd próbálja újra.',
  errGeneric: 'Hiba történt. Próbálja újra.',

  server: {
    TERMS_REQUIRED: 'El kell fogadnia a feltételeket.',
    FIELD_TOO_LONG: 'Az egyik mező túl hosszú. Rövidítse le, és próbálja újra.',
    INVALID_EMAIL: 'Adjon meg érvényes e-mail-címet.',
    FORM_NOT_OPEN: 'Ez az űrlap még nem fogad nyilatkozatokat.',
    FIELD_REQUIRED: 'Egy kötelező mező üres. Töltse ki az összes *-gal jelölt mezőt.',
    BUYER_TYPE_REQUIRED: 'Válassza ki, hogy magánszemély vagy cég.',
    COMPANY_NAME_REQUIRED: 'Adja meg a cége nevét.',
    VAT_REQUIRED: 'Adja meg közösségi adószámát.',
    ID_UNAVAILABLE: 'A személyazonosság ellenőrzése átmenetileg nem érhető el. Próbálja újra később.',
    ID_REQUIRED: 'Először fejezze be a személyazonosság ellenőrzését.',
    ID_EXPIRED: 'A személyazonosság ellenőrzése lejárt, vagy már felhasználták. Indítsa újra.',
    ID_UNCONFIRMED: 'A személyazonosság ellenőrzését nem sikerült megerősíteni. Próbálja újra.',
    ID_UNFINISHED: 'A személyazonosság ellenőrzése még nem fejeződött be. Fejezze be, majd próbálja újra.',
    ID_DOCUMENT_TYPE: 'Csak útlevelet és személyi igazolványt fogadunk el.',
    UNDER_AGE: 'Végfelhasználói nyilatkozat benyújtásához legalább 18 évesnek kell lennie.',
    BOT_CHECK_MISSING: 'Fejezze be a robotszűrést, és próbálja újra.',
    BOT_CHECK_ERROR: 'A robotszűrést nem sikerült befejezni. Próbálja újra.',
    BOT_CHECK_FAILED: 'A robotszűrés nem sikerült. Próbálja újra.',
  },

  vcDocTitle: 'Ellenőrzés kész',
  vcTitle: 'Az ellenőrzés befejeződött',
  vcBody: 'Bezárhatja ezt az ablakot, és visszatérhet az űrlaphoz. Az magától frissül.',
};

export default hu;
