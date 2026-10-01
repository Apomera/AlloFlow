// Canvas text contrast, across every STEM tool.
//
// The DOM contrast suites cannot see inside a canvas: those colours are
// arguments to fillText, not CSS, so axe and every stylesheet-based check walk
// straight past them. Several tools draw labels, readouts and units onto a
// canvas, and those are text a student has to read.
//
// This was written after the same defect was found by hand in nuclearlab (a
// reactor readout label at 3.75:1) and then swept for across the library. It
// found five more in oratory, two in singing, and one each in migration and
// platetectonics — every one of them light-theme, because these palettes were
// picked against a dark canvas and reused.
//
// WHAT IT CANNOT DO, stated plainly: a static scan does not know what is behind
// the text. It assumes the tool's own canvas backdrop. Labels drawn on top of
// something else — a piano key, a tectonic plate, a coloured bar — have to be
// checked by reading the code, and the verified ones are listed in RESOLVED
// below with the backdrop they were measured against. A new hit is a candidate
// to investigate, not automatically a bug.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = 'stem_lab';
const AA = 4.5;

// The backdrop a canvas paints when it paints its own. Tools vary a little
// (#0b1120, #1e293b, #0f172a in dark; #f8fafc, #e2e8f0 in light); the darkest
// dark and the lightest light are used, which is the forgiving direction — a
// hit here is real on any of them.
const DARK_BG = [30, 41, 59];      // #1e293b, the lightest dark backdrop in use
const LIGHT_BG = [248, 250, 252];  // #f8fafc

// Text confirmed by reading the code to sit on something other than the canvas
// backdrop. Each entry records what it actually sits on and what it measures.
const RESOLVED = {
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (rgb) => {
  const a = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
};
const ratio = (fg, bg) => {
  const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

function scan() {
  const files = fs.readdirSync(DIR).filter((f) => /^stem_tool_.*\.js$/.test(f) && !f.endsWith('.bak'));
  const hits = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(DIR, f), 'utf8');
    const re = /(\w+)\.fillStyle\s*=\s*isDark \? '(#[0-9a-fA-F]{6})' : '(#[0-9a-fA-F]{6})'\s*;/g;
    let m;
    while ((m = re.exec(src))) {
      const rest = src.slice(m.index + m[0].length, m.index + m[0].length + 900);
      const nextFill = rest.search(/\.fillStyle\s*=/);
      const nextText = rest.search(/\.fillText\(/);
      // Anything DRAWN before the fillText means this ink painted a shape.
      const nextShape = rest.search(/\.(fillRect|strokeRect|fill\(|stroke\(|arc\()/);
      const colorsText = nextText !== -1
        && (nextFill === -1 || nextText < nextFill)
        && (nextShape === -1 || nextText < nextShape);
      if (!colorsText) continue;
      const rd = ratio(hex(m[2]), DARK_BG);
      const rl = ratio(hex(m[3]), LIGHT_BG);
      if (rd >= AA && rl >= AA) continue;
      hits.push({
        key: f.replace(/^stem_tool_|\.js$/g, '') + ':' + src.slice(0, m.index).split('\n').length,
        dark: m[2], light: m[3], rd: rd.toFixed(2), rl: rl.toFixed(2),
      });
    }
  }
  return hits;
}

describe('canvas text contrast across the STEM library', () => {
  const hits = scan();

  it('finds text drawn on a canvas at all — the detector must not silently stop working', () => {
    // If a refactor changed how these tools set fillStyle, this suite would
    // pass by scanning nothing. Assert it still sees the shape it expects.
    const files = fs.readdirSync(DIR).filter((f) => /^stem_tool_.*\.js$/.test(f) && !f.endsWith('.bak'));
    const withCanvasText = files.filter((f) => {
      const s = fs.readFileSync(path.join(DIR, f), 'utf8');
      return /\.fillStyle\s*=\s*isDark \?/.test(s) && /\.fillText\(/.test(s);
    });
    // Ten tools currently do. The floor is set below that rather than at it:
    // the point is to catch the detector silently matching nothing after a
    // refactor, not to freeze the exact count.
    expect(withCanvasText.length, 'no tool appears to draw themed text on a canvas').toBeGreaterThanOrEqual(8);
  });

  it('has no unresolved canvas text below WCAG AA', () => {
    const unresolved = hits.filter((h) => !RESOLVED[h.key]);
    const report = unresolved.map((h) =>
      `  ${h.key}  dark ${h.dark}=${h.rd}:1  light ${h.light}=${h.rl}:1`).join('\n');
    expect(unresolved.map((h) => h.key),
      'canvas text below AA (or sitting on a non-default backdrop — check, then add to RESOLVED):\n' + report
    ).toEqual([]);
  });

  it('keeps the RESOLVED list honest — every entry must still be a hit', () => {
    // An entry that no longer matches is a stale exemption, and a stale
    // exemption is how a real failure gets waved through later.
    const keys = new Set(hits.map((h) => h.key));
    for (const k of Object.keys(RESOLVED)) {
      expect(keys.has(k), `${k} is exempted but the scan no longer flags it — remove the entry`).toBe(true);
    }
  });
});
