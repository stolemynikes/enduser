import type { HowItWorks } from './en.ts';

const hu: HowItWorks = {
  docTitle: 'Hogyan működik',
  badge: 'Vevőknek',
  title: 'Hogyan működik',
  lede: 'Egy vegyi anyag megvásárlása előtt végfelhasználói nyilatkozat kitöltését kérték Öntől. Ez az oldal elmagyarázza, miért, mi történik az adataival, és mit tehet Ön.',
  sentBy: (seller) => `A(z) ${seller} űrlapjáról érkezett ide.`,
  backToForm: 'Vissza az űrlaphoz',
  contents: 'Ezen az oldalon',

  shortTitle: 'Röviden',
  short: [
    'Az eladónak ellenőriznie kell, ki vásárol bizonyos vegyi anyagokat és mire. Ezt a jogszabály írja elő, nem a bolt döntése.',
    'Személyazonosító okmányát a Didit ellenőrzi. A róla készült fényképek soha nem jutnak el az eladóhoz vagy hozzánk.',
    'Nyilatkozatát az eladó csapata olvassa. Az okmány száma rejtve marad, hacsak valaki szándékosan le nem kéri, és minden lekérést naplózunk.',
    'Minden automatikusan törlődik 18 hónap után.',
  ],

  whyTitle: 'Miért kérik ezt tőlem?',
  why: [
    'Egyes vegyi anyagokkal vissza lehet élni robbanóanyag, kábítószer vagy fegyver előállítására. Az uniós szabályok — köztük a robbanóanyag-prekurzorokról szóló (EU) 2019/1148 rendelet — előírják, hogy az eladók tudják, kinek és milyen célra adják el ezeket az anyagokat, ezt rögzítsék, és jelentsék a gyanús ügyleteket.',
    'Az Ön által kitöltött nyilatkozat ez a rögzítés. Az eustatement az a szolgáltatás, amellyel az eladó összegyűjti.',
  ],

  idTitle: 'Mi történik a személyazonosító okmányommal?',
  id: [
    'Ha az eladó személyazonosság-ellenőrzést kér, megnyílik a Didit — személyazonosság-ellenőrzési szolgáltatónk — biztonságos ablaka. Lefényképezi útlevelét vagy személyi igazolványát, és készít egy rövid szelfit. A Didit ellenőrzi, hogy az okmány valódi-e, és Öné-e.',
    'A fényképek csak a Didithez kerülnek — soha nem jutnak el az eladóhoz vagy hozzánk. Amint az eredményt elmentettük, az ellenőrzést a Diditnél a fényképekkel együtt töröljük.',
    'Megőrizzük az eredményt és az okmányra nyomtatott adatokat: az Ön nevét, az okmány típusát és számát. Születési dátumát egyszer használjuk annak ellenőrzésére, hogy elmúlt-e 18 éves, és nem tároljuk.',
  ],

  storedTitle: 'Mit tárolnak, és ki láthatja?',
  stored: [
    'Az űrlapon megadott adatokat, a személyazonosság-ellenőrzés eredményét és az anyag automatikus ellenőrzéseinek eredményét. Személyes adatait titkosítva, az EU-ban lévő szervereken tároljuk.',
    'Más eladó nem láthatja nyilatkozatát — csak az az eladó és csapata, akitől vásárol. Az okmány száma még előlük is rejtve marad: egy csapattagnak egy második bejelentkezési lépéssel kell megerősítenie, hogy lássa, és ezt minden alkalommal naplózzuk.',
    'Saját munkatársaink megnyithatják a nyilatkozatokat, ha ez a szolgáltatás működtetéséhez és támogatásához szükséges. Ők is csak szándékos lekéréssel látják az okmány számát, és ez a lekérés megjelenik az eladó naplójában.',
  ],

  decideTitle: 'Ki dönt?',
  decide: [
    'Az eladónál egy ember elolvas minden nyilatkozatot, és dönt. Az automatikus ellenőrzések — szerepel-e az anyag korlátozott anyagok listáján, tartalmaz-e a megadott felhasználás figyelmeztető jeleket, érvényes-e egy cég közösségi adószáma — csak arra hívják fel a bíráló figyelmét, ami alaposabb vizsgálatot érdemel. Soha nem hagynak jóvá és nem utasítanak el semmit önállóan.',
    'Az egyetlen kivétel az életkor: ha okmánya szerint Ön 18 évesnél fiatalabb, a nyilatkozat nem küldhető el.',
    'Ha nyilatkozata nem angol vagy holland nyelvű, a bíráló számára gépi fordítás készülhet. Ez saját szerverünkön történik; szövegét nem küldjük el fordítószolgáltatásnak.',
  ],

  keptTitle: 'Meddig őrzik meg?',
  kept: [
    'Az elküldés napjától számított 18 hónapig. Ezután automatikusan törlődik, a fent leírtakkal együtt. Ha az eladó korábban megszünteti fiókját, 30 nappal azután törlődik.',
  ],

  othersTitle: 'Ki vesz még részt?',
  othersIntro: 'Az eladón és rajtunk kívül ezek a felek vesznek részt:',
  others: [
    ['Didit', 'ellenőrzi személyazonosító okmányát — csak ha az eladó kéri.'],
    ['Az Európai Bizottság (VIES)', 'ellenőrzi a közösségi adószámot — csak ha cég nevében rendel.'],
    ['PubChem és Wikidata', 'segítenek azonosítani az anyagot. Az anyag nevét és CAS-számát kapják meg, soha semmit Önről.'],
    ['E-mail-szolgáltatónk', 'kézbesíti a visszaigazolást és a döntést a postafiókjába.'],
    ['Cloudflare', 'védi a webhelyet a támadásoktól, és a forgalom áthaladásakor látja az IP-címét.'],
    ['Hetzner', 'üzemelteti szervereinket az EU-ban.'],
  ],
  othersMore: 'A teljes lista a helyszínekkel együtt adatvédelmi szabályzatunkban található (angolul).',

  rightsTitle: 'Milyen jogaim vannak?',
  rights: [
    'Kérheti a róla tárolt adatokhoz való hozzáférést, azok helyesbítését vagy — amennyiben a jogszabály megengedi — törlését; az eladó köteles lehet a nyilvántartást addig megőrizni, ameddig a szabályok előírják.',
  ],
  controller: (seller) => seller
    ? `Adataiért a(z) ${seller} felel (az „adatkezelő”); az eustatement az ő megbízásából kezeli azokat. Kérését küldje a(z) ${seller} részére.`
    : 'Adataiért az eladó felel (az „adatkezelő”); az eustatement az ő megbízásából kezeli azokat. Kérését küldje az eladónak.',
  fallback: (email) => `Ha nem éri el őket, írjon a(z) ${email} címre, és továbbítjuk kérését.`,
  complaint: 'Panaszt tehet az Ön országának adatvédelmi hatóságánál is.',

  questionsTitle: 'Kérdése van?',
  questionsOrder: 'A rendeléssel vagy a döntéssel kapcsolatban: forduljon az eladóhoz.',
  questionsData: (email) => `Ezzel az oldallal vagy adatai kezelésével kapcsolatban: ${email}.`,

  lastUpdated: (date) => `Utoljára frissítve: ${date}`,
  privacyPolicy: 'Adatvédelmi szabályzat',
};

export default hu;
