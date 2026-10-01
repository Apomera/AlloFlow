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

describe('temperature is not encoded by colour alone', () => {
  // Contrast mode paints the coolant white and the fuel emissive black, so the
  // colour ramp above carries NO heat information there — and blue-to-red is
  // the pair a red-green colour-blind student reads worst at exactly the top of
  // the range. Steam voids are the shape channel: real PWR behaviour, readable
  // in any colour mode. WCAG 1.4.1 is the general form of this.
  function buildCore() {
    const partsOpen = SRC.indexOf('  var RX_PARTS = [');
    const partsClose = SRC.indexOf('\n  ];', partsOpen) + 5;
    const open = SRC.indexOf('  function rxBuildCore(');
    const close = SRC.indexOf('\n  var RX_NULL', open);
    expect(open).toBeGreaterThan(-1);
    // eslint-disable-next-line no-new-func
    return new Function(
      SRC.slice(partsOpen, partsClose) + SRC.slice(open, close) + '\nreturn rxBuildCore;',
    )();
  }

  function fakeThree() {
    class Obj {
      constructor() {
        this.children = [];
        // RECORD the coordinates. A no-op set() made the determinism test below
        // vacuous: every position stringified to the same empty object, so
        // swapping the golden-angle spiral for Math.random() still passed.
        const pos = { x: 0, y: 0, z: 0 };
        pos.set = (x, y, z) => { pos.x = x; pos.y = y; pos.z = z; };
        this.position = pos;
      }
      add(c) { this.children.push(c); }
    }
    return {
      Group: class extends Obj {},
      Mesh: class extends Obj {
        constructor(g, m) { super(); this.geometry = g; this.material = m; }
      },
      CylinderGeometry: class {},
      SphereGeometry: class {},
      MeshPhongMaterial: class { constructor(o) { Object.assign(this, o); } },
      Color: class { constructor(v) { this.v = v; } },
    };
  }

  const run = (hot, contrast) => buildCore()(fakeThree(), {
    scene: { add() {} }, sceneProps: { rods: 50, hot }, contrast: !!contrast,
  });

  it('shows no steam while the core is running normally', () => {
    // The steady scenario teaches that a healthy reactor is boring.
    expect(run(0).meshes.voids).toBeFalsy();
    expect(run(0.3).meshes.voids).toBeFalsy();
  });

  it('grows the void count as the core heats', () => {
    const counts = [0.6, 0.8, 1].map((h) => {
      const v = run(h).meshes.voids;
      return v ? v.children.length : 0;
    });
    expect(counts[0]).toBeGreaterThan(0);
    expect(counts[1]).toBeGreaterThan(counts[0]);
    expect(counts[2]).toBeGreaterThan(counts[1]);
  });

  it('keeps the shape channel in contrast mode, where colour is gone', () => {
    // This is the whole point: contrast mode still has to say 'hot'.
    const v = run(1, true).meshes.voids;
    expect(v, 'contrast mode lost every temperature cue').toBeTruthy();
    expect(v.children.length).toBeGreaterThan(0);
  });

  it('places voids deterministically, so a rebuild does not shimmer', () => {
    // sceneKey rebuilds happen on every quantised step; random placement would
    // make the bubbles jump around at a constant temperature.
    const xyz = (m) => m.position.x + ',' + m.position.y + ',' + m.position.z;
    const a = run(0.9).meshes.voids.children.map(xyz);
    const b = run(0.9).meshes.voids.children.map(xyz);
    // Guard against the stub silently recording nothing.
    expect(a.some((p) => p !== '0,0,0')).toBe(true);
    expect(a).toEqual(b);
  });

  it('shares one geometry and one material across every bubble', () => {
    const v = run(1).meshes.voids.children;
    expect(v.length).toBeGreaterThan(5);
    expect(new Set(v.map((m) => m.geometry)).size).toBe(1);
    expect(new Set(v.map((m) => m.material)).size).toBe(1);
  });
});

describe('the 3D view is reachable without sight', () => {
  // The host sets aria-hidden="true" on the WebGL canvas it creates, so the 3D
  // core is invisible to a screen reader BY DESIGN and the tool has to describe
  // it. Nothing did: the container carried no role and no name, while the 2D
  // control panel beside it had a full aria-label and aria-describedby. A
  // screen reader user met a labelled panel next to an unlabelled blank.
  it('names the 3D container and says what it shows', () => {
    const attach = /ref: rxAttach,[\s\S]{0,900}?\}\)/.exec(SRC);
    expect(attach, 'rxAttach container not found').toBeTruthy();
    const block = attach[0];
    expect(block).toContain("role: 'img'");
    expect(block).toContain('aria-label');
    // It must describe the two things that actually move.
    expect(block).toMatch(/control rods|rods rise/i);
    expect(block).toMatch(/steam voids|coolant/i);
  });

  it('points at the equivalents rather than pretending the canvas is operable', () => {
    // Every part has a keyboard button and every live value is in the telemetry
    // list; the label should send a screen reader user there.
    const attach = /ref: rxAttach,[\s\S]{0,900}?\}\)/.exec(SRC)[0];
    expect(attach).toContain("'aria-describedby': 'rx-live-readings'");
    expect(attach).toMatch(/Parts of the core/);
  });

  it('keeps the status overlay outside the labelled container', () => {
    // role="img" makes a subtree presentational. The loading / WebGL-blocked
    // message must NOT be inside it, or the one thing a failed viewer still has
    // to say would be hidden.
    const view = SRC.slice(SRC.indexOf("nk-rx-core-view"));
    const attachAt = view.indexOf('ref: rxAttach');
    const statusAt = view.indexOf("role: 'status'");
    expect(attachAt).toBeGreaterThan(-1);
    expect(statusAt).toBeGreaterThan(attachAt);
    // The attach div closes before the status div opens: they are siblings.
    const between = view.slice(attachAt, statusAt);
    expect(between).toContain('}),');
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
