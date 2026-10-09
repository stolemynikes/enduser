import type { HowItWorks } from './en.ts';

const ro: HowItWorks = {
  docTitle: 'Cum funcționează',
  badge: 'Pentru cumpărători',
  title: 'Cum funcționează',
  lede: 'Vi s-a cerut să completați o declarație a utilizatorului final înainte de a cumpăra o substanță chimică. Această pagină explică de ce, ce se întâmplă cu datele dumneavoastră și ce puteți face.',
  sentBy: (seller) => `Ați ajuns aici din formularul vânzătorului ${seller}.`,
  backToForm: 'Înapoi la formular',
  contents: 'Pe această pagină',

  shortTitle: 'Pe scurt',
  short: [
    'Vânzătorul trebuie să verifice cine cumpără anumite substanțe chimice și în ce scop. O cere legea, nu este alegerea magazinului.',
    'Documentul dumneavoastră de identitate este verificat de Didit. Fotografiile acestuia nu ajung niciodată la vânzător sau la noi.',
    'Echipa vânzătorului vă citește declarația. Numărul documentului rămâne ascuns dacă nimeni nu îl consultă în mod deliberat, iar fiecare consultare este înregistrată.',
    'Totul se șterge automat după 18 luni.',
  ],

  whyTitle: 'De ce mi se cere acest lucru?',
  why: [
    'Unele substanțe chimice pot fi folosite abuziv pentru a fabrica explozivi, droguri sau arme. Normele UE — printre care Regulamentul (UE) 2019/1148 privind precursorii de explozivi — obligă vânzătorii să știe cui și în ce scop vând aceste substanțe, să țină evidența acestui lucru și să raporteze tranzacțiile suspecte.',
    'Declarația pe care o completați este această evidență. eustatement este serviciul pe care vânzătorul îl folosește pentru a o colecta.',
  ],

  idTitle: 'Ce se întâmplă cu documentul meu de identitate?',
  id: [
    'Dacă vânzătorul solicită verificarea identității, se deschide o fereastră securizată Didit, furnizorul nostru de verificare a identității. Fotografiați pașaportul sau cartea de identitate și faceți un scurt selfie. Didit verifică dacă documentul este autentic și dacă vă aparține.',
    'Fotografiile ajung doar la Didit — nu ajung niciodată la vânzător sau la noi. Imediat ce rezultatul este salvat, verificarea de la Didit, inclusiv fotografiile, este ștearsă.',
    'Se păstrează rezultatul și ceea ce este tipărit pe document: numele dumneavoastră, tipul documentului și numărul acestuia. Data nașterii este folosită o singură dată, pentru a verifica dacă aveți cel puțin 18 ani, și nu este păstrată.',
  ],

  storedTitle: 'Ce se stochează și cine poate vedea?',
  stored: [
    'Datele pe care le introduceți în formular, rezultatul verificării identității și rezultatul verificărilor automate ale substanței. Datele dumneavoastră personale sunt stocate criptat, pe servere din UE.',
    'Niciun alt vânzător nu vă poate vedea declarația — doar vânzătorul de la care cumpărați și echipa sa. Numărul documentului rămâne ascuns chiar și pentru ei: un membru al echipei trebuie să confirme printr-un al doilea pas de autentificare pentru a-l vedea, iar de fiecare dată acest lucru este înregistrat.',
    'Personalul nostru poate deschide declarații atunci când este necesar pentru funcționarea și asistența serviciului. Și acesta vede un număr de document doar consultându-l în mod deliberat, iar consultarea apare în evidența vânzătorului.',
  ],

  decideTitle: 'Cine decide?',
  decide: [
    'O persoană de la vânzător citește fiecare declarație și decide. Verificările automate — dacă substanța se află pe o listă restricționată, dacă utilizarea declarată conține semnale de alarmă, dacă codul de TVA al unei societăți este valabil — doar semnalează celui care examinează ce merită o privire mai atentă. Nu aprobă și nu resping niciodată nimic de la sine.',
    'Singura excepție este vârsta: dacă documentul arată că aveți sub 18 ani, declarația nu poate fi trimisă.',
    'Dacă declarația nu este în engleză sau neerlandeză, ea poate fi tradusă automat pentru cel care o examinează. Acest lucru are loc pe propriul nostru server; textul dumneavoastră nu este trimis niciunui serviciu de traducere.',
  ],

  keptTitle: 'Cât timp se păstrează?',
  kept: [
    '18 luni de la data trimiterii. După aceea este ștearsă automat, împreună cu tot ce este descris mai sus. Dacă vânzătorul își închide contul mai devreme, este ștearsă la 30 de zile după aceea.',
  ],

  othersTitle: 'Cine mai este implicat?',
  othersIntro: 'Pe lângă vânzător și noi, aceste părți au un rol:',
  others: [
    ['Didit', 'verifică documentul dumneavoastră de identitate — doar dacă vânzătorul o cere.'],
    ['Comisia Europeană (VIES)', 'verifică codul de TVA — doar dacă comandați în numele unei societăți.'],
    ['PubChem și Wikidata', 'ajută la identificarea substanței. Primesc denumirea substanței și numărul CAS, niciodată nimic despre dumneavoastră.'],
    ['Furnizorul nostru de e-mail', 'livrează confirmarea și decizia în căsuța dumneavoastră poștală.'],
    ['Cloudflare', 'protejează site-ul împotriva atacurilor și vede adresa dumneavoastră IP când trece traficul.'],
    ['Hetzner', 'găzduiește serverele noastre în UE.'],
  ],
  othersMore: 'Lista completă, cu locațiile, se află în politica noastră de confidențialitate (în limba engleză).',

  rightsTitle: 'Care sunt drepturile mele?',
  rights: [
    'Puteți solicita accesul la datele care vă privesc, rectificarea sau ștergerea lor acolo unde legea permite — vânzătorul poate fi obligat să păstreze evidența atât timp cât o impun normele.',
  ],
  controller: (seller) => seller
    ? `${seller} este responsabil pentru datele dumneavoastră („operatorul”); eustatement le prelucrează în numele acestuia. Trimiteți solicitarea la ${seller}.`
    : 'Vânzătorul este responsabil pentru datele dumneavoastră („operatorul”); eustatement le prelucrează în numele acestuia. Trimiteți solicitarea vânzătorului.',
  fallback: (email) => `Dacă nu îl puteți contacta, scrieți la ${email}, iar noi vom transmite solicitarea.`,
  complaint: 'Puteți depune și o plângere la autoritatea de protecție a datelor din țara dumneavoastră.',

  questionsTitle: 'Întrebări?',
  questionsOrder: 'Despre comandă sau decizie: contactați vânzătorul.',
  questionsData: (email) => `Despre această pagină sau modul în care vă sunt prelucrate datele: ${email}.`,

  lastUpdated: (date) => `Ultima actualizare: ${date}`,
  privacyPolicy: 'Politica de confidențialitate',
};

export default ro;
