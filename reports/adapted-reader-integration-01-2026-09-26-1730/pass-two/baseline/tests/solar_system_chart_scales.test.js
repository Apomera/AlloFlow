import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Bar charts here print the value beside the bar, so a clamped or saturated track
// contradicts its own numbers in the reader's eye. Two did:
//
//  * Day length clamped bars at 280px, and BOTH Mercury (1,408 h) and Venus (5,832 h)
//    overran it - the chart drew its two headline values as the same length, directly
//    under a caption reading "Venus rotates slowest".
//  * Star lifespan drew a linear bar for a quantity spanning nearly seven orders of
//    magnitude across its own slider: full for every star lighter than the Sun, a
//    sub-pixel sliver above four solar masses. The number moved; the picture did not.
//
// These run the SHIPPED expressions over the SHIPPED data rather than a copy.
const PATHS = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];

function dayLengthHours(source) {
  const anchor = source.indexOf('var maxHr = planets.reduce');
  expect(anchor, 'the day-length chart must exist').toBeGreaterThan(-1);
  // The planets array sits just above the scale it is measured on.
  const block = source.slice(Math.max(0, anchor - 2500), anchor);
  const hrs = [];
  const re = /hr: ([\d.]+)/g;
  let m;
  while ((m = re.exec(block))) hrs.push(Number(m[1]));
  return hrs;
}

function shippedExpression(source, declaration) {
  const re = new RegExp(`var ${declaration} = ([^;]+);`);
  const m = source.match(re);
  expect(m, `${declaration} must exist`).not.toBeNull();
  return m[1];
}

describe('bar charts do not contradict their own numbers', () => {
  for (const path of PATHS) {
    const source = readFileSync(path, 'utf8');

    it(`scales the day-length bars so no two values share a length (${path})`, () => {
      expect(source).not.toContain('Math.min(280, Math.log10(p.hr) * 100)');
      const hrs = dayLengthHours(source);
      expect(hrs.length, 'day-length rows must parse').toBeGreaterThanOrEqual(8);

      // `var w = ...` is a common name, so read it from this chart's own region.
      const at = source.indexOf('var maxHr = planets.reduce');
      const chart = source.slice(at - 400, at + 2000);
      const barMax = Number(shippedExpression(chart, 'dayBarMax'));
      expect(barMax).toBeGreaterThan(0);
      // eslint-disable-next-line no-new-func
      const widthOf = new Function(
        'p', 'dayLogMax', 'dayBarMax',
        'return ' + shippedExpression(chart, 'w') + ';',
      );
      const dayLogMax = Math.log10(Math.max(...hrs));
      const widths = hrs.map((hr) => widthOf({ hr }, dayLogMax, barMax));

      // Nothing clipped off the end of the track...
      for (const w of widths) {
        expect(w).toBeGreaterThan(0);
        expect(w).toBeLessThanOrEqual(barMax + 0.001);
      }
      // ...and the two slowest rotators, which used to share the clamp, differ.
      const sorted = hrs.slice().sort((a, b) => b - a);
      const slowest = widthOf({ hr: sorted[0] }, dayLogMax, barMax);
      const second = widthOf({ hr: sorted[1] }, dayLogMax, barMax);
      expect(sorted[0] / sorted[1]).toBeGreaterThan(2); // genuinely different values
      expect(slowest - second).toBeGreaterThan(20); // and genuinely different bars
      // Order on screen must follow order in the data.
      const paired = hrs.map((hr, i) => [hr, widths[i]]).sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < paired.length; i++) {
        expect(paired[i][1], 'longer day draws a longer bar').toBeGreaterThan(paired[i - 1][1]);
      }
    });

    it(`keeps the star-lifespan bar readable across its whole slider (${path})`, () => {
      expect(source).not.toContain('Math.min(300, lifespan * 20)');
      // Run the shipped block verbatim, from the first declaration to the width.
      const from = source.indexOf('var lifeMin =');
      const to = source.indexOf(';', source.indexOf('var lifeW =')) + 1;
      expect(from, 'the lifespan scale must exist').toBeGreaterThan(-1);
      expect(to).toBeGreaterThan(from);
      // eslint-disable-next-line no-new-func
      const barFor = new Function('lifespan', source.slice(from, to) + ' return lifeW;');

      // The slider runs 0.1 to 50 solar masses; lifespan = 10 * M^-2.5 Gyr.
      const masses = [0.1, 0.5, 1, 4, 15, 50];
      const widths = masses.map((m) => barFor(10 * Math.pow(m, -2.5)));
      // Heavier star, shorter life, shorter bar - strictly, at every step.
      for (let i = 1; i < widths.length; i++) {
        expect(widths[i], `${masses[i]} M must draw shorter than ${masses[i - 1]} M`)
          .toBeLessThan(widths[i - 1]);
      }
      // A massive star still has a visible bar, and the Sun is not pinned to the end.
      expect(widths[widths.length - 2]).toBeGreaterThan(10);
      expect(widths[masses.indexOf(1)]).toBeLessThan(280);
    });
  }
});

