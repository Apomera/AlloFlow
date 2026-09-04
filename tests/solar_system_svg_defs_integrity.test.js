import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Every `url(#id)` in an SVG has to resolve to a def that exists. A reference to a
// missing gradient, clip path or filter does not throw and does not warn - the
// browser just skips it, which means the element draws with no fill, or with no clip
// at all.
//
// The Phases of Venus diagram referenced `url(#vClip)`, and no clipPath by that name
// existed anywhere in the file. So the dark disc meant to be clipped to Venus' night
// side was drawn whole, covering the lit disc underneath it: Venus was a black dot in
// a diagram whose entire subject is that Venus has phases.
const PATHS = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];

const DEF_TAGS = [
  'radialGradient', 'linearGradient', 'clipPath', 'filter',
  'pattern', 'mask', 'marker', 'symbol',
];

// Line comments describe these ids as often as the code uses them, and a comment is
// not a reference.
function stripLineComments(source) {
  return source
    .split('\n')
    .map((line) => {
      const at = line.indexOf('//');
      if (at < 0) return line;
      const before = line.slice(0, at);
      // Only treat it as a comment if the `//` is not inside a quoted string.
      const quotes = (before.match(/'/g) || []).length + (before.match(/"/g) || []).length;
      return quotes % 2 === 0 ? before : line;
    })
    .join('\n');
}

describe('every SVG def referenced by the tool exists', () => {
  for (const path of PATHS) {
    const source = stripLineComments(readFileSync(path, 'utf8'));

    it(`resolves every url(#id) to a defined element (${path})`, () => {
      const referenced = [...new Set([...source.matchAll(/url\(#([A-Za-z0-9_-]+)\)/g)].map((m) => m[1]))];
      const defined = new Set();
      const tags = DEF_TAGS.join('|');
      // Both quoting styles appear in this file.
      for (const m of source.matchAll(
        new RegExp(`createElement\\(['"](${tags})['"],\\s*\\{[^}]*?id:\\s*['"]([A-Za-z0-9_-]+)['"]`, 'g'),
      )) {
        defined.add(m[2]);
      }

      // Guard against a regex change quietly matching nothing.
      expect(referenced.length, 'url(#id) references must parse').toBeGreaterThanOrEqual(20);
      expect(defined.size, 'def ids must parse').toBeGreaterThanOrEqual(20);

      const missing = referenced.filter((id) => !defined.has(id));
      expect(missing, `referenced but never defined: ${missing.join(', ')}`).toEqual([]);
    });

    it(`gives each def a unique id (${path})`, () => {
      // Ids are document-global. Two defs sharing one means the first wins wherever
      // the id is used, silently applying the wrong gradient or clip.
      const seen = new Map();
      const tags = DEF_TAGS.join('|');
      for (const m of source.matchAll(
        new RegExp(`createElement\\(['"](${tags})['"],\\s*\\{[^}]*?id:\\s*['"]([A-Za-z0-9_-]+)['"]`, 'g'),
      )) {
        seen.set(m[2], (seen.get(m[2]) || 0) + 1);
      }
      const duplicates = [...seen.entries()].filter(([, n]) => n > 1).map(([id, n]) => `${id} x${n}`);
      expect(duplicates, `duplicate def ids: ${duplicates.join(', ')}`).toEqual([]);
    });

    it(`draws Venus' night side as a half disc that spans its own radius (${path})`, () => {
      expect(source).not.toContain("clipPath: 'url(#vClip)'");
      const line = source.split('\n').find((l) => l.includes('var venusNightPath ='));
      expect(line, 'the Venus night side must exist').toBeTruthy();
      const from = source.indexOf('var venusNightPath =');
      const to = source.indexOf("' Z';", from) + 5;
      // eslint-disable-next-line no-new-func
      const pathFor = new Function(
        'venusX', 'venusY', 'sunAng',
        source.slice(source.indexOf('var vEdgeA =', from - 400), to) + ' return venusNightPath;',
      );

      for (const sunAng of [0, Math.PI / 3, Math.PI, -Math.PI / 2]) {
        const d = pathFor(100, 100, sunAng);
        const m = d.match(/M\s+(-?[\d.]+)\s+(-?[\d.]+)\s+A\s+([\d.]+)\s+([\d.]+)[^]*?\s(-?[\d.]+)\s+(-?[\d.]+)\s+Z/);
        expect(m, `path must parse for sunAng ${sunAng}`).not.toBeNull();
        const [, x1, y1, rx, ry, x2, y2] = m.map(Number);
        // Radii must exactly span the chord, or SVG scales them up and the shadow
        // spills outside the planet.
        const chord = Math.hypot(x2 - x1, y2 - y1);
        expect(chord).toBeCloseTo(2 * Number(rx), 6);
        expect(Number(ry)).toBeCloseTo(Number(rx), 6);
        // The dark half must lie on the side away from the Sun.
        const midAngle = sunAng + Math.PI;
        const midX = 100 + Math.cos(midAngle) * Number(rx);
        const midY = 100 + Math.sin(midAngle) * Number(rx);
        const chordMidX = (x1 + x2) / 2;
        const chordMidY = (y1 + y2) / 2;
        expect(Math.hypot(midX - chordMidX, midY - chordMidY)).toBeCloseTo(Number(rx), 6);
      }
    });
  }
});
