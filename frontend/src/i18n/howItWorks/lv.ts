import type { HowItWorks } from './en.ts';

const lv: HowItWorks = {
  docTitle: 'Kā tas darbojas',
  badge: 'Pircējiem',
  title: 'Kā tas darbojas',
  lede: 'Pirms ķīmiskas vielas iegādes jums lūdza aizpildīt galalietotāja deklarāciju. Šajā lapā paskaidrots, kāpēc, kas notiek ar jūsu datiem un ko varat darīt.',
  sentBy: (seller) => `Jūs atnācāt no pārdevēja ${seller} veidlapas.`,
  backToForm: 'Atpakaļ uz veidlapu',
  contents: 'Šajā lapā',

  shortTitle: 'Īsumā',
  short: [
    'Pārdevējam ir jāpārbauda, kas un kam pērk noteiktas ķīmiskas vielas. To prasa likums, nevis veikals.',
    'Jūsu personu apliecinošo dokumentu pārbauda Didit. Tā fotoattēli nekad nenonāk pie pārdevēja vai pie mums.',
    'Jūsu deklarāciju lasa pārdevēja komanda. Dokumenta numurs paliek paslēpts, ja vien kāds to apzināti neatver, un katra atvēršana tiek reģistrēta.',
    'Pēc 18 mēnešiem viss tiek automātiski dzēsts.',
  ],

  whyTitle: 'Kāpēc man to jautā?',
  why: [
    'Dažas ķīmiskas vielas var ļaunprātīgi izmantot sprāgstvielu, narkotiku vai ieroču izgatavošanai. ES noteikumi — tostarp Regula (ES) 2019/1148 par sprāgstvielu prekursoriem — uzliek pārdevējiem pienākumu zināt, kam un kādam nolūkam viņi pārdod šīs vielas, to reģistrēt un ziņot par aizdomīgiem darījumiem.',
    'Jūsu aizpildītā deklarācija ir šis ieraksts. eustatement ir pakalpojums, ar kuru pārdevējs to savāc.',
  ],

  idTitle: 'Kas notiek ar manu personu apliecinošo dokumentu?',
  id: [
    'Ja pārdevējs pieprasa identitātes pārbaudi, atveras drošs Didit — mūsu identitātes pārbaudes pakalpojumu sniedzēja — logs. Jūs nofotografējat savu pasi vai personas apliecību un uzņemat īsu pašbildi. Didit pārbauda, vai dokuments ir īsts un pieder jums.',
    'Fotoattēli nonāk tikai pie Didit — tie nekad nenonāk pie pārdevēja vai pie mums. Tiklīdz rezultāts ir saglabāts, pārbaude Didit, ieskaitot fotoattēlus, tiek dzēsta.',
    'Saglabā rezultātu un to, kas uzdrukāts dokumentā: jūsu vārdu, dokumenta veidu un tā numuru. Jūsu dzimšanas datumu izmanto vienreiz, lai pārbaudītu, vai jums ir vismaz 18 gadu, un to neglabā.',
  ],

  storedTitle: 'Kas tiek glabāts, un kas to var redzēt?',
  stored: [
    'Veidlapā ievadītie dati, identitātes pārbaudes rezultāts un vielas automātisko pārbaužu rezultāts. Jūsu personas dati tiek glabāti šifrēti, serveros ES.',
    'Neviens cits pārdevējs nevar redzēt jūsu deklarāciju — tikai pārdevējs, no kura pērkat, un viņa komanda. Dokumenta numurs paliek paslēpts pat no viņiem: komandas loceklim tas jāapstiprina ar otru pieteikšanās soli, lai to redzētu, un katru reizi tas tiek reģistrēts.',
    'Mūsu darbinieki var atvērt deklarācijas, ja tas nepieciešams pakalpojuma darbībai un atbalstam. Arī viņi redz dokumenta numuru tikai tad, ja to apzināti atver, un šī atvēršana redzama pārdevēja žurnālā.',
  ],

  decideTitle: 'Kas izlemj?',
  decide: [
    'Katru deklarāciju izlasa un par to izlemj cilvēks pārdevēja pusē. Automātiskās pārbaudes — vai viela ir ierobežoto vielu sarakstā, vai norādītais lietojums satur brīdinājuma zīmes, vai uzņēmuma PVN reģistrācijas numurs ir derīgs — tikai norāda pārbaudītājam, kam vērts pievērst lielāku uzmanību. Tās nekad neko pašas neapstiprina un nenoraida.',
    'Vienīgais izņēmums ir vecums: ja jūsu dokuments rāda, ka jums ir mazāk par 18 gadiem, deklarāciju nevar nosūtīt.',
    'Ja jūsu deklarācija nav angļu vai nīderlandiešu valodā, to var mašīntulkot pārbaudītājam. Tas notiek mūsu pašu serverī; jūsu teksts netiek sūtīts tulkošanas pakalpojumam.',
  ],

  keptTitle: 'Cik ilgi to glabā?',
  kept: [
    '18 mēnešus no nosūtīšanas dienas. Pēc tam tā tiek automātiski dzēsta kopā ar visu iepriekš aprakstīto. Ja pārdevējs slēdz savu kontu agrāk, tā tiek dzēsta 30 dienas pēc tam.',
  ],

  othersTitle: 'Kas vēl ir iesaistīts?',
  othersIntro: 'Bez pārdevēja un mums lomu spēlē šādas puses:',
  others: [
    ['Didit', 'pārbauda jūsu personu apliecinošo dokumentu — tikai tad, ja to pieprasa pārdevējs.'],
    ['Eiropas Komisija (VIES)', 'pārbauda PVN reģistrācijas numuru — tikai tad, ja pasūtāt uzņēmuma vārdā.'],
    ['PubChem un Wikidata', 'palīdz identificēt vielu. Tās saņem vielas nosaukumu un CAS numuru, nekad neko par jums.'],
    ['Mūsu e-pasta pakalpojumu sniedzējs', 'piegādā apstiprinājumu un lēmumu jūsu pastkastītē.'],
    ['Cloudflare', 'aizsargā tīmekļa vietni pret uzbrukumiem un redz jūsu IP adresi, kad plūst datplūsma.'],
    ['Hetzner', 'mitina mūsu serverus ES.'],
  ],
  othersMore: 'Pilns saraksts ar atrašanās vietām ir mūsu privātuma politikā (angļu valodā).',

  rightsTitle: 'Kādas ir manas tiesības?',
  rights: [
    'Varat lūgt piekļuvi par jums glabātajiem datiem, to labošanu vai dzēšanu, ja to atļauj likums — pārdevējam var būt pienākums glabāt ierakstu tik ilgi, cik prasa noteikumi.',
  ],
  controller: (seller) => seller
    ? `Par jūsu datiem atbild ${seller} („pārzinis“); eustatement tos apstrādā viņa vārdā. Nosūtiet savu pieprasījumu pārdevējam ${seller}.`
    : 'Par jūsu datiem atbild pārdevējs („pārzinis“); eustatement tos apstrādā viņa vārdā. Nosūtiet savu pieprasījumu pārdevējam.',
  fallback: (email) => `Ja nevarat ar viņu sazināties, rakstiet uz ${email}; mēs pārsūtīsim jūsu pieprasījumu.`,
  complaint: 'Varat arī iesniegt sūdzību savas valsts datu aizsardzības iestādē.',

  questionsTitle: 'Jautājumi?',
  questionsOrder: 'Par pasūtījumu vai lēmumu: sazinieties ar pārdevēju.',
  questionsData: (email) => `Par šo lapu vai jūsu datu apstrādi: ${email}.`,

  lastUpdated: (date) => `Pēdējo reizi atjaunināts: ${date}`,
  privacyPolicy: 'Privātuma politika',
};

export default lv;
