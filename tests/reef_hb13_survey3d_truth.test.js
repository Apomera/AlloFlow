import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it, vi, afterEach } from 'vitest';

// Lane hb13: the Field survey's 3D view tells the truth under every plumb line,
// and the diver's default view shows that spot. The habitat and engine copies sit
// beside the tool copy (stem_lab/ at install); REEF3D_*_SOURCE override them.
vi.setConfig({ testTimeout: 60000 });
const REPO = process.cwd().split(String.fromCharCode(92)).join('/');
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const DIR = path.dirname(TOOL).split(String.fromCharCode(92)).join('/');
const HABITAT = process.env.REEF3D_HABITAT_SOURCE || DIR + '/reef_3d_habitat.js';
const ENGINE = process.env.REEF3D_ENGINE_SOURCE || DIR + '/reef_3d_engine.js';
const THREE = createRequire(import.meta.url)(REPO + '/vendor/three-r128/three.min.js');
const HABITAT_SRC = readFileSync(HABITAT, 'utf8'), ENGINE_SRC = readFileSync(ENGINE, 'utf8');
const habitatWindow = { console: { warn() {}, error() {} } };
new Function('window', HABITAT_SRC)(habitatWindow);
const Habitat = habitatWindow.Reef3DHabitat;
const toolWindow = { StemLab: { isRegistered: () => false, registerTool: () => {} }, __RR_TEST_EXPORTS__: {} };
vm.runInNewContext(readFileSync(TOOL, 'utf8'), { window: toolWindow, Math, Object, JSON, Array, Number, String, Date, URL });
const X = toolWindow.__RR_TEST_EXPORTS__.coralReef;

// One transect per reef: the five field sites and a modeled reef (year 10 of the
// recent-trend run, as the Field survey builds it from the model).
function modeledSite() {
  const settings = X.scenarioSettings('recent'), rows = X.runScenario(settings, 7);
  return X.siteFromModelYear(rows[10], settings, 9001, 7);
}
const SITES = X.SITES.concat([modeledSite()]);
const LAYOUTS = SITES.map((site) => X.buildTransect(site, site.seed));
const built = new Map();
function habitatFor(layout, quality = 'high') {
  const key = layout.siteId + ':' + layout.seed + ':' + quality;
  if (!built.has(key)) { const h = Habitat.create(THREE, { layout, seed: layout.seed, quality }); h.root.updateMatrixWorld(true); built.set(key, h); }
  return built.get(key);
}
function ownerPoint(object) { let o = object; while (o && !(o.userData && typeof o.userData.surveyPoint === 'number')) o = o.parent; return o ? o.userData.surveyPoint : -1; }
function surveyMeshes(h) { const out = []; h.surveyObjects.forEach((o) => o.traverse((m) => { if (m.isMesh) out.push(m); })); return out; }
function uniformsOf(material) {
  const lib = THREE.ShaderLib.physical, shader = { uniforms: THREE.UniformsUtils.clone(lib.uniforms), vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader };
  material.onBeforeCompile(shader);
  return shader.uniforms;
}
const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b, chroma = (c) => Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
// What the picture shows, read from what is drawn (mesh, surface model, colour,
// turf film), never from the point's own label.
function drawnCategory(mesh) {
  if (mesh.name === 'reef-macroalgae') return 'macroalgae';
  if (mesh.name === 'reef-rock') return 'rock';
  if (mesh.name === 'reef-rubble') return 'rubble';
  if (mesh.name === 'reef-sand') return 'sand';
  if (mesh.name !== 'reef-coral') return 'unknown:' + mesh.name;
  const u = uniformsOf(mesh.material), a = u.reefCoralA.value, b = u.reefCoralB.value, color = mesh.material.color;
  const film = !!mesh.parent.getObjectByName('reef-turf-fuzz');
  if (b.w === 1 && b.z === 0 && a.y === 0 && !film && chroma(color) > 0.08 && lum(color) < 0.4) return 'hard_coral';
  if (b.w === 0 && b.z === 0 && a.y === 0 && !film && lum(color) > 0.8 && chroma(color) < 0.08) return 'bleached_coral';
  if (b.z === 1 && a.y > 0.3 && film && lum(color) < 0.8) return 'recently_dead_coral';
  return 'unknown-coral';
}

