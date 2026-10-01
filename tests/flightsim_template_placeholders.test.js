import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Every templated string must have its placeholders filled.
 *
 * The i18n passes replaced glued concatenation ('Score: ' + n) with templates
 * ('Score: {n}' plus .replace). That is the right shape for translation, but it
 * introduces a failure mode nothing else catches: if the {token} in the text and
 * the .replace() that fills it ever disagree — a rename, a copied line, a key
 * reused with different wording — the user simply sees a literal "{n}" on
 * screen. Nothing throws, no test fails, and it only shows in the one state
 * that renders that string. Several of these live on canvas, where no DOM sweep
 * can reach them at all.
 *
 * Two shapes are legitimate and must NOT be reported:
 *   - a chain of several .replace() calls whose arguments contain ')';
 *   - a template assigned to a variable and filled later:
 *       tachUnit = __alloT(..., '{n} RPM');  ... tachUnit.replace('{n}', v)
 * An earlier version of this check reported 54 findings, all false, by trying
 * to match the .replace chain with a regex anchored to the __alloT call.
 */
const SRC = 'stem_lab/stem_tool_flightsim.js';

const findUnfilled = (src) => {
  const statements = src.split(';');
  const unfilled = [];
  const callRe = /__alloT\(\s*'stem\.flightsim\.([A-Za-z0-9_]+)'\s*,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*\)/g;
  let checked = 0;
  for (const stmt of statements) {
    let m;
    callRe.lastIndex = 0;
    while ((m = callRe.exec(stmt))) {
      let text;
      // eslint-disable-next-line no-eval
      try { text = eval(m[2]); } catch (e) { continue; }
      if (typeof text !== 'string') continue;
      const tokens = Array.from(new Set(text.match(/\{[A-Za-z0-9_]+\}/g) || []));
      if (!tokens.length) continue;
      checked++;
      for (const tok of tokens) {
        if (stmt.includes(`replace('${tok}'`) || stmt.includes(`replace("${tok}"`)) continue;
        const assign = /(?:var\s+)?([A-Za-z_$][\w$]*)\s*=\s*$/.exec(stmt.slice(0, m.index));
        if (assign && new RegExp(`${assign[1]}\\.replace\\(\\s*'${tok.replace(/[{}]/g, '\\$&')}'`).test(src)) continue;
        unfilled.push(`${m[1]}  ${tok}`);
      }
    }
  }
  return { checked, unfilled: Array.from(new Set(unfilled)) };
};

describe('flightsim template placeholders', () => {
  const src = readFileSync(SRC, 'utf8');

  it('checks a meaningful number of templates (the scan must not go blind)', () => {
    const { checked } = findUnfilled(src);
    expect(checked, 'the template scan matched almost nothing — check the pattern')
      .toBeGreaterThan(50);
  });

  it('fills every placeholder it declares', () => {
    const { unfilled } = findUnfilled(src);
    expect(unfilled, 'these render a literal {token} to the user').toEqual([]);
  });

  it('would catch a removed .replace (the check can fail)', () => {
    // Calibration in the test itself: plant the defect in a STRING COPY, never
    // on disk. A gate that cannot fail is worse than no gate.
    const planted = src.replace(".replace('{grade}', ls.grade)", '');
    expect(planted, 'the calibration anchor is gone — update it').not.toBe(src);
    const { unfilled } = findUnfilled(planted);
    expect(unfilled.some((u) => u.includes('{grade}')),
      'the scan did not react to a planted unfilled placeholder').toBe(true);
  });
});
