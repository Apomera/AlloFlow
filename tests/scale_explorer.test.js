// Scale Explorer contract (2026-09-07).
//
// A powers-of-ten tool is only worth anything if its numbers are right and if
// it can be driven without a mouse, so those are what these tests pin:
//   1. every size is a positive number with a stated dimension and a real
//      description, and the ladder spans the range it claims
//   2. sizes agree with the ratios the tool tells students about
//   3. the log mapping is a true log axis (equal screen distance = equal ratio)
//   4. the keyboard reaches every control, and the canvas is a named target
//   5. announcements fire per power of ten, never per frame
//   6. all four ui_strings copies carry every key at the source's English
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const TOOL = 'stem_lab/stem_tool_scaleexplorer.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_scaleexplorer.js';
const UI_COPIES = ['ui_strings.js', 'desktop/web-app/public/ui_strings.js', 'desktop/web-app/build/ui_strings.js', 'desktop/app-build/ui_strings.js'];
const src = read(TOOL);

function readArray(text, name) {
  const s = text.indexOf('var ' + name + ' = ');
  const o = text.indexOf('[', s);
  let i = o, d = 0, q = null;
  for (; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === '\'' || c === '"' || c === '`') { q = c; continue; }
    if (c === '[') d++; else if (c === ']') { d--; if (d === 0) break; }
  }
  return vm.runInNewContext('(' + text.slice(o, i + 1) + ')');
}
const ITEMS = readArray(src, 'ITEMS');
const byId = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

