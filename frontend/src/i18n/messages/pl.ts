// Polski. Terminy ANNEX IV dosłownie z polskiej wersji rozporządzenia (UE)
// 2019/1148, załącznik IV. Zasady: zob. en.ts.
import type { Messages } from './en.ts';

const pl: Messages = {
  docTitle: 'Oświadczenie użytkownika końcowego',
  docTitleCompany: (company) => `${company} — Oświadczenie`,
  badge: 'Dokument urzędowy',
  title: 'Oświadczenie użytkownika końcowego',
  subtitle: 'Substancje chemiczne — oświadczenie o regulowanym zastosowaniu',
  submittedTo: (company) => `Składane do: ${company}`,
  themeToggle: 'Jasny lub ciemny',

  language: 'Język',
  languageSearch: 'Szukaj języka',
  languageNone: 'Nie znaleziono języka',
  languageSuggested: 'Proponowane',
  languageAll: 'Wszystkie języki',

  secBuyerType: 'Rodzaj kupującego',
  secContact: 'Dane kontaktowe',
  secCompany: 'Dane firmy',
  secAddress: 'Adres',
  secSubstance: 'Informacje o substancji',
  secIdentity: 'Weryfikacja tożsamości',
  secTerms: 'Warunki',

  buyerTypeQuestion: 'Czy zamawia Pan/Pani jako osoba prywatna, czy w imieniu firmy?',
  buyerIndividual: 'Osoba prywatna',
  buyerCompany: 'Firma',

  optional: '(opcjonalnie)',
  email: 'E-mail',
  orderNumber: 'Numer zamówienia',
  firstName: 'Imię',
  lastName: 'Nazwisko',
  companyName: 'Nazwa firmy',
  vatNumber: 'Numer VAT',
  vatHint: 'Potrzebny do unijnej weryfikacji VIES, np. PL1234567890',
  street: 'Ulica i numer',
  zipCode: 'Kod pocztowy',
  place: 'Miejscowość',
  country: 'Kraj',
  countrySelect: '— Wybierz —',
  substanceName: 'Nazwa substancji',
  casNo: 'Numer CAS',
  concentration: 'Stężenie',
  concentrationHint: 'Tak jak na etykiecie, np. 15% w/w. Od niego zależą prawne limity dla prekursorów.',
  intendedUse: 'Zamierzone stosowanie',
  intendedUseHint: 'Proszę opisać, do czego będzie używana substancja.',

  idNote:
    'Paszport lub dowód osobisty sprawdza Didit, nasz dostawca weryfikacji tożsamości. '
    + 'Otworzy się bezpieczne okno, w którym należy sfotografować dokument i zrobić krótkie selfie. '
    + 'Zdjęcia pozostają w Didit — ten formularz nigdy ich nie otrzymuje ani nie przechowuje. Przechowywany jest '
    + 'tylko wynik oraz dane wydrukowane w dokumencie.',
  idUnavailableTitle: 'Weryfikacja tożsamości jest chwilowo niedostępna',
  idUnavailableNote: (seller) =>
    `Ten formularz jej wymaga, więc nie można go teraz wysłać. Proszę spróbować później lub skontaktować się ze sprzedawcą${seller ? ` (${seller})` : ''}.`,
  fillFirst: (list) => `Najpierw proszę wypełnić resztę formularza, a potem potwierdzić tożsamość. Brakuje: ${list}.`,
  verifyButton: 'Potwierdź moją tożsamość',
  verifyOpening: 'Otwieranie bezpiecznej weryfikacji…',
  verifyWaiting: 'Oczekiwanie na zakończenie weryfikacji…',
  verifyWaitingHint: 'Proszę wykonać kroki w oknie weryfikacji i wrócić tutaj. Ta strona odświeża się sama.',
  verifyBlocked: 'Przeglądarka zablokowała okno weryfikacji.',
  verifyBlockedLink: 'Otwórz w nowej karcie',
  verifyRestart: 'Okno zamknięte? Zacznij od nowa',
  verified: 'Tożsamość potwierdzona',
  verifyInReview: 'Dokument jest sprawdzany ręcznie. Można już wysłać formularz — sprzedawca zobaczy wynik.',
  verifyFailedTitle: 'Weryfikacja nieudana',
  verifyFailedNote: 'Mimo to można wysłać ten formularz. Sprzedawca sprawdzi go ręcznie.',
  verifyTryAgain: 'Spróbuj ponownie',

  termsIntro: (seller) => `Warunki sprzedawcy${seller ? ` ${seller}` : ''}:`,
  termsReadLink: (seller) => `Przeczytaj warunki sprzedawcy${seller ? ` ${seller}` : ''}`,
  termsAsWritten: () => 'Te warunki ustala sprzedawca i są wyświetlane w oryginalnym brzmieniu.',
  agree: 'Przeczytałem/przeczytałam powyższe warunki i akceptuję je',
  defaultTerms: `Niniejszym potwierdzam, że:
— Substancje, preparaty i produkty są używane wyłącznie w sposób dozwolony (zgodnie z prawem europejskim i krajowym) i wyłącznie do celów badawczych, naukowych i edukacyjnych.

Zamówiona(-e) substancja(-e):
— Nie jest/są używana(-e) do wytwarzania środków odurzających i/lub substancji psychotropowych ani jako ich składnik lub półprodukt.
— Nie jest/są używana(-e) w produktach leczniczych stosowanych u ludzi lub zwierząt, w rolnictwie, żywności lub kosmetykach, z wyjątkiem użycia jako surowiec, materiał pomocniczy lub eksploatacyjny i/lub jako odczynnik badawczy i analityczny.
— Nie jest/są używana(-e) do opracowywania ani produkcji broni chemicznej.
— Nie będzie/będą używana(-e) do celów wojskowych ani niezgodnych z prawem.
— Nie jest/są reeksportowana(-e) do państw trzecich bez uprzedniej zgody organów kontroli eksportu.
— Nie będzie/będą reeksportowana(-e)/eksportowana(-e), odsprzedawana(-e) w kraju lub za granicą ani przekazywana(-e) do miejsca przeznaczenia objętego embargiem UE, ONZ lub USA, jeżeli byłoby to sprzeczne z warunkami tego embarga.
— Jest/są dostarczana(-e) wyłącznie klientom, którzy również mogą przedstawić takie oświadczenie użytkownika końcowego. Wszystkie otrzymane oświadczenia starannie przechowujemy i przedstawiamy na żądanie.
— Mam ukończone 18 lat.`,

  requiredNote: 'Pola wymagane',
  stillToComplete: (list) => `Do uzupełnienia: ${list}.`,
  submitting: 'Wysyłanie…',
  submit: 'Wyślij oświadczenie',
  footer: 'Ten dokument jest prawnie wiążący. Wszystkie podane informacje mogą zostać zweryfikowane.',

  missing: {
    email: 'prawidłowy adres e-mail',
    firstName: 'imię',
    lastName: 'nazwisko',
    orderNumber: 'numer zamówienia',
    buyerType: 'czy jest Pan/Pani osobą prywatną, czy firmą',
    companyName: 'nazwa firmy',
    vatNumber: 'numer VAT',
    street: 'ulica',
    zipCode: 'kod pocztowy',
    place: 'miejscowość',
    country: 'kraj',
    substance: 'nazwa substancji',
    cas: 'numer CAS',
    concentration: 'stężenie',
    intendedUse: 'zamierzone stosowanie',
    identity: 'weryfikacja tożsamości',
    terms: 'akceptacja warunków',
    robot: 'kontrola antyrobotowa',
  },

  successTitle: 'Oświadczenie otrzymane',
  successBody: 'Oświadczenie użytkownika końcowego zostało wysłane. Otrzyma Pan/Pani potwierdzenie e-mailem oraz kolejną wiadomość po jego sprawdzeniu.',
  successNote: 'Proszę zachować to potwierdzenie w dokumentacji.',
  notFoundTitle: 'Nie znaleziono formularza',
  notFoundBody: 'Pod tym adresem nie ma formularza. Proszę sprawdzić link.',
  notReadyTitle: 'Formularz jeszcze niedostępny',
  notReadyBody: 'Ten formularz nie przyjmuje jeszcze oświadczeń. Proszę spróbować później.',
  contactSupplier: 'Jeśli ten link pochodzi od dostawcy, proszę skontaktować się z nim w celu uzyskania pomocy.',
  notFoundHome: 'Przejdź do strony głównej',

  errVerifyExpired: 'Sesja weryfikacji wygasła. Proszę rozpocząć ją ponownie.',
  errVerifyStart: 'Nie udało się rozpocząć weryfikacji tożsamości. Proszę spróbować ponownie.',
  errIncomplete: (list) => `Najpierw proszę wypełnić formularz. Brakuje: ${list}.`,
  errIdUnavailable: 'Weryfikacja tożsamości jest chwilowo niedostępna, dlatego tego formularza nie można teraz wysłać.',
  errRateLimited: 'Zbyt wiele prób z tego połączenia. Proszę odczekać kilka minut i spróbować ponownie.',
  errGeneric: 'Coś poszło nie tak. Proszę spróbować ponownie.',

  server: {
    TERMS_REQUIRED: 'Należy zaakceptować warunki.',
    FIELD_TOO_LONG: 'Jedno z pól jest za długie. Proszę je skrócić i spróbować ponownie.',
    INVALID_EMAIL: 'Proszę podać prawidłowy adres e-mail.',
    FORM_NOT_OPEN: 'Ten formularz nie przyjmuje jeszcze oświadczeń.',
    FIELD_REQUIRED: 'Wymagane pole jest puste. Proszę wypełnić wszystkie pola oznaczone *.',
    BUYER_TYPE_REQUIRED: 'Proszę wybrać, czy jest Pan/Pani osobą prywatną, czy firmą.',
    COMPANY_NAME_REQUIRED: 'Proszę podać nazwę firmy.',
    VAT_REQUIRED: 'Proszę podać numer VAT.',
    ID_UNAVAILABLE: 'Weryfikacja tożsamości jest chwilowo niedostępna. Proszę spróbować później.',
    ID_REQUIRED: 'Proszę najpierw zakończyć weryfikację tożsamości.',
    ID_EXPIRED: 'Weryfikacja tożsamości wygasła lub została już wykorzystana. Proszę rozpocząć ją ponownie.',
    ID_UNCONFIRMED: 'Nie udało się potwierdzić weryfikacji tożsamości. Proszę spróbować ponownie.',
    ID_UNFINISHED: 'Weryfikacja tożsamości nie została jeszcze zakończona. Proszę ją dokończyć i spróbować ponownie.',
    ID_DOCUMENT_TYPE: 'Akceptowane są wyłącznie paszporty i dowody osobiste.',
    UNDER_AGE: 'Aby złożyć oświadczenie użytkownika końcowego, trzeba mieć ukończone 18 lat.',
    BOT_CHECK_MISSING: 'Proszę zakończyć kontrolę antyrobotową i spróbować ponownie.',
    BOT_CHECK_ERROR: 'Nie udało się zakończyć kontroli antyrobotowej. Proszę spróbować ponownie.',
    BOT_CHECK_FAILED: 'Kontrola antyrobotowa nie powiodła się. Proszę spróbować ponownie.',
  },

  poweredBy: 'Obsługiwane przez',
  howItWorksLink: 'Jak to działa?',

  vcDocTitle: 'Weryfikacja zakończona',
  vcTitle: 'Weryfikacja zakończona',
  vcBody: 'Można zamknąć to okno i wrócić do formularza. Odświeża się on sam.',
};

export default pl;
