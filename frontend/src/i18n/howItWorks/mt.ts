// Maltese is among the languages this was least certain in. Have the whole
// page read by a native speaker before relying on it.
import type { HowItWorks } from './en.ts';

const mt: HowItWorks = {
  docTitle: 'Kif jaħdem',
  badge: 'Għax-xerrejja',
  title: 'Kif jaħdem',
  lede: 'Intalabt timla dikjarazzjoni tal-utent finali qabel ma tixtri kimika. Din il-paġna tispjega għaliex, x’jiġri mid-dettalji tiegħek u x’tista’ tagħmel.',
  sentBy: (seller) => `Wasalt hawn mill-formola ta’ ${seller}.`,
  backToForm: 'Lura għall-formola',
  contents: 'F’din il-paġna',

  shortTitle: 'Fil-qosor',
  short: [
    'Il-bejjiegħ irid jiċċekkja min jixtri ċerti kimiki u għal xiex. Dan jeħtieġu l-liġi, mhux il-ħanut.',
    'Id-dokument tal-identità tiegħek jiċċekkjah Didit. Ir-ritratti tiegħu qatt ma jaslu għand il-bejjiegħ jew għandna.',
    'It-tim tal-bejjiegħ jaqra d-dikjarazzjoni tiegħek. In-numru tad-dokument jibqa’ moħbi sakemm ħadd ma jfittxu apposta, u kull tfittxija tiġi rreġistrata.',
    'Kollox jitħassar awtomatikament wara 18-il xahar.',
  ],

  whyTitle: 'Għaliex qed jintalab dan minni?',
  why: [
    'Xi kimiki jistgħu jintużaw ħażin biex isiru splussivi, drogi jew armi. Ir-regoli tal-UE — fosthom ir-Regolament (UE) 2019/1148 dwar il-prekursuri tal-isplussivi — jobbligaw lill-bejjiegħa jkunu jafu lil min u għal liema skop ibigħu dawn is-sustanzi, iżommu rekord ta’ dan u jirrappurtaw tranżazzjonijiet suspettużi.',
    'Id-dikjarazzjoni li timla hija dak ir-rekord. eustatement huwa s-servizz li l-bejjiegħ juża biex jiġborha.',
  ],

  idTitle: 'X’jiġri mid-dokument tal-identità tiegħi?',
  id: [
    'Jekk il-bejjiegħ jitlob verifika tal-identità, tinfetaħ tieqa sigura ta’ Didit, il-fornitur tagħna tal-verifika tal-identità. Tieħu ritratt tal-passaport jew tal-karta tal-identità tiegħek u selfie qasir. Didit jiċċekkja li d-dokument huwa ġenwin u li huwa tiegħek.',
    'Ir-ritratti jmorru għand Didit biss — qatt ma jaslu għand il-bejjiegħ jew għandna. Hekk kif ir-riżultat jiġi ssejvjat, il-verifika għand Didit, inklużi r-ritratti, titħassar.',
    'Jinżamm ir-riżultat u dak li hu stampat fuq id-dokument: ismek, it-tip ta’ dokument u n-numru tiegħu. Id-data tat-twelid tiegħek tintuża darba biss, biex jiġi ċċekkjat li għandek 18-il sena jew aktar, u ma tinżammx.',
  ],

  storedTitle: 'X’jinħażen, u min jista’ jarah?',
  stored: [
    'Id-dettalji li tikteb fil-formola, ir-riżultat tal-verifika tal-identità u r-riżultat tal-kontrolli awtomatiċi fuq is-sustanza. Id-dejta personali tiegħek tinħażen kriptata, fuq servers fl-UE.',
    'L-ebda bejjiegħ ieħor ma jista’ jara d-dikjarazzjoni tiegħek — biss il-bejjiegħ li qed tixtri mingħandu u t-tim tiegħu. In-numru tad-dokument jibqa’ moħbi anki minnhom: membru tat-tim irid jikkonferma b’pass ieħor tal-login biex jarah, u kull darba dan jiġi rreġistrat.',
    'L-istaff tagħna jista’ jiftaħ dikjarazzjonijiet meta jkun meħtieġ biex is-servizz jaħdem u jingħata appoġġ. Anki huma jaraw numru ta’ dokument biss jekk ifittxuh apposta, u dik it-tfittxija tidher fir-rekord tal-bejjiegħ.',
  ],

  decideTitle: 'Min jiddeċiedi?',
  decide: [
    'Persuna għand il-bejjiegħ taqra kull dikjarazzjoni u tiddeċiedi. Il-kontrolli awtomatiċi — jekk is-sustanza hijiex f’lista ristretta, jekk l-użu ddikjarat fihx sinjali ta’ twissija, jekk in-numru tal-VAT ta’ kumpanija huwiex validu — jindikaw biss lil min qed jeżamina x’jixraqlu ħarsa oħra. Qatt ma japprovaw jew jirrifjutaw xejn waħedhom.',
    'L-unika eċċezzjoni hija l-età: jekk id-dokument tiegħek juri li għandek inqas minn 18-il sena, id-dikjarazzjoni ma tistax tintbagħat.',
    'Jekk id-dikjarazzjoni tiegħek mhijiex bl-Ingliż jew bl-Olandiż, tista’ tiġi tradotta awtomatikament għal min qed jeżaminaha. Dan isir fuq is-server tagħna; it-test tiegħek ma jintbagħatx lil servizz tat-traduzzjoni.',
  ],

  keptTitle: 'Għal kemm żmien jinżamm?',
  kept: [
    '18-il xahar mill-jum li tibgħatha. Wara dan titħassar awtomatikament, flimkien ma’ dak kollu deskritt hawn fuq. Jekk il-bejjiegħ jagħlaq il-kont tiegħu qabel, titħassar 30 jum wara.',
  ],

  othersTitle: 'Min iktar huwa involut?',
  othersIntro: 'Minbarra l-bejjiegħ u aħna, dawn il-partijiet għandhom rwol:',
  others: [
    ['Didit', 'jiċċekkja d-dokument tal-identità tiegħek — biss jekk jitolbu l-bejjiegħ.'],
    ['Il-Kummissjoni Ewropea (VIES)', 'tiċċekkja n-numru tal-VAT — biss jekk tordna għal kumpanija.'],
    ['PubChem u Wikidata', 'jgħinu jidentifikaw is-sustanza. Jirċievu l-isem tas-sustanza u n-numru CAS, qatt xejn dwarek.'],
    ['Il-fornitur tal-email tagħna', 'iwassal il-konferma u d-deċiżjoni fil-kaxxa postali tiegħek.'],
    ['Cloudflare', 'jipproteġi s-sit minn attakki u jara l-indirizz IP tiegħek hekk kif jgħaddi t-traffiku.'],
    ['Hetzner', 'jospita s-servers tagħna fl-UE.'],
  ],
  othersMore: 'Il-lista sħiħa, bil-postijiet, tinsab fil-politika tal-privatezza tagħna (bl-Ingliż).',

  rightsTitle: 'X’inhuma d-drittijiet tiegħi?',
  rights: [
    'Tista’ titlob li tara d-dejta miżmuma dwarek, li tiġi kkoreġuta jew imħassra fejn il-liġi tippermetti — il-bejjiegħ jista’ jkun obbligat iżomm ir-rekord sakemm jeħtieġu r-regoli.',
  ],
  controller: (seller) => seller
    ? `${seller} huwa responsabbli għad-dejta tiegħek (il-“kontrollur”); eustatement jipproċessaha f’ismu. Ibgħat it-talba tiegħek lil ${seller}.`
    : 'Il-bejjiegħ huwa responsabbli għad-dejta tiegħek (il-“kontrollur”); eustatement jipproċessaha f’ismu. Ibgħat it-talba tiegħek lill-bejjiegħ.',
  fallback: (email) => `Jekk ma tistax tilħqu, ikteb lil ${email} u aħna ngħaddu t-talba tiegħek.`,
  complaint: 'Tista’ wkoll tressaq ilment quddiem l-awtorità tal-protezzjoni tad-dejta f’pajjiżek.',

  questionsTitle: 'Mistoqsijiet?',
  questionsOrder: 'Dwar l-ordni tiegħek jew id-deċiżjoni: ikkuntattja lill-bejjiegħ.',
  questionsData: (email) => `Dwar din il-paġna jew kif tiġi ttrattata d-dejta tiegħek: ${email}.`,

  lastUpdated: (date) => `L-aħħar aġġornament: ${date}`,
  privacyPolicy: 'Politika tal-privatezza',
};

export default mt;
