import type { HowItWorks } from './en.ts';

const lt: HowItWorks = {
  docTitle: 'Kaip tai veikia',
  badge: 'Pirkėjams',
  title: 'Kaip tai veikia',
  lede: 'Prieš perkant cheminę medžiagą jūsų paprašė užpildyti galutinio naudotojo deklaraciją. Šiame puslapyje paaiškinama, kodėl, kas vyksta su jūsų duomenimis ir ką galite padaryti.',
  sentBy: (seller) => `Atėjote iš pardavėjo ${seller} formos.`,
  backToForm: 'Grįžti į formą',
  contents: 'Šiame puslapyje',

  shortTitle: 'Trumpai',
  short: [
    'Pardavėjas turi patikrinti, kas ir kam perka tam tikras chemines medžiagas. Tai reikalauja įstatymas, o ne parduotuvė.',
    'Jūsų asmens dokumentą tikrina „Didit“. Jo nuotraukos niekada nepasiekia pardavėjo ar mūsų.',
    'Jūsų deklaraciją skaito pardavėjo komanda. Dokumento numeris lieka paslėptas, nebent kas nors sąmoningai jį atidaro, ir kiekvienas atidarymas užregistruojamas.',
    'Po 18 mėnesių viskas automatiškai ištrinama.',
  ],

  whyTitle: 'Kodėl manęs to prašoma?',
  why: [
    'Kai kurios cheminės medžiagos gali būti panaudotos sprogmenims, narkotikams ar ginklams gaminti. ES taisyklės — tarp jų Reglamentas (ES) 2019/1148 dėl sprogmenų pirmtakų — įpareigoja pardavėjus žinoti, kam ir kokiu tikslu jie parduoda šias medžiagas, tai užfiksuoti ir pranešti apie įtartinus sandorius.',
    'Jūsų pildoma deklaracija ir yra šis įrašas. eustatement — tai paslauga, kuria pardavėjas jį surenka.',
  ],

  idTitle: 'Kas nutinka mano asmens dokumentui?',
  id: [
    'Jei pardavėjas reikalauja patikrinti tapatybę, atsidaro saugus „Didit“ — mūsų tapatybės patikrinimo paslaugų teikėjo — langas. Nufotografuojate pasą ar asmens tapatybės kortelę ir trumpai nusifotografuojate. „Didit“ patikrina, ar dokumentas tikras ir ar jis priklauso jums.',
    'Nuotraukos keliauja tik į „Didit“ — jos niekada nepasiekia pardavėjo ar mūsų. Vos tik rezultatas išsaugomas, patikrinimas „Didit“ sistemoje kartu su nuotraukomis ištrinamas.',
    'Išsaugomas rezultatas ir tai, kas atspausdinta dokumente: jūsų vardas ir pavardė, dokumento rūšis ir jo numeris. Gimimo data panaudojama vieną kartą — patikrinti, ar jums ne mažiau kaip 18 metų, — ir nesaugoma.',
  ],

  storedTitle: 'Kas saugoma ir kas tai gali matyti?',
  stored: [
    'Formoje įvesti duomenys, tapatybės patikrinimo rezultatas ir automatinių medžiagos patikrų rezultatas. Jūsų asmens duomenys saugomi užšifruoti, serveriuose ES.',
    'Joks kitas pardavėjas nemato jūsų deklaracijos — tik pardavėjas, iš kurio perkate, ir jo komanda. Dokumento numeris lieka paslėptas net nuo jų: komandos narys turi jį patvirtinti antru prisijungimo žingsniu, kad pamatytų, ir kiekvieną kartą tai užregistruojama.',
    'Mūsų darbuotojai gali atidaryti deklaracijas, kai to reikia paslaugos veikimui ir palaikymui. Jie taip pat mato dokumento numerį tik sąmoningai jį atidarę, ir tai matoma pardavėjo žurnale.',
  ],

  decideTitle: 'Kas sprendžia?',
  decide: [
    'Kiekvieną deklaraciją perskaito ir sprendimą priima pardavėjo darbuotojas. Automatinės patikros — ar medžiaga yra ribojamų medžiagų sąraše, ar nurodytas naudojimas turi įspėjamųjų ženklų, ar įmonės PVM mokėtojo kodas galioja — tik nurodo tikrintojui, į ką verta atidžiau pažvelgti. Jos niekada nieko pačios nepatvirtina ir neatmeta.',
    'Vienintelė išimtis — amžius: jei jūsų dokumentas rodo, kad jums mažiau nei 18 metų, deklaracijos išsiųsti negalima.',
    'Jei jūsų deklaracija ne anglų ar nyderlandų kalba, ji gali būti išversta mašininiu vertimu tikrintojui. Tai vyksta mūsų pačių serveryje; jūsų tekstas nesiunčiamas jokiai vertimo paslaugai.',
  ],

  keptTitle: 'Kiek laiko saugoma?',
  kept: [
    '18 mėnesių nuo išsiuntimo dienos. Vėliau ji automatiškai ištrinama kartu su viskuo, kas aprašyta pirmiau. Jei pardavėjas uždaro paskyrą anksčiau, ji ištrinama po 30 dienų.',
  ],

  othersTitle: 'Kas dar dalyvauja?',
  othersIntro: 'Be pardavėjo ir mūsų, vaidmenį atlieka šios šalys:',
  others: [
    ['Didit', 'tikrina jūsų asmens dokumentą — tik jei to reikalauja pardavėjas.'],
    ['Europos Komisija (VIES)', 'tikrina PVM mokėtojo kodą — tik jei užsakote įmonės vardu.'],
    ['PubChem ir Wikidata', 'padeda nustatyti medžiagą. Jos gauna medžiagos pavadinimą ir CAS numerį, niekada nieko apie jus.'],
    ['Mūsų el. pašto paslaugų teikėjas', 'pristato patvirtinimą ir sprendimą į jūsų pašto dėžutę.'],
    ['Cloudflare', 'saugo svetainę nuo atakų ir mato jūsų IP adresą, kai praeina srautas.'],
    ['Hetzner', 'talpina mūsų serverius ES.'],
  ],
  othersMore: 'Visas sąrašas su vietomis pateiktas mūsų privatumo politikoje (anglų kalba).',

  rightsTitle: 'Kokios mano teisės?',
  rights: [
    'Galite prašyti susipažinti su apie jus saugomais duomenimis, juos ištaisyti arba ištrinti, kai tai leidžia įstatymas — pardavėjas gali būti įpareigotas saugoti įrašą tiek, kiek reikalauja taisyklės.',
  ],
  controller: (seller) => seller
    ? `Už jūsų duomenis atsako ${seller} („duomenų valdytojas“); eustatement juos tvarko jo vardu. Prašymą siųskite pardavėjui ${seller}.`
    : 'Už jūsų duomenis atsako pardavėjas („duomenų valdytojas“); eustatement juos tvarko jo vardu. Prašymą siųskite pardavėjui.',
  fallback: (email) => `Jei nepavyksta su juo susisiekti, rašykite adresu ${email}; perduosime jūsų prašymą.`,
  complaint: 'Taip pat galite pateikti skundą savo šalies duomenų apsaugos institucijai.',

  questionsTitle: 'Klausimų?',
  questionsOrder: 'Dėl užsakymo ar sprendimo: kreipkitės į pardavėją.',
  questionsData: (email) => `Dėl šio puslapio ar jūsų duomenų tvarkymo: ${email}.`,

  lastUpdated: (date) => `Paskutinį kartą atnaujinta: ${date}`,
  privacyPolicy: 'Privatumo politika',
};

export default lt;
