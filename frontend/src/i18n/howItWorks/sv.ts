import type { HowItWorks } from './en.ts';

const sv: HowItWorks = {
  docTitle: 'Så fungerar det',
  badge: 'För köpare',
  title: 'Så fungerar det',
  lede: 'Du ombads fylla i ett slutanvändarintyg innan du köper en kemikalie. Den här sidan förklarar varför, vad som händer med dina uppgifter och vad du själv kan göra.',
  sentBy: (seller) => `Du kom hit från formuläret hos ${seller}.`,
  backToForm: 'Tillbaka till formuläret',
  contents: 'På den här sidan',

  shortTitle: 'I korthet',
  short: [
    'Säljaren måste kontrollera vem som köper vissa kemikalier och till vad. Det kräver lagen — det är inte butikens val.',
    'Din id-handling kontrolleras av Didit. Bilder av den når aldrig säljaren eller oss.',
    'Säljarens team läser ditt intyg. Ditt dokumentnummer förblir dolt om ingen medvetet tar fram det, och varje gång registreras.',
    'Allt raderas automatiskt efter 18 månader.',
  ],

  whyTitle: 'Varför får jag den här frågan?',
  why: [
    'Vissa kemikalier kan missbrukas för att tillverka sprängämnen, narkotika eller vapen. EU-regler — bland dem förordning (EU) 2019/1148 om sprängämnesprekursorer — kräver att säljare vet vem de säljer dessa ämnen till och för vilket ändamål, att de dokumenterar det och att de rapporterar misstänkta transaktioner.',
    'Intyget du fyller i är den dokumentationen. eustatement är tjänsten säljaren använder för att samla in den.',
  ],

  idTitle: 'Vad händer med min id-handling?',
  id: [
    'Om säljaren begär identitetskontroll öppnas ett säkert fönster från Didit, vår leverantör av identitetskontroll. Du fotograferar ditt pass eller id-kort och tar en kort selfie. Didit kontrollerar att handlingen är äkta och att den tillhör dig.',
    'Bilderna går bara till Didit — de når aldrig säljaren eller oss. Så snart resultatet har sparats raderas kontrollen hos Didit, bilderna inräknade.',
    'Det som sparas är resultatet och det som står tryckt på handlingen: ditt namn, typ av handling och dess nummer. Ditt födelsedatum används en gång, för att kontrollera att du har fyllt 18, och sparas inte.',
  ],

  storedTitle: 'Vad sparas, och vem kan se det?',
  stored: [
    'Uppgifterna du fyller i formuläret, resultatet av identitetskontrollen och resultatet av de automatiska kontrollerna av ämnet. Dina personuppgifter sparas krypterade, på servrar inom EU.',
    'Ingen annan säljare kan se ditt intyg — bara säljaren du köper av och deras team. Ditt dokumentnummer förblir dolt även för dem: en teammedlem måste bekräfta med ett andra inloggningssteg för att se det, och varje gång det sker registreras det.',
    'Vår egen personal kan öppna intyg när det behövs för att driva och ge support för tjänsten. Även de ser ett dokumentnummer bara genom att medvetet ta fram det, och det syns i säljarens logg.',
  ],

  decideTitle: 'Vem beslutar?',
  decide: [
    'En person hos säljaren läser varje intyg och beslutar. Automatiska kontroller — om ämnet finns på en lista med begränsningar, om den angivna användningen innehåller varningssignaler, om ett företags momsnummer är giltigt — pekar bara ut för granskaren vad som förtjänar en närmare titt. De godkänner eller avslår aldrig något på egen hand.',
    'Det enda undantaget är ålder: om din handling visar att du är under 18 år kan intyget inte skickas.',
    'Är ditt intyg inte på engelska eller nederländska kan det maskinöversättas åt granskaren. Det sker på vår egen server; din text skickas inte till någon översättningstjänst.',
  ],

  keptTitle: 'Hur länge sparas det?',
  kept: [
    '18 månader från den dag du skickar intyget. Därefter raderas det automatiskt, tillsammans med allt som beskrivs ovan. Om säljaren avslutar sitt konto tidigare raderas det 30 dagar därefter.',
  ],

  othersTitle: 'Vilka fler är inblandade?',
  othersIntro: 'Utöver säljaren och oss har dessa parter en roll:',
  others: [
    ['Didit', 'kontrollerar din id-handling — bara om säljaren begär det.'],
    ['Europeiska kommissionen (VIES)', 'kontrollerar momsnumret — bara om du beställer för ett företag.'],
    ['PubChem och Wikidata', 'hjälper till att identifiera ämnet. De får ämnets namn och CAS-nummer, aldrig något om dig.'],
    ['Vår e-postleverantör', 'levererar bekräftelsen och beslutet till din inkorg.'],
    ['Cloudflare', 'skyddar webbplatsen mot attacker och ser din IP-adress när trafiken passerar.'],
    ['Hetzner', 'driftar våra servrar inom EU.'],
  ],
  othersMore: 'Hela listan, med platser, finns i vår integritetspolicy (på engelska).',

  rightsTitle: 'Vilka rättigheter har jag?',
  rights: [
    'Du kan begära att få se uppgifterna om dig, att få dem rättade eller raderade där lagen tillåter det — säljaren kan vara skyldig att spara dokumentationen så länge reglerna kräver.',
  ],
  controller: (seller) => seller
    ? `${seller} ansvarar för dina uppgifter (den ”personuppgiftsansvarige”); eustatement behandlar dem för deras räkning. Skicka din begäran till ${seller}.`
    : 'Säljaren ansvarar för dina uppgifter (den ”personuppgiftsansvarige”); eustatement behandlar dem för säljarens räkning. Skicka din begäran till säljaren.',
  fallback: (email) => `Om du inte når dem, skriv till ${email} så vidarebefordrar vi din begäran.`,
  complaint: 'Du kan också klaga hos dataskyddsmyndigheten i ditt land.',

  questionsTitle: 'Frågor?',
  questionsOrder: 'Om din beställning eller beslutet: kontakta säljaren.',
  questionsData: (email) => `Om den här sidan eller hur dina uppgifter hanteras: ${email}.`,

  lastUpdated: (date) => `Senast uppdaterad: ${date}`,
  privacyPolicy: 'Integritetspolicy',
};

export default sv;
