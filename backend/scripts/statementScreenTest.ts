// Keyword screen tests, per language.
//
// Two failure directions, both costly. A miss lets "Ich will damit eine Waffe
// bauen" read as "no concerns". A false flag on ordinary lab language trains
// reviewers to ignore the flag — which is worse, because then the real one is
// ignored too. So every language gets both kinds of case, and the cases that
// exist because a word means something else in a neighbouring language
// ("bom", "arme", "Essen", "droguerie") are tested explicitly.
//
// Offline. Run: npx tsx scripts/statementScreenTest.ts
import { screenStatement } from '../services/statementScreen.ts';

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const cats = (text: string, lang?: string | null) => screenStatement(text, lang).map(c => c.category);
const flags = (text: string, lang: string | null, category: string) => {
  const got = cats(text, lang);
  check(`[${lang ?? '??'}] "${text}" → ${category}`, got.includes(category), `got ${JSON.stringify(got)}`);
};
const clean = (text: string, lang: string | null) => {
  const got = cats(text, lang);
  check(`[${lang ?? '??'}] "${text}" → no concerns`, got.length === 0, `got ${JSON.stringify(got)}`);
};

const ING = 'Ingestion', EXP = 'Explosive or pyrotechnic intent', WEA = 'Weapon intent',
  DRU = 'Illicit drug manufacture', AVO = 'Avoiding scrutiny', VAGUE = 'Stated use not meaningful';

console.log('— The gaps that started this —');
flags('Ik ga het opdrinken', 'nl', ING);
flags('Ich will damit eine Waffe bauen', 'de', WEA);
flags('pour fabriquer de la drogue', 'fr', DRU);

console.log('— Dutch —');
flags('Ik wil het inslikken om high te worden', 'nl', ING);
flags('Voor het maken van vuurwerk voor oud en nieuw', 'nl', EXP);
flags('Om een bom te bouwen', 'nl', EXP);
flags('Ik wil iemand vergiftigen', 'nl', WEA);
flags('Een batch koken in de schuur', 'nl', DRU);
flags('Graag zonder factuur, contant, geen vragen', 'nl', AVO);
flags('Gaat u niets aan', 'nl', AVO);
flags('privé', 'nl', VAGUE);
clean('Reinigen van glaswerk in ons laboratorium', 'nl');
clean('Drinkwateranalyse volgens NEN-norm', 'nl');
clean('Etsen van printplaten in mijn werkplaats', 'nl');
clean('Oplosmiddel voor HPLC; let op explosiegrens van de damp', 'nl');
clean('Afbraak onder invloed van licht meten', 'nl');

console.log('— German —');
flags('Ich will es trinken', 'de', ING);
flags('Zum Sniffen', 'de', ING);
flags('Für Feuerwerk und Böller zu Silvester', 'de', EXP);
flags('Sprengstoff herstellen', 'de', EXP);
flags('Um mich an ihm zu rächen, Rache', 'de', WEA);
flags('Drogen herstellen im Keller', 'de', DRU);
flags('Bitte ohne Rechnung, nur bar, keine Fragen', 'de', AVO);
flags('Eigenbedarf', 'de', VAGUE);
clean('Reinigung von Laborglas', 'de');
clean('Trinkwasseranalyse nach DIN', 'de');
clean('Sicherheitsdatenblatt beachten: bei Verschlucken sofort Arzt rufen', 'de');
clean('Lieferung an unser Labor in Essen', 'de');
clean('Explosionsgeschützte Lagerung im Ex-Schutz-Schrank', 'de');
clean('Für arme Schüler im Chemieunterricht', 'de');   // "arme" = poor; a weapon only in French

console.log('— French —');
flags('Je veux le boire', 'fr', ING);
flags('Pour faire un feu d’artifice', 'fr', EXP);
flags('Fabriquer une bombe', 'fr', EXP);
flags('Pour empoisonner quelqu’un', 'fr', WEA);
flags('Laboratoire clandestin', 'fr', DRU);
flags('Sans facture, en liquide uniquement', 'fr', AVO);
flags('usage personnel', 'fr', VAGUE);
clean('Nettoyage de la verrerie de laboratoire', 'fr');
clean('Analyse de l’eau potable', 'fr');
clean('En cas d’ingestion, consulter un médecin — nous stockons en armoire antidéflagrante', 'fr');
clean('Achat pour notre droguerie', 'fr');

console.log('— English unchanged —');
flags('I want to drink it', 'en', ING);
flags('to make a bomb', 'en', EXP);
flags('No questions asked, cash only', 'en', AVO);
clean('Solvent for drinking water analysis by GC-MS', 'en');
clean('Cleaning precision optical components in our workshop', 'en');

console.log('— Language scoping —');
clean('Para bom uso no laboratório', 'pt');           // Portuguese "bom" = good
flags('Para bom uso no laboratório', null, EXP);       // unknown language: every list, and a false flag is the price
flags('Ich will es trinken', null, ING);               // unknown language still catches German
flags('Ik ga het opdrinken, high worden', 'nl', ING);  // English loanword inside Dutch
clean('Für arme Schüler', 'de');
flags('Une arme', 'fr', WEA);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