describe('hb13 survey 3D: what is drawn under each point', () => {
  it('draws, under every point of one transect per reef, the category the survey scores', () => {
    const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), from = new THREE.Vector3();
    const seen = new Set();
    for (const layout of LAYOUTS) {
      const h = habitatFor(layout), meshes = surveyMeshes(h);
      expect(h.layout.points.length).toBe(40);
      layout.points.forEach((p, i) => {
        // The same layout the survey scores: the habitat's normalized point matches it.
        expect(h.layout.points[i].category, `${layout.siteId} point ${i + 1}`).toBe(p.category);
        let hit = null;
        for (const [ox, oz] of [[0, 0.0013], [0.009, 0.0013], [-0.009, 0.0013], [0, 0.0103], [0, -0.0077]]) {
          from.set(p.distanceM + ox, h.tapeHeight(p.distanceM) + 0.4, oz); ray.set(from, down); ray.far = 4;
          const first = ray.intersectObjects(meshes, false)[0];
          if (first && (!hit || first.point.y > hit.point.y)) hit = first;
        }
        // Thin blades can let a line pass between them: then the point's own seaweed is still right there.
        const mesh = hit ? hit.object : h.surveyObjects[i].getObjectByName('reef-macroalgae');
        expect(mesh, `${layout.siteId} point ${i + 1}: nothing under the line`).toBeTruthy();
        expect(ownerPoint(mesh), `${layout.siteId} point ${i + 1} meets point ${ownerPoint(mesh) + 1}`).toBe(i);
        expect(drawnCategory(mesh), `${layout.siteId} point ${i + 1} (${p.category} ${p.coralForm || ''})`).toBe(p.category);
        seen.add(p.category);
      });
    }
    expect([...seen].sort()).toEqual(['bleached_coral', 'hard_coral', 'macroalgae', 'recently_dead_coral', 'rock', 'rubble', 'sand']);
  });

  it('keeps the cover the survey would measure: one survey object per point, in order, on both tiers', () => {
    for (const layout of LAYOUTS) for (const quality of ['high', 'low']) {
      const h = habitatFor(layout, quality), drawn = {}, truth = {};
      h.surveyObjects.forEach((o, i) => {
        expect(o.userData.surveyPoint).toBe(i);
        expect(o.position.x).toBeCloseTo(layout.points[i].distanceM, 9);
        let mesh = null; o.traverse((m) => { if (!mesh && m.isMesh) mesh = m; });
        const c = drawnCategory(mesh); drawn[c] = (drawn[c] || 0) + 1;
      });
      layout.points.forEach((p) => { truth[p.category] = (truth[p.category] || 0) + 1; });
      expect(drawn, `${layout.siteId} ${quality}`).toEqual(truth);
    }
  });

  it('grows nothing tall in the strip between the diver and the tape', () => {
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    for (const layout of LAYOUTS) for (const quality of ['high', 'low']) {
      const h = habitatFor(layout, quality), tall = [];
      h.root.traverse((o) => {
        if (!o.isInstancedMesh || !/^reef-decor-(sponge|soft|fan)$/.test(o.name)) return;
        for (let k = 0; k < o.count; k++) {
          o.getMatrixAt(k, m); m.decompose(p, q, s);
          if (p.z > 0 && p.z < 1.4 && p.x > -1.5 && p.x < layout.lengthM + 1.5) tall.push(o.name + '@' + p.x.toFixed(2) + ',' + p.z.toFixed(2));
        }
      });
      expect(tall, `${layout.siteId} ${quality}`).toEqual([]);
    }
  });
});

// ---- The default diver view, through the real engine on a stub renderer ----
const cleanups = [];
afterEach(() => { while (cleanups.length) cleanups.pop()(); });
function mountEngine(layout) {
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
  canvas.getBoundingClientRect = () => ({ width: 1100, height: 360 });
  document.body.appendChild(canvas);
  const controller = local.Reef3D.mount(canvas, { THREE: { ...THREE, WebGLRenderer: Renderer }, layout, seed: layout.seed, quality: 'high', reducedMotion: true });
  cleanups.push(() => { try { controller.dispose(); } catch (ignore) {} canvas.remove(); });
  return { controller, get renderer() { return renderer; }, step() { clock += 50; const q = [...frames.values()]; frames.clear(); q.forEach((cb) => cb(clock)); } };
}

describe('hb13 survey 3D: the diver sees the point', () => {
  it('looks at each point with no other survey colony, rock or garden coral standing in front of it', () => {
    const blocked = [], ray = new THREE.Raycaster(), dir = new THREE.Vector3(), aim = new THREE.Vector3();
    for (const layout of LAYOUTS.slice(0, 5)) {
      const t = mountEngine(layout), scene = t.renderer.scene, camera = t.renderer.camera;
      const habitat = scene.getObjectByName('reef-habitat');
      const solids = [];
      habitat.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && !/contact-shade|water-surface|light-shaft|tape|floor/.test(o.name) && !o.isPoints) solids.push(o); });
      layout.points.forEach((p, i) => {
        t.controller.goToPoint(i); t.step();
        const ring = scene.getObjectByName('reef-highlight').children[0];
        camera.updateMatrixWorld(true);
        aim.set(p.distanceM, ring.position.y - 0.012 + 0.02, 0);
        dir.subVectors(aim, camera.position); const far = dir.length(); dir.normalize();
        ray.set(camera.position, dir); ray.far = far - 0.06;
        const hit = ray.intersectObjects(solids, false).find((x) => ownerPoint(x.object) !== i);
        if (hit) blocked.push(`${layout.siteId} point ${i + 1} behind ${hit.object.name}${ownerPoint(hit.object) >= 0 ? ' of point ' + (ownerPoint(hit.object) + 1) : ''}`);
      });
    }
    if (process.env.HB13_PRINT) writeFileSync(process.env.HB13_PRINT, blocked.join('\n'));
    expect(blocked, blocked.join('\n')).toEqual([]);
  });
});
