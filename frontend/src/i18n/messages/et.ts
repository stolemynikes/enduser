// Eesti. ANNEX IV terminid sõna-sõnalt määruse (EL) 2019/1148 eestikeelse
// versiooni IV lisast. Reeglid: vt en.ts.
import type { Messages } from './en.ts';

const et: Messages = {
  docTitle: 'Lõppkasutaja deklaratsioon',
  docTitleCompany: (company) => `${company} — Deklaratsioon`,
  badge: 'Ametlik dokument',
  title: 'Lõppkasutaja deklaratsioon',
  subtitle: 'Keemilised ained — reguleeritud kasutuse deklaratsioon',
  submittedTo: (company) => `Esitatakse: ${company}`,
  themeToggle: 'Hele või tume',

  language: 'Keel',
  languageSearch: 'Otsi keelt',
  languageNone: 'Keelt ei leitud',
  languageSuggested: 'Soovitatud',
  languageAll: 'Kõik keeled',

  secBuyerType: 'Ostja liik',
  secContact: 'Kontaktandmed',
  secCompany: 'Ettevõtte andmed',
  secAddress: 'Aadress',
  secSubstance: 'Aine andmed',
  secIdentity: 'Isikusamasuse kontroll',
  secTerms: 'Tingimused',

  buyerTypeQuestion: 'Kas tellite eraisikuna või ettevõtte nimel?',
  buyerIndividual: 'Eraisik',
  buyerCompany: 'Ettevõte',

  optional: '(valikuline)',
  email: 'E-post',
  orderNumber: 'Tellimuse number',
  firstName: 'Eesnimi',
  lastName: 'Perekonnanimi',
  companyName: 'Ettevõtte nimi',
  vatNumber: 'KMKR number',
  vatHint: 'Vajalik ELi VIES-kontrolliks, nt EE123456789',
  street: 'Tänav ja maja number',
  zipCode: 'Postiindeks',
  place: 'Linn või asula',
  country: 'Riik',
  countrySelect: '— Valige —',
  substanceName: 'Aine või ainete nimetus',
  casNo: 'CASi number',
  concentration: 'Kontsentratsioon',
  concentrationHint: 'Nagu etiketil märgitud, nt 15% w/w. Lähteainete seaduslikud piirmäärad sõltuvad sellest.',
  intendedUse: 'Kavandatav kasutamine',
  intendedUseHint: 'Kirjeldage, milleks te ainet kasutate.',

  idNote:
    'Teie passi või isikutunnistust kontrollib Didit, meie isikusamasuse kontrolli teenusepakkuja. '
    + 'Avaneb turvaline aken, kus pildistate oma dokumenti ja teete lühikese selfi. '
    + 'Fotod jäävad Diditi juurde — see vorm ei saa ega salvesta neid kunagi. Säilitatakse ainult tulemus '
    + 'ja teie dokumendile trükitud andmed.',
  idUnavailableTitle: 'Isikusamasuse kontroll ei ole ajutiselt saadaval',
  idUnavailableNote: (seller) =>
    `See vorm nõuab seda, mistõttu ei saa seda praegu saata. Proovige hiljem uuesti või võtke ühendust müüjaga${seller ? ` (${seller})` : ''}.`,
  fillFirst: (list) => `Täitke kõigepealt ülejäänud vorm ja seejärel kinnitage oma isik. Puudu: ${list}.`,
  verifyButton: 'Kinnita minu isik',
  verifyOpening: 'Turvalise kontrolli avamine…',
  verifyWaiting: 'Ootame, kuni lõpetate kontrolli…',
  verifyWaitingHint: 'Tehke kontrolliaknas sammud läbi ja tulge siis siia tagasi. See leht uueneb ise.',
  verifyBlocked: 'Teie brauser blokeeris kontrolliakna.',
  verifyBlockedLink: 'Ava uuel vahelehel',
  verifyRestart: 'Aken suleti? Alusta uuesti',
  verified: 'Isik kinnitatud',
  verifyInReview: 'Teie dokumenti kontrollitakse käsitsi. Võite vormi juba saata — müüja näeb tulemust.',
  verifyFailedTitle: 'Kontroll ei läinud läbi',
  verifyFailedNote: 'Võite vormi siiski saata. Müüja vaatab selle siis käsitsi üle.',
  verifyTryAgain: 'Proovi uuesti',

  termsIntro: (seller) => `Müüja tingimused${seller ? ` (${seller})` : ''}:`,
  termsReadLink: (seller) => `Loe müüja tingimusi${seller ? ` (${seller})` : ''}`,
  termsAsWritten: () => 'Need tingimused on kehtestanud müüja ja neid näidatakse nii, nagu need on kirjutatud.',
  agree: 'Olen ülaltoodud tingimusi lugenud ja nõustun nendega',
  defaultTerms: `Kinnitan käesolevaga, et:
— Aineid, valmistisi ja tooteid kasutatakse ainult lubatud viisil (kooskõlas Euroopa ja riigi õigusaktidega) ning ainult teadus-, uurimis- ja õppeotstarbel.

Tellitud ainet või aineid:
— Ei kasutata narkootiliste ja/või psühhotroopsete ainete valmistamiseks ega nende koostisosa või vaheproduktina.
— Ei kasutata inim- või veterinaarravimites, põllumajanduses, toidus ega kosmeetikas, välja arvatud tooraine, abi- või tööainena ja/või uurimis- ja analüüsireaktiivina.
— Ei kasutata keemiarelvade arendamiseks ega tootmiseks.
— Ei kasutata sõjalistel ega ebaseaduslikel eesmärkidel.
— Ei reeksportida kolmandatesse riikidesse ilma ekspordikontrolli asutuste eelneva nõusolekuta.
— Ei reeksportida/ekspordita, ei müüda edasi riigisiseselt ega rahvusvaheliselt ega anta üle sihtkohta, mille suhtes kehtib ELi, ÜRO või USA embargo, kui see oleks vastuolus selle embargo tingimustega.
— Tarnitakse ainult klientidele, kes suudavad samuti esitada sellise lõppkasutaja deklaratsiooni. Hoiame kõiki saadud deklaratsioone hoolikalt ja esitame need nõudmisel.
— Olen vähemalt 18-aastane.`,

  requiredNote: 'Kohustuslikud väljad',
  stillToComplete: (list) => `Veel täita: ${list}.`,
  submitting: 'Saatmine…',
  submit: 'Saada deklaratsioon',
  footer: 'See dokument on õiguslikult siduv. Kõiki esitatud andmeid võidakse kontrollida.',

  missing: {
    email: 'kehtiv e-posti aadress',
    firstName: 'eesnimi',
    lastName: 'perekonnanimi',
    orderNumber: 'tellimuse number',
    buyerType: 'kas olete eraisik või ettevõte',
    companyName: 'ettevõtte nimi',
    vatNumber: 'KMKR number',
    street: 'tänav',
    zipCode: 'postiindeks',
    place: 'linn või asula',
    country: 'riik',
    substance: 'aine nimetus',
    cas: 'CASi number',
    concentration: 'kontsentratsioon',
    intendedUse: 'kavandatav kasutamine',
    identity: 'isikusamasuse kontroll',
    terms: 'tingimustega nõustumine',
    robot: 'robotikontroll',
  },

  successTitle: 'Deklaratsioon on kätte saadud',
  successBody: 'Teie lõppkasutaja deklaratsioon on saadetud. Saate kinnituse e-postiga ja uue teate, kui see on läbi vaadatud.',
  successNote: 'Palun hoidke see kinnitus alles.',
  notFoundTitle: 'Vormi ei leitud',
  notFoundBody: 'Sellel aadressil ei ole vormi. Kontrollige linki.',
  notReadyTitle: 'Vorm ei ole veel saadaval',
  notReadyBody: 'See vorm ei võta veel deklaratsioone vastu. Proovige hiljem uuesti.',
  contactSupplier: 'Kui saite selle lingi tarnijalt, võtke abi saamiseks temaga ühendust.',
  notFoundHome: 'Avalehele',

  errVerifyExpired: 'Teie kontrolliseanss on aegunud. Alustage uuesti.',
  errVerifyStart: 'Isikusamasuse kontrolli ei saanud alustada. Proovige uuesti.',
  errIncomplete: (list) => `Täitke kõigepealt vorm. Puudu: ${list}.`,
  errIdUnavailable: 'Isikusamasuse kontroll ei ole ajutiselt saadaval, mistõttu ei saa seda vormi praegu saata.',
  errRateLimited: 'Sellest ühendusest on liiga palju katseid. Oodake mõni minut ja proovige uuesti.',
  errGeneric: 'Midagi läks valesti. Proovige uuesti.',

  server: {
    TERMS_REQUIRED: 'Peate tingimustega nõustuma.',
    FIELD_TOO_LONG: 'Üks väljadest on liiga pikk. Lühendage seda ja proovige uuesti.',
    INVALID_EMAIL: 'Sisestage kehtiv e-posti aadress.',
    FORM_NOT_OPEN: 'See vorm ei võta veel deklaratsioone vastu.',
    FIELD_REQUIRED: 'Kohustuslik väli on tühi. Täitke kõik *-ga märgitud väljad.',
    BUYER_TYPE_REQUIRED: 'Valige, kas olete eraisik või ettevõte.',
    COMPANY_NAME_REQUIRED: 'Sisestage oma ettevõtte nimi.',
    VAT_REQUIRED: 'Sisestage oma KMKR number.',
    ID_UNAVAILABLE: 'Isikusamasuse kontroll ei ole ajutiselt saadaval. Proovige hiljem uuesti.',
    ID_REQUIRED: 'Lõpetage kõigepealt isikusamasuse kontroll.',
    ID_EXPIRED: 'Teie isikusamasuse kontroll on aegunud või juba kasutatud. Alustage uuesti.',
    ID_UNCONFIRMED: 'Teie isikusamasuse kontrolli ei saanud kinnitada. Proovige uuesti.',
    ID_UNFINISHED: 'Teie isikusamasuse kontroll ei ole veel lõppenud. Lõpetage see ja proovige uuesti.',
    ID_DOCUMENT_TYPE: 'Aktsepteeritakse ainult passe ja isikutunnistusi.',
    UNDER_AGE: 'Lõppkasutaja deklaratsiooni esitamiseks peate olema vähemalt 18-aastane.',
    BOT_CHECK_MISSING: 'Lõpetage robotikontroll ja proovige uuesti.',
    BOT_CHECK_ERROR: 'Robotikontrolli ei saanud lõpetada. Proovige uuesti.',
    BOT_CHECK_FAILED: 'Robotikontroll ei läinud läbi. Proovige uuesti.',
  },

  poweredBy: 'Teenust pakub',
  howItWorksLink: 'Kuidas see toimib?',

  vcDocTitle: 'Kontroll on lõpetatud',
  vcTitle: 'Kontroll on lõppenud',
  vcBody: 'Võite selle akna sulgeda ja vormi juurde tagasi minna. See uueneb ise.',
};

export default et;