// Three more mini-tools whose geometry stopped moving long before their captions did.
// Each is checked by running the SHIPPED scale over the SHIPPED slider bounds.
describe('mini-tool scales cover their own input range', () => {
  for (const path of PATHS) {
    const source = readFileSync(path, 'utf8');

    it(`separates the two Voyagers for every year on the slider (${path})`, () => {
      // At 1.5 px/AU the axis ended at 133 AU, which Voyager 1 passed in 2014.
      expect(source).not.toContain('Math.min(195, v1AU * 1.5)');
      expect(source).not.toContain('Math.min(195, v2AU * 1.5)');
      // The planets must share the probes' scale, or the picture mixes two rulers.
      expect(source).toContain('var r = p[1] * auPx;');

      const from = source.indexOf('var voyMaxAU =');
      expect(from, 'the AU scale must exist').toBeGreaterThan(-1);
      const to = source.indexOf(';', source.indexOf('var auPx =')) + 1;
      // eslint-disable-next-line no-new-func
      const auPx = new Function(source.slice(from, to) + ' return auPx;')();

      for (const year of [1990, 2014, 2026, 2040, 2050]) {
        const v1 = 0.058 + (year - 1977) * 3.6;
        const v2 = 0.062 + (year - 1977) * 3.3;
        const x1 = 200 - v1 * auPx;
        const x2 = 200 - v2 * auPx;
        // Voyager 1 is ahead, visibly, and still inside the frame.
        expect(x1, `V1 must stay on canvas in ${year}`).toBeGreaterThanOrEqual(0);
        expect(x2 - x1, `V1 must lead V2 visibly in ${year}`).toBeGreaterThan(2);
      }
      // The heliopause is drawn once, from the list - not again as a loose circle.
      expect(source).not.toContain("cy: 140, r: 180, fill: 'none'");
    });

    it(`grows the impact crater across the whole size slider (${path})`, () => {
      expect(source).not.toContain('Math.min(150, craterKm * 5)');
      expect(source).not.toContain('Math.min(20, size / 2)');
      // Take the whole block from the impact model through the ring geometry, so
      // the crater size and the radius that draws it always come from one source.
      const from = source.indexOf('var energy = 5.43e-5');
      expect(from, 'the crater scale must exist').toBeGreaterThan(-1);
      const to = source.indexOf(';', source.indexOf('var impactorR =')) + 1;
      // eslint-disable-next-line no-new-func
      const ringFor = new Function('size', source.slice(from, to) + ' return [craterR, impactorR];');

      // The slider runs 0.5 m to 5,000 m.
      const sizes = [0.5, 10, 65, 500, 5000];
      const rings = sizes.map((m) => ringFor(m));
      for (let i = 1; i < rings.length; i++) {
        expect(rings[i][0], `${sizes[i]} m must crater wider than ${sizes[i - 1]} m`)
          .toBeGreaterThan(rings[i - 1][0]);
        expect(rings[i][1], `${sizes[i]} m must draw bigger than ${sizes[i - 1]} m`)
          .toBeGreaterThan(rings[i - 1][1]);
      }
      // Everything stays inside the 400x240 viewBox.
      expect(rings[rings.length - 1][0]).toBeLessThanOrEqual(150);
      // The reader is told the rings are compressed.
      expect(source).toContain('rings on a log scale');
    });

    it(`moves the Doppler source across its whole velocity slider (${path})`, () => {
      // 1 px per 5 km/s saturated at 500, on a slider running to 50,000.
      expect(source).not.toContain('Math.min(Math.abs(vel) / 5, 100)');
      const offsetFor = (vel) => Math.min(Math.abs(vel) / 500, 100);
      expect(source).toContain('Math.min(Math.abs(vel) / 500, 100)');
      expect(offsetFor(50000)).toBeCloseTo(100, 6); // reaches the end, does not overrun
      expect(offsetFor(5000)).toBeGreaterThan(offsetFor(500));
      expect(offsetFor(500)).toBeGreaterThan(0);
    });
  }
});

