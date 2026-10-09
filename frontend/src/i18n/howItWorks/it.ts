import type { HowItWorks } from './en.ts';

const it: HowItWorks = {
  docTitle: 'Come funziona',
  badge: 'Per gli acquirenti',
  title: 'Come funziona',
  lede: 'Le è stato chiesto di compilare una dichiarazione di utilizzatore finale prima di acquistare un prodotto chimico. Questa pagina spiega perché, cosa succede ai suoi dati e cosa può fare.',
  sentBy: (seller) => `È arrivato qui dal modulo di ${seller}.`,
  backToForm: 'Torna al modulo',
  contents: 'In questa pagina',

  shortTitle: 'In breve',
  short: [
    'Il venditore deve verificare chi acquista determinati prodotti chimici e per quale scopo. Lo impone la legge, non è una scelta del negozio.',
    'Il suo documento d’identità viene verificato da Didit. Le foto non arrivano mai al venditore né a noi.',
    'Il team del venditore legge la sua dichiarazione. Il numero del documento resta nascosto finché qualcuno non lo consulta deliberatamente, e ogni consultazione viene registrata.',
    'Tutto viene cancellato automaticamente dopo 18 mesi.',
  ],

  whyTitle: 'Perché mi viene chiesto?',
  why: [
    'Alcuni prodotti chimici possono essere usati impropriamente per fabbricare esplosivi, droghe o armi. Le norme dell’UE — tra cui il regolamento (UE) 2019/1148 sui precursori di esplosivi — obbligano i venditori a sapere a chi vendono queste sostanze e per quale scopo, a tenerne traccia e a segnalare le transazioni sospette.',
    'La dichiarazione che compila è questa traccia. eustatement è il servizio che il venditore usa per raccoglierla.',
  ],

  idTitle: 'Cosa succede al mio documento d’identità?',
  id: [
    'Se il venditore richiede una verifica dell’identità, si apre una finestra sicura di Didit, il nostro fornitore di verifica dell’identità. Lei fotografa il passaporto o la carta d’identità e scatta un breve selfie. Didit verifica che il documento sia autentico e che sia suo.',
    'Le foto vanno solo a Didit: non arrivano mai al venditore né a noi. Non appena il risultato è salvato, la verifica presso Didit, foto comprese, viene cancellata.',
    'Si conservano il risultato e ciò che è stampato sul documento: il suo nome, il tipo di documento e il suo numero. La data di nascita viene usata una sola volta, per verificare che abbia almeno 18 anni, e non viene conservata.',
  ],

  storedTitle: 'Cosa viene conservato, e chi può vederlo?',
  stored: [
    'I dati che inserisce nel modulo, l’esito della verifica dell’identità e quello dei controlli automatici sulla sostanza. I suoi dati personali sono conservati cifrati, su server situati nell’UE.',
    'Nessun altro venditore può vedere la sua dichiarazione: solo il venditore da cui acquista e il suo team. Il numero del documento resta nascosto anche a loro: un membro del team deve confermare con un secondo passaggio di accesso per vederlo, e ogni volta che ciò avviene viene registrato.',
    'Il nostro personale può aprire le dichiarazioni quando è necessario per il funzionamento e l’assistenza del servizio. Anche loro vedono un numero di documento solo consultandolo deliberatamente, e quella consultazione compare nel registro del venditore.',
  ],

  decideTitle: 'Chi decide?',
  decide: [
    'Una persona del venditore legge ogni dichiarazione e decide. I controlli automatici — se la sostanza è in un elenco con restrizioni, se l’uso indicato contiene segnali di allarme, se la partita IVA di un’azienda è valida — servono solo a indicare a chi esamina cosa merita un secondo sguardo. Non approvano né rifiutano mai nulla da soli.',
    'L’unica eccezione è l’età: se il documento mostra che ha meno di 18 anni, la dichiarazione non può essere inviata.',
    'Se la sua dichiarazione non è in inglese o in olandese, può essere tradotta automaticamente per chi la esamina. Ciò avviene sul nostro server; il suo testo non viene inviato a nessun servizio di traduzione.',
  ],

  keptTitle: 'Per quanto tempo viene conservato?',
  kept: [
    '18 mesi dal giorno dell’invio. Poi viene cancellata automaticamente, con tutto quanto descritto sopra. Se il venditore chiude prima il proprio account, viene cancellata 30 giorni dopo.',
  ],

  othersTitle: 'Chi altro è coinvolto?',
  othersIntro: 'Oltre al venditore e a noi, intervengono questi soggetti:',
  others: [
    ['Didit', 'verifica il suo documento d’identità, solo se il venditore lo richiede.'],
    ['La Commissione europea (VIES)', 'verifica la partita IVA, solo se ordina per un’azienda.'],
    ['PubChem e Wikidata', 'aiutano a identificare la sostanza. Ricevono il nome della sostanza e il numero CAS, mai nulla che la riguardi.'],
    ['Il nostro fornitore di e-mail', 'recapita la conferma e la decisione nella sua casella di posta.'],
    ['Cloudflare', 'protegge il sito dagli attacchi e vede il suo indirizzo IP al passaggio del traffico.'],
    ['Hetzner', 'ospita i nostri server nell’UE.'],
  ],
  othersMore: 'L’elenco completo, con le sedi, è nella nostra informativa sulla privacy (in inglese).',

  rightsTitle: 'Quali sono i miei diritti?',
  rights: [
    'Può chiedere di accedere ai dati che la riguardano, di farli rettificare o cancellare ove la legge lo consenta; il venditore può essere tenuto a conservare la traccia per tutto il tempo richiesto dalle norme.',
  ],
  controller: (seller) => seller
    ? `${seller} è responsabile dei suoi dati (il «titolare del trattamento»); eustatement li tratta per suo conto. Invii la richiesta a ${seller}.`
    : 'Il venditore è responsabile dei suoi dati (il «titolare del trattamento»); eustatement li tratta per suo conto. Invii la richiesta al venditore.',
  fallback: (email) => `Se non riesce a contattarlo, scriva a ${email}: inoltreremo la sua richiesta.`,
  complaint: 'Può anche presentare un reclamo all’autorità per la protezione dei dati del suo paese.',

  questionsTitle: 'Domande?',
  questionsOrder: 'Sull’ordine o sulla decisione: contatti il venditore.',
  questionsData: (email) => `Su questa pagina o sul trattamento dei suoi dati: ${email}.`,

  lastUpdated: (date) => `Ultimo aggiornamento: ${date}`,
  privacyPolicy: 'Informativa sulla privacy',
};

export default it;
