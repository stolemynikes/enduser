// Hrvatski. Izrazi ANNEX IV doslovno iz hrvatske verzije Uredbe (EU)
// 2019/1148, Prilog IV. Pravila: vidi en.ts.
import type { Messages } from './en.ts';

const hr: Messages = {
  docTitle: 'Izjava krajnjeg korisnika',
  docTitleCompany: (company) => `${company} — Izjava`,
  badge: 'Službeni dokument',
  title: 'Izjava krajnjeg korisnika',
  subtitle: 'Kemijske tvari — izjava o reguliranoj uporabi',
  submittedTo: (company) => `Podnosi se: ${company}`,
  themeToggle: 'Svijetlo ili tamno',

  language: 'Jezik',
  languageSearch: 'Traži jezik',
  languageNone: 'Nije pronađen nijedan jezik',
  languageSuggested: 'Predloženi',
  languageAll: 'Svi jezici',

  secBuyerType: 'Vrsta kupca',
  secContact: 'Podaci za kontakt',
  secCompany: 'Podaci o poduzeću',
  secAddress: 'Adresa',
  secSubstance: 'Podaci o tvari',
  secIdentity: 'Provjera identiteta',
  secTerms: 'Uvjeti',

  buyerTypeQuestion: 'Naručujete li kao fizička osoba ili u ime poduzeća?',
  buyerIndividual: 'Fizička osoba',
  buyerCompany: 'Poduzeće',

  optional: '(neobavezno)',
  email: 'E-pošta',
  orderNumber: 'Broj narudžbe',
  firstName: 'Ime',
  lastName: 'Prezime',
  companyName: 'Naziv poduzeća',
  vatNumber: 'PDV identifikacijski broj',
  vatHint: 'Potreban za provjeru u sustavu EU-a VIES, npr. HR12345678901',
  street: 'Ulica i kućni broj',
  zipCode: 'Poštanski broj',
  place: 'Mjesto',
  country: 'Država',
  countrySelect: '— Odaberite —',
  substanceName: 'Naziv tvari',
  casNo: 'CAS broj',
  concentration: 'Koncentracija',
  concentrationHint: 'Kako je navedeno na etiketi, npr. 15 % w/w. O njoj ovise zakonske granične vrijednosti za prekursore.',
  intendedUse: 'Planirana uporaba',
  intendedUseHint: 'Opišite za što ćete upotrebljavati tvar.',

  idNote:
    'Vašu putovnicu ili osobnu iskaznicu provjerava Didit, naš pružatelj usluge provjere identiteta. '
    + 'Otvara se sigurni prozor u kojem fotografirate svoj dokument i snimate kratki selfie. '
    + 'Fotografije ostaju kod Didita — ovaj obrazac ih nikada ne prima niti pohranjuje. Čuvaju se samo '
    + 'ishod i podaci otisnuti na vašem dokumentu.',
  idUnavailableTitle: 'Provjera identiteta privremeno nije dostupna',
  idUnavailableNote: (seller) =>
    `Ovaj obrazac je zahtijeva pa ga trenutačno nije moguće poslati. Pokušajte ponovno kasnije ili se obratite prodavatelju${seller ? ` (${seller})` : ''}.`,
  fillFirst: (list) => `Najprije ispunite ostatak obrasca, a zatim potvrdite svoj identitet. Nedostaje: ${list}.`,
  verifyButton: 'Potvrdi moj identitet',
  verifyOpening: 'Otvaranje sigurne provjere…',
  verifyWaiting: 'Čeka se da završite provjeru…',
  verifyWaitingHint: 'Dovršite korake u prozoru za provjeru, a zatim se vratite ovamo. Ova se stranica sama ažurira.',
  verifyBlocked: 'Vaš preglednik blokirao je prozor za provjeru.',
  verifyBlockedLink: 'Otvori u novoj kartici',
  verifyRestart: 'Zatvorili ste prozor? Počni ispočetka',
  verified: 'Identitet potvrđen',
  verifyInReview: 'Vaš se dokument provjerava ručno. Obrazac već možete poslati — prodavatelj će vidjeti ishod.',
  verifyFailedTitle: 'Provjera nije uspjela',
  verifyFailedNote: 'Obrazac ipak možete poslati. Prodavatelj će ga tada pregledati ručno.',
  verifyTryAgain: 'Pokušaj ponovno',

  termsIntro: (seller) => `Uvjeti prodavatelja${seller ? ` (${seller})` : ''}:`,
  termsReadLink: (seller) => `Pročitajte uvjete prodavatelja${seller ? ` (${seller})` : ''}`,
  termsAsWritten: () => 'Ove uvjete utvrdio je prodavatelj i prikazani su u izvornom obliku.',
  agree: 'Pročitao/pročitala sam gore navedene uvjete i prihvaćam ih',
  defaultTerms: `Ovime potvrđujem da:
— Se tvari, pripravci i proizvodi upotrebljavaju samo na dopušteni način (u skladu s europskim i nacionalnim zakonodavstvom) i samo u istraživačke, znanstvene i obrazovne svrhe.

Naručena tvar ili tvari:
— Ne upotrebljavaju se za proizvodnju opojnih droga i/ili psihotropnih tvari niti kao njihov sastojak ili međuproizvod.
— Ne upotrebljavaju se u lijekovima za ljudsku ili veterinarsku primjenu, u poljoprivredi, hrani ili kozmetici, osim kao sirovina, pomoćni ili procesni materijal i/ili kao istraživački i analitički reagens.
— Ne upotrebljavaju se za razvoj ili proizvodnju kemijskog oružja.
— Neće se upotrebljavati u vojne ili nezakonite svrhe.
— Ne izvoze se ponovno u treće zemlje bez prethodne suglasnosti tijela za kontrolu izvoza.
— Neće se ponovno izvoziti/izvoziti, dalje prodavati u zemlji ili inozemstvu niti prenositi na odredište na koje se primjenjuje embargo EU-a, UN-a ili SAD-a ako bi to bilo protivno uvjetima tog embarga.
— Isporučuju se samo kupcima koji također mogu predočiti takvu izjavu krajnjeg korisnika. Sve primljene izjave pažljivo čuvamo i na zahtjev ih predočujemo.
— Imam više od 18 godina.`,

  requiredNote: 'Obavezna polja',
  stillToComplete: (list) => `Još treba ispuniti: ${list}.`,
  submitting: 'Slanje…',
  submit: 'Pošalji izjavu',
  footer: 'Ovaj je dokument pravno obvezujući. Svi navedeni podaci mogu se provjeriti.',

  missing: {
    email: 'valjana adresa e-pošte',
    firstName: 'ime',
    lastName: 'prezime',
    orderNumber: 'broj narudžbe',
    buyerType: 'jeste li fizička osoba ili poduzeće',
    companyName: 'naziv poduzeća',
    vatNumber: 'PDV identifikacijski broj',
    street: 'ulica',
    zipCode: 'poštanski broj',
    place: 'mjesto',
    country: 'država',
    substance: 'naziv tvari',
    cas: 'CAS broj',
    concentration: 'koncentracija',
    intendedUse: 'planirana uporaba',
    identity: 'provjera identiteta',
    terms: 'prihvaćanje uvjeta',
    robot: 'provjera protiv robota',
  },

  successTitle: 'Izjava zaprimljena',
  successBody: 'Vaša izjava krajnjeg korisnika je poslana. E-poštom ćete dobiti potvrdu i još jednu poruku kada bude pregledana.',
  successNote: 'Sačuvajte ovu potvrdu.',
  notFoundTitle: 'Obrazac nije pronađen',
  notFoundBody: 'Na ovoj adresi nema obrasca. Provjerite poveznicu.',
  notReadyTitle: 'Obrazac još nije dostupan',
  notReadyBody: 'Ovaj obrazac još ne prima izjave. Pokušajte ponovno kasnije.',
  contactSupplier: 'Ako ste ovu poveznicu dobili od dobavljača, obratite mu se za pomoć.',
  notFoundHome: 'Idi na početnu stranicu',

  errVerifyExpired: 'Vaša sesija provjere je istekla. Pokrenite je ponovno.',
  errVerifyStart: 'Provjeru identiteta nije bilo moguće pokrenuti. Pokušajte ponovno.',
  errIncomplete: (list) => `Najprije ispunite obrazac. Nedostaje: ${list}.`,
  errIdUnavailable: 'Provjera identiteta privremeno nije dostupna pa ovaj obrazac trenutačno nije moguće poslati.',
  errRateLimited: 'Previše pokušaja s ove veze. Pričekajte nekoliko minuta i pokušajte ponovno.',
  errGeneric: 'Nešto nije u redu. Pokušajte ponovno.',

  server: {
    TERMS_REQUIRED: 'Morate prihvatiti uvjete.',
    FIELD_TOO_LONG: 'Jedno od polja je predugačko. Skratite ga i pokušajte ponovno.',
    INVALID_EMAIL: 'Unesite valjanu adresu e-pošte.',
    FORM_NOT_OPEN: 'Ovaj obrazac još ne prima izjave.',
    FIELD_REQUIRED: 'Obavezno polje je prazno. Ispunite sva polja označena sa *.',
    BUYER_TYPE_REQUIRED: 'Odaberite jeste li fizička osoba ili poduzeće.',
    COMPANY_NAME_REQUIRED: 'Unesite naziv svojeg poduzeća.',
    VAT_REQUIRED: 'Unesite svoj PDV identifikacijski broj.',
    ID_UNAVAILABLE: 'Provjera identiteta privremeno nije dostupna. Pokušajte ponovno kasnije.',
    ID_REQUIRED: 'Najprije dovršite provjeru identiteta.',
    ID_EXPIRED: 'Vaša provjera identiteta je istekla ili je već iskorištena. Pokrenite je ponovno.',
    ID_UNCONFIRMED: 'Vašu provjeru identiteta nije bilo moguće potvrditi. Pokušajte ponovno.',
    ID_UNFINISHED: 'Vaša provjera identiteta još nije završena. Dovršite je i pokušajte ponovno.',
    ID_DOCUMENT_TYPE: 'Prihvaćaju se samo putovnice i osobne iskaznice.',
    UNDER_AGE: 'Za podnošenje izjave krajnjeg korisnika morate imati najmanje 18 godina.',
    BOT_CHECK_MISSING: 'Dovršite provjeru protiv robota i pokušajte ponovno.',
    BOT_CHECK_ERROR: 'Provjeru protiv robota nije bilo moguće dovršiti. Pokušajte ponovno.',
    BOT_CHECK_FAILED: 'Provjera protiv robota nije uspjela. Pokušajte ponovno.',
  },

  poweredBy: 'Pokreće',
  howItWorksLink: 'Kako ovo funkcionira?',

  vcDocTitle: 'Provjera dovršena',
  vcTitle: 'Provjera je završena',
  vcBody: 'Ovaj prozor možete zatvoriti i vratiti se na obrazac. Sam se ažurira.',
};

export default hr;
