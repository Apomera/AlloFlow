import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// A preset button writes straight into the same state a slider controls, so the two
// have to agree about what values exist. The habitable-zone tool's sliders both had
// `min: 0.05`, while three of its six presets are M-dwarf systems: TRAPPIST-1 e sets
// a luminosity of 0.0005 and a distance of 0.029. The thumb pinned to the left, the
// readout showed "0.00", and the next drag silently threw the preset away.
//
// The frame was a fixed 5 AU too, so that whole system - star, zone and planet - drew
// inside about one pixel.
const PATHS = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];

function habitableZone(source) {
  const at = source.indexOf('var Lstar = d.hzLum');
  expect(at, 'the habitable-zone tool must exist').toBeGreaterThan(-1);
  const block = source.slice(at, at + 9000);

  const sliders = {};
  const sliderRe = /val: (\w+), key: '(\w+)', min: ([\d.]+), max: ([\d.]+)/g;
  let m;
  while ((m = sliderRe.exec(block))) sliders[m[2]] = { min: Number(m[3]), max: Number(m[4]) };

  const presetRe = /\['([^']+)', ([\d.]+), ([\d.]+)\]/g;
  const presets = [];
  while ((m = presetRe.exec(block))) presets.push({ name: m[1], lum: Number(m[2]), dist: Number(m[3]) });

  return { sliders, presets };
}

describe('presets stay reachable by the controls that share their state', () => {
  for (const path of PATHS) {
    const source = readFileSync(path, 'utf8');

    it(`keeps every habitable-zone preset inside its slider range (${path})`, () => {
      const { sliders, presets } = habitableZone(source);
      expect(Object.keys(sliders).sort()).toEqual(['hzDist', 'hzLum']);
      expect(presets.length, 'presets must parse').toBeGreaterThanOrEqual(6);

      for (const preset of presets) {
        expect(preset.lum, `${preset.name} luminosity below the slider minimum`)
          .toBeGreaterThanOrEqual(sliders.hzLum.min);
        expect(preset.lum, `${preset.name} luminosity above the slider maximum`)
          .toBeLessThanOrEqual(sliders.hzLum.max);
        expect(preset.dist, `${preset.name} distance below the slider minimum`)
          .toBeGreaterThanOrEqual(sliders.hzDist.min);
        expect(preset.dist, `${preset.name} distance above the slider maximum`)
          .toBeLessThanOrEqual(sliders.hzDist.max);
      }
    });

    it(`draws every habitable-zone preset at a readable size (${path})`, () => {
      const { presets } = habitableZone(source);
      // The shipped frame: it must follow the system rather than assume 5 AU.
      expect(source).not.toContain('var maxDist = 5;');
      const from = source.indexOf('var maxDist = Math.max(planetDist');
      expect(from, 'the adaptive frame must exist').toBeGreaterThan(-1);
      const to = source.indexOf(';', source.indexOf('var scale =', from)) + 1;
      // eslint-disable-next-line no-new-func
      const frameFor = new Function(
        'planetDist', 'outerEdge', 'W',
        source.slice(from, to) + ' return scale;',
      );

      for (const preset of presets) {
        const innerEdge = Math.sqrt(preset.lum / 1.1);
        const outerEdge = Math.sqrt(preset.lum / 0.53);
        const scale = frameFor(preset.dist, outerEdge, 400);
        const innerX = 50 + innerEdge * scale;
        const outerX = 50 + outerEdge * scale;
        const planetX = 50 + preset.dist * scale;

        // The green band has to be a band, not a line.
        expect(outerX - innerX, `${preset.name} zone is too thin to see`).toBeGreaterThan(20);
        // And everything stays on the 400-wide canvas.
        for (const [what, x] of [['inner edge', innerX], ['outer edge', outerX], ['planet', planetX]]) {
          expect(x, `${preset.name} ${what} is off the left of the frame`).toBeGreaterThanOrEqual(0);
          expect(x, `${preset.name} ${what} is off the right of the frame`).toBeLessThanOrEqual(400);
        }
      }
    });

    it(`prints small values instead of rounding them to zero (${path})`, () => {
      // "0.00 L" told the reader a red dwarf emits no light at all.
      expect(source).not.toContain("}, Lstar.toFixed(2) + 'L");
      const from = source.indexOf('var hzFmt =');
      expect(from, 'the readout formatter must exist').toBeGreaterThan(-1);
      // eslint-disable-next-line no-new-func
      // The formatter's own body has semicolons in it, so cut at its closing brace.
      const fmt = new Function(source.slice(from, source.indexOf('};', from) + 2) + ' return hzFmt;')();
      expect(Number(fmt(0.0005))).toBeGreaterThan(0);
      expect(Number(fmt(0.0017))).toBeGreaterThan(0);
      expect(fmt(1)).toBe('1.00');
    });
  }
});

