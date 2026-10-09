import type { HowItWorks } from './en.ts';

const pl: HowItWorks = {
  docTitle: 'Jak to działa',
  badge: 'Dla kupujących',
  title: 'Jak to działa',
  lede: 'Przed zakupem substancji chemicznej poproszono Pana/Panią o wypełnienie oświadczenia użytkownika końcowego. Ta strona wyjaśnia, dlaczego, co dzieje się z Pana/Pani danymi i co może Pan/Pani zrobić.',
  sentBy: (seller) => `Przechodzi Pan/Pani z formularza sprzedawcy: ${seller}.`,
  backToForm: 'Wróć do formularza',
  contents: 'Na tej stronie',

  shortTitle: 'W skrócie',
  short: [
    'Sprzedawca musi sprawdzić, kto kupuje niektóre substancje chemiczne i w jakim celu. Wymaga tego prawo, a nie sklep.',
    'Dokument tożsamości sprawdza Didit. Jego zdjęcia nigdy nie trafiają do sprzedawcy ani do nas.',
    'Oświadczenie czyta zespół sprzedawcy. Numer dokumentu pozostaje ukryty, dopóki ktoś celowo go nie sprawdzi, a każde sprawdzenie jest rejestrowane.',
    'Po 18 miesiącach wszystko jest automatycznie usuwane.',
  ],

  whyTitle: 'Dlaczego jestem o to proszony/proszona?',
  why: [
    'Niektóre substancje chemiczne mogą zostać użyte do wytwarzania materiałów wybuchowych, narkotyków lub broni. Przepisy UE — w tym rozporządzenie (UE) 2019/1148 w sprawie prekursorów materiałów wybuchowych — zobowiązują sprzedawców do wiedzy, komu i w jakim celu sprzedają te substancje, do prowadzenia ewidencji oraz do zgłaszania podejrzanych transakcji.',
    'Wypełniane oświadczenie jest właśnie tą ewidencją. eustatement to usługa, z której sprzedawca korzysta, aby je zbierać.',
  ],

  idTitle: 'Co dzieje się z moim dokumentem tożsamości?',
  id: [
    'Jeśli sprzedawca wymaga weryfikacji tożsamości, otwiera się bezpieczne okno Didit, naszego dostawcy weryfikacji tożsamości. Fotografuje Pan/Pani paszport lub dowód osobisty i robi krótkie selfie. Didit sprawdza, czy dokument jest prawdziwy i czy należy do Pana/Pani.',
    'Zdjęcia trafiają tylko do Didit — nigdy do sprzedawcy ani do nas. Gdy tylko wynik zostanie zapisany, weryfikacja w Didit, łącznie ze zdjęciami, jest usuwana.',
    'Zachowywany jest wynik oraz to, co jest wydrukowane w dokumencie: imię i nazwisko, rodzaj dokumentu i jego numer. Data urodzenia jest użyta jednorazowo, aby sprawdzić, czy ma Pan/Pani ukończone 18 lat, i nie jest przechowywana.',
  ],

  storedTitle: 'Co jest przechowywane i kto może to zobaczyć?',
  stored: [
    'Dane wpisane w formularzu, wynik weryfikacji tożsamości oraz wynik automatycznych kontroli substancji. Dane osobowe są przechowywane w postaci zaszyfrowanej, na serwerach w UE.',
    'Żaden inny sprzedawca nie widzi oświadczenia — tylko sprzedawca, u którego Pan/Pani kupuje, i jego zespół. Numer dokumentu pozostaje ukryty nawet przed nimi: członek zespołu musi potwierdzić drugim krokiem logowania, aby go zobaczyć, a każde takie zdarzenie jest rejestrowane.',
    'Nasi pracownicy mogą otwierać oświadczenia, gdy jest to potrzebne do działania i obsługi usługi. Oni również widzą numer dokumentu tylko wtedy, gdy celowo go sprawdzą, a takie sprawdzenie widnieje w rejestrze sprzedawcy.',
  ],

  decideTitle: 'Kto decyduje?',
  decide: [
    'Osoba po stronie sprzedawcy czyta każde oświadczenie i podejmuje decyzję. Automatyczne kontrole — czy substancja jest na liście ograniczeń, czy podane zastosowanie zawiera sygnały ostrzegawcze, czy numer VAT firmy jest ważny — jedynie wskazują osobie sprawdzającej, co wymaga dokładniejszego przyjrzenia się. Nigdy same niczego nie zatwierdzają ani nie odrzucają.',
    'Jedynym wyjątkiem jest wiek: jeśli dokument wskazuje, że ma Pan/Pani mniej niż 18 lat, oświadczenia nie można wysłać.',
    'Jeśli oświadczenie nie jest po angielsku ani po niderlandzku, może zostać przetłumaczone maszynowo dla osoby sprawdzającej. Dzieje się to na naszym własnym serwerze; tekst nie jest wysyłany do żadnej usługi tłumaczeniowej.',
  ],

  keptTitle: 'Jak długo dane są przechowywane?',
  kept: [
    '18 miesięcy od dnia wysłania. Potem oświadczenie jest automatycznie usuwane razem ze wszystkim, co opisano powyżej. Jeśli sprzedawca zamknie konto wcześniej, zostanie ono usunięte 30 dni później.',
  ],

  othersTitle: 'Kto jeszcze uczestniczy?',
  othersIntro: 'Oprócz sprzedawcy i nas rolę odgrywają następujące podmioty:',
  others: [
    ['Didit', 'sprawdza dokument tożsamości — tylko jeśli sprzedawca tego wymaga.'],
    ['Komisja Europejska (VIES)', 'sprawdza numer VAT — tylko przy zamówieniu na firmę.'],
    ['PubChem i Wikidata', 'pomagają zidentyfikować substancję. Otrzymują nazwę substancji i numer CAS, nigdy nic o Panu/Pani.'],
    ['Nasz dostawca poczty e-mail', 'dostarcza potwierdzenie i decyzję do skrzynki odbiorczej.'],
    ['Cloudflare', 'chroni stronę przed atakami i widzi adres IP podczas przesyłania ruchu.'],
    ['Hetzner', 'utrzymuje nasze serwery w UE.'],
  ],
  othersMore: 'Pełna lista wraz z lokalizacjami znajduje się w naszej polityce prywatności (w języku angielskim).',

  rightsTitle: 'Jakie mam prawa?',
  rights: [
    'Może Pan/Pani poprosić o wgląd w dane, które Pana/Pani dotyczą, o ich sprostowanie lub usunięcie, o ile pozwala na to prawo — sprzedawca może być zobowiązany przechowywać ewidencję tak długo, jak wymagają tego przepisy.',
  ],
  controller: (seller) => seller
    ? `Za Pana/Pani dane odpowiada sprzedawca ${seller} („administrator”); eustatement przetwarza je w jego imieniu. Prośbę należy skierować do sprzedawcy ${seller}.`
    : 'Za Pana/Pani dane odpowiada sprzedawca („administrator”); eustatement przetwarza je w jego imieniu. Prośbę należy skierować do sprzedawcy.',
  fallback: (email) => `Jeśli nie można się z nim skontaktować, prosimy pisać na adres ${email}; przekażemy prośbę dalej.`,
  complaint: 'Można również złożyć skargę do organu ochrony danych w swoim kraju.',

  questionsTitle: 'Pytania?',
  questionsOrder: 'W sprawie zamówienia lub decyzji: prosimy kontaktować się ze sprzedawcą.',
  questionsData: (email) => `W sprawie tej strony lub sposobu przetwarzania danych: ${email}.`,

  lastUpdated: (date) => `Ostatnia aktualizacja: ${date}`,
  privacyPolicy: 'Polityka prywatności',
};

export default pl;
