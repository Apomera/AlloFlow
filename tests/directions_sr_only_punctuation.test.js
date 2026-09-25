// Directions view · screen-reader-only text uses plain punctuation.
//
// The goals checklist and the quest map carried hidden status text for screen readers joined with an
// em dash (" — not yet complete", " — Reading, already visited"). Some screen readers announce the
// character as "dash" in the middle of every goal, and the house style for student-facing text is
// no em or en dashes. Found 2026-09-22 in the Crew QA harness's goal labels. Checks the source and
// both built copies of the module. DIRECTIONS_ROOT points it at copies (for mutation runs).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILES = ['view_directions_result_source.jsx', 'view_directions_result_module.js', 'desktop/web-app/public/view_directions_result_module.js'];

// Every sr-only element's text: JSX children in the source, React.createElement children in the build.
// The build's children run to the createElement call's closing paren; stopping at the first ')' would
// miss the second branch of a ternary.
function srOnlyTexts(src) {
  const out = [];
  for (const m of src.matchAll(/className="sr-only">\{([^\n]*?)\}<\/span>/g)) out.push(m[1]);
  for (const m of src.matchAll(/className:\s*"sr-only"\s*\},\s*/g)) {
    const start = m.index + m[0].length;
    let i = start, depth = 0, quote = '';
    for (; i < src.length; i++) {
      const ch = src[i];
      if (quote) { if (ch === '\\') i++; else if (ch === quote) quote = ''; continue; }
      if (ch === "'" || ch === '"' || ch === '`') quote = ch;
      else if (ch === '(') depth++;
      else if (ch === ')') { if (depth === 0) break; depth--; }
    }
    out.push(src.slice(start, i));
  }
  return out;
}

describe('directions view: screen-reader-only text', () => {
  it.each(FILES)('%s has sr-only status text, and none of it uses an em or en dash', (file) => {
    const src = readFileSync(resolve(process.env.DIRECTIONS_ROOT || process.cwd(), file), 'utf8');
    const texts = srOnlyTexts(src);
    expect(texts.length, 'found no sr-only text to check in ' + file).toBeGreaterThanOrEqual(2);
    expect(texts.filter((t) => /[–—]|\\u201[34]/.test(t))).toEqual([]);
  });
});