// The habitable-zone tool was not the only place a preset button wrote a value its
// own slider could not represent. This sweeps every preset in the file:
//
//   * Telescope Aperture Lab offered Hubble (240 cm) and JWST (650 cm) on a slider
//     that stopped at 100 cm.
//   * Asteroid Impact offered a Chicxulub preset of 10,000 m on a slider that
//     stopped at 5,000.
//   * Comet Orbit offered Hale-Bopp at e = 0.995 on a slider that stopped at 0.99,
//     and Earth's 0.017 did not sit on its 0.01 step grid.
//
// In every case the range input silently pins its thumb, so the preset survives only
// until the next drag - and the drawing is scaled for the range, not the value.
function sliderRanges(source) {
  const ranges = {};
  // Row objects: { ..., key: 'k', min: X, max: Y }
  const rowRe = /key: '(\w+)', min: (-?[\d.]+), max: ([\d.]+)/g;
  let m;
  while ((m = rowRe.exec(source))) ranges[m[1]] = { min: Number(m[2]), max: Number(m[3]) };
  // Inline inputs: min/max on the element, with upd('key', ...) in the handler.
  const inlineRe = /min: (-?[\d.]+), max: ([\d.]+)[^}]*?upd\('(\w+)'/g;
  while ((m = inlineRe.exec(source))) {
    if (!ranges[m[3]]) ranges[m[3]] = { min: Number(m[1]), max: Number(m[2]) };
  }
  return ranges;
}

// `upd('key', p[1])` inside a .map over a nearby [[...]] literal.
function presetWrites(source) {
  const writes = [];
  const re = /upd\('(\w+)', (\w+)\[(\d)\]\)/g;
  let m;
  while ((m = re.exec(source))) {
    const [, key, , index] = m;
    const before = source.slice(Math.max(0, m.index - 900), m.index);
    const arrayStart = before.lastIndexOf('[[');
    if (arrayStart < 0) continue;
    const arrayText = before.slice(arrayStart, before.indexOf(']]', arrayStart) + 2);
    const rowRe = /\['([^']*)'((?:, -?[\d.]+)+)\]/g;
    let row;
    while ((row = rowRe.exec(arrayText))) {
      const values = row[2].split(',').slice(1).map((v) => Number(v.trim()));
      const value = values[Number(index) - 1];
      if (Number.isFinite(value)) writes.push({ key, name: row[1], value });
    }
  }
  return writes;
}

describe('every preset in the tool is a value its own slider can reach', () => {
  for (const path of PATHS) {
    const source = readFileSync(path, 'utf8');

    it(`finds no preset outside its slider range (${path})`, () => {
      const ranges = sliderRanges(source);
      const writes = presetWrites(source);
      // Guard against a parse that quietly matches nothing.
      expect(Object.keys(ranges).length, 'sliders must parse').toBeGreaterThanOrEqual(8);
      expect(writes.length, 'presets must parse').toBeGreaterThanOrEqual(20);

      const checked = writes.filter((w) => ranges[w.key]);
      expect(checked.length, 'presets must match sliders').toBeGreaterThanOrEqual(15);

      for (const w of checked) {
        const range = ranges[w.key];
        expect(w.value, `preset "${w.name}" sets ${w.key}=${w.value}, below its slider minimum ${range.min}`)
          .toBeGreaterThanOrEqual(range.min);
        expect(w.value, `preset "${w.name}" sets ${w.key}=${w.value}, above its slider maximum ${range.max}`)
          .toBeLessThanOrEqual(range.max);
      }
    });

    it(`keeps the telescope drawing inside its frame at every aperture (${path})`, () => {
      // 1.5 px per cm drew a 995 px tube for JWST on a 400 px canvas.
      expect(source).not.toContain('var apXp = 20 + aperture * 1.5;');
      const from = source.indexOf('var apFrac =');
      expect(from, 'the aperture scale must exist').toBeGreaterThan(-1);
      // Aperture sizes the tube. The eyepiece disc is magnification's job now, and
      // is covered in solar_system_chart_scales.
      const to = source.indexOf(';', source.indexOf('var apXp =')) + 1;
      // eslint-disable-next-line no-new-func
      const tubeFor = new Function('aperture', source.slice(from, to) + ' return apXp;');

      for (const cm of [2, 10, 35, 100, 240, 650]) {
        const tube = tubeFor(cm);
        expect(30 + tube, `${cm} cm tube runs off the canvas`).toBeLessThanOrEqual(400);
        expect(tube, `${cm} cm tube has no length`).toBeGreaterThan(0);
      }
      // A bigger mirror draws a bigger telescope - strictly.
      expect(tubeFor(650)).toBeGreaterThan(tubeFor(240));
      expect(tubeFor(240)).toBeGreaterThan(tubeFor(10));
    });
  }
});
