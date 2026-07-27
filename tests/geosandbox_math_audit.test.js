// Geometry Sandbox — mathematical-correctness audit.
//
// Revolve computes volume from PAPPUS'S THEOREM, V = θ·R̄·A. That theorem has two
// hypotheses, and neither was enforced:
//   1. the spin axis must LIE IN the plane of the profile;
//   2. the profile must not CROSS that axis.
// Both failed from the most ordinary setup in the tool — a rectangle drawn flat on
// the ground, one of the three axis buttons pressed:
//   • flat rect spun about the PERPENDICULAR axis sweeps a flat annulus with no
//     volume whatsoever, and the readout claimed 22.65;
//   • rect straddling the axis puts its centroid ON the axis, R̄ = 0, so a solid
//     rendering 384 triangles on screen reported a volume of 0.
// The numbers below were measured from the tool's real functions before the fix.

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { loadAlloModule } from './setup.js';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeAll(() => {
  loadAlloModule('stem_lab/stem_tool_geosandbox.js');
  P = window.StemLab && window.StemLab.geoPure;
  if (!P) throw new Error('geoPure not exposed on window.StemLab');
});

const rect = (position, u, v) => ({ position, u, v });

// The shapes at issue, named once so every block reads the same way.
const RING = rect([1, 0, 0], [1, 0, 0], [0, 2, 0]);        // offset from the Y axis
const CYLINDER = rect([0, 0, 0], [1, 0, 0], [0, 2, 0]);    // one edge ON the Y axis
const STRADDLING = rect([-1, 0, 0], [2, 0, 0], [0, 2, 0]); // centred on the Y axis
const PARTLY_ACROSS = rect([-0.5, 0, 0], [2, 0, 0], [0, 2, 0]);
const OFF_ORIGIN = rect([1, 0, 1], [1, 0, 0], [0, 2, 0]);  // plane misses the origin

describe('revolutionValidity — Pappus’s two hypotheses', () => {
  it('accepts the profiles the theorem actually covers', () => {
    expect(P.revolutionValidity(RING, 'y')).toEqual({ ok: true, reason: 'ok' });
    expect(P.revolutionValidity(CYLINDER, 'y')).toEqual({ ok: true, reason: 'ok' });
    // A triangle profile touching the axis — the cone case.
    expect(P.revolutionValidity(CYLINDER, 'y', 'triangle').ok).toBe(true);
  });

  it('rejects a profile that crosses the axis, naming that hypothesis', () => {
    expect(P.revolutionValidity(STRADDLING, 'y')).toEqual({ ok: false, reason: 'crosses_axis' });
    expect(P.revolutionValidity(PARTLY_ACROSS, 'y')).toEqual({ ok: false, reason: 'crosses_axis' });
  });

  it('rejects an axis that is not in the profile’s plane', () => {
    // The flat rect lies in z = 0; the Z axis is square to it. Spinning about Z
    // sweeps a flat annulus — a 2-D region, zero volume.
    expect(P.revolutionValidity(RING, 'z')).toEqual({ ok: false, reason: 'axis_off_plane' });
    // Parallel to the plane but not in it: the axis line misses the plane entirely.
    expect(P.revolutionValidity(OFF_ORIGIN, 'y')).toEqual({ ok: false, reason: 'axis_off_plane' });
  });

  it('rejects a degenerate profile with no plane at all', () => {
    expect(P.revolutionValidity(rect([0, 0, 0], [1, 0, 0], [2, 0, 0]), 'y').reason).toBe('degenerate');
    expect(P.revolutionValidity(null, 'y').ok).toBe(false);
    expect(P.revolutionValidity({ position: [0, 0, 0] }, 'y').ok).toBe(false);
  });

  it('reads the axis and profile off a built revolution when not passed explicitly', () => {
    expect(P.revolutionValidity(P.revolveRect(STRADDLING, 'y', 360)).reason).toBe('crosses_axis');
    expect(P.revolutionValidity(P.revolveRect(RING, 'z', 360)).reason).toBe('axis_off_plane');
    expect(P.revolutionValidity(P.revolveRect(RING, 'y', 360)).ok).toBe(true);
  });
});

