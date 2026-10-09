// Irish is among the languages this was least certain in. Have the whole page
// read by a native speaker before relying on it.
import type { HowItWorks } from './en.ts';

const ga: HowItWorks = {
  docTitle: 'Conas a oibríonn sé',
  badge: 'Do cheannaitheoirí',
  title: 'Conas a oibríonn sé',
  lede: 'Iarradh ort ráiteas úsáideora deiridh a líonadh sula gceannaíonn tú ceimiceán. Míníonn an leathanach seo cén fáth, cad a tharlaíonn do do shonraí, agus cad is féidir leat a dhéanamh.',
  sentBy: (seller) => `Tháinig tú anseo ó fhoirm ${seller}.`,
  backToForm: 'Ar ais chuig an bhfoirm',
  contents: 'Ar an leathanach seo',

  shortTitle: 'Go hachomair',
  short: [
    'Caithfidh an díoltóir seiceáil cé a cheannaíonn ceimiceáin áirithe agus cén fáth. Is é an dlí a éilíonn é, ní rogha an tsiopa.',
    'Seiceálann Didit do dhoiciméad aitheantais. Ní shroicheann grianghraif de an díoltóir ná sinne riamh.',
    'Léann foireann an díoltóra do ráiteas. Fanann uimhir an doiciméid i bhfolach mura n-iarrann duine é d’aon ghnó, agus taifeadtar gach iarratas.',
    'Scriostar gach rud go huathoibríoch tar éis 18 mí.',
  ],

  whyTitle: 'Cén fáth a n-iarrtar é seo orm?',
  why: [
    'Is féidir mí-úsáid a bhaint as ceimiceáin áirithe chun pléascáin, drugaí nó airm a dhéanamh. Ceanglaíonn rialacha AE — Rialachán (AE) 2019/1148 maidir le réamhtheachtaithe pléascán ina measc — ar dhíoltóirí a fhios a bheith acu cé leis agus chun cén críche a dhíolann siad na substaintí seo, taifead a choinneáil, agus idirbhearta amhrasacha a thuairisciú.',
    'Is é an ráiteas a líonann tú an taifead sin. Is é eustatement an tseirbhís a úsáideann an díoltóir chun é a bhailiú.',
  ],

  idTitle: 'Cad a tharlaíonn do mo dhoiciméad aitheantais?',
  id: [
    'Má iarrann an díoltóir fíorú aitheantais, osclaítear fuinneog shlán ó Didit, ár soláthraí fíoraithe aitheantais. Tógann tú grianghraf de do phas nó de do chárta aitheantais agus féinphic ghearr. Seiceálann Didit go bhfuil an doiciméad barántúil agus gur leatsa é.',
    'Ní théann na grianghraif ach chuig Didit — ní shroicheann siad an díoltóir ná sinne riamh. Chomh luath agus a stóráiltear an toradh, scriostar an fíorú ag Didit, na grianghraif san áireamh.',
    'Is é a choinnítear ná an toradh agus a bhfuil clóite ar an doiciméad: d’ainm, an cineál doiciméid agus a uimhir. Úsáidtear do dháta breithe uair amháin, chun a sheiceáil go bhfuil tú 18 mbliana d’aois nó níos sine, agus ní choinnítear é.',
  ],

  storedTitle: 'Cad a stóráiltear, agus cé atá in ann é a fheiceáil?',
  stored: [
    'Na sonraí a chuireann tú isteach san fhoirm, toradh an fhíoraithe aitheantais agus toradh na seiceálacha uathoibríocha ar an tsubstaint. Stóráiltear do shonraí pearsanta criptithe, ar fhreastalaithe san AE.',
    'Ní féidir le haon díoltóir eile do ráiteas a fheiceáil — an díoltóir óna gceannaíonn tú agus a fhoireann amháin. Fanann uimhir an doiciméid i bhfolach fiú uathu: caithfidh ball den fhoireann é a dhearbhú le dara céim síniú isteach chun é a fheiceáil, agus taifeadtar é gach uair.',
    'Is féidir lenár bhfoireann féin ráitis a oscailt nuair is gá sin chun an tseirbhís a reáchtáil agus tacaíocht a thabhairt. Ní fheiceann siadsan ach oiread uimhir doiciméid ach amháin má iarrann siad é d’aon ghnó, agus feictear an t-iarratas sin i dtaifead an díoltóra.',
  ],

  decideTitle: 'Cé a chinneann?',
  decide: [
    'Léann duine ag an díoltóir gach ráiteas agus cinneann sé. Ní dhéanann seiceálacha uathoibríocha — an bhfuil an tsubstaint ar liosta srianta, an bhfuil comharthaí rabhaidh san úsáid a luaitear, an bhfuil uimhir CBL cuideachta bailí — ach aird an athbhreithneora a dhíriú ar a bhfuil fiú a scrúdú níos géire. Ní fhaomhann ná ní dhiúltaíonn siad aon rud as a stuaim féin.',
    'Is í an aois an t-aon eisceacht: má léiríonn do dhoiciméad go bhfuil tú faoi 18 mbliana d’aois, ní féidir an ráiteas a sheoladh.',
    'Mura bhfuil do ráiteas i mBéarla ná in Ollainnis, d’fhéadfaí é a aistriú go meicniúil don athbhreithneoir. Tarlaíonn sé sin ar ár bhfreastalaí féin; ní sheoltar do théacs chuig seirbhís aistriúcháin.',
  ],

  keptTitle: 'Cá fhad a choinnítear é?',
  kept: [
    '18 mí ón lá a sheolann tú é. Ina dhiaidh sin scriostar é go huathoibríoch, mar aon le gach rud a bhfuil cur síos air thuas. Má dhúnann an díoltóir a chuntas níos luaithe, scriostar é 30 lá ina dhiaidh sin.',
  ],

  othersTitle: 'Cé eile atá páirteach?',
  othersIntro: 'Seachas an díoltóir agus sinne, tá ról ag na páirtithe seo:',
  others: [
    ['Didit', 'seiceálann sé do dhoiciméad aitheantais — ach amháin má iarrann an díoltóir é.'],
    ['An Coimisiún Eorpach (VIES)', 'seiceálann sé an uimhir CBL — ach amháin má ordaíonn tú thar ceann cuideachta.'],
    ['PubChem agus Wikidata', 'cabhraíonn siad an tsubstaint a aithint. Faigheann siad ainm na substainte agus an uimhir CAS, ní fhaigheann siad aon rud fút riamh.'],
    ['Ár soláthraí ríomhphoist', 'seachadann sé an deimhniú agus an cinneadh chuig do bhosca isteach.'],
    ['Cloudflare', 'cosnaíonn sé an suíomh ar ionsaithe agus feiceann sé do sheoladh IP agus an trácht ag dul tríd.'],
    ['Hetzner', 'óstálann sé ár bhfreastalaithe san AE.'],
  ],
  othersMore: 'Tá an liosta iomlán, le suíomhanna, inár bpolasaí príobháideachta (i mBéarla).',

  rightsTitle: 'Cad iad mo chearta?',
  rights: [
    'Is féidir leat iarraidh na sonraí a choinnítear fút a fheiceáil, iad a cheartú, nó iad a scriosadh nuair a cheadaíonn an dlí é — d’fhéadfadh go mbeadh ar an díoltóir an taifead a choinneáil chomh fada agus a éilíonn na rialacha.',
  ],
  controller: (seller) => seller
    ? `Tá ${seller} freagrach as do shonraí (an “rialaitheoir”); próiseálann eustatement iad thar a cheann. Seol d’iarratas chuig ${seller}.`
    : 'Tá an díoltóir freagrach as do shonraí (an “rialaitheoir”); próiseálann eustatement iad thar a cheann. Seol d’iarratas chuig an díoltóir.',
  fallback: (email) => `Mura féidir leat teagmháil a dhéanamh leo, scríobh chuig ${email} agus cuirfimid d’iarratas ar aghaidh.`,
  complaint: 'Is féidir leat gearán a dhéanamh freisin leis an údarás cosanta sonraí i do thír féin.',

  questionsTitle: 'Ceisteanna?',
  questionsOrder: 'Faoi d’ordú nó faoin gcinneadh: déan teagmháil leis an díoltóir.',
  questionsData: (email) => `Faoin leathanach seo nó faoin gcaoi a láimhseáiltear do shonraí: ${email}.`,

  lastUpdated: (date) => `Nuashonraithe go deireanach: ${date}`,
  privacyPolicy: 'Polasaí príobháideachta',
};

export default ga;