describe('Scale Explorer ladder', () => {
  it('gives every entry a size, a dimension and a real description', () => {
    expect(ITEMS.length).toBeGreaterThanOrEqual(45);
    for (const it of ITEMS) {
      expect(typeof it.size, it.id).toBe('number');
      expect(it.size, it.id + ' size must be positive and finite').toBeGreaterThan(0);
      expect(Number.isFinite(it.size), it.id).toBe(true);
      expect(it.dim, it.id + ' must say which dimension the size is').toBeTruthy();
      expect(it.emoji, it.id).toBeTruthy();
      // The description is what a student who cannot see the canvas gets instead.
      expect(it.describe.length, it.id + ' describe too short').toBeGreaterThan(60);
      expect(it.describe, it.id).not.toBe(it.name);
    }
    const ids = ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('spans at least 40 powers of ten', () => {
    const logs = ITEMS.map((i) => Math.log10(i.size));
    expect(Math.max(...logs) - Math.min(...logs)).toBeGreaterThanOrEqual(40);
  });

  it('leaves no gap wider than four powers of ten', () => {
    // A gap larger than the screen width means zooming through empty space with
    // nothing to hold on to.
    const logs = ITEMS.map((i) => Math.log10(i.size)).sort((a, b) => a - b);
    const gaps = logs.slice(1).map((v, i) => v - logs[i]);
    const worst = Math.max(...gaps);
    expect(worst, 'largest gap in decades').toBeLessThanOrEqual(4);
  });

  it('labels distances as distances, so they are not read as sizes', () => {
    const distances = ITEMS.filter((i) => i.dim === 'distance');
    expect(distances.length).toBeGreaterThan(0);
    for (const d of distances) {
      expect(d.describe.toLowerCase(), d.id + ' should say it is a distance').toMatch(/distance|how far|gap/);
    }
  });

  it('carries an uncertainty note wherever the number is genuinely soft', () => {
    // Betelgeuse's published radii span 640 to 887 solar radii; an atom has no
    // edge; sand is a size range by definition. Saying so is the honest move
    // and is itself part of the subject.
    for (const id of ['betelgeuse', 'carbon', 'sand', 'hair', 'proton']) {
      expect(byId[id], id + ' missing from the ladder').toBeTruthy();
      expect(byId[id].note, id + ' needs an uncertainty note').toBeTruthy();
    }
  });
});

describe('Scale Explorer sizes agree with reality', () => {
  // Spot checks against values a teacher would recognise. These are ratios, so
  // they stay true whichever unit the tool renders in.
  const ratio = (a, b) => byId[a].size / byId[b].size;
  it('the Sun is about 109 Earths across', () => {
    expect(ratio('sun', 'earth')).toBeGreaterThan(105);
    expect(ratio('sun', 'earth')).toBeLessThan(113);
  });
  it('the Earth is about 3.7 Moons across', () => {
    expect(ratio('earth', 'moon')).toBeGreaterThan(3.5);
    expect(ratio('earth', 'moon')).toBeLessThan(3.8);
  });
  it('a red blood cell is a few micrometres', () => {
    expect(byId['rbc'].size).toBeGreaterThan(6e-6);
    expect(byId['rbc'].size).toBeLessThan(9e-6);
  });
  it('an atom is about ten thousand times its nucleus', () => {
    const r = byId['carbon'].size / byId['nucleus'].size;
    expect(r).toBeGreaterThan(3000);
    expect(r).toBeLessThan(30000);
  });
  it('a person to a proton is about fifteen powers of ten', () => {
    expect(Math.log10(ratio('human', 'proton'))).toBeGreaterThan(14.5);
    expect(Math.log10(ratio('human', 'proton'))).toBeLessThan(15.5);
  });
  it('the observable universe is tens of billions of light years across', () => {
    const ly = byId['universe'].size / 9.461e15;
    expect(ly).toBeGreaterThan(8e10);
    expect(ly).toBeLessThan(1e11);
  });
});

describe('Scale Explorer view model', () => {
  it('positions objects on a true log axis', () => {
    // Equal distance across the screen must mean equal ratio, or the tool is
    // teaching the wrong thing while looking right.
    expect(src).toMatch(/var x = cssW \/ 2 \+ \(lg - e\) \* pxPerDecade/);
    expect(src).toMatch(/var lg = log10\(it\.size\)/);
  });
  it('draws objects at true relative size', () => {
    expect(src).toMatch(/var dia = it\.size \/ Math\.pow\(10, e\) \* refPx/);
  });
  it('caps the emoji so a larger neighbour cannot cover the view', () => {
    // At true scale an object one decade bigger is several screens wide.
    expect(src).toMatch(/maxGlyph = Math\.min\(cssW, cssH\) \* 0\.62/);
    expect(src).toMatch(/glyph >= 10 && glyph <= maxGlyph/);
  });
  it('skips labels that would collide, but never the focused one', () => {
    expect(src).toMatch(/if \(!clash \|\| isFocus\)/);
  });
  it('uses an absolute canvas transform, so a redraw cannot compound the scale', () => {
    expect(src).toMatch(/g\.setTransform\(dpr, 0, 0, dpr, 0, 0\)/);
    expect(src).not.toMatch(/g\.scale\(dpr, dpr\)/);
  });
});

describe('Scale Explorer accessibility', () => {
  it('makes the canvas a named, focusable target with real keys', () => {
    expect(src).toMatch(/tabIndex: 0, role: 'application'/);
    expect(src).toMatch(/'aria-label': S\('canvas_aria'/);
    for (const key of ['ArrowRight', 'ArrowLeft', 'PageUp', 'PageDown', 'Home']) {
      expect(src, key + ' should be handled').toContain(key);
    }
  });
  it('offers the whole ladder as buttons, so the tool works with no canvas at all', () => {
    expect(src).toMatch(/id: 'sx-ladder'/);
    expect(src).toMatch(/'aria-current': on \? 'true' : undefined/);
    expect(src).toMatch(/onClick: function \(\) \{ openItem\(i\); \}/);
  });
  it('announces once per power of ten, not once per frame', () => {
    // A live region fed a running number talks over everything else.
    expect(src).toMatch(/if \(d === lastDecadeRef\.current\) return;/);
    expect(src).toMatch(/lastDecadeRef\.current = d;/);
  });
  it('speaks the numbers rather than leaving a screen reader to guess at 10⁻⁶', () => {
    expect(src).toMatch(/decade_sr_near/);
    expect(src).toMatch(/ten to the power \{n\}/);
  });
  it('respects a reduced-motion preference instead of animating regardless', () => {
    expect(src).toMatch(/prefers-reduced-motion/);
    expect(src).toMatch(/if \(reduceMotion \|\| opts\.instant\)/);
  });
  it('hides read-aloud when the host cannot speak, and cannot get stuck', () => {
    expect(src).toMatch(/if \(typeof ctx\.callTTS !== 'function' \|\| !text\) return null;/);
    expect(src).toMatch(/\{ force: true \}/);
    expect(src).toMatch(/speakTokenRef\.current !== token/);
    expect(src).toMatch(/setTimeout\(function \(\) \{ settle\(true\); \}, 30000\)/);
  });
  it('paints its own ground, because the host card is white in both themes', () => {
    expect(src).toMatch(/background: P\.bg, color: P\.text, borderRadius: 14/);
  });
});

// Icon uniqueness is already enforced repo-wide by tests/tool_icon_uniqueness.js,
// which globs every stem tool; duplicating it here re-read 150 files for 25s.
describe('Scale Explorer wiring', () => {
  it('is registered in every copy of the loader list', () => {
    for (const f of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      expect(read(f), f).toContain("'stem_lab/stem_tool_scaleexplorer.js'");
    }
  });
  it('keeps the desktop mirror byte-identical', () => {
    expect(read(MIRROR)).toBe(src);
  });

  it('is in the desktop bundle list, so an offline classroom gets it too', () => {
    // build.js names every stem tool the desktop build packages locally. A tool
    // missing here still works online and fails only where the CDN is not
    // reachable, which is exactly the case the desktop build exists for.
    expect(read('build.js')).toContain("'stem_lab/stem_tool_scaleexplorer.js'");
  });
});

describe('Scale Explorer strings in ui_strings.js (all four copies)', () => {
  const sections = UI_COPIES.map((p) => ({ path: p, section: (JSON.parse(read(p)).stem || {}).scaleExplorer || {} }));
  it('registers a key for every ladder entry, with the source English', () => {
    const missing = [], drift = [];
    for (const it of ITEMS) {
      const base = 'item_' + it.id.replace(/-/g, '_') + '_';
      const expected = { name: it.name, describe: it.describe };
      if (it.note) expected.note = it.note;
      for (const f of Object.keys(expected)) {
        const v = sections[0].section[base + f];
        if (v == null) missing.push(base + f);
        else if (v !== expected[f]) drift.push(base + f);
      }
    }
    expect(missing, 'missing keys').toEqual([]);
    expect(drift, 'shipped value differs from source').toEqual([]);
  });
  it('all four copies agree', () => {
    for (const s of sections.slice(1)) expect(s.section, s.path).toEqual(sections[0].section);
  });
  it('reads every string through the stem.scaleExplorer prefix', () => {
    expect(src).toMatch(/t\('stem\.scaleExplorer\.' \+ key, fb\)/);
    expect(src).toMatch(/t\('stem\.scaleExplorer\.item_' \+ item\.id\.replace/);
  });
});

describe('Scale Explorer estimate-first loop', () => {
  // Browsing alone does not build a feel for orders of magnitude. This is the
  // house Predict → Explore → Explain shape applied to scale.
  it('asks before it tells, and never scores the student', () => {
    expect(src).toMatch(/function lockInEstimate\(\)/);
    expect(src).toMatch(/revealed \? h\('p', \{ role: 'status'/);
    // The reveal is gated on `revealed`, which only lockInEstimate sets.
    expect(src).toMatch(/setRevealed\(true\);/);
    // The three verdicts describe distance, they do not judge. Checking the
    // verdict strings themselves rather than the whole file, which legitimately
    // contains words like "points of light" in an image description.
    const verdicts = [...src.matchAll(/S\('est_(spot|close|off)', '([^']*(?:\\'[^']*)*)'/g)].map((m) => m[2]);
    expect(verdicts.length, 'all three verdict tiers').toBe(3);
    for (const v of verdicts) expect(v, v).not.toMatch(/\b(wrong|incorrect|failed|bad)\b/i);
  });

  it('picks pairs that are worth guessing at', () => {
    // Under two decades is a coin flip; over twenty is unguessable rather than
    // instructive, and either way the student learns nothing from the reveal.
    expect(src).toMatch(/if \(gap < 2 \|\| gap > 20\) continue;/);
    expect(src).toMatch(/if \(a\.id === b\.id\) continue;/);
  });

  it('grades by distance in decades, and says the factor that distance means', () => {
    expect(src).toMatch(/if \(off <= 0\.5\) return S\('est_spot'/);
    expect(src).toMatch(/if \(off <= 1\.5\) return S\('est_close'/);
    expect(src).toMatch(/est_off.*factor of \{factor\}/);
  });

  it('always gives the real number, whatever the student guessed', () => {
    expect(src).toMatch(/function challengeReveal\(\)/);
    expect(src).toMatch(/The gap is \{dec\} powers of ten/);
  });

  it('counts an estimate toward its own quest', () => {
    expect(src).toMatch(/cur\.estimateCount = \(cur\.estimateCount \|\| 0\) \+ 1;/);
    expect(src).toMatch(/id: 'scale_estimate'/);
    expect(src).toMatch(/\(d\.estimateCount \|\| 0\) >= 1/);
  });

  it('lets the keyboard commit without reaching for the button', () => {
    expect(src).toMatch(/if \(e\.key === 'Enter'\) \{ e\.preventDefault\(\); lockInEstimate\(\); \}/);
  });
});
