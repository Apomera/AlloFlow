import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it, vi, afterEach } from 'vitest';

// Lane sv14: the Field survey's default diver view is close enough to judge the
// bottom under the plumb line, on a wide page and on a phone, and still shows the
// neighbouring tape marks and the plumb line, so the student knows where they are.
// Real engine and habitat on a stub renderer (as hb13's view test). The habitat and
// engine copies sit beside the tool copy (stem_lab/ at install); REEF3D_*_SOURCE override them.
vi.setConfig({ testTimeout: 60000 });
const REPO = process.cwd().split(String.fromCharCode(92)).join('/');
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const DIR = path.dirname(TOOL).split(String.fromCharCode(92)).join('/');
const HABITAT = process.env.REEF3D_HABITAT_SOURCE || DIR + '/reef_3d_habitat.js';
const ENGINE = process.env.REEF3D_ENGINE_SOURCE || DIR + '/reef_3d_engine.js';
const THREE = createRequire(import.meta.url)(REPO + '/vendor/three-r128/three.min.js');
const HABITAT_SRC = readFileSync(HABITAT, 'utf8'), ENGINE_SRC = readFileSync(ENGINE, 'utf8');
const toolWindow = { StemLab: { isRegistered: () => false, registerTool: () => {} }, __RR_TEST_EXPORTS__: {} };
vm.runInNewContext(readFileSync(TOOL, 'utf8'), { window: toolWindow, Math, Object, JSON, Array, Number, String, Date, URL });
const X = toolWindow.__RR_TEST_EXPORTS__.coralReef;
function modeledSite() {
  const settings = X.scenarioSettings('recent'), rows = X.runScenario(settings, 7);
  return X.siteFromModelYear(rows[10], settings, 9001, 7);
}
const LAYOUTS = X.SITES.concat([modeledSite()]).map((site) => X.buildTransect(site, site.seed));

const cleanups = [];
afterEach(() => { while (cleanups.length) cleanups.pop()(); });
function mountEngine(layout, width, height, quality) {
  let renderer = null, clock = 1000;
  const frames = new Map(); let serial = 0;
  class Renderer {
    constructor() { renderer = this; this.shadowMap = {}; this.info = { render: { calls: 0, triangles: 0 } }; this.capabilities = { isWebGL2: true }; this.extensions = { has: () => true }; }
    setPixelRatio() {} setSize() {} render(scene, camera) { this.scene = scene; this.camera = camera; } dispose() {} forceContextLoss() {}
  }
  const local = { innerWidth: 1280, devicePixelRatio: 1, console: { warn() {}, error() {} }, performance: { now: () => clock },
    requestAnimationFrame(cb) { const id = ++serial; frames.set(id, cb); return id; }, cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout() { return 0; }, clearTimeout() {}, addEventListener() {}, removeEventListener() {} };
  new Function('window', HABITAT_SRC)(local);
  new Function('window', ENGINE_SRC)(local);
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ width, height });
  document.body.appendChild(canvas);
  const controller = local.Reef3D.mount(canvas, { THREE: { ...THREE, WebGLRenderer: Renderer }, layout, seed: layout.seed, quality, reducedMotion: true });
  cleanups.push(() => { try { controller.dispose(); } catch (ignore) {} canvas.remove(); });
  return { controller, get renderer() { return renderer; }, step() { clock += 50; const q = [...frames.values()]; frames.clear(); q.forEach((cb) => cb(clock)); } };
}

describe('sv14 survey 3D: a close diver view with context', () => {
  // The canvas is 360 px tall: about 1100 wide on a 1280 page, about 340 on a 390 phone.
  for (const [width, quality] of [[1100, 'high'], [340, 'low']]) {
    it(`shows the point large, with the neighbouring marks and the plumb line in view (${width} px, ${quality})`, () => {
      const v = new THREE.Vector3(), small = [], lost = [];
      for (const layout of LAYOUTS) {
        const t = mountEngine(layout, width, 360, quality);
        const px = (x, y, z) => { v.set(x, y, z).project(t.renderer.camera); return { x: (v.x * 0.5 + 0.5) * width, y: (0.5 - v.y * 0.5) * 360, z: v.z }; };
        const inside = (q, m) => q.z < 1 && q.x > m && q.x < width - m && q.y > m && q.y < 360 - m;
        layout.points.forEach((p, i) => {
          t.controller.goToPoint(i); t.step();
          const scene = t.renderer.scene, camera = t.renderer.camera; camera.updateMatrixWorld(true);
          const hl = scene.getObjectByName('reef-highlight'), ring = hl.children[0], d = p.distanceM, y = ring.position.y;
          const at = px(d, y, 0);
          // The ring (26 cm across, across the tape) on screen: about 40 px at the old 1.9 m view.
          const a = px(d, y, -0.13), b = px(d, y, 0.13), across = Math.hypot(a.x - b.x, a.y - b.y);
          if (across < 52) small.push(`${layout.siteId} point ${i + 1}: ring ${Math.round(across)} px across`);
          // The spot itself, its ring, the plumb line's top and the marks of the points either side.
          if (!inside(at, 40)) lost.push(`${layout.siteId} point ${i + 1}: spot`);
          const top = px(d, hl.children.find((c) => c.isLine).position.y + hl.children.find((c) => c.isLine).scale.y, 0);
          if (!inside(top, 2)) lost.push(`${layout.siteId} point ${i + 1}: plumb line top`);
          for (const o of [-0.5, 0.5]) if (d + o >= 0 && d + o <= layout.lengthM && !inside(px(d + o, y, 0), 2)) lost.push(`${layout.siteId} point ${i + 1}: mark at ${d + o} m`);
          // The diver stays above the reef, not down among the colonies.
          if (camera.position.y - y < 0.8) lost.push(`${layout.siteId} point ${i + 1}: camera ${camera.position.y.toFixed(2)} m, only ${(camera.position.y - y).toFixed(2)} m over the spot`);
        });
      }
      expect(small, small.slice(0, 8).join('\n')).toEqual([]);
      expect(lost, lost.slice(0, 8).join('\n')).toEqual([]);
    });
  }
});
