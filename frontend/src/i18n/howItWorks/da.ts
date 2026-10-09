import type { HowItWorks } from './en.ts';

const da: HowItWorks = {
  docTitle: 'Sådan fungerer det',
  badge: 'For købere',
  title: 'Sådan fungerer det',
  lede: 'Du er blevet bedt om at udfylde en slutbrugererklæring, før du køber et kemikalie. Denne side forklarer hvorfor, hvad der sker med dine oplysninger, og hvad du selv kan gøre.',
  sentBy: (seller) => `Du kommer fra formularen hos ${seller}.`,
  backToForm: 'Tilbage til formularen',
  contents: 'På denne side',

  shortTitle: 'Kort fortalt',
  short: [
    'Sælgeren skal kontrollere, hvem der køber visse kemikalier, og hvad de skal bruges til. Det kræver loven — det er ikke butikkens valg.',
    'Dit id-dokument kontrolleres af Didit. Billeder af det når aldrig frem til sælgeren eller os.',
    'Sælgerens team læser din erklæring. Dit dokumentnummer forbliver skjult, medmindre nogen bevidst slår det op, og hvert opslag registreres.',
    'Alt slettes automatisk efter 18 måneder.',
  ],

  whyTitle: 'Hvorfor bliver jeg bedt om dette?',
  why: [
    'Visse kemikalier kan misbruges til at fremstille sprængstoffer, narkotika eller våben. EU-regler — bl.a. forordning (EU) 2019/1148 om udgangsstoffer til eksplosivstoffer — kræver, at sælgere ved, hvem de sælger disse stoffer til og til hvilket formål, at de registrerer det, og at de indberetter mistænkelige transaktioner.',
    'Den erklæring, du udfylder, er den registrering. eustatement er den tjeneste, sælgeren bruger til at indsamle den.',
  ],

  idTitle: 'Hvad sker der med mit id-dokument?',
  id: [
    'Hvis sælgeren kræver identitetskontrol, åbnes et sikkert vindue fra Didit, vores udbyder af identitetskontrol. Du fotograferer dit pas eller id-kort og tager en kort selfie. Didit kontrollerer, at dokumentet er ægte og tilhører dig.',
    'Billederne går kun til Didit — de når aldrig frem til sælgeren eller os. Så snart resultatet er gemt, slettes kontrollen hos Didit, billederne inklusive.',
    'Det, der gemmes, er resultatet og det, der står trykt på dokumentet: dit navn, dokumenttypen og dets nummer. Din fødselsdato bruges én gang, til at kontrollere, at du er fyldt 18, og gemmes ikke.',
  ],

  storedTitle: 'Hvad gemmes, og hvem kan se det?',
  stored: [
    'De oplysninger, du skriver i formularen, resultatet af identitetskontrollen og resultatet af de automatiske kontroller af stoffet. Dine personoplysninger gemmes krypteret på servere i EU.',
    'Ingen anden sælger kan se din erklæring — kun den sælger, du køber hos, og deres team. Dit dokumentnummer forbliver skjult selv for dem: et teammedlem skal bekræfte med et ekstra login-trin for at se det, og hver gang det sker, registreres det.',
    'Vores egne medarbejdere kan åbne erklæringer, når det er nødvendigt for at drive og supportere tjenesten. Også de ser kun et dokumentnummer ved bevidst at slå det op, og opslaget fremgår af sælgerens log.',
  ],

  decideTitle: 'Hvem bestemmer?',
  decide: [
    'En person hos sælgeren læser hver erklæring og træffer beslutningen. Automatiske kontroller — om stoffet står på en liste over begrænsede stoffer, om den angivne anvendelse indeholder advarselstegn, om en virksomheds momsnummer er gyldigt — peger kun på det, der fortjener et nærmere kig. De godkender eller afviser aldrig noget på egen hånd.',
    'Den eneste undtagelse er alder: hvis dit dokument viser, at du er under 18 år, kan erklæringen ikke sendes.',
    'Er din erklæring ikke på engelsk eller nederlandsk, kan den blive maskinoversat for den, der gennemgår den. Det sker på vores egen server; din tekst sendes ikke til en oversættelsestjeneste.',
  ],

  keptTitle: 'Hvor længe gemmes det?',
  kept: [
    '18 måneder fra den dag, du sender erklæringen. Derefter slettes den automatisk sammen med alt det ovenfor beskrevne. Lukker sælgeren sin konto tidligere, slettes den 30 dage efter.',
  ],

  othersTitle: 'Hvem er ellers involveret?',
  othersIntro: 'Ud over sælgeren og os spiller disse parter en rolle:',
  others: [
    ['Didit', 'kontrollerer dit id-dokument — kun hvis sælgeren beder om det.'],
    ['Europa-Kommissionen (VIES)', 'kontrollerer momsnummeret — kun hvis du bestiller for en virksomhed.'],
    ['PubChem og Wikidata', 'hjælper med at identificere stoffet. De modtager stoffets navn og CAS-nummer, aldrig noget om dig.'],
    ['Vores e-mailudbyder', 'leverer bekræftelsen og beslutningen til din indbakke.'],
    ['Cloudflare', 'beskytter hjemmesiden mod angreb og ser din IP-adresse, når trafikken passerer.'],
    ['Hetzner', 'hoster vores servere i EU.'],
  ],
  othersMore: 'Den fulde liste med placeringer findes i vores privatlivspolitik (på engelsk).',

  rightsTitle: 'Hvilke rettigheder har jeg?',
  rights: [
    'Du kan bede om at se de oplysninger, der er om dig, få dem rettet eller slettet, hvor loven tillader det — sælgeren kan være forpligtet til at opbevare registreringen, så længe reglerne kræver det.',
  ],
  controller: (seller) => seller
    ? `${seller} er ansvarlig for dine oplysninger (den „dataansvarlige“); eustatement behandler dem på deres vegne. Send din anmodning til ${seller}.`
    : 'Sælgeren er ansvarlig for dine oplysninger (den „dataansvarlige“); eustatement behandler dem på sælgerens vegne. Send din anmodning til sælgeren.',
  fallback: (email) => `Kan du ikke få fat i dem, så skriv til ${email}, så videresender vi din anmodning.`,
  complaint: 'Du kan også klage til databeskyttelsesmyndigheden i dit land.',

  questionsTitle: 'Spørgsmål?',
  questionsOrder: 'Om din ordre eller beslutningen: kontakt sælgeren.',
  questionsData: (email) => `Om denne side eller hvordan dine oplysninger behandles: ${email}.`,

  lastUpdated: (date) => `Senest opdateret: ${date}`,
  privacyPolicy: 'Privatlivspolitik',
};

export default da;
