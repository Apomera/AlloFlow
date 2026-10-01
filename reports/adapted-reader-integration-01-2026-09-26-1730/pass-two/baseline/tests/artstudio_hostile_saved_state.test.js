import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Two reads of saved state used `value || fallback` as if it were a type guard.
 * It is not: a truthy but wrong value walks straight through it.
 *
 *   - gradStops reached addColorStop unsanitised. Math.max/Math.min PROPAGATE
 *     NaN rather than clamping it, so a stop whose pos was a string, missing, or
 *     non-finite produced a non-finite offset and threw, blanking the Gradient
 *     lab. A stop that was not an object at all did the same.
 *   - strShape fell through an if/else-if chain with no final else, so an
 *     unrecognised value left the nail array empty and the draw loop read
 *     from[0] of undefined, blanking String Art.
 *
 * Swept in a real browser on 2026-09-21: 306 state keys x 14 hostile shapes =
 * 4,284 mounts, one crash each before, zero after. These pin the guards, since
 * both are one careless edit away from returning.
 */
const SOURCE = path.join(process.cwd(), 'stem_lab', 'stem_tool_artstudio.js');

describe('Art Studio hostile saved state', () => {
  const source = fs.readFileSync(SOURCE, 'utf8');

  it('normalises every gradient-stop read', () => {
    // The raw `d.gradStops || [ ... ]` shape is what crashed; every read should
    // go through the normaliser instead.
    expect(source).toContain('const artStudioGradientStops = function (raw)');
    expect(source, 'a raw gradStops read bypasses the normaliser')
      .not.toMatch(/d\.gradStops \|\| \[\{ hue:/);
  });

  it('the gradient normaliser rejects non-finite and non-object stops', () => {
    // Pull the helper out of the source and exercise it directly, so this stays
    // honest if the implementation is rewritten.
    const start = source.indexOf('const artStudioGradientStops = function (raw)');
    expect(start, 'gradient normaliser should exist').toBeGreaterThan(-1);
    const end = source.indexOf('\n          };', start);
    const body = source.slice(source.indexOf('{', start), end + 12);
    // The helper closes over the default list, so supply it the same way the
    // tool does rather than inlining a second copy of the values here.
    const defaultsMatch = source.match(/const ART_STUDIO_GRADIENT_STOPS = (\[[^;]*\]);/);
    expect(defaultsMatch, 'default gradient stops should exist').toBeTruthy();
    // eslint-disable-next-line no-new-func
    const normalise = new Function(
      'const ART_STUDIO_GRADIENT_STOPS = ' + defaultsMatch[1] + ';'
      + 'return function (raw) ' + body + ';')();

    const finite = (list) => list.every((s) =>
      typeof s.hue === 'number' && Number.isFinite(s.hue) &&
      typeof s.pos === 'number' && Number.isFinite(s.pos) &&
      s.pos >= 0 && s.pos <= 100);

    for (const hostile of [
      null, undefined, 'nonsense', 0, [], [null, null], [7, { hue: 45, pos: 100 }],
      [{ hue: 330, pos: 'x' }], [{ hue: 330 }], [{ hue: Infinity, pos: 0 }],
      [{ hue: { a: 1 }, pos: { b: 2 } }], [{ hue: NaN, pos: NaN }],
    ]) {
      const out = normalise(hostile);
      expect(Array.isArray(out), JSON.stringify(hostile)).toBe(true);
      expect(out.length, JSON.stringify(hostile)).toBeGreaterThan(0);
      expect(finite(out), 'non-finite stop survived: ' + JSON.stringify(hostile)).toBe(true);
    }
  });

  it('normalises the watercolour swatch colour instead of trusting truthiness', () => {
    // `(d.watercolorColor || '#2f6fb0').toLowerCase()` let a NUMBER through the
    // guard and then threw, blanking the Watercolor lab. Found by the deep
    // hostile sweep, which reaches keys the default 60-key pass does not.
    expect(source, 'a raw colour read must not call toLowerCase directly')
      .not.toContain("(d.watercolorColor || '#2f6fb0').toLowerCase()");
    expect(source).toContain('const artStudioHexColor = function (raw, fallback)');
  });

  it('the colour normaliser only accepts real hex and still lowercases it', () => {
    const start = source.indexOf('const artStudioHexColor = function (raw, fallback)');
    expect(start, 'colour normaliser should exist').toBeGreaterThan(-1);
    const body = source.slice(source.indexOf('{', start), source.indexOf('\n          };', start) + 12);
    // eslint-disable-next-line no-new-func
    const hex = new Function('return function (raw, fallback) ' + body + ';')();

    // Valid input is preserved, and case is normalised so a swatch still matches.
    expect(hex('#2F6FB0', '#2f6fb0')).toBe('#2f6fb0');
    expect(hex('#abc', '#2f6fb0')).toBe('#abc');
    // Everything a corrupted save can hold falls back to something usable.
    for (const bad of [9999, {}, [], null, undefined, true, 'notacolor', '#zzz', NaN]) {
      expect(hex(bad, '#2f6fb0'), JSON.stringify(bad)).toBe('#2f6fb0');
    }
  });

  it('validates the string-art frame shape against the known set', () => {
    expect(source, 'strShape must be checked against the known shapes, not just truthiness')
      .toContain("['circle', 'square', 'triangle', 'star'].indexOf(d.strShape) === -1");
    expect(source).not.toMatch(/var shape = d\.strShape \|\| 'circle';/);
  });
});
