// Statement translation tests, against a stand-in LibreTranslate.
//
// The real service runs only in the deployed stack, so this starts a small
// HTTP server that answers the three endpoints the code uses. What matters:
// a readable statement is left alone, a foreign one is translated, a language
// the server has not loaded is named but not guessed at, the screen reads the
// translation, and the translator being down never breaks anything.
//
// Offline. Run: npx tsx scripts/translateTest.ts
import http from 'node:http';
import type { AddressInfo } from 'node:net';

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};

// ── Stand-in LibreTranslate ────────────────────────────────────────────────
const DETECT: Record<string, { language: string; confidence: number }> = {
  'I will use it to clean glassware.': { language: 'en', confidence: 92 },
  'Ik gebruik het om glaswerk te reinigen.': { language: 'nl', confidence: 90 },
  'Ich will es trinken.': { language: 'de', confidence: 95 },
  'nettoyage': { language: 'it', confidence: 12 },
  'Reinigung von Glas.': { language: 'de', confidence: 88 },
  'Para limpiar.': { language: 'es', confidence: 85 },
  // Portuguese on a server without Portuguese: the detector picks its nearest.
  'Para bom uso no laboratório.': { language: 'es', confidence: 88 },
  'I clean glass with it.': { language: 'en', confidence: 90 },
};
const TRANSLATE: Record<string, string> = {
  'Ich will es trinken.': 'I want to drink it.',
  'nettoyage': 'cleaning',
  'Para limpiar.': 'Para limpiar.', // an engine passing text through untranslated
};
let inFlight = 0, maxInFlight = 0, detectCalls = 0, translateCalls = 0;

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', async () => {
    inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise(r => setTimeout(r, 20));
    inFlight--;
    const json = (v: unknown) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(v)); };
    if (req.url === '/languages') {
      return json(['en', 'nl', 'de', 'fr', 'es', 'it', 'pl'].map(code => ({ code, targets: ['en', 'nl', 'de', 'fr', 'es', 'it', 'pl'] })));
    }
    const { q, source } = JSON.parse(body || '{}');
    if (req.url === '/detect') { detectCalls++; return json([DETECT[q] ?? { language: 'en', confidence: 10 }]); }
    if (req.url === '/translate') {
      translateCalls++;
      return json({ translatedText: TRANSLATE[q] ?? `[${source}→en] ${q}` });
    }
    res.statusCode = 404; res.end();
  });
});
await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
process.env.LIBRETRANSLATE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

// Imported after the URL is set: the module reads it once.
const { translateStatement, resetTranslationCache } = await import('../services/translate.ts');
const { checkSubstanceUse } = await import('../services/substanceCheck.ts');

console.log('— Readable languages are left alone —');
{
  const before = translateCalls;
  const en = await translateStatement('I will use it to clean glassware.');
  check('English: detected, not translated', en.lang === 'en' && en.translation === null, JSON.stringify(en));
  const nl = await translateStatement('Ik gebruik het om glaswerk te reinigen.', 'nl');
  check('Dutch: detected, not translated', nl.lang === 'nl' && nl.translation === null, JSON.stringify(nl));
  check('no translation request was made for either', translateCalls === before);
}

console.log('— Foreign languages the server has loaded —');
{
  const de = await translateStatement('Ich will es trinken.', 'de');
  check('German is translated to English', de.lang === 'de' && de.translation === 'I want to drink it.', JSON.stringify(de));
  const unsure = await translateStatement('nettoyage', 'fr');
  check('an unsure detection defers to the buyer’s form language', unsure.lang === 'fr', JSON.stringify(unsure));
  const passthrough = await translateStatement('Para limpiar.');
  check('a "translation" identical to the input is dropped', passthrough.lang === 'es' && passthrough.translation === null, JSON.stringify(passthrough));
}

