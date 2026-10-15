// Gaeilge. Téarmaí ANNEX IV focal ar fhocal ó leagan Gaeilge Rialachán (AE)
// 2019/1148, Iarscríbhinn IV. Rialacha: féach en.ts.
//
// Irish, like Maltese, is a language I am less sure of. Every line here, not
// only the LEGAL ones, should be read by a native speaker before launch. Irish
// buyers will almost all read English as well; this file exists because the
// regulation treats Irish as an official language, not because it is likely
// to be chosen often.
import type { Messages } from './en.ts';

const ga: Messages = {
  docTitle: 'Ráiteas an úsáideora deiridh',
  docTitleCompany: (company) => `${company} — Ráiteas`,
  badge: 'Doiciméad oifigiúil',
  title: 'Ráiteas an úsáideora deiridh',
  subtitle: 'Substaintí ceimiceacha — dearbhú maidir le húsáid rialaithe',
  submittedTo: (company) => `Curtha faoi bhráid: ${company}`,
  themeToggle: 'Geal nó dorcha',

  language: 'Teanga',
  languageSearch: 'Cuardaigh teanga',
  languageNone: 'Níor aimsíodh teanga',
  languageSuggested: 'Molta',
  languageAll: 'Gach teanga',

  secBuyerType: 'Cineál ceannaitheora',
  secContact: 'Sonraí teagmhála',
  secCompany: 'Sonraí na cuideachta',
  secAddress: 'Seoladh',
  secSubstance: 'Faisnéis faoin tsubstaint',
  secIdentity: 'Fíorú aitheantais',
  secTerms: 'Téarmaí agus coinníollacha',

  buyerTypeQuestion: 'An bhfuil tú ag ordú mar dhuine aonair nó thar ceann cuideachta?',
  buyerIndividual: 'Duine aonair',
  buyerCompany: 'Cuideachta',

  optional: '(roghnach)',
  email: 'Ríomhphost',
  orderNumber: 'Uimhir an ordaithe',
  firstName: 'Céadainm',
  lastName: 'Sloinne',
  companyName: 'Ainm na cuideachta',
  vatNumber: 'Uimhir CBL',
  vatHint: 'Ag teastáil le haghaidh sheiceáil VIES an AE, m.sh. IE1234567X',
  street: 'Sráid agus uimhir',
  zipCode: 'Éirchód / cód poist',
  place: 'Baile nó cathair',
  country: 'Tír',
  countrySelect: '— Roghnaigh —',
  substanceName: 'Ainm na substainte',
  casNo: 'Uimh. CAS',
  concentration: 'Tiúchan',
  concentrationHint: 'Mar atá ar an lipéad, m.sh. 15 % w/w. Braitheann na teorainneacha dlíthiúla do réamhtheachtaithe air.',
  intendedUse: 'Úsáid bheartaithe',
  intendedUseHint: 'Déan cur síos ar cad chuige a mbainfidh tú úsáid as an tsubstaint.',

  idNote:
    'Seiceálann Didit, ár soláthraí fíoraithe aitheantais, do phas nó do chárta aitheantais. '
    + 'Osclaítear fuinneog shlán ina dtógann tú grianghraf de do dhoiciméad agus féinphic ghearr. '
    + 'Fanann na grianghraif ag Didit — ní fhaigheann an fhoirm seo iad agus ní stórálann sí iad riamh. Ní choinnítear '
    + 'ach an toradh agus na sonraí atá clóite ar do dhoiciméad.',
  idUnavailableTitle: 'Níl fíorú aitheantais ar fáil faoi láthair',
  idUnavailableNote: (seller) =>
    `Tá sé ag teastáil ón bhfoirm seo, mar sin ní féidir í a sheoladh anois. Bain triail eile as níos déanaí nó déan teagmháil leis an díoltóir${seller ? ` (${seller})` : ''}.`,
  fillFirst: (list) => `Líon an chuid eile den fhoirm ar dtús, ansin fíoraigh d’aitheantas. In easnamh fós: ${list}.`,
  verifyButton: 'Fíoraigh m’aitheantas',
  verifyOpening: 'An fíorú slán á oscailt…',
  verifyWaiting: 'Ag fanacht go gcríochnóidh tú an fíorú…',
  verifyWaitingHint: 'Críochnaigh na céimeanna san fhuinneog fíoraithe, ansin fill anseo. Nuashonraíonn an leathanach seo é féin.',
  verifyBlocked: 'Chuir do bhrabhsálaí bac ar an bhfuinneog fíoraithe.',
  verifyBlockedLink: 'Oscail i gcluaisín nua',
  verifyRestart: 'Dúnadh an fhuinneog? Tosaigh arís',
  verified: 'Aitheantas fíoraithe',
  verifyInReview: 'Tá do dhoiciméad á sheiceáil de láimh. Is féidir leat an fhoirm a sheoladh anois — feicfidh an díoltóir an toradh.',
  verifyFailedTitle: 'Níor éirigh leis an bhfíorú',
  verifyFailedNote: 'Is féidir leat an fhoirm seo a sheoladh fós. Déanfaidh an díoltóir athbhreithniú uirthi de láimh.',
  verifyTryAgain: 'Bain triail eile as',

  termsIntro: (seller) => `Téarmaí agus coinníollacha an díoltóra${seller ? ` (${seller})` : ''}:`,
  termsReadLink: (seller) => `Léigh téarmaí agus coinníollacha an díoltóra${seller ? ` (${seller})` : ''}`,
  termsAsWritten: () => 'Is é an díoltóir a leag síos na téarmaí seo agus taispeántar iad mar a scríobhadh iad.',
  agree: 'Léigh mé na téarmaí agus coinníollacha thuas agus glacaim leo',
  defaultTerms: `Deimhním leis seo:
— Nach n-úsáidtear na substaintí, na hullmhóidí agus na táirgí ach ar bhealach údaraithe (de réir reachtaíocht Eorpach agus náisiúnta), agus chun críocha taighde, eolaíochta agus oideachais amháin.

Maidir leis an tsubstaint nó na substaintí a ordaíodh:
— Nach n-úsáidtear iad chun drugaí támhshuanacha agus/nó substaintí síceatrópacha a mhonarú, ná mar chomhábhar nó idirmheánach díobh.
— Nach n-úsáidtear iad i dtáirgí íocshláinte d’úsáid dhaonna nó tréidliachta, sa talmhaíocht, i mbia ná i gcosmaidí, ach amháin mar amhábhar, mar ábhar cúnta nó oibriúcháin agus/nó mar imoibrí taighde agus anailíse.
— Nach n-úsáidtear iad chun airm cheimiceacha a fhorbairt ná a tháirgeadh.
— Nach n-úsáidfear iad chun críocha míleata ná neamhdhleathacha.
— Nach ndéantar iad a athonnmhuiriú chuig tríú tíortha gan toiliú roimh ré ó na húdaráis rialaithe onnmhairiúcháin.
— Nach ndéanfar iad a athonnmhuiriú/a onnmhuiriú, ná a athdhíol go náisiúnta ná go hidirnáisiúnta, ná a aistriú chuig ceann scríbe atá faoi lánchosc de chuid an AE, na NA nó SAM, dá mbeadh sé sin contrártha do théarmaí an lánchoisc sin.
— Nach soláthraítear iad ach do chustaiméirí ar féidir leo ráiteas úsáideora deiridh den chineál sin a chur isteach freisin. Coimeádfaimid go cúramach gach ráiteas a fhaightear agus cuirfimid ar fáil iad arna iarraidh sin.
— Go bhfuil mé os cionn 18 mbliana d’aois.`,

  requiredNote: 'Réimsí riachtanacha',
  stillToComplete: (list) => `Le líonadh fós: ${list}.`,
  submitting: 'Á sheoladh…',
  submit: 'Seol an ráiteas',
  footer: 'Tá an doiciméad seo ceangailteach go dlíthiúil. Is féidir an fhaisnéis go léir a thugtar a fhíorú.',

  missing: {
    email: 'seoladh ríomhphoist bailí',
    firstName: 'céadainm',
    lastName: 'sloinne',
    orderNumber: 'uimhir an ordaithe',
    buyerType: 'an duine aonair nó cuideachta thú',
    companyName: 'ainm na cuideachta',
    vatNumber: 'uimhir CBL',
    street: 'sráid',
    zipCode: 'cód poist',
    place: 'baile nó cathair',
    country: 'tír',
    substance: 'ainm na substainte',
    cas: 'uimhir CAS',
    concentration: 'tiúchan',
    intendedUse: 'úsáid bheartaithe',
    identity: 'fíorú aitheantais',
    terms: 'glacadh leis na téarmaí',
    robot: 'an seiceáil frith-róbait',
  },

  successTitle: 'Fuarthas an ráiteas',
  successBody: 'Seoladh do ráiteas úsáideora deiridh. Gheobhaidh tú deimhniú trí ríomhphost, agus teachtaireacht eile nuair a bheidh athbhreithniú déanta air.',
  successNote: 'Coinnigh an deimhniú seo le haghaidh do thaifead.',
  notFoundTitle: 'Níor aimsíodh an fhoirm',
  notFoundBody: 'Níl aon fhoirm ag an seoladh seo. Seiceáil an nasc.',
  notReadyTitle: 'Níl an fhoirm ar fáil fós',
  notReadyBody: 'Níl an fhoirm seo ag glacadh le ráitis fós. Bain triail eile as níos déanaí.',
  contactSupplier: 'Má fuair tú an nasc seo ó sholáthraí, déan teagmháil leo chun cabhair a fháil.',
  notFoundHome: 'Téigh go dtí an leathanach baile',

  errVerifyExpired: 'Chuaigh do sheisiún fíoraithe in éag. Tosaigh arís é.',
  errVerifyStart: 'Níorbh fhéidir fíorú aitheantais a thosú. Bain triail eile as.',
  errIncomplete: (list) => `Líon an fhoirm ar dtús. In easnamh fós: ${list}.`,
  errIdUnavailable: 'Níl fíorú aitheantais ar fáil faoi láthair, mar sin ní féidir an fhoirm seo a sheoladh anois.',
  errRateLimited: 'An iomarca iarrachtaí ón nasc seo. Fan cúpla nóiméad agus bain triail eile as.',
  errGeneric: 'Chuaigh rud éigin amú. Bain triail eile as.',

  server: {
    TERMS_REQUIRED: 'Caithfidh tú glacadh leis na téarmaí agus coinníollacha.',
    FIELD_TOO_LONG: 'Tá ceann de na réimsí rófhada. Giorraigh é agus bain triail eile as.',
    INVALID_EMAIL: 'Cuir isteach seoladh ríomhphoist bailí.',
    FORM_NOT_OPEN: 'Níl an fhoirm seo ag glacadh le ráitis fós.',
    FIELD_REQUIRED: 'Tá réimse riachtanach folamh. Líon gach réimse atá marcáilte le *.',
    BUYER_TYPE_REQUIRED: 'Roghnaigh an duine aonair nó cuideachta thú.',
    COMPANY_NAME_REQUIRED: 'Cuir isteach ainm do chuideachta.',
    VAT_REQUIRED: 'Cuir isteach d’uimhir CBL.',
    ID_UNAVAILABLE: 'Níl fíorú aitheantais ar fáil faoi láthair. Bain triail eile as níos déanaí.',
    ID_REQUIRED: 'Críochnaigh an fíorú aitheantais ar dtús.',
    ID_EXPIRED: 'Chuaigh d’fhíorú aitheantais in éag nó úsáideadh cheana é. Tosaigh arís é.',
    ID_UNCONFIRMED: 'Níorbh fhéidir d’fhíorú aitheantais a dhearbhú. Bain triail eile as.',
    ID_UNFINISHED: 'Níl d’fhíorú aitheantais críochnaithe fós. Críochnaigh é agus bain triail eile as.',
    ID_DOCUMENT_TYPE: 'Ní ghlactar ach le pasanna agus cártaí aitheantais.',
    UNDER_AGE: 'Caithfidh tú a bheith 18 mbliana d’aois ar a laghad chun ráiteas úsáideora deiridh a chur isteach.',
    BOT_CHECK_MISSING: 'Críochnaigh an seiceáil frith-róbait agus bain triail eile as.',
    BOT_CHECK_ERROR: 'Níorbh fhéidir an seiceáil frith-róbait a chríochnú. Bain triail eile as.',
    BOT_CHECK_FAILED: 'Níor éirigh leis an seiceáil frith-róbait. Bain triail eile as.',
  },

  poweredBy: 'Á chumhachtú ag',
  howItWorksLink: 'Conas a oibríonn sé?',

  vcDocTitle: 'Fíorú críochnaithe',
  vcTitle: 'Tá an fíorú thart',
  vcBody: 'Is féidir leat an fhuinneog seo a dhúnadh agus filleadh ar an bhfoirm. Nuashonraíonn sí í féin.',
};

export default ga;
