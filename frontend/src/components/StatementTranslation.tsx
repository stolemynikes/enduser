// The buyer's stated use, with a machine translation under it when one exists.
//
// The original always comes first and stays the record; the translation is
// labelled as what it is, so nobody quotes it in a report by mistake. Used by
// both the company and the platform dashboard, so it carries its own styles
// and takes its colours from the surrounding text rather than either palette.
//
// UX rules this follows deliberately:
//   - the label says "machine translation" in words, not only by indentation
//   - the original is marked with its language (`lang`), so a screen reader
//     pronounces German as German instead of reading it with English rules
//   - a language with no translation is named, so the reviewer knows why the
//     block is missing instead of wondering whether something failed
const READABLE = new Set(['en', 'nl']);

function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function StatementWithTranslation({ statement, lang, translation }: {
  statement: string;
  lang?: string | null;
  translation?: string | null;
}) {
  const foreign = !!lang && !READABLE.has(lang);
  return (
    <span className="st-wrap">
      <style>{styles}</style>
      <span lang={lang || undefined}>{statement}</span>
      {translation && (
        <span className="st-translation" lang="en">
          <span className="st-meta">
            Machine translation{lang ? ` from ${languageName(lang)}` : ''} · made on this server · read the original before deciding
          </span>
          <span className="st-text">{translation}</span>
        </span>
      )}
      {!translation && foreign && (
        <span className="st-meta st-meta--alone">
          Written in {languageName(lang)}. No automatic translation is available for this language.
        </span>
      )}
    </span>
  );
}

const styles = `
  .st-wrap { display: flex; flex-direction: column; gap: 10px; }
  .st-translation {
    display: flex; flex-direction: column; gap: 4px;
    border-left: 2px solid rgba(91, 156, 246, 0.55);
    padding: 2px 0 2px 10px;
  }
  .st-meta {
    font-size: 10.5px; letter-spacing: 0.02em; opacity: 0.7;
    font-style: italic;
  }
  .st-meta--alone { opacity: 0.65; }
  .st-text { opacity: 0.92; }
`;
