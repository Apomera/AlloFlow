import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { findUnfilled } from './helpers/flightsim_template_scan.js';

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
 * These shapes are legitimate and must NOT be reported:
 *   - a chain of several .replace() calls whose arguments contain ')';
 *   - a conditional template assigned to a variable and filled later;
 *   - a template assigned to a variable and filled later:
 *       tachUnit = __alloT(..., '{n} RPM');  ... tachUnit.replace('{n}', v)
 * An earlier version of this check reported 54 findings, all false, by trying
 * to match the .replace chain with a regex anchored to the __alloT call.
 */
const SRC = process.env.SKYSCHOOL_TEMPLATE_SOURCE || 'stem_lab/stem_tool_flightsim.js';

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

  it('recognizes a conditional template assignment and catches a missing fill', () => {
    const conditional = "var message = rotor ? __alloT('stem.flightsim.radio_rotor_start', '{field} training radio') : __alloT('stem.flightsim.radio_taxi', '{field} training radio'); message.replace('{field}', field);";
    expect(findUnfilled(conditional).unfilled).toEqual([]);
    expect(findUnfilled(conditional.replace("message.replace('{field}', field)", 'message')).unfilled)
      .toContain('radio_rotor_start  {field}');
  });

  it('follows nested conditional assignments through both later replacements', () => {
    const code = "var turn = direction === 'left' ? __alloT('stem.flightsim.sample_left', '{degrees} toward {airport}') : direction === 'right' ? __alloT('stem.flightsim.sample_right', '{degrees} toward {airport}') : __alloT('stem.flightsim.sample_aligned', 'Toward {airport}'); turn = turn.replace('{degrees}', Math.round(Math.abs(error))).replace('{airport}', airport.code);";
    expect(findUnfilled(code).unfilled).toEqual([]);
    expect(findUnfilled(code.replace(".replace('{airport}', airport.code)", '')).unfilled).toEqual([
      'sample_left  {airport}', 'sample_right  {airport}', 'sample_aligned  {airport}',
    ]);
  });

  it('keeps semicolons inside strings, comments and replacement callbacks intact', () => {
    const code = "__alloT('stem.flightsim.sample_progress', '{done} complete; {total} total').replace('{done}', rows.filter(function(row) { /* ; */ return row.done; }).length).replace('{total}', rows.length);";
    expect(findUnfilled(code).unfilled).toEqual([]);
    expect(findUnfilled(code.replace(".replace('{total}', rows.length)", '')).unfilled).toEqual(['sample_progress  {total}']);
  });

  it('follows every replacement in a later chain on an assigned template', () => {
    const code = "var message = __alloT('stem.flightsim.sample_counts', '{cards} in {topics}'); var output = message.replace('{cards}', count()).replace('{topics}', topics.length);";
    expect(findUnfilled(code).unfilled).toEqual([]);
    expect(findUnfilled(code.replace(".replace('{topics}', topics.length)", '')).unfilled).toEqual(['sample_counts  {topics}']);
  });

  it('does not borrow a fill from another template in the same statement', () => {
    const code = "render(__alloT('stem.flightsim.sample_missing', '{n}'), __alloT('stem.flightsim.sample_filled', '{n}').replace('{n}', count));";
    expect(findUnfilled(code).unfilled).toEqual(['sample_missing  {n}']);
  });

  it('keeps identically named variables in different functions separate', () => {
    const code = "function first() { var message = __alloT('stem.flightsim.sample_missing', '{n}'); return message; } function second() { var message = __alloT('stem.flightsim.sample_filled', '{n}'); return message.replace('{n}', count); }";
    expect(findUnfilled(code).unfilled).toEqual(['sample_missing  {n}']);
  });

  it('does not treat a shadowed callback parameter as the assigned template', () => {
    const code = "var message = __alloT('stem.flightsim.sample_missing', '{n}'); rows.map(function(message) { return message.replace('{n}', count); });";
    expect(findUnfilled(code).unfilled).toEqual(['sample_missing  {n}']);
    expect(findUnfilled(code + "message.replace('{n}', count);").unfilled).toEqual([]);
  });

  it('follows aliases, double-quoted literals and computed replacement methods', () => {
    const code = 'const message = __alloT("stem.flightsim.sample_alias", "{n}"); const alias = message; alias["replaceAll"]("{n}", count);';
    expect(findUnfilled(code).unfilled).toEqual([]);
    expect(findUnfilled(code.replace('alias["replaceAll"]("{n}", count)', 'alias')).unfilled).toEqual(['sample_alias  {n}']);
  });

  it('ignores replacement-shaped text in comments and unrelated strings', () => {
    const code = "var message = __alloT('stem.flightsim.sample_missing', '{n}'); // message.replace('{n}', count);\n render(\"message.replace('{n}', count)\");";
    expect(findUnfilled(code).unfilled).toEqual(['sample_missing  {n}']);
    expect(findUnfilled(code + "message.replace('{n}', count);").unfilled).toEqual([]);
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