describe('revolutionVolume — exact where the theorem applies', () => {
  // These three are the regression guard: the fix must not disturb them.
  it('gives the exact ring volume (2π·R̄·A = 6π)', () => {
    expect(P.revolutionVolume(P.revolveRect(RING, 'y', 360))).toBeCloseTo(6 * Math.PI, 9);
  });
  it('gives the exact cylinder volume (πr²h = 2π)', () => {
    expect(P.revolutionVolume(P.revolveRect(CYLINDER, 'y', 360))).toBeCloseTo(2 * Math.PI, 9);
  });
  it('gives the exact cone volume (⅓πr²h = 2π/3)', () => {
    expect(P.revolutionVolume(P.revolveRect(CYLINDER, 'y', 360, 48, 'triangle')))
      .toBeCloseTo((2 / 3) * Math.PI, 9);
  });
  it('scales linearly with sweep angle for a valid profile', () => {
    const half = P.revolutionVolume(P.revolveRect(RING, 'y', 180));
    expect(half).toBeCloseTo(3 * Math.PI, 9);
  });

  it('states no volume where Pappus does not apply', () => {
    // Before the fix these returned 0 (a visible solid) and 22.6543 (a flat sweep)
    // respectively — both presented beside the formula as though computed.
    expect(P.revolutionVolume(P.revolveRect(STRADDLING, 'y', 360))).toBe(0);
    expect(P.revolutionVolume(P.revolveRect(PARTLY_ACROSS, 'y', 360))).toBe(0);
    expect(P.revolutionVolume(P.revolveRect(RING, 'z', 360))).toBe(0);
  });
});

describe('revolutionAxisOptions — what the picker may offer', () => {
  it('offers only the axes lying in the rectangle’s plane', () => {
    // Flat in z = 0: X and Y lie in that plane, Z is square to it.
    expect(P.revolutionAxisOptions(RING)).toEqual(['x', 'y']);
    // In the x = 0 plane: Y and Z lie in it.
    expect(P.revolutionAxisOptions(rect([0, 0, 1], [0, 0, 1], [0, 2, 0]))).toEqual(['y', 'z']);
  });
  it('drops an axis the rectangle straddles even though it is in the plane', () => {
    // The straddling rect spans x = −1…1 (crosses Y) but y = 0…2 (clear of X).
    expect(P.revolutionAxisOptions(STRADDLING)).toEqual(['x']);
  });
  it('offers nothing when no world axis lies in the plane', () => {
    expect(P.revolutionAxisOptions(OFF_ORIGIN)).toEqual([]);
  });
});

describe('geoStretchMeasure carries the verdict to the readout', () => {
  it('marks a valid revolution valid and keeps the Pappus formula', () => {
    const m = P.geoStretchMeasure(P.revolveRect(RING, 'y', 360));
    expect(m.valid).toBe(true);
    expect(m.invalidReason).toBe(null);
    expect(m.formula).toContain('Pappus');
    expect(m.formula).not.toContain('hypotheses not met');
    expect(m.value).toBeCloseTo(6 * Math.PI, 9);
  });

  it('flags an invalid revolution so the readout can explain rather than print 0', () => {
    const m = P.geoStretchMeasure(P.revolveRect(STRADDLING, 'y', 360));
    expect(m.valid).toBe(false);
    expect(m.invalidReason).toBe('crosses_axis');
    expect(m.formula).toContain('hypotheses not met');
    // Still a number, because badge/puzzle scoring does arithmetic on this field.
    expect(typeof m.value).toBe('number');
    expect(Number.isNaN(m.value)).toBe(false);
  });

  it('does not let an uncomputable solid win the fattest-solid puzzle', () => {
    // A straddling rect has a large profile area; if its volume were still reported
    // by Pappus it would score, on a number the tool cannot stand behind.
    const m = P.geoStretchMeasure(P.revolveRect(PARTLY_ACROSS, 'y', 360));
    expect(m.value).toBe(0);
  });

  it('leaves every other shape type untouched by the revolve guard', () => {
    expect(P.geoStretchMeasure({ type: 'rect', position: [0, 0, 0], u: [3, 0, 0], v: [0, 4, 0] }).value)
      .toBeCloseTo(12, 9);
    expect(P.geoStretchMeasure({ type: 'prism', position: [0, 0, 0], u: [2, 0, 0], v: [0, 3, 0], w: [0, 0, 4] }).value)
      .toBeCloseTo(24, 9);
  });
});

