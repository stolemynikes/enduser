import type { HowItWorks } from './en.ts';

const nl: HowItWorks = {
  docTitle: 'Hoe dit werkt',
  badge: 'Voor kopers',
  title: 'Hoe dit werkt',
  lede: 'U werd gevraagd een eindgebruikersverklaring in te vullen voordat u een chemische stof koopt. Op deze pagina leest u waarom, wat er met uw gegevens gebeurt en wat u zelf kunt doen.',
  sentBy: (seller) => `U komt hier via het formulier van ${seller}.`,
  backToForm: 'Terug naar het formulier',
  contents: 'Op deze pagina',

  shortTitle: 'In het kort',
  short: [
    'De verkoper moet controleren wie bepaalde chemische stoffen koopt en waarvoor. Dat is de wet, geen keuze van de winkel.',
    'Uw identiteitsbewijs wordt gecontroleerd door Didit. Foto’s daarvan komen nooit bij de verkoper of bij ons.',
    'Het team van de verkoper leest uw verklaring. Uw documentnummer blijft verborgen tenzij iemand het bewust opvraagt, en elke opvraging wordt vastgelegd.',
    'Alles wordt na 18 maanden automatisch verwijderd.',
  ],

  whyTitle: 'Waarom wordt mij dit gevraagd?',
  why: [
    'Sommige chemische stoffen kunnen worden misbruikt om explosieven, drugs of wapens te maken. Europese regels — waaronder Verordening (EU) 2019/1148 over precursoren voor explosieven — verplichten verkopers te weten aan wie ze deze stoffen verkopen en waarvoor, dat vast te leggen, en verdachte transacties te melden.',
    'De verklaring die u invult, is die vastlegging. eustatement is de dienst die de verkoper gebruikt om haar te verzamelen.',
  ],

  idTitle: 'Wat gebeurt er met mijn identiteitsbewijs?',
  id: [
    'Als de verkoper om een identiteitscontrole vraagt, opent een beveiligd venster van Didit, onze aanbieder van identiteitscontrole. U fotografeert uw paspoort of identiteitskaart en maakt een korte selfie. Didit controleert of het document echt is en of het van u is.',
    'De foto’s gaan alleen naar Didit — ze komen nooit bij de verkoper of bij ons. Zodra de uitkomst is opgeslagen, wordt de controle bij Didit, inclusief de foto’s, verwijderd.',
    'Wat bewaard blijft, is de uitkomst en wat er op het document staat: uw naam, het soort document en het nummer. Uw geboortedatum wordt één keer gebruikt, om te controleren dat u 18 jaar of ouder bent, en wordt niet bewaard.',
  ],

  storedTitle: 'Wat wordt opgeslagen, en wie kan het zien?',
  stored: [
    'De gegevens die u in het formulier invult, de uitkomst van de identiteitscontrole en het resultaat van de automatische controles op de stof. Uw persoonsgegevens worden versleuteld opgeslagen, op servers in de EU.',
    'Geen andere verkoper kan uw verklaring zien — alleen de verkoper bij wie u koopt en diens team. Uw documentnummer blijft zelfs voor hen verborgen: een teamlid moet met een tweede inlogstap bevestigen om het te zien, en elke keer dat dat gebeurt wordt het vastgelegd.',
    'Onze eigen medewerkers kunnen verklaringen openen als dat nodig is om de dienst te laten werken en te ondersteunen. Ook zij zien een documentnummer alleen door het bewust op te vragen, en die opvraging is zichtbaar in het overzicht van de verkoper.',
  ],

  decideTitle: 'Wie beslist?',
  decide: [
    'Een medewerker van de verkoper leest elke verklaring en beslist. Automatische controles — of de stof op een lijst met beperkingen staat, of het opgegeven gebruik waarschuwingssignalen bevat, of het btw-nummer van een bedrijf geldig is — wijzen de beoordelaar alleen op wat een tweede blik verdient. Ze keuren nooit zelf iets goed of af.',
    'De enige uitzondering is leeftijd: als uw document laat zien dat u jonger bent dan 18, kan de verklaring niet worden verzonden.',
    'Is uw verklaring niet in het Engels of Nederlands, dan kan ze voor de beoordelaar automatisch worden vertaald. Dat gebeurt op onze eigen server; uw tekst gaat niet naar een vertaaldienst.',
  ],

  keptTitle: 'Hoe lang wordt het bewaard?',
  kept: [
    '18 maanden vanaf de dag dat u de verklaring verstuurt. Daarna wordt ze automatisch verwijderd, met alles wat hierboven staat. Sluit de verkoper zijn account eerder, dan wordt ze 30 dagen daarna verwijderd.',
  ],

  othersTitle: 'Wie zijn er verder bij betrokken?',
  othersIntro: 'Naast de verkoper en ons spelen deze partijen een rol:',
  others: [
    ['Didit', 'controleert uw identiteitsbewijs — alleen als de verkoper daarom vraagt.'],
    ['De Europese Commissie (VIES)', 'controleert het btw-nummer — alleen als u voor een bedrijf bestelt.'],
    ['PubChem en Wikidata', 'helpen de stof te herkennen. Ze ontvangen de stofnaam en het CAS-nummer, nooit iets over u.'],
    ['Onze e-mailaanbieder', 'bezorgt de bevestiging en de beslissing in uw mailbox.'],
    ['Cloudflare', 'beschermt de website tegen aanvallen en ziet uw IP-adres als het verkeer passeert.'],
    ['Hetzner', 'host onze servers in de EU.'],
  ],
  othersMore: 'De volledige lijst, met vestigingslanden, staat in ons privacybeleid (Engelstalig).',

  rightsTitle: 'Wat zijn mijn rechten?',
  rights: [
    'U kunt vragen om de gegevens over u in te zien, ze te laten verbeteren of te laten verwijderen waar de wet dat toestaat — de verkoper kan verplicht zijn de vastlegging te bewaren zolang de regels dat vereisen.',
  ],
  controller: (seller) => seller
    ? `${seller} is verantwoordelijk voor uw gegevens (de „verwerkingsverantwoordelijke”); eustatement verwerkt ze in hun opdracht. Stuur uw verzoek naar ${seller}.`
    : 'De verkoper is verantwoordelijk voor uw gegevens (de „verwerkingsverantwoordelijke”); eustatement verwerkt ze in hun opdracht. Stuur uw verzoek naar de verkoper.',
  fallback: (email) => `Krijgt u hen niet te pakken, schrijf dan naar ${email}; wij sturen uw verzoek door.`,
  complaint: 'U kunt ook een klacht indienen bij de toezichthouder voor gegevensbescherming in uw land; in Nederland is dat de Autoriteit Persoonsgegevens.',

  questionsTitle: 'Vragen?',
  questionsOrder: 'Over uw bestelling of de beslissing: neem contact op met de verkoper.',
  questionsData: (email) => `Over deze pagina of hoe met uw gegevens wordt omgegaan: ${email}.`,

  lastUpdated: (date) => `Laatst bijgewerkt: ${date}`,
  privacyPolicy: 'Privacybeleid',
};

export default nl;
