// Pets Lab — "Through Their Eyes" sensory-perspective mode.
//
// The 3D room is an ILLUSTRATION layered on top of a written comparison, not
// a replacement for it. These tests hold that line: the view must carry its
// full lesson with no WebGL, no Three.js, and no canvas — which is exactly
// the state the SSR harness reproduces (its ensureThree returns a
// forever-pending promise, so `window.THREE` never appears).
//
// They also pin the sensory constants, because those are science claims
// rendered as authoritative numbers, and the dichromat transform, because a
// silent regression there would quietly teach the wrong thing.

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_pets.js';
const ID = 'petsLab';
const SRC = fs.readFileSync(path.resolve(process.cwd(), FILE), 'utf8');

function extractArray(name) {
  const s = SRC.indexOf('var ' + name);
  const o = SRC.indexOf('[', s);
  let d = 0, i = o;
  for (; i < SRC.length; i++) {
    if (SRC[i] === '[') d++;
    else if (SRC[i] === ']') { d--; if (d === 0) { i++; break; } }
  }
  // eslint-disable-next-line no-eval
  return eval('(' + SRC.slice(o, i) + ')');
}

const SPECIES = extractArray('SENSORY_SPECIES');
const SCENTS = extractArray('SENSORY_SCENTS');

/** React escapes & and ' in text nodes; compare against the decoded markup. */
function text(html) {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});
afterAll(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
beforeEach(() => { resetStemLab(); loadTool(FILE, ID); });

describe('sensory view renders without any 3D engine', () => {
  it('does not throw when Three.js is absent', () => {
    expect(typeof window.THREE).toBe('undefined');
    expect(() => renderTool(ID, { [ID]: { view: 'sensory' } })).not.toThrow();
  });

  it('offers the engine as an explicit opt-in rather than auto-loading', () => {
    const html = renderTool(ID, { [ID]: { view: 'sensory' } });
    expect(html).toContain('Load the 3D room');
    // Nothing should have tried to fetch Three just by rendering the view.
    expect(window.THREE).toBeUndefined();
  });

  it('still teaches the full comparison with no canvas', () => {
    for (const sp of SPECIES) {
      const html = renderTool(ID, { [ID]: { view: 'sensory', sensorySpecies: sp.id } });
      expect(html).toContain(sp.acuity);
      expect(html).toContain(String(sp.totalFieldDeg));
      expect(html).toContain(String(sp.binocularDeg));
      expect(html).toContain(sp.dichromat ? 'Dichromat' : 'Trichromat');
      expect(text(html), sp.id + ' is missing its sources').toContain(sp.cite.split(' ·')[0]);
    }
  });

  it('discloses that the blur and field of view are illustrations', () => {
    const html = renderTool(ID, { [ID]: { view: 'sensory' } });
    expect(html).toMatch(/ILLUSTRATION|illustration/);
    expect(html).toMatch(/not a calibrated optical model/i);
    expect(html).toMatch(/cannot be drawn undistorted/i);
  });

  it('surfaces a retry path when the engine fails to load', () => {
    const html = renderTool(ID, { [ID]: { view: 'sensory', _threeError: true } });
    expect(html).toContain('Try again');
    expect(html).toMatch(/still work/i);
  });

  it('reaches the view from the menu', () => {
    const html = renderTool(ID, {});
    expect(html).toContain('Through Their Eyes');
  });
});

describe('sensory science constants', () => {
  it('covers human, dog and cat', () => {
    expect(SPECIES.map((s) => s.id).sort()).toEqual(['cat', 'dog', 'human']);
  });

  it('orders eye height human > dog > cat', () => {
    const at = (id) => SPECIES.find((s) => s.id === id);
    expect(at('human').eyeHeight).toBeGreaterThan(at('dog').eyeHeight);
    expect(at('dog').eyeHeight).toBeGreaterThan(at('cat').eyeHeight);
  });

  it('makes only the non-human species dichromats', () => {
    const at = (id) => SPECIES.find((s) => s.id === id);
    expect(at('human').dichromat).toBe(false);
    expect(at('dog').dichromat).toBe(true);
    expect(at('cat').dichromat).toBe(true);
  });

  it('gives the animals wider fields but softer acuity than the human', () => {
    const at = (id) => SPECIES.find((s) => s.id === id);
    const denom = (s) => Number(s.acuity.split('/')[1]);
    expect(at('dog').totalFieldDeg).toBeGreaterThan(at('human').totalFieldDeg);
    expect(at('cat').totalFieldDeg).toBeGreaterThan(at('human').totalFieldDeg);
    // Bigger denominator = worse acuity.
    expect(denom(at('dog'))).toBeGreaterThan(denom(at('human')));
    expect(denom(at('cat'))).toBeGreaterThan(denom(at('dog')));
  });

  it('gives the animals better low-light ability than the human', () => {
    const at = (id) => SPECIES.find((s) => s.id === id);
    expect(at('human').lowLightFactor).toBe(1);
    expect(at('dog').lowLightFactor).toBeGreaterThan(1);
    expect(at('cat').lowLightFactor).toBeGreaterThan(at('dog').lowLightFactor);
  });

  it('blur tracks acuity — sharper eyes are never blurrier', () => {
    const sorted = [...SPECIES].sort((a, b) => Number(a.acuity.split('/')[1]) - Number(b.acuity.split('/')[1]));
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].blurPx).toBeGreaterThanOrEqual(sorted[i - 1].blurPx);
    }
    expect(SPECIES.find((s) => s.id === 'human').blurPx).toBe(0);
  });

  it('every species cites a source', () => {
    for (const s of SPECIES) expect(s.cite.length).toBeGreaterThan(8);
  });
});