describe('the rendered mesh and the stated volume agree', () => {
  // The original defect was precisely that they disagreed: 384 triangles on screen,
  // volume 0 in the readout. Tie them together so they cannot drift apart again.
  it('a valid revolution renders triangles and states a positive volume', () => {
    const o = P.revolveRect(RING, 'y', 360);
    expect(P.revolutionTriangles(o).length).toBeGreaterThan(0);
    expect(P.revolutionVolume(o)).toBeGreaterThan(0);
  });
  it('no shape both renders as a solid and reports a volume of zero', () => {
    // Every shape the tool will now BUILD (validity ok) must satisfy this.
    const buildable = [RING, CYLINDER].map((r) => P.revolveRect(r, 'y', 360));
    buildable.forEach((o) => {
      expect(P.revolutionValidity(o).ok).toBe(true);
      expect(P.revolutionTriangles(o).length).toBeGreaterThan(0);
      expect(P.revolutionVolume(o)).toBeGreaterThan(0);
    });
  });
});

// AI Sculpt drew the sculpture at 2.6 world units per recipe unit, on the SAME
// 1-unit grid that single and stretch mode draw against 1:1 — while the panel stated
// volumes in raw recipe units and hard-coded "u³". A 1×1×1 part therefore spanned
// 2.6 grid squares and reported "V 1.00 u³": off by 2.6³ ≈ 17.6×. One shared
// constant now feeds both the renderer and the readout.
describe('sculpt measurements describe what is actually on the grid', () => {
  it('exposes one grid-unit constant', () => {
    expect(P.SCULPT_GRID_UNIT).toBeGreaterThan(0);
  });

  it('measures in recipe units by default — the pure contract other tests rely on', () => {
    const m = P.geoSculptMeasure({ scale: 1, parts: [{ shape: 'box', size: [2, 2, 2] }] });
    expect(m.totalVol).toBeCloseTo(8, 6);
  });

  it('measures in grid units when the display unit is passed', () => {
    const u = P.SCULPT_GRID_UNIT;
    const m = P.geoSculptMeasure({ scale: 1, parts: [{ shape: 'box', size: [1, 1, 1] }] }, u);
    expect(m.totalVol).toBeCloseTo(u * u * u, 6);
    expect(m.totalSA).toBeCloseTo(6 * u * u, 6);
  });

  it('scales the printed dimensions too, not just the totals', () => {
    // A separate ×f³ multiplier would have fixed the volume and left "1×1×1" behind.
    const u = P.SCULPT_GRID_UNIT;
    const m = P.geoSculptMeasure({ scale: 1, parts: [{ shape: 'box', size: [1, 1, 1] }] }, u);
    expect(m.parts[0].dims).toContain(String(Math.round(u * 100) / 100));
    expect(m.parts[0].dims).not.toBe('1×1×1');
  });

  it('still composes with the recipe’s own scale', () => {
    const u = P.SCULPT_GRID_UNIT;
    const one = P.geoSculptMeasure({ scale: 1, parts: [{ shape: 'box', size: [2, 2, 2] }] }, u);
    const two = P.geoSculptMeasure({ scale: 2, parts: [{ shape: 'box', size: [2, 2, 2] }] }, u);
    expect(two.totalVol).toBeCloseTo(one.totalVol * 8, 6);
    expect(two.totalSA).toBeCloseTo(one.totalSA * 4, 6);
  });

  // The invariant, checked against the geometry the renderer really asks for rather
  // than against the constant — so changing 2.6 in one place and not the other fails.
  it('states the volume of the box the renderer actually draws', () => {
    loadAlloModule('prim3d_module.js');
    const P3D = window.AlloModules && window.AlloModules.Prim3D;
    expect(P3D, 'Prim3D module did not attach').toBeTruthy();

    const drawn = [];
    const THREE = {
      Group: function () {
        this.children = []; this.userData = {};
        this.scale = { setScalar: (s) => { this.scaleValue = s; } };
        this.rotation = { y: 0 }; this.position = { y: 0 };
        this.add = (c) => this.children.push(c);
        this.traverse = (fn) => { fn(this); this.children.forEach(fn); };
      },
      BoxGeometry: function (w, h, d) { drawn.push([w, h, d]); },
      SphereGeometry: function () {}, CylinderGeometry: function () {},
      ConeGeometry: function () {}, TorusGeometry: function () {},
      Mesh: function (g) {
        this.geometry = g; this.isMesh = true;
        this.position = { set: () => {} }; this.rotation = { set: () => {} };
        this.traverse = (fn) => fn(this);
      },
      MeshStandardMaterial: function () {}, Color: function () { this.multiply = () => {}; },
    };

    const recipe = { name: 'probe', scale: 1, parts: [{ shape: 'box', size: [1, 1, 1], position: [0, 0.5, 0], rotation: [0, 0, 0], color: '#60a5fa' }] };
    const group = P3D.buildObject(THREE, recipe, { unit: P.SCULPT_GRID_UNIT });
    expect(group).toBeTruthy();

    // What ends up on the grid: geometry extents × the group's scale.
    const [w, h, d] = drawn[0];
    const s = group.scaleValue;
    const drawnVolume = (w * s) * (h * s) * (d * s);

    const stated = P.geoSculptMeasure(recipe, P.SCULPT_GRID_UNIT).totalVol;
    expect(stated).toBeCloseTo(drawnVolume, 6);
    // And it is emphatically not the old recipe-unit answer.
    expect(stated).not.toBeCloseTo(1, 2);
  });
});

