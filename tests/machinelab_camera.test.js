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
    return text.slice(i, i + 500);
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
    expect(text).toMatch(/WALL_HOME = \{ rotY: 14, rotX: 16, zoom: 1 \}/);
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