describe('dichromat colour transform', () => {
  // Re-derive the shipped function from source so the test can't drift from it.
  // eslint-disable-next-line no-eval
  const dichromat = eval(
    '(' + SRC.slice(
      SRC.indexOf('function _petsDichromat'),
      SRC.indexOf('// Where a dog can smell')
    ).trim() + ')'
  );

  it('collapses red and green toward a common yellow, the defining deficit', () => {
    const red = dichromat(1, 0, 0);
    const green = dichromat(0, 1, 0);
    // After the transform the red/green channels of each converge: both read
    // as yellowish rather than as two distinguishable hues.
    const redHue = red.r - red.g;
    const greenHue = green.r - green.g;
    expect(Math.abs(redHue)).toBeLessThan(0.35);
    expect(Math.abs(greenHue)).toBeLessThan(0.35);
  });

  it('leaves blue substantially intact — dogs see blue well', () => {
    const blue = dichromat(0, 0, 1);
    expect(blue.b).toBeGreaterThan(0.7);
    expect(blue.b).toBeGreaterThan(blue.r);
  });

  it('preserves greys, so it is a hue transform not a brightness filter', () => {
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      const g = dichromat(v, v, v);
      expect(Math.abs(g.r - v)).toBeLessThan(0.02);
      expect(Math.abs(g.g - v)).toBeLessThan(0.02);
      expect(Math.abs(g.b - v)).toBeLessThan(0.02);
    }
  });

  it('stays in gamut for every channel', () => {
    for (const c of [[1, 1, 1], [0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [0.8, 0.2, 0.4]]) {
      const out = dichromat(c[0], c[1], c[2]);
      for (const ch of ['r', 'g', 'b']) {
        expect(out[ch]).toBeGreaterThanOrEqual(0);
        expect(out[ch]).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('scent layer (dog view only)', () => {
  it('labels every scent source', () => {
    expect(SCENTS.length).toBeGreaterThanOrEqual(4);
    for (const s of SCENTS) {
      expect(typeof s.label).toBe('string');
      expect(s.label.length).toBeGreaterThan(3);
      expect(s.count).toBeGreaterThan(0);
    }
  });

  it('places every source inside the room', () => {
    const room = eval('(' + (SRC.match(/var SENSORY_ROOM = (\{[^}]*\})/) || [])[1] + ')');
    for (const s of SCENTS) {
      expect(Math.abs(s.x)).toBeLessThanOrEqual(room.halfX);
      expect(Math.abs(s.z)).toBeLessThanOrEqual(room.halfZ);
    }
  });

  it('is gated to the dog and never rendered for human or cat', () => {
    expect(SRC).toMatch(/scentGroup\.visible = \(speciesId === 'dog'\)/);
  });

  it('names the scent sources in text for students who cannot see the canvas', () => {
    const html = renderTool(ID, { [ID]: { view: 'sensory', sensorySpecies: 'dog', sensoryActive: true, _threeLoaded: true } });
    for (const s of SCENTS) expect(text(html)).toContain(s.label);
  });
});

describe('room layout', () => {
  const BLOCKERS = extractArray('SENSORY_BLOCKERS');
  const spawn = (() => {
    const m = SRC.match(/yaw: 0, pitch: [-\d.]+, x: (-?[\d.]+), z: (-?[\d.]+)/);
    return m ? { x: Number(m[1]), z: Number(m[2]) } : null;
  })();

  it('has a spawn point', () => {
    expect(spawn).not.toBeNull();
  });

  // The bug this pins was invisible at a human's 1.6 m eye line and filled
  // half the screen with unlit black at a cat's 0.28 m — i.e. it only broke
  // the views the feature exists for. A screenshot caught it; nothing else did.
  it('does not spawn the camera inside the furniture', () => {
    for (const b of BLOCKERS) {
      const inside = spawn.x > b.x0 - 0.22 && spawn.x < b.x1 + 0.22 &&
                     spawn.z > b.z0 - 0.22 && spawn.z < b.z1 + 0.22;
      expect(inside, 'spawn point is inside a furniture blocker').toBe(false);
    }
  });

  it('spawns inside the room', () => {
    const room = eval('(' + (SRC.match(/var SENSORY_ROOM = (\{[^}]*\})/) || [])[1] + ')');
    expect(Math.abs(spawn.x)).toBeLessThan(room.halfX);
    expect(Math.abs(spawn.z)).toBeLessThan(room.halfZ);
  });

  it('blocks walking into every solid prop', () => {
    expect(BLOCKERS.length).toBeGreaterThanOrEqual(4);
    for (const b of BLOCKERS) {
      expect(b.x1).toBeGreaterThan(b.x0);
      expect(b.z1).toBeGreaterThan(b.z0);
    }
    // Axes resolve separately so a collision slides rather than sticking.
    expect(SRC).toMatch(/if \(!blocked\(nx, S\.z\)\) S\.x = nx;/);
    expect(SRC).toMatch(/if \(!blocked\(S\.x, nz\)\) S\.z = nz;/);
  });
});

describe('reduced motion', () => {
  it('gates the scent animation AND the render, not just the CSS', () => {
    // The tool ships a prefers-reduced-motion stylesheet, but CSS cannot
    // touch a requestAnimationFrame loop. The guard has to be inside frame().
    expect(SRC).toMatch(/if \(reduced && !S\.dirty\) return;/);
    expect(SRC).toMatch(/S\.built\.scentGroup\.visible && !reduced/);
  });

  it('still lets the student move — reduced, not frozen', () => {
    // Movement sets the dirty flag, which is what allows a frame through.
    expect(SRC).toMatch(/api\.look\(turn \* 90 \* dt, 0\); S\.dirty = true;/);
    expect(SRC).toMatch(/api\.move\(fwd \* dt \* 1\.7, strafe \* dt \* 1\.7\); S\.dirty = true;/);
  });

  it('defaults to the OS preference but leaves the student in charge', () => {
    expect(SRC).toMatch(/matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches/);
    // An explicit stored choice must win over the OS default.
    expect(SRC).toMatch(/d\.sensoryReduceMotion != null\s*\?\s*!!d\.sensoryReduceMotion/);
  });

  it('honours the app-level .reduce-motion class like the host does', () => {
    expect(SRC).toMatch(/querySelector\('\.reduce-motion'\)/);
  });

  it('exposes a labelled toggle with pressed state', () => {
    const html = renderTool(ID, {
      [ID]: { view: 'sensory', sensoryActive: true, _threeLoaded: true, sensoryReduceMotion: true },
    });
    expect(html).toContain('Motion reduced');
    expect(html).toMatch(/aria-pressed="true"/);
  });

  it('every change that alters the image marks the scene dirty', () => {
    // Otherwise a species or dusk switch would show a stale frame while
    // reduced motion is on.
    for (const re of [/S\.built\.scentGroup\.visible = \(speciesId === 'dog'\);\s*\n\s*S\.dirty = true;/,
      /S\.camera\.updateProjectionMatrix\(\);\s*\n\s*S\.dirty = true;\s*\n\s*\}/]) {
      expect(SRC).toMatch(re);
    }
  });
});

describe('sensory viewer lifecycle', () => {
  it('tears down the RAF loop and WebGL context on detach', () => {
    expect(SRC).toMatch(/cancelAnimationFrame\(S\.raf\)/);
    expect(SRC).toMatch(/S\.renderer\.dispose\(\)/);
    expect(SRC).toMatch(/removeEventListener/);
  });

  it('survives a device with no WebGL rather than throwing', () => {
    // attach() returns after setStatus('failed') when the renderer ctor throws.
    expect(SRC).toMatch(/catch \(e\) \{\s*setStatus\('failed'\);/);
  });

  it('keeps its hooks out of the view switch', () => {
    // renderSensory() is reached from `case 'sensory':`, so a hook inside it
    // would reorder hooks on navigation. They must live in _renderPets.
    const start = SRC.indexOf('function renderSensory()');
    const end = SRC.indexOf('function decoderCelebOverlay');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = SRC.slice(start, end);
    expect(body).not.toMatch(/React\.use[A-Z]/);
  });

  it('mounts through a stable ref, not an inline callback ref', () => {
    // An inline arrow ref re-initialises the canvas on every render.
    expect(SRC).toMatch(/ref: _sensoryMountRef/);
    expect(SRC).not.toMatch(/ref: function \(node\) \{[^}]*sensory/i);
  });
});