console.log('— Languages the server has not loaded —');
{
  const before = detectCalls;
  const el = await translateStatement('Θα το χρησιμοποιήσω για καθαρισμό.');
  check('Greek is named from its script, not guessed at', el.lang === 'el' && el.translation === null, JSON.stringify(el));
  check('and LibreTranslate was not asked to detect it', detectCalls === before);
  const bg = await translateStatement('Ще го използвам за почистване.', 'bg');
  check('Cyrillic from a buyer who chose Bulgarian is Bulgarian', bg.lang === 'bg' && bg.translation === null, JSON.stringify(bg));
  const ru = await translateStatement('Я буду использовать это для очистки.', 'en');
  check('Cyrillic otherwise is left unnamed, not called Bulgarian', ru.lang === null && ru.translation === null, JSON.stringify(ru));
  const ar = await translateStatement('لتنظيف الأدوات الزجاجية في المختبر', 'en');
  check('Arabic is left unnamed', ar.lang === null && ar.translation === null, JSON.stringify(ar));
  check('and no non-Latin text was sent to the detector', detectCalls === before);

  const before2 = translateCalls;
  const pt = await translateStatement('Para bom uso no laboratório.', 'pt');
  check('Portuguese detected as "Spanish" keeps the buyer’s choice and is not translated', pt.lang === 'pt' && pt.translation === null, JSON.stringify(pt));
  check('so no Spanish-into-nonsense translation was made', translateCalls === before2);
  const ptEn = await translateStatement('I clean glass with it.', 'pt');
  check('a buyer on the Portuguese form writing English is read as English', ptEn.lang === 'en' && ptEn.translation === null, JSON.stringify(ptEn));
}

console.log('— One at a time on a small server —');
{
  maxInFlight = 0;
  await Promise.all(['Ich will es trinken.', 'Reinigung von Glas.', 'nettoyage', 'Para limpiar.']
    .map(t => translateStatement(t)));
  check('concurrent statements are translated one after another', maxInFlight === 1, `max in flight ${maxInFlight}`);
}

console.log('— The screen reads the translation —');
{
  // An invalid CAS keeps this offline: the CAS is flagged without asking
  // PubChem, and the statement screen still runs.
  const base = { substances: 'Aceton', casNumbers: 'n/a', buyerType: 'INDIVIDUAL' as const };
  // Polish has no hand-written word list, so only the translation can catch it.
  const without = await checkSubstanceUse({ ...base, statement: 'Chcę to wypić.', statementLang: 'pl' });
  check('Polish "drink it" alone is not caught by any word list', !/Ingestion/.test(without.note));
  const withT = await checkSubstanceUse({
    ...base, statement: 'Chcę to wypić.', statementTranslation: 'I want to drink it.', statementLang: 'pl',
  });
  check('with the translation it is flagged', withT.status === 'FLAGGED' && /Ingestion/.test(withT.note), withT.note.slice(0, 200));
  check('and the flag says it came from the Polish translation', /found in the machine translation from Polish/.test(withT.note));
  const de = await checkSubstanceUse({
    ...base, statement: 'Ich will es trinken.', statementTranslation: 'I want to drink it.', statementLang: 'de',
  });
  check('German is caught by its own list, not attributed to the translation',
    /Ingestion/.test(de.note) && !/found in the machine translation/.test(de.note), de.note.slice(0, 200));
  const both = await checkSubstanceUse({
    ...base, statement: 'I want to drink it.', statementTranslation: 'I want to drink it.', statementLang: 'en',
  });
  check('a concern found in both is reported once', (both.note.match(/Ingestion/g) ?? []).length === 1, both.note.slice(0, 200));
}

{
  const pending = await checkSubstanceUse({
    substances: 'Aceton', casNumbers: 'n/a', buyerType: 'INDIVIDUAL', statement: 'Quiero beberlo.', translationUnavailable: true,
  });
  check('an untranslated statement during an outage says so in the note', /not been translated yet/.test(pending.note), pending.note.slice(0, 160));
}

console.log('— The translator being down —');
{
  await new Promise<void>(r => server.close(() => r()));
  server.closeAllConnections?.();
  resetTranslationCache();
  const down = await translateStatement('Ich will es trinken.', 'de');
  check('no throw, no translation, marked for a retry', down.translation === null && down.unavailable === true, JSON.stringify(down));
  check('the form language is kept as the best guess', down.lang === 'de');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
