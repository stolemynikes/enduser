import type { HowItWorks } from './en.ts';

const fi: HowItWorks = {
  docTitle: 'Näin tämä toimii',
  badge: 'Ostajille',
  title: 'Näin tämä toimii',
  lede: 'Teitä pyydettiin täyttämään loppukäyttäjän ilmoitus ennen kemikaalin ostamista. Tällä sivulla kerrotaan, miksi, mitä tiedoillenne tapahtuu ja mitä voitte itse tehdä.',
  sentBy: (seller) => `Tulitte tänne myyjän ${seller} lomakkeelta.`,
  backToForm: 'Takaisin lomakkeeseen',
  contents: 'Tällä sivulla',

  shortTitle: 'Lyhyesti',
  short: [
    'Myyjän on tarkistettava, kuka ostaa tiettyjä kemikaaleja ja mihin. Sen vaatii laki — se ei ole kaupan oma valinta.',
    'Henkilöllisyystodistuksenne tarkistaa Didit. Kuvat siitä eivät koskaan päädy myyjälle tai meille.',
    'Myyjän tiimi lukee ilmoituksenne. Asiakirjan numero pysyy piilossa, ellei joku hae sitä tarkoituksella, ja jokainen haku kirjataan.',
    'Kaikki poistetaan automaattisesti 18 kuukauden kuluttua.',
  ],

  whyTitle: 'Miksi tätä kysytään minulta?',
  why: [
    'Joitakin kemikaaleja voidaan käyttää väärin räjähteiden, huumeiden tai aseiden valmistukseen. EU:n säännöt — muun muassa räjähteiden lähtöaineista annettu asetus (EU) 2019/1148 — velvoittavat myyjät tietämään, kenelle ja mihin tarkoitukseen ne myyvät näitä aineita, kirjaamaan sen ja ilmoittamaan epäilyttävistä liiketoimista.',
    'Täyttämänne ilmoitus on tämä kirjaus. eustatement on palvelu, jolla myyjä kerää sen.',
  ],

  idTitle: 'Mitä henkilöllisyystodistukselleni tapahtuu?',
  id: [
    'Jos myyjä edellyttää henkilöllisyyden tarkistusta, avautuu suojattu ikkuna Diditiltä, henkilöllisyyden tarkistuspalvelumme tarjoajalta. Valokuvaatte passinne tai henkilökorttinne ja otatte lyhyen selfien. Didit tarkistaa, että asiakirja on aito ja kuuluu teille.',
    'Kuvat menevät vain Diditille — ne eivät koskaan päädy myyjälle tai meille. Heti kun tulos on tallennettu, tarkistus Diditillä kuvineen poistetaan.',
    'Säilytetään tulos ja asiakirjaan painetut tiedot: nimenne, asiakirjan tyyppi ja sen numero. Syntymäaikaanne käytetään kerran sen tarkistamiseen, että olette vähintään 18-vuotias, eikä sitä tallenneta.',
  ],

  storedTitle: 'Mitä tallennetaan, ja kuka sen näkee?',
  stored: [
    'Lomakkeeseen syöttämänne tiedot, henkilöllisyyden tarkistuksen tulos ja aineen automaattisten tarkistusten tulos. Henkilötietonne tallennetaan salattuina EU:ssa sijaitseville palvelimille.',
    'Mikään muu myyjä ei näe ilmoitustanne — vain myyjä, jolta ostatte, ja sen tiimi. Asiakirjan numero pysyy piilossa jopa heiltä: tiimin jäsenen on vahvistettava toisella kirjautumisvaiheella nähdäkseen sen, ja jokainen kerta kirjataan.',
    'Oma henkilöstömme voi avata ilmoituksia, kun se on tarpeen palvelun ylläpitämiseksi ja tukemiseksi. Hekin näkevät asiakirjan numeron vain hakemalla sen tarkoituksella, ja haku näkyy myyjän lokissa.',
  ],

  decideTitle: 'Kuka päättää?',
  decide: [
    'Myyjän puolella ihminen lukee jokaisen ilmoituksen ja päättää. Automaattiset tarkistukset — onko aine rajoitettujen aineiden luettelossa, sisältääkö ilmoitettu käyttö varoitusmerkkejä, onko yrityksen ALV-tunniste voimassa — vain osoittavat tarkastajalle, mikä ansaitsee tarkemman katseen. Ne eivät koskaan hyväksy tai hylkää mitään itse.',
    'Ainoa poikkeus on ikä: jos asiakirjanne osoittaa, että olette alle 18-vuotias, ilmoitusta ei voi lähettää.',
    'Jos ilmoituksenne ei ole englanniksi tai hollanniksi, se voidaan konekääntää tarkastajaa varten. Se tapahtuu omalla palvelimellamme; tekstiänne ei lähetetä käännöspalveluun.',
  ],

  keptTitle: 'Kuinka kauan tietoja säilytetään?',
  kept: [
    '18 kuukautta lähetyspäivästä. Sen jälkeen ilmoitus poistetaan automaattisesti kaikkine edellä kuvattuine tietoineen. Jos myyjä sulkee tilinsä aiemmin, se poistetaan 30 päivää sen jälkeen.',
  ],

  othersTitle: 'Keitä muita on mukana?',
  othersIntro: 'Myyjän ja meidän lisäksi mukana ovat seuraavat tahot:',
  others: [
    ['Didit', 'tarkistaa henkilöllisyystodistuksenne — vain jos myyjä sitä pyytää.'],
    ['Euroopan komissio (VIES)', 'tarkistaa ALV-tunnisteen — vain jos tilaatte yrityksen puolesta.'],
    ['PubChem ja Wikidata', 'auttavat tunnistamaan aineen. Ne saavat aineen nimen ja CAS-numeron, eivät koskaan mitään teistä.'],
    ['Sähköpostipalvelumme', 'toimittaa vahvistuksen ja päätöksen sähköpostiinne.'],
    ['Cloudflare', 'suojaa sivustoa hyökkäyksiltä ja näkee IP-osoitteenne liikenteen kulkiessa.'],
    ['Hetzner', 'ylläpitää palvelimiamme EU:ssa.'],
  ],
  othersMore: 'Täydellinen luettelo sijainteineen on tietosuojakäytännössämme (englanniksi).',

  rightsTitle: 'Mitkä ovat oikeuteni?',
  rights: [
    'Voitte pyytää nähdä teistä säilytetyt tiedot, oikaista ne tai poistaa ne, kun laki sen sallii — myyjä voi olla velvollinen säilyttämään kirjauksen niin kauan kuin säännöt edellyttävät.',
  ],
  controller: (seller) => seller
    ? `${seller} vastaa tiedoistanne (”rekisterinpitäjä”); eustatement käsittelee niitä sen puolesta. Lähettäkää pyyntönne myyjälle ${seller}.`
    : 'Myyjä vastaa tiedoistanne (”rekisterinpitäjä”); eustatement käsittelee niitä myyjän puolesta. Lähettäkää pyyntönne myyjälle.',
  fallback: (email) => `Jos ette tavoita myyjää, kirjoittakaa osoitteeseen ${email}, niin välitämme pyyntönne eteenpäin.`,
  complaint: 'Voitte myös tehdä valituksen oman maanne tietosuojaviranomaiselle.',

  questionsTitle: 'Kysyttävää?',
  questionsOrder: 'Tilaukseen tai päätökseen liittyen: ottakaa yhteyttä myyjään.',
  questionsData: (email) => `Tähän sivuun tai tietojenne käsittelyyn liittyen: ${email}.`,

  lastUpdated: (date) => `Päivitetty viimeksi: ${date}`,
  privacyPolicy: 'Tietosuojakäytäntö',
};

export default fi;
