// Nuclear Lab — the 3D core's temperature colouring.
//
// The core used to pick its colour from three hard thresholds (320 C, 450 C,
// 900 C). Cladding fails at 1200 C, so across the last 300 degrees — more than
// half the blackout scenario, and the part where the fuel is actually failing —
// the picture did not change at all while the number climbed. A student watching
// the 3D view saw a frozen image during the only stretch that mattered.
//
// It now interpolates across twelve quantised steps. These tests pin the two
// things that make that worth doing: the colour must actually keep changing as
// the core heats, and normal operation must still look unremarkable.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_nuclearlab.js', 'utf8');

function ramps() {
  const open = SRC.indexOf('    var nkMix = function');
  const close = SRC.indexOf('    var colourOf = function', open);
  expect(open, 'nkMix helper not found — did rxBuildCore change shape?').toBeGreaterThan(-1);
  expect(close, 'colourOf not found after nkMix').toBeGreaterThan(open);
  // eslint-disable-next-line no-new-func
  return new Function(SRC.slice(open, close) + '\nreturn { nkMix, nkRamp };')();
}

// The stops the tool actually uses, read out of source so this test cannot
// drift from them silently.
function stopsFor(varName) {
  const line = new RegExp('var ' + varName + ' = nkRamp\\(([\\s\\S]*?)\\], hot\\);').exec(SRC);
  expect(line, varName + ' ramp not found').toBeTruthy();
  // eslint-disable-next-line no-new-func
  return new Function('return ' + line[1].trim() + ']')();
}

describe('the core keeps changing colour as it heats', () => {
  it('interpolates rather than stepping between fixed colours', () => {
    const { nkMix } = ramps();
    // A blend halfway between two colours must be neither endpoint.
    const mid = nkMix('#000000', '#ffffff', 0.5);
    expect(mid).not.toBe('#000000');
    expect(mid).not.toBe('#ffffff');
    expect(mid).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('clamps outside 0..1 instead of producing a broken colour', () => {
    const { nkMix, nkRamp } = ramps();
    expect(nkMix('#000000', '#ffffff', -5)).toBe('#000000');
    expect(nkMix('#000000', '#ffffff', 5)).toBe('#ffffff');
    const cool = stopsFor('coolCol');
    expect(nkRamp(cool, -1)).toMatch(/^#[0-9a-f]{6}$/);
    expect(nkRamp(cool, 99)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('gives the hot half of the range more than one appearance', () => {
    // The old model had ONE colour above 900 C. Walk the top half of the band
    // and require the view to keep moving.
    const { nkRamp } = ramps();
    const cool = stopsFor('coolCol');
    const glow = stopsFor('glow');
    const seen = new Set();
    for (let step = 6; step <= 12; step++) {
      seen.add(nkRamp(cool, step / 12) + '|' + nkRamp(glow, step / 12));
    }
    expect(seen.size, 'the upper half of the temperature band still looks static')
      .toBeGreaterThanOrEqual(6);
  });

  it('leaves normal operation unremarkable', () => {
    // The steady scenario teaches that a reactor running properly is boring.
    // The fuel must not glow at the reference temperature.
    const { nkRamp } = ramps();
    expect(nkRamp(stopsFor('glow'), 0)).toBe('#000000');
    expect(nkRamp(stopsFor('glow'), 0.2)).toBe('#000000');
  });

  it('reaches a genuinely hot colour at the failure end', () => {
    const { nkRamp } = ramps();
    const hot = nkRamp(stopsFor('glow'), 1);
    const red = parseInt(hot.slice(1, 3), 16);
    const blue = parseInt(hot.slice(5, 7), 16);
    expect(red, 'the top of the range should be strongly red').toBeGreaterThan(150);
    expect(red).toBeGreaterThan(blue * 2);
  });
});

describe('the temperature the scene is given', () => {
  it('spans reference coolant temperature to cladding failure in 12 steps', () => {
    expect(SRC).toContain('(s.t - RX_T_REF) / (RX_T_CLAD - RX_T_REF)');
    expect(SRC).toContain('Math.round(hotFrac * 12)');
    // And the scene must be handed the fraction back, not the step index.
    expect(SRC).toContain('hot: rxUi.hotStep / 12');
  });

  it('no longer uses the three-threshold model', () => {
    expect(SRC).not.toContain("s.t > 900 ? 2 : (s.t > 450 ? 1 : 0)");
  });
});
