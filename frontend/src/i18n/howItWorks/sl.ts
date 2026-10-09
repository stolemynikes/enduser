import type { HowItWorks } from './en.ts';

const sl: HowItWorks = {
  docTitle: 'Kako to deluje',
  badge: 'Za kupce',
  title: 'Kako to deluje',
  lede: 'Pred nakupom kemikalije ste bili zaprošeni, da izpolnite izjavo končnega uporabnika. Ta stran pojasnjuje, zakaj, kaj se zgodi z vašimi podatki in kaj lahko storite.',
  sentBy: (seller) => `Sem ste prišli z obrazca prodajalca ${seller}.`,
  backToForm: 'Nazaj na obrazec',
  contents: 'Na tej strani',

  shortTitle: 'Na kratko',
  short: [
    'Prodajalec mora preveriti, kdo kupuje nekatere kemikalije in za kaj. To zahteva zakon, ne trgovina.',
    'Vaš osebni dokument preveri Didit. Njegove fotografije nikoli ne pridejo do prodajalca ali do nas.',
    'Vašo izjavo bere ekipa prodajalca. Številka dokumenta ostane skrita, razen če jo kdo namenoma prikliče, in vsak priklic se zabeleži.',
    'Po 18 mesecih se vse samodejno izbriše.',
  ],

  whyTitle: 'Zakaj me to sprašujete?',
  why: [
    'Nekatere kemikalije je mogoče zlorabiti za izdelavo eksplozivov, drog ali orožja. Predpisi EU — med njimi Uredba (EU) 2019/1148 o predhodnih sestavinah za eksplozive — od prodajalcev zahtevajo, da vedo, komu in za kakšen namen prodajajo te snovi, da to evidentirajo in da sporočajo sumljive transakcije.',
    'Izjava, ki jo izpolnite, je ta evidenca. eustatement je storitev, s katero jo prodajalec zbira.',
  ],

  idTitle: 'Kaj se zgodi z mojim osebnim dokumentom?',
  id: [
    'Če prodajalec zahteva preverjanje istovetnosti, se odpre varno okno ponudnika Didit, ki za nas izvaja preverjanje istovetnosti. Fotografirate potni list ali osebno izkaznico in posnamete kratek selfi. Didit preveri, ali je dokument pristen in ali je vaš.',
    'Fotografije gredo samo k Diditu — nikoli ne pridejo do prodajalca ali do nas. Takoj ko je izid shranjen, se preverjanje pri Diditu, skupaj s fotografijami, izbriše.',
    'Ohrani se izid in to, kar je natisnjeno na dokumentu: vaše ime, vrsta dokumenta in njegova številka. Datum rojstva se uporabi enkrat, da se preveri, ali ste stari vsaj 18 let, in se ne hrani.',
  ],

  storedTitle: 'Kaj se shrani in kdo lahko to vidi?',
  stored: [
    'Podatki, ki jih vnesete v obrazec, izid preverjanja istovetnosti in izid samodejnih preverjanj snovi. Vaši osebni podatki se shranjujejo šifrirano, na strežnikih v EU.',
    'Noben drug prodajalec ne vidi vaše izjave — le prodajalec, pri katerem kupujete, in njegova ekipa. Številka dokumenta ostane skrita tudi pred njimi: član ekipe jo mora za ogled potrditi z drugim korakom prijave in vsakič se to zabeleži.',
    'Naši zaposleni lahko odprejo izjave, kadar je to potrebno za delovanje in podporo storitve. Tudi oni vidijo številko dokumenta le, če jo namenoma prikličejo, in ta priklic je viden v evidenci prodajalca.',
  ],

  decideTitle: 'Kdo odloča?',
  decide: [
    'Vsako izjavo prebere in o njej odloči človek pri prodajalcu. Samodejna preverjanja — ali je snov na seznamu omejenih snovi, ali navedena uporaba vsebuje opozorilne znake, ali je identifikacijska številka za DDV podjetja veljavna — ocenjevalca le opozorijo na to, kar si zasluži natančnejši pogled. Nikoli sama ničesar ne odobrijo ali zavrnejo.',
    'Edina izjema je starost: če dokument kaže, da ste mlajši od 18 let, izjave ni mogoče poslati.',
    'Če izjava ni v angleščini ali nizozemščini, jo lahko za ocenjevalca strojno prevedemo. To se zgodi na našem lastnem strežniku; vaše besedilo se ne pošlje nobeni prevajalski storitvi.',
  ],

  keptTitle: 'Kako dolgo se hrani?',
  kept: [
    '18 mesecev od dneva pošiljanja. Nato se samodejno izbriše, skupaj z vsem, kar je opisano zgoraj. Če prodajalec prej zapre svoj račun, se izbriše 30 dni pozneje.',
  ],

  othersTitle: 'Kdo še sodeluje?',
  othersIntro: 'Poleg prodajalca in nas imajo vlogo te strani:',
  others: [
    ['Didit', 'preveri vaš osebni dokument — le če to zahteva prodajalec.'],
    ['Evropska komisija (VIES)', 'preveri identifikacijsko številko za DDV — le če naročate za podjetje.'],
    ['PubChem in Wikidata', 'pomagata prepoznati snov. Prejmeta ime snovi in številko CAS, nikoli ničesar o vas.'],
    ['Naš ponudnik e-pošte', 'dostavi potrditev in odločitev v vaš poštni predal.'],
    ['Cloudflare', 'ščiti spletno mesto pred napadi in ob prehodu prometa vidi vaš naslov IP.'],
    ['Hetzner', 'gosti naše strežnike v EU.'],
  ],
  othersMore: 'Celoten seznam z lokacijami je v našem pravilniku o zasebnosti (v angleščini).',

  rightsTitle: 'Kakšne so moje pravice?',
  rights: [
    'Zahtevate lahko vpogled v podatke o sebi, njihov popravek ali izbris, kjer to dovoljuje zakon — prodajalec je lahko dolžan hraniti evidenco tako dolgo, kot zahtevajo predpisi.',
  ],
  controller: (seller) => seller
    ? `Za vaše podatke je odgovoren ${seller} („upravljavec“); eustatement jih obdeluje v njegovem imenu. Zahtevo pošljite prodajalcu ${seller}.`
    : 'Za vaše podatke je odgovoren prodajalec („upravljavec“); eustatement jih obdeluje v njegovem imenu. Zahtevo pošljite prodajalcu.',
  fallback: (email) => `Če ga ne morete doseči, pišite na ${email}; vašo zahtevo bomo posredovali.`,
  complaint: 'Pritožbo lahko vložite tudi pri organu za varstvo podatkov v svoji državi.',

  questionsTitle: 'Vprašanja?',
  questionsOrder: 'Glede naročila ali odločitve: obrnite se na prodajalca.',
  questionsData: (email) => `Glede te strani ali obdelave vaših podatkov: ${email}.`,

  lastUpdated: (date) => `Zadnja posodobitev: ${date}`,
  privacyPolicy: 'Pravilnik o zasebnosti',
};

export default sl;
