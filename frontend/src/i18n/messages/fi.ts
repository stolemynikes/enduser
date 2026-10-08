// Suomi. ANNEX IV -termit sanatarkasti asetuksen (EU) 2019/1148 suomenkielisen
// version liitteestä IV. Säännöt: ks. en.ts.
import type { Messages } from './en.ts';

const fi: Messages = {
  docTitle: 'Loppukäyttäjän ilmoitus',
  docTitleCompany: (company) => `${company} — Ilmoitus`,
  badge: 'Virallinen asiakirja',
  title: 'Loppukäyttäjän ilmoitus',
  subtitle: 'Kemialliset aineet — ilmoitus säännellystä käytöstä',
  submittedTo: (company) => `Vastaanottaja: ${company}`,
  themeToggle: 'Vaalea tai tumma',

  language: 'Kieli',
  languageSearch: 'Hae kieltä',
  languageNone: 'Kieltä ei löytynyt',
  languageSuggested: 'Ehdotetut',
  languageAll: 'Kaikki kielet',

  secBuyerType: 'Ostajan tyyppi',
  secContact: 'Yhteystiedot',
  secCompany: 'Yrityksen tiedot',
  secAddress: 'Osoite',
  secSubstance: 'Aineen tiedot',
  secIdentity: 'Henkilöllisyyden tarkistus',
  secTerms: 'Ehdot',

  buyerTypeQuestion: 'Tilaatteko yksityishenkilönä vai yrityksen puolesta?',
  buyerIndividual: 'Yksityishenkilö',
  buyerCompany: 'Yritys',

  optional: '(valinnainen)',
  email: 'Sähköposti',
  orderNumber: 'Tilausnumero',
  firstName: 'Etunimi',
  lastName: 'Sukunimi',
  companyName: 'Yrityksen nimi',
  vatNumber: 'ALV-tunniste',
  vatHint: 'Tarvitaan EU:n VIES-tarkistukseen, esim. FI12345678',
  street: 'Katuosoite',
  zipCode: 'Postinumero',
  place: 'Postitoimipaikka',
  country: 'Maa',
  countrySelect: '— Valitse —',
  substanceName: 'Aineen tai aineiden nimi',
  casNo: 'CAS-numero',
  concentration: 'Pitoisuus',
  concentrationHint: 'Kuten etiketissä, esim. 15 % w/w. Lähtöaineiden lakisääteiset raja-arvot riippuvat siitä.',
  intendedUse: 'Käyttötarkoitus',
  intendedUseHint: 'Kuvailkaa, mihin käytätte ainetta.',

  idNote:
    'Passinne tai henkilökorttinne tarkistaa Didit, henkilöllisyyden tarkistuspalvelumme. '
    + 'Avautuu suojattu ikkuna, jossa valokuvaatte asiakirjanne ja otatte lyhyen selfien. '
    + 'Kuvat jäävät Diditille — tämä lomake ei koskaan vastaanota tai tallenna niitä. Vain tulos '
    + 'ja asiakirjaanne painetut tiedot säilytetään.',
  idUnavailableTitle: 'Henkilöllisyyden tarkistus ei ole tilapäisesti käytettävissä',
  idUnavailableNote: (seller) =>
    `Lomake edellyttää sitä, joten sitä ei voi lähettää juuri nyt. Yrittäkää myöhemmin uudelleen tai ottakaa yhteyttä myyjään${seller ? ` (${seller})` : ''}.`,
  fillFirst: (list) => `Täyttäkää ensin muu lomake ja vahvistakaa sitten henkilöllisyytenne. Puuttuu: ${list}.`,
  verifyButton: 'Vahvista henkilöllisyyteni',
  verifyOpening: 'Avataan suojattua tarkistusta…',
  verifyWaiting: 'Odotetaan, että tarkistus valmistuu…',
  verifyWaitingHint: 'Suorittakaa vaiheet tarkistusikkunassa ja palatkaa sitten tänne. Sivu päivittyy itsestään.',
  verifyBlocked: 'Selaimenne esti tarkistusikkunan.',
  verifyBlockedLink: 'Avaa uudessa välilehdessä',
  verifyRestart: 'Suljitteko ikkunan? Aloita alusta',
  verified: 'Henkilöllisyys vahvistettu',
  verifyInReview: 'Asiakirjanne tarkistetaan käsin. Voitte jo lähettää lomakkeen — myyjä näkee tuloksen.',
  verifyFailedTitle: 'Tarkistus ei mennyt läpi',
  verifyFailedNote: 'Voitte silti lähettää lomakkeen. Myyjä tarkistaa sen silloin käsin.',
  verifyTryAgain: 'Yritä uudelleen',

  termsIntro: (seller) => `Myyjän ehdot${seller ? ` (${seller})` : ''}:`,
  termsReadLink: (seller) => `Lue myyjän ehdot${seller ? ` (${seller})` : ''}`,
  termsAsWritten: () => 'Nämä ehdot on laatinut myyjä, ja ne näytetään sellaisina kuin ne on kirjoitettu.',
  agree: 'Olen lukenut yllä olevat ehdot ja hyväksyn ne',
  defaultTerms: `Vahvistan täten, että:
— Aineita, valmisteita ja tuotteita käytetään ainoastaan sallitulla tavalla (Euroopan ja kansallisen lainsäädännön mukaisesti) ja ainoastaan tutkimus-, tiede- ja opetustarkoituksiin.

Tilattua ainetta tai tilattuja aineita:
— Ei käytetä huumausaineiden ja/tai psykotrooppisten aineiden valmistukseen eikä niiden ainesosana tai välituotteena.
— Ei käytetä ihmisille tai eläimille tarkoitetuissa lääkkeissä, maataloudessa, elintarvikkeissa tai kosmetiikassa, paitsi raaka-aineena, apu- tai prosessiaineena ja/tai tutkimus- ja analyysireagenssina.
— Ei käytetä kemiallisten aseiden kehittämiseen tai tuottamiseen.
— Ei tulla käyttämään sotilaallisiin tai laittomiin tarkoituksiin.
— Ei jälleenviedä kolmansiin maihin ilman vientivalvontaviranomaisten ennakkosuostumusta.
— Ei tulla jälleenviemään/viemään, jälleenmyymään kotimaassa tai kansainvälisesti tai siirtämään määränpäähän, johon kohdistuu EU:n, YK:n tai Yhdysvaltojen kauppasaarto, jos tämä olisi ristiriidassa kyseisen kauppasaarron ehtojen kanssa.
— Toimitetaan vain asiakkaille, jotka voivat myös esittää tällaisen loppukäyttäjän ilmoituksen. Säilytämme kaikki vastaanotetut ilmoitukset huolellisesti ja esitämme ne pyynnöstä.
— Olen täyttänyt 18 vuotta.`,

  requiredNote: 'Pakolliset kentät',
  stillToComplete: (list) => `Vielä täytettävä: ${list}.`,
  submitting: 'Lähetetään…',
  submit: 'Lähetä ilmoitus',
  footer: 'Tämä asiakirja on oikeudellisesti sitova. Kaikki annetut tiedot voidaan tarkistaa.',

  missing: {
    email: 'kelvollinen sähköpostiosoite',
    firstName: 'etunimi',
    lastName: 'sukunimi',
    orderNumber: 'tilausnumero',
    buyerType: 'oletteko yksityishenkilö vai yritys',
    companyName: 'yrityksen nimi',
    vatNumber: 'ALV-tunniste',
    street: 'katuosoite',
    zipCode: 'postinumero',
    place: 'postitoimipaikka',
    country: 'maa',
    substance: 'aineen nimi',
    cas: 'CAS-numero',
    concentration: 'pitoisuus',
    intendedUse: 'käyttötarkoitus',
    identity: 'henkilöllisyyden tarkistus',
    terms: 'ehtojen hyväksyminen',
    robot: 'robottitarkistus',
  },

  successTitle: 'Ilmoitus vastaanotettu',
  successBody: 'Loppukäyttäjän ilmoituksenne on lähetetty. Saatte vahvistuksen sähköpostitse ja uuden viestin, kun ilmoitus on käsitelty.',
  successNote: 'Säilyttäkää tämä vahvistus.',
  notFoundTitle: 'Lomaketta ei löytynyt',
  notFoundBody: 'Tässä osoitteessa ei ole lomaketta. Tarkistakaa linkki.',
  notReadyTitle: 'Lomake ei ole vielä käytettävissä',
  notReadyBody: 'Lomake ei vielä ota vastaan ilmoituksia. Yrittäkää myöhemmin uudelleen.',
  contactSupplier: 'Jos saitte linkin toimittajalta, ottakaa häneen yhteyttä.',

  errVerifyExpired: 'Tarkistusistuntonne on vanhentunut. Aloittakaa se uudelleen.',
  errVerifyStart: 'Henkilöllisyyden tarkistusta ei voitu aloittaa. Yrittäkää uudelleen.',
  errIncomplete: (list) => `Täyttäkää ensin lomake. Puuttuu: ${list}.`,
  errIdUnavailable: 'Henkilöllisyyden tarkistus ei ole tilapäisesti käytettävissä, joten lomaketta ei voi lähettää juuri nyt.',
  errRateLimited: 'Liian monta yritystä tästä yhteydestä. Odottakaa muutama minuutti ja yrittäkää uudelleen.',
  errGeneric: 'Jokin meni vikaan. Yrittäkää uudelleen.',

  server: {
    TERMS_REQUIRED: 'Teidän on hyväksyttävä ehdot.',
    FIELD_TOO_LONG: 'Yksi kentistä on liian pitkä. Lyhentäkää sitä ja yrittäkää uudelleen.',
    INVALID_EMAIL: 'Antakaa kelvollinen sähköpostiosoite.',
    FORM_NOT_OPEN: 'Lomake ei vielä ota vastaan ilmoituksia.',
    FIELD_REQUIRED: 'Pakollinen kenttä on tyhjä. Täyttäkää kaikki *-merkityt kentät.',
    BUYER_TYPE_REQUIRED: 'Valitkaa, oletteko yksityishenkilö vai yritys.',
    COMPANY_NAME_REQUIRED: 'Antakaa yrityksenne nimi.',
    VAT_REQUIRED: 'Antakaa ALV-tunnisteenne.',
    ID_UNAVAILABLE: 'Henkilöllisyyden tarkistus ei ole tilapäisesti käytettävissä. Yrittäkää myöhemmin uudelleen.',
    ID_REQUIRED: 'Suorittakaa ensin henkilöllisyyden tarkistus.',
    ID_EXPIRED: 'Henkilöllisyyden tarkistuksenne on vanhentunut tai jo käytetty. Aloittakaa se uudelleen.',
    ID_UNCONFIRMED: 'Henkilöllisyyden tarkistustanne ei voitu vahvistaa. Yrittäkää uudelleen.',
    ID_UNFINISHED: 'Henkilöllisyyden tarkistus ei ole vielä valmis. Suorittakaa se loppuun ja yrittäkää uudelleen.',
    ID_DOCUMENT_TYPE: 'Vain passit ja henkilökortit hyväksytään.',
    UNDER_AGE: 'Loppukäyttäjän ilmoituksen antaminen edellyttää vähintään 18 vuoden ikää.',
    BOT_CHECK_MISSING: 'Suorittakaa robottitarkistus ja yrittäkää uudelleen.',
    BOT_CHECK_ERROR: 'Robottitarkistusta ei voitu suorittaa. Yrittäkää uudelleen.',
    BOT_CHECK_FAILED: 'Robottitarkistus ei mennyt läpi. Yrittäkää uudelleen.',
  },

  vcDocTitle: 'Tarkistus valmis',
  vcTitle: 'Tarkistus on päättynyt',
  vcBody: 'Voitte sulkea tämän ikkunan ja palata lomakkeeseen. Se päivittyy itsestään.',
};

export default fi;
