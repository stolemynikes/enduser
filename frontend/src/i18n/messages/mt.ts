// Malti. It-termini ANNEX IV kelma b'kelma mill-verżjoni Maltija tar-Regolament
// (UE) 2019/1148, Anness IV. Regoli: ara en.ts.
//
// Maltese is the language I am least sure of in this set. Every line here,
// not only the LEGAL ones, should be read by a native speaker before launch.
import type { Messages } from './en.ts';

const mt: Messages = {
  docTitle: 'Dikjarazzjoni tal-utent finali',
  docTitleCompany: (company) => `${company} — Dikjarazzjoni`,
  badge: 'Dokument uffiċjali',
  title: 'Dikjarazzjoni tal-utent finali',
  subtitle: 'Sustanzi kimiċi — dikjarazzjoni ta’ użu regolat',
  submittedTo: (company) => `Sottomessa lil: ${company}`,
  themeToggle: 'Ċar jew skur',

  language: 'Lingwa',
  languageSearch: 'Fittex lingwa',
  languageNone: 'Ma nstabet l-ebda lingwa',
  languageSuggested: 'Issuġġeriti',
  languageAll: 'Il-lingwi kollha',

  secBuyerType: 'Tip ta’ xerrej',
  secContact: 'Dettalji ta’ kuntatt',
  secCompany: 'Dettalji tal-kumpanija',
  secAddress: 'Indirizz',
  secSubstance: 'Informazzjoni dwar is-sustanza',
  secIdentity: 'Verifika tal-identità',
  secTerms: 'Termini u kundizzjonijiet',

  buyerTypeQuestion: 'Qed tordna bħala individwu privat jew f’isem kumpanija?',
  buyerIndividual: 'Individwu',
  buyerCompany: 'Kumpanija',

  optional: '(fakultattiv)',
  email: 'Posta elettronika',
  orderNumber: 'Numru tal-ordni',
  firstName: 'Isem',
  lastName: 'Kunjom',
  companyName: 'Isem il-kumpanija',
  vatNumber: 'Numru tal-VAT',
  vatHint: 'Meħtieġ għall-kontroll VIES tal-UE, eż. MT12345678',
  street: 'Triq u numru',
  zipCode: 'Kodiċi postali',
  place: 'Belt jew raħal',
  country: 'Pajjiż',
  countrySelect: '— Agħżel —',
  substanceName: 'Isem is-sustanza/i',
  casNo: 'CAS Nru.',
  concentration: 'Konċentrazzjoni',
  concentrationHint: 'Kif stampata fuq it-tikketta, eż. 15 % w/w. Il-limiti legali għall-prekursuri jiddependu minnha.',
  intendedUse: 'Użu intenzjonat',
  intendedUseHint: 'Iddeskrivi għal xiex se tuża s-sustanza.',

  idNote:
    'Il-passaport jew il-karta tal-identità tiegħek jiġu ċċekkjati minn Didit, il-fornitur tagħna tal-verifika tal-identità. '
    + 'Tinfetaħ tieqa sigura fejn tieħu ritratt tad-dokument tiegħek u selfie qasir. '
    + 'Ir-ritratti jibqgħu għand Didit — din il-formola qatt ma tirċevihom jew taħżinhom. Jinżammu biss '
    + 'ir-riżultat u d-dettalji stampati fuq id-dokument tiegħek.',
  idUnavailableTitle: 'Il-verifika tal-identità mhix disponibbli temporanjament',
  idUnavailableNote: (seller) =>
    `Din il-formola teħtieġha, għalhekk ma tistax tintbagħat issa. Erġa’ pprova aktar tard jew ikkuntattja lill-bejjiegħ${seller ? ` (${seller})` : ''}.`,
  fillFirst: (list) => `L-ewwel imla l-bqija tal-formola, imbagħad ivverifika l-identità tiegħek. Għadu nieqes: ${list}.`,
  verifyButton: 'Ivverifika l-identità tiegħi',
  verifyOpening: 'Qed tinfetaħ il-verifika sigura…',
  verifyWaiting: 'Qed nistennew li tlesti l-verifika…',
  verifyWaitingHint: 'Lesti l-passi fit-tieqa tal-verifika, imbagħad erġa’ lura hawn. Din il-paġna taġġorna ruħha.',
  verifyBlocked: 'Il-browser tiegħek imblokka t-tieqa tal-verifika.',
  verifyBlockedLink: 'Iftaħha f’tab ġdida',
  verifyRestart: 'Għalaqt it-tieqa? Erġa’ ibda',
  verified: 'Identità vverifikata',
  verifyInReview: 'Id-dokument tiegħek qed jiġi ċċekkjat manwalment. Tista’ diġà tibgħat il-formola — il-bejjiegħ jara r-riżultat.',
  verifyFailedTitle: 'Il-verifika ma għaddietx',
  verifyFailedNote: 'Xorta tista’ tibgħat din il-formola. Il-bejjiegħ jeżaminaha manwalment.',
  verifyTryAgain: 'Erġa’ pprova',

  termsIntro: (seller) => `Termini u kundizzjonijiet tal-bejjiegħ${seller ? ` (${seller})` : ''}:`,
  termsReadLink: (seller) => `Aqra t-termini u l-kundizzjonijiet tal-bejjiegħ${seller ? ` (${seller})` : ''}`,
  termsAsWritten: () => 'Dawn it-termini huma stabbiliti mill-bejjiegħ u qed jintwerew kif inkitbu.',
  agree: 'Qrajt u naqbel mat-termini u l-kundizzjonijiet ta’ hawn fuq',
  defaultTerms: `B’dan nikkonferma li:
— Is-sustanzi, il-preparazzjonijiet u l-prodotti jintużaw biss b’mod awtorizzat (skont il-leġiżlazzjoni Ewropea u nazzjonali), u biss għal skopijiet ta’ riċerka, xjentifiċi u edukattivi.

Is-sustanza/i ordnata/i:
— Ma tintużax/jintużawx biex jiġu manifatturati drogi narkotiċi u/jew sustanzi psikotropiċi, jew bħala kostitwent jew intermedju tagħhom.
— Ma tintużax/jintużawx fi prodotti mediċinali għall-użu mill-bniedem jew veterinarju, fl-agrikoltura, fl-ikel jew fil-kożmetiċi, ħlief bħala materja prima, materjal awżiljarju jew operattiv u/jew bħala reaġent ta’ riċerka u analitiku.
— Ma tintużax/jintużawx biex jiġu żviluppati jew prodotti armi kimiċi.
— Mhux se tintuża/jintużaw għal skopijiet militari jew illegali.
— Ma terġax/jerġgħux tiġi/jiġu esportata/i lejn pajjiżi terzi mingħajr il-kunsens minn qabel tal-awtoritajiet tal-kontroll tal-esportazzjoni.
— Mhux se terġa’/jerġgħu tiġi/jiġu esportata/i jew esportata/i, jew mibjugħa/mibjugħin mill-ġdid fil-pajjiż jew internazzjonalment, jew trasferita/i lejn destinazzjoni soġġetta għal embargo tal-UE, tan-NU jew tal-Istati Uniti, jekk dan imur kontra t-termini ta’ dak l-embargo.
— Tiġi/jiġu fornuta/i biss lil klijenti li wkoll jistgħu jissottomettu dikjarazzjoni tal-utent finali bħal din. Inżommu bir-reqqa d-dikjarazzjonijiet kollha li nirċievu u nippreżentawhom meta mitluba.
— Għandi aktar minn 18-il sena.`,

  requiredNote: 'Oqsma obbligatorji',
  stillToComplete: (list) => `Għadu jrid jimtela: ${list}.`,
  submitting: 'Qed tintbagħat…',
  submit: 'Ibgħat id-dikjarazzjoni',
  footer: 'Dan id-dokument huwa legalment vinkolanti. L-informazzjoni kollha pprovduta tista’ tiġi vverifikata.',

  missing: {
    email: 'indirizz elettroniku validu',
    firstName: 'isem',
    lastName: 'kunjom',
    orderNumber: 'numru tal-ordni',
    buyerType: 'jekk intix individwu jew kumpanija',
    companyName: 'isem il-kumpanija',
    vatNumber: 'numru tal-VAT',
    street: 'triq',
    zipCode: 'kodiċi postali',
    place: 'belt jew raħal',
    country: 'pajjiż',
    substance: 'isem is-sustanza',
    cas: 'numru CAS',
    concentration: 'konċentrazzjoni',
    intendedUse: 'użu intenzjonat',
    identity: 'verifika tal-identità',
    terms: 'qbil mat-termini',
    robot: 'il-kontroll kontra r-robots',
  },

  successTitle: 'Id-dikjarazzjoni waslet',
  successBody: 'Id-dikjarazzjoni tal-utent finali tiegħek intbagħtet. Se tirċievi konferma bil-posta elettronika, u messaġġ ieħor meta tkun ġiet eżaminata.',
  successNote: 'Żomm din il-konferma għar-rekords tiegħek.',
  notFoundTitle: 'Il-formola ma nstabitx',
  notFoundBody: 'M’hemm l-ebda formola f’dan l-indirizz. Iċċekkja l-link.',
  notReadyTitle: 'Il-formola għadha mhix disponibbli',
  notReadyBody: 'Din il-formola għadha ma taċċettax dikjarazzjonijiet. Erġa’ pprova aktar tard.',
  contactSupplier: 'Jekk irċevejt dan il-link minn fornitur, ikkuntattjah għall-għajnuna.',

  errVerifyExpired: 'Is-sessjoni tal-verifika tiegħek skadiet. Erġa’ ibdieha.',
  errVerifyStart: 'Il-verifika tal-identità ma setgħetx tinbeda. Erġa’ pprova.',
  errIncomplete: (list) => `L-ewwel imla l-formola. Għadu nieqes: ${list}.`,
  errIdUnavailable: 'Il-verifika tal-identità mhix disponibbli temporanjament, għalhekk din il-formola ma tistax tintbagħat issa.',
  errRateLimited: 'Wisq tentattivi minn din il-konnessjoni. Stenna ftit minuti u erġa’ pprova.',
  errGeneric: 'Inqala’ xi żball. Erġa’ pprova.',

  server: {
    TERMS_REQUIRED: 'Trid taqbel mat-termini u l-kundizzjonijiet.',
    FIELD_TOO_LONG: 'Wieħed mill-oqsma huwa twil wisq. Qassru u erġa’ pprova.',
    INVALID_EMAIL: 'Daħħal indirizz elettroniku validu.',
    FORM_NOT_OPEN: 'Din il-formola għadha ma taċċettax dikjarazzjonijiet.',
    FIELD_REQUIRED: 'Qasam obbligatorju huwa vojt. Imla l-oqsma kollha mmarkati b’*.',
    BUYER_TYPE_REQUIRED: 'Agħżel jekk intix individwu jew kumpanija.',
    COMPANY_NAME_REQUIRED: 'Daħħal isem il-kumpanija tiegħek.',
    VAT_REQUIRED: 'Daħħal in-numru tal-VAT tiegħek.',
    ID_UNAVAILABLE: 'Il-verifika tal-identità mhix disponibbli temporanjament. Erġa’ pprova aktar tard.',
    ID_REQUIRED: 'L-ewwel lesti l-verifika tal-identità.',
    ID_EXPIRED: 'Il-verifika tal-identità tiegħek skadiet jew diġà ntużat. Erġa’ ibdieha.',
    ID_UNCONFIRMED: 'Il-verifika tal-identità tiegħek ma setgħetx tiġi kkonfermata. Erġa’ pprova.',
    ID_UNFINISHED: 'Il-verifika tal-identità tiegħek għadha ma ntemmitx. Lestiha u erġa’ pprova.',
    ID_DOCUMENT_TYPE: 'Jiġu aċċettati biss passaporti u karti tal-identità.',
    UNDER_AGE: 'Trid ikollok mill-inqas 18-il sena biex tissottometti dikjarazzjoni tal-utent finali.',
    BOT_CHECK_MISSING: 'Lesti l-kontroll kontra r-robots u erġa’ pprova.',
    BOT_CHECK_ERROR: 'Il-kontroll kontra r-robots ma setax jitlesta. Erġa’ pprova.',
    BOT_CHECK_FAILED: 'Il-kontroll kontra r-robots ma għaddiex. Erġa’ pprova.',
  },

  vcDocTitle: 'Verifika lesta',
  vcTitle: 'Il-verifika ntemmet',
  vcBody: 'Tista’ tagħlaq din it-tieqa u tmur lura għall-formola. Taġġorna ruħha.',
};

export default mt;