// WCAG 2.1.4 Character Key Shortcuts (Level A). The C/W/E/B/U/M and "/" shortcuts
// were bound to `window` and guarded on tag name alone, so they acted from anywhere
// on the page. The criterion allows a character-key shortcut only if it can be
// turned off, remapped, or is active on focus — focus-scoping keeps the shortcuts.
describe('geoShortcutAllowed — character keys act only on focus', () => {
  // A stand-in for the tool root: contains() answers for a small tree.
  const rootOf = (owned) => ({ contains: (n) => owned.indexOf(n) >= 0 });
  const el = (tagName, extra) => Object.assign({ tagName, isContentEditable: false }, extra || {});

  it('allows a keystroke on an element inside the sandbox', () => {
    const canvas = el('CANVAS');
    expect(P.geoShortcutAllowed(canvas, rootOf([canvas]))).toBe(true);
  });

  it('refuses a keystroke aimed anywhere outside the sandbox', () => {
    // document.body is the target when nothing is focused — the old code acted.
    const body = el('BODY');
    const canvas = el('CANVAS');
    expect(P.geoShortcutAllowed(body, rootOf([canvas]))).toBe(false);
    expect(P.geoShortcutAllowed(el('BUTTON'), rootOf([canvas]))).toBe(false);
  });

  it('still refuses text-entry targets even inside the sandbox', () => {
    ['INPUT', 'TEXTAREA', 'SELECT'].forEach((tag) => {
      const node = el(tag);
      expect(P.geoShortcutAllowed(node, rootOf([node]))).toBe(false);
    });
  });

  it('refuses a contenteditable target, which the tag-name guard let through', () => {
    const node = el('DIV', { isContentEditable: true });
    expect(P.geoShortcutAllowed(node, rootOf([node]))).toBe(false);
  });

  it('refuses safely when the root is missing or malformed', () => {
    const canvas = el('CANVAS');
    expect(P.geoShortcutAllowed(canvas, null)).toBe(false);
    expect(P.geoShortcutAllowed(canvas, {})).toBe(false);
    expect(P.geoShortcutAllowed(null, rootOf([]))).toBe(false);
  });
});

