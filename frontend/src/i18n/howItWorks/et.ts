import type { HowItWorks } from './en.ts';

const et: HowItWorks = {
  docTitle: 'Kuidas see toimib',
  badge: 'Ostjatele',
  title: 'Kuidas see toimib',
  lede: 'Teil paluti enne kemikaali ostmist täita lõppkasutaja deklaratsioon. Sellel lehel selgitatakse, miks, mis teie andmetega juhtub ja mida saate ise teha.',
  sentBy: (seller) => `Tulite siia müüja ${seller} vormilt.`,
  backToForm: 'Tagasi vormi juurde',
  contents: 'Sellel lehel',

  shortTitle: 'Lühidalt',
  short: [
    'Müüja peab kontrollima, kes teatud kemikaale ostab ja milleks. Seda nõuab seadus, mitte pood.',
    'Teie isikut tõendavat dokumenti kontrollib Didit. Selle fotod ei jõua kunagi müüja ega meieni.',
    'Teie deklaratsiooni loeb müüja meeskond. Dokumendi number jääb varjatuks, kui keegi seda teadlikult ei ava, ja iga avamine registreeritakse.',
    'Kõik kustutatakse automaatselt 18 kuu möödudes.',
  ],

  whyTitle: 'Miks seda minult küsitakse?',
  why: [
    'Mõnda kemikaali saab kuritarvitada lõhkeainete, narkootikumide või relvade valmistamiseks. ELi õigusaktid — muu hulgas määrus (EL) 2019/1148 lõhkeainete lähteainete kohta — kohustavad müüjaid teadma, kellele ja milleks nad neid aineid müüvad, seda dokumenteerima ja kahtlastest tehingutest teatama.',
    'Teie täidetav deklaratsioon on see dokument. eustatement on teenus, mille abil müüja selle kogub.',
  ],

  idTitle: 'Mis juhtub minu isikut tõendava dokumendiga?',
  id: [
    'Kui müüja nõuab isikusamasuse kontrolli, avaneb Diditi, meie isikusamasuse kontrolli teenusepakkuja turvaline aken. Pildistate oma passi või isikutunnistust ja teete lühikese selfi. Didit kontrollib, et dokument on ehtne ja kuulub teile.',
    'Fotod lähevad ainult Diditile — need ei jõua kunagi müüja ega meieni. Kohe, kui tulemus on salvestatud, kustutatakse kontroll Diditis koos fotodega.',
    'Alles jääb tulemus ja see, mis on dokumendile trükitud: teie nimi, dokumendi liik ja number. Teie sünnikuupäeva kasutatakse üks kord, et kontrollida, et olete vähemalt 18-aastane, ja seda ei säilitata.',
  ],

  storedTitle: 'Mida säilitatakse ja kes seda näeb?',
  stored: [
    'Vormi sisestatud andmed, isikusamasuse kontrolli tulemus ja aine automaatsete kontrollide tulemus. Teie isikuandmeid säilitatakse krüpteeritult ELis asuvates serverites.',
    'Ükski teine müüja ei näe teie deklaratsiooni — ainult müüja, kellelt ostate, ja tema meeskond. Dokumendi number jääb isegi nende eest varjatuks: meeskonnaliige peab selle nägemiseks kinnitama teise sisselogimissammuga ja iga kord registreeritakse.',
    'Meie töötajad võivad deklaratsioone avada, kui see on vajalik teenuse toimimiseks ja toetamiseks. Ka nemad näevad dokumendi numbrit ainult siis, kui nad selle teadlikult avavad, ja see avamine on nähtav müüja logis.',
  ],

  decideTitle: 'Kes otsustab?',
  decide: [
    'Müüja poolel loeb iga deklaratsiooni inimene ja otsustab. Automaatsed kontrollid — kas aine on piiratud ainete loetelus, kas märgitud kasutus sisaldab hoiatusmärke, kas ettevõtte KMKR number kehtib — näitavad läbivaatajale ainult seda, mis väärib lähemat pilku. Need ei kiida kunagi midagi heaks ega lükka tagasi iseseisvalt.',
    'Ainus erand on vanus: kui teie dokumendist nähtub, et olete alla 18-aastane, ei saa deklaratsiooni saata.',
    'Kui teie deklaratsioon ei ole inglise ega hollandi keeles, võidakse see läbivaataja jaoks masintõlkida. See toimub meie enda serveris; teie teksti ei saadeta tõlketeenusele.',
  ],

  keptTitle: 'Kui kaua seda säilitatakse?',
  kept: [
    '18 kuud saatmise päevast. Seejärel kustutatakse see automaatselt koos kõige ülalkirjeldatuga. Kui müüja sulgeb oma konto varem, kustutatakse see 30 päeva pärast seda.',
  ],

  othersTitle: 'Kes veel on kaasatud?',
  othersIntro: 'Lisaks müüjale ja meile on oma roll järgmistel osapooltel:',
  others: [
    ['Didit', 'kontrollib teie isikut tõendavat dokumenti — ainult siis, kui müüja seda nõuab.'],
    ['Euroopa Komisjon (VIES)', 'kontrollib KMKR numbrit — ainult siis, kui tellite ettevõtte nimel.'],
    ['PubChem ja Wikidata', 'aitavad ainet tuvastada. Need saavad aine nimetuse ja CAS-numbri, mitte kunagi midagi teie kohta.'],
    ['Meie e-posti teenusepakkuja', 'toimetab kinnituse ja otsuse teie postkasti.'],
    ['Cloudflare', 'kaitseb veebisaiti rünnakute eest ja näeb liikluse läbimisel teie IP-aadressi.'],
    ['Hetzner', 'majutab meie servereid ELis.'],
  ],
  othersMore: 'Täielik loetelu koos asukohtadega on meie privaatsuspoliitikas (inglise keeles).',

  rightsTitle: 'Millised on minu õigused?',
  rights: [
    'Võite taotleda teie kohta säilitatavate andmetega tutvumist, nende parandamist või kustutamist, kui seadus seda lubab — müüja võib olla kohustatud säilitama dokumenti nii kaua, kui õigusaktid nõuavad.',
  ],
  controller: (seller) => seller
    ? `Teie andmete eest vastutab ${seller} („vastutav töötleja“); eustatement töötleb neid tema nimel. Saatke oma taotlus müüjale ${seller}.`
    : 'Teie andmete eest vastutab müüja („vastutav töötleja“); eustatement töötleb neid tema nimel. Saatke oma taotlus müüjale.',
  fallback: (email) => `Kui te müüjaga ühendust ei saa, kirjutage aadressil ${email}; edastame teie taotluse.`,
  complaint: 'Samuti võite esitada kaebuse oma riigi andmekaitseasutusele.',

  questionsTitle: 'Küsimusi?',
  questionsOrder: 'Tellimuse või otsuse kohta: võtke ühendust müüjaga.',
  questionsData: (email) => `Selle lehe või teie andmete töötlemise kohta: ${email}.`,

  lastUpdated: (date) => `Viimati uuendatud: ${date}`,
  privacyPolicy: 'Privaatsuspoliitika',
};

export default et;
