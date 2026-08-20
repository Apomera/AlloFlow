import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';
const state = (o = {}) => ({ machineLab: Object.assign({ view: 'build' }, o) });

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'machineLab');
});

// makeOrbitViewer takes rotY/rotX/zoom from EVERY push and overwrites its own
// state with them (stem_lab_module.js: `S.rotY = next.rotY` runs unconditionally).
// A push that omits them sets the camera to undefined -> 0, which silently
// discards cfg.rot and freezes every scene dead-on. The caller owns the camera.
describe('Machine Lab: the camera is sent on every push', () => {
  const src = () => fs.readFileSync(path.resolve(process.cwd(), FILE), 'utf8');

  // Read a window after the push marker rather than matching the whole object:
  // it contains a nested geom: {...}, so a lazy match to the first "});" stops
  // in the wrong place and reports a false negative.
  function pushWindow(marker) {
    const text = src();
    const i = text.indexOf(marker);
    expect(i, marker + ' not found').toBeGreaterThan(-1);
    // Wide enough to clear the siege push's signature, which now names the
    // machine and the standoff because both change the geometry of the field.
    return text.slice(i, i + 1400);
  }

  it('includes rotY, rotX and zoom in the machine bay push', () => {
    const w = pushWindow('TREB_GL.push({');
    expect(w).toContain('rotY:');
    expect(w).toContain('rotX:');
    expect(w).toContain('zoom:');
  });

  it('includes them in the wall bay push too', () => {
    const w = pushWindow('SIEGE_GL.push({');
    expect(w).toContain('rotY:');
    expect(w).toContain('rotX:');
    expect(w).toContain('zoom:');
  });

  it('starts each bay at the angle its scene was designed for', () => {
    const cfg = loadTool(FILE, 'machineLab');
    const s = String(cfg.render);
    expect(s).toContain("camFor('machine')");
    expect(s).toContain("camFor('wall')");
    // The homes exist and are not both flat-on, which is the state the bug left.
    const text = src();
    expect(text).toMatch(/MACHINE_HOME = \{ rotY: 22, rotX: 12, zoom: 1 \}/);

    // The wall bay is a whole siege field now: the machine stands at negative z
    // and throws towards the wall at the origin. The camera direction runs as
    // (sin rotY, ., cos rotY), so a rotY near 0 puts the camera BEYOND the wall
    // and you watch the siege from the defenders' side, through the back of the
    // masonry, with your own machine a speck past it. It has to be on the
    // attacker's side, which is rotY somewhere around 180.
    const wall = text.match(/WALL_HOME = \{ rotY: (-?\d+(?:\.\d+)?), rotX: (-?\d+(?:\.\d+)?)/);
    expect(wall, 'WALL_HOME not found').toBeTruthy();
    const rotY = ((Number(wall[1]) % 360) + 360) % 360;
    expect(rotY, 'the wall camera must sit behind the machine').toBeGreaterThan(135);
    expect(rotY).toBeLessThan(225);
    // Looking down at the field from above flattens it into a plan view.
    expect(Number(wall[2])).toBeGreaterThan(0);
    expect(Number(wall[2])).toBeLessThan(35);
  });
});

describe('Machine Lab: the camera is reachable without a mouse', () => {
  it('offers labelled turn, tilt, zoom and reset controls on the machine bay', () => {
    const html = renderTool('machineLab', state({ view: 'build' }));
    for (const label of ['Turn left', 'Turn right', 'Tilt up', 'Tilt down', 'Zoom in', 'Zoom out', 'Reset the view']) {
      expect(html, label).toContain('aria-label="' + label + '"');
    }
  });

  it('offers them on the target wall too', () => {
    const html = renderTool('machineLab', state({ view: 'siege' }));
    expect(html).toContain('aria-label="Turn left"');
    expect(html).toContain('aria-label="Reset the view"');
  });

  it('offers the same camera controls on the 3D test range lane', () => {
    const html = renderTool('machineLab', state({ view: 'range' }));
    expect(html).toContain('data-ml-orbitable="true"');
    expect(html).toContain('aria-label="Camera for the 3D range lane"');
    expect(html).toContain('aria-label="Toggle full screen for the 3D range lane. Press Escape to leave full screen."');
  });

  it('groups them with a name, so they are not seven loose glyph buttons', () => {
    const html = renderTool('machineLab', state({ view: 'build' }));
    expect(html).toMatch(/role="group" aria-label="Camera for the [^"]+"/);
  });

  it('uses real buttons, so they are keyboard operable for free', () => {
    const html = renderTool('machineLab', state({ view: 'build' }));
    const idx = html.indexOf('Camera for the');
    const strip = html.slice(idx, idx + 1600);
    expect((strip.match(/<button/g) || []).length).toBeGreaterThanOrEqual(7);
    expect(strip).not.toContain('role="button"');
  });
});

describe('Machine Lab: the workshop camera feels direct without losing alternatives', () => {
  it('exposes side and close-up presets as labelled native buttons', () => {
    const html = renderTool('machineLab', state({ view: 'machines', bench: 'lever' }));
    expect(html).toContain('aria-label="Show the machine from the side"');
    expect(html).toContain('aria-label="Show a close three-quarter view"');
    expect(html).toContain('>Side</button>');
    expect(html).toContain('>Close</button>');
  });

  it('marks the 3D workshop as orbitable and explains the equivalent controls', () => {
    const html = renderTool('machineLab', state({ view: 'machines', bench: 'lever' }));
    expect(html).toContain('data-ml-orbitable="true"');
    expect(html).toContain('Drag scene or use:');
    expect(html).toContain('camera buttons and panels below provide complete keyboard and numeric equivalents');
  });

  it('keeps touch reserved for page scrolling while supporting mouse and pen drag', () => {
    const text = fs.readFileSync(path.resolve(process.cwd(), FILE), 'utf8');
    expect(text).toContain("ev.pointerType === 'touch'");
    expect(text).toContain('onPointerDown: beginShopOrbit');
    expect(text).toContain('onPointerCancel: endShopOrbit');
  });
});

describe('Machine Lab: camera limits', () => {
  it('reads back whatever angle the state holds', () => {
    const html = renderTool('machineLab', state({ machineRotY: 90, machineRotX: 40, machineZoom: 2 }));
    expect(html).toContain('Turn left');       // still rendered, no throw
    expect(html).not.toContain('NaN');
  });

  it('survives absent or corrupt camera state by falling back to home', () => {
    // Older saved state has no camera fields at all.
    const html = renderTool('machineLab', {
      machineLab: { view: 'build', machineRotY: undefined, machineRotX: null, machineZoom: 0 }
    });
    expect(html).toContain('Energy ledger');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('undefined');
  });

  it('clamps tilt so the scene can never go fully under or over', () => {
    const text = fs.readFileSync(path.resolve(process.cwd(), FILE), 'utf8');
    expect(text).toContain('Math.max(-70, Math.min(78, nx))');
  });

  it('clamps zoom to a usable range', () => {
    const text = fs.readFileSync(path.resolve(process.cwd(), FILE), 'utf8');
    expect(text).toContain('Math.max(0.5, Math.min(2.6, nz))');
  });

  it('keeps yaw inside one turn instead of counting up forever', () => {
    const text = fs.readFileSync(path.resolve(process.cwd(), FILE), 'utf8');
    expect(text).toContain('((ny % 360) + 360) % 360');
  });
});