// The pure verdict is worth nothing if the student never sees it. These render the
// real panel, the way geosandbox_panel_render does, and check the warning is on
// screen BEFORE the press — a refusal that only arrives after the click teaches
// less than one that heads it off.
describe('the panel warns before the press', () => {
  const spin = (objects, selection, stretchAxis) => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_geosandbox.js', 'geoSandbox');
    return renderTool('geoSandbox', {
      _threeLoaded: true,
      geoSandbox: {
        mode: 'stretch', buildVerb: 'revolve', stretchAxis: stretchAxis,
        construction: { objects: objects, selection: selection },
      },
    });
  };
  const RECT_FLAT = { id: 1, type: 'rect', position: [1, 0, 0], u: [1, 0, 0], v: [0, 2, 0] };
  const RECT_STRADDLE = { id: 2, type: 'rect', position: [-1, 0, 0], u: [2, 0, 0], v: [0, 2, 0] };

  beforeEach(() => resetStemLab());

  it('stays quiet when the chosen axis really can spin the rectangle', () => {
    const html = spin([RECT_FLAT], 1, 'y');
    expect(html).toContain('Spin axis:');
    expect(html).not.toContain('straddles the spin axis');
    expect(html).not.toContain('sweeps no solid at all');
  });

  it('names the off-plane axis, and which axes would work', () => {
    // Flat in z = 0, spun about Z — the perpendicular case that reported 22.65.
    const html = spin([RECT_FLAT], 1, 'z');
    expect(html).toContain('sweeps no solid at all');
    expect(html).toContain('X / Y');
  });

  it('names the straddle, and offers the axis that is still clear of the face', () => {
    const html = spin([RECT_STRADDLE], 2, 'y');
    expect(html).toContain('straddles the spin axis');
    expect(html).toContain('X');   // spinning about X, the face is wholly on one side
  });

  it('advertises only the shortcuts that work in the current mode', () => {
    const overlay = (m) => {
      resetStemLab();
      loadTool('stem_lab/stem_tool_geosandbox.js', 'geoSandbox');
      return renderTool('geoSandbox', {
        _threeLoaded: true,
        geoSandbox: { mode: m, construction: { objects: [RECT_FLAT], selection: 1 } },
      });
    };
    // "U: undo" was shown in sculpt mode while U was bound for stretch alone.
    // U is now bound there, so the claim is true rather than the claim removed.
    expect(overlay('sculpt')).toContain('U: undo');
    expect(overlay('stretch')).toContain('U: undo');
    // Stretch owns [ ] and Delete; the old shared string never mentioned them.
    expect(overlay('stretch')).toContain('Delete: remove');
    // Single mode has no undo shortcut, and must not claim one.
    expect(overlay('single')).not.toContain('U: undo');
    expect(overlay('single')).toContain('1-7: shapes');
    // And every mode says the shortcuts are focus-scoped.
    ['single', 'stretch', 'sculpt'].forEach((m) => {
      expect(overlay(m)).toContain('has focus');
    });
  });

  it('does not warn when Revolve is not the active verb', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_geosandbox.js', 'geoSandbox');
    const html = renderTool('geoSandbox', {
      _threeLoaded: true,
      geoSandbox: {
        mode: 'stretch', buildVerb: 'stretch', stretchAxis: 'z',
        construction: { objects: [RECT_FLAT], selection: 1 },
      },
    });
    expect(html).not.toContain('sweeps no solid at all');
  });
});