// A slider that changes only a caption is a dead control. Two here were:
//
//   * Space Debris Tracker's one slider is altitude, and altitude touched nothing but
//     the label and the number of dots - the debris was scattered across the whole
//     frame by `50 + (ji*71)%300`, sitting at no altitude at all.
//   * Telescope Aperture Lab had its two sliders' jobs swapped: aperture set how big
//     Jupiter looked, while magnification - the control that by definition sets how
//     big it looks - moved nothing.
describe('sliders move the picture, not just the caption', () => {
  for (const path of PATHS) {
    const source = readFileSync(path, 'utf8');

    it(`places space debris at the altitude the slider names (${path})`, () => {
      expect(source).not.toContain('points.push({ x: 50 + (ji * 71) % 300');
      const from = source.indexOf('var junkShell =');
      expect(from, 'the debris shell must exist').toBeGreaterThan(-1);
      const prelude = source.indexOf('var junkLo =');
      // eslint-disable-next-line no-new-func
      const shellFor = new Function(
        'km',
        source.slice(prelude, source.indexOf('};', from) + 2) +
        ' var JUNK_EARTH_R = 60; return junkShell(km);',
      );

      // Strictly higher orbit, strictly bigger shell...
      const altitudes = [300, 600, 2000, 20200, 35786];
      for (let i = 1; i < altitudes.length; i++) {
        expect(shellFor(altitudes[i]), `${altitudes[i]} km must sit outside ${altitudes[i - 1]} km`)
          .toBeGreaterThan(shellFor(altitudes[i - 1]));
      }
      // ...and geostationary still fits the 400x250 frame, with Earth at (200, 220).
      const geo = shellFor(35786);
      expect(220 - geo, 'the GEO shell runs off the top').toBeGreaterThan(32);
      expect(200 - geo, 'the GEO shell runs off the left').toBeGreaterThan(0);
      // Low orbit is not swallowed by the planet.
      expect(shellFor(600)).toBeGreaterThan(60);
    });

    it(`magnifies with the magnification slider, not the aperture one (${path})`, () => {
      const m = source.match(/var apDiscR = ([^;]+);/);
      expect(m, 'the eyepiece disc must exist').not.toBeNull();
      // Aperture governs resolution and light grasp; it must not be what enlarges
      // the image, or the magnification control has nothing to do.
      expect(m[1]).not.toContain('aperture');
      expect(m[1]).toContain('magnif');
      // eslint-disable-next-line no-new-func
      const discFor = new Function('magnif', 'return ' + m[1] + ';');
      expect(discFor(500)).toBeGreaterThan(discFor(100));
      expect(discFor(100)).toBeGreaterThan(discFor(10));
      // And it stays inside the eyepiece, which has radius 50.
      expect(discFor(500)).toBeLessThan(50);
      expect(discFor(10)).toBeGreaterThan(0);
    });
  }
});
