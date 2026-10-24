import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

// Building all five real transects at both tiers takes several seconds on a busy machine.
vi.setConfig({ testTimeout: 60000 });

// Lane F2: the survey 3D view tells the truth at every plumb line, on the
// tool's real transects. REEF3D_HABITAT_SOURCE / CORALREEF_SOURCE let a
// mutation check point the suite at scratch copies.
// Tests run from the repo root (like every 'stem_lab/...' path in this suite).
const REPO = process.cwd().split(String.fromCharCode(92)).join('/');
const THREE = createRequire(import.meta.url)(REPO + '/vendor/three-r128/three.min.js');
const HABITAT = process.env.REEF3D_HABITAT_SOURCE || REPO + '/stem_lab/reef_3d_habitat.js';
const TOOL = process.env.CORALREEF_SOURCE || REPO + '/stem_lab/stem_tool_coralreef.js';
const habitatWindow = { console: { warn() {}, error() {} } };
new Function('window', readFileSync(HABITAT, 'utf8'))(habitatWindow);
const Habitat = habitatWindow.Reef3DHabitat;
const toolWindow = { StemLab: { isRegistered: () => false, registerTool: () => {} }, __RR_TEST_EXPORTS__: {} };
vm.runInNewContext(readFileSync(TOOL, 'utf8'), { window: toolWindow, Math, Object, JSON, Array, Number, String, Date, URL });
const X = toolWindow.__RR_TEST_EXPORTS__.coralReef;
const LAYOUTS = X.SITES.map((site) => X.buildTransect(site, site.seed));
const isCoral = (c) => c.endsWith('_coral');
const built = new Map();
function habitatFor(layout, quality = 'high', seed = layout.seed) {
  const key = layout.siteId + quality + seed;
  if (!built.has(key)) { const h = Habitat.create(THREE, { layout, seed, quality }); h.root.updateMatrixWorld(true); built.set(key, h); }
  return built.get(key);
}
function surveyMeshes(h) { const out = []; h.surveyObjects.forEach((o) => o.traverse((m) => { if (m.isMesh) out.push(m); })); return out; }
function ownerPoint(object) { let o = object; while (o && !(o.userData && typeof o.userData.surveyPoint === 'number')) o = o.parent; return o ? o.userData.surveyPoint : -1; }
function geometryKey(h) {
  return h.surveyObjects.map((o) => { const parts = []; o.traverse((m) => { if (m.geometry) parts.push(m.name, m.geometry.attributes.position.count, Array.from(m.geometry.attributes.position.array.slice(0, 600), (v) => v.toFixed(5)).join(',')); }); return parts.join(';'); }).join('|');
}

describe('Survey 3D: what lies under each plumb line', () => {
  it('meets the point\'s own bottom first at every point of all five sites (no neighbouring colony in the way)', () => {
    const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), from = new THREE.Vector3();
    for (const layout of LAYOUTS) {
      const h = habitatFor(layout), meshes = surveyMeshes(h);
      layout.points.forEach((p, i) => {
        // A plumb line and its weight are about 2 cm across: the highest surface under any part of it.
        let hit = null;
        for (const [ox, oz] of [[0, 0.0013], [0.009, 0.0013], [-0.009, 0.0013], [0, 0.0103], [0, -0.0077]]) {
          from.set(p.distanceM + ox, h.tapeHeight(p.distanceM) + 0.4, oz); ray.set(from, down); ray.far = 4;
          const first = ray.intersectObjects(meshes, false)[0];
          if (first && (!hit || first.point.y > hit.point.y)) hit = first;
        }
        if (!hit) { expect(p.category, `${layout.siteId} point ${i + 1}: nothing under the line`).toBe('macroalgae'); return; }
        expect(ownerPoint(hit.object), `${layout.siteId} point ${i + 1} (${p.category}) meets point ${ownerPoint(hit.object) + 1}`).toBe(i);
        expect(hit.object.name, `${layout.siteId} point ${i + 1}`).toBe(isCoral(p.category) ? 'reef-coral' : { macroalgae: 'reef-macroalgae', rock: 'reef-rock', rubble: 'reef-rubble', sand: 'reef-sand' }[p.category]);
        expect(h.contactHeight(i), `${layout.siteId} point ${i + 1} contact`).toBeCloseTo(Math.max(hit.point.y, h.floorHeight(p.distanceM, 0)), 6);
      });
    }
  });

  it('puts the plumb contact at a height that fits each bottom type and coral form', () => {
    const seen = new Set();
    for (const layout of LAYOUTS) {
      const h = habitatFor(layout);
      layout.points.forEach((p, i) => {
        const above = h.contactHeight(i) - h.floorHeight(p.distanceM, 0), id = `${layout.siteId} point ${i + 1} ${p.category} ${p.coralForm || ''}`;
        seen.add(isCoral(p.category) ? p.coralForm : p.category);
        expect(h.contactHeight(i), id).toBeLessThanOrEqual(h.tapeHeight(p.distanceM) + 1e-9);
        if (p.category === 'sand') expect(above, id).toBeLessThan(0.012);
        else if (p.category === 'rock' || p.category === 'rubble') { expect(above, id).toBeGreaterThan(0.01); expect(above, id).toBeLessThan(0.09); }
        else if (p.category === 'macroalgae') expect(above, id).toBeGreaterThan(0.04);
        else if (p.coralForm === 'encrusting') { expect(above, id).toBeGreaterThan(0.01); expect(above, id).toBeLessThan(0.1); }
        else expect(above, id).toBeGreaterThan(0.09);
      });
    }
    // The five sites between them show every form and bottom type.
    expect([...seen].sort()).toEqual(['branching', 'encrusting', 'macroalgae', 'massive', 'plate', 'rock', 'rubble', 'sand']);
  });

  it('grows one colony across neighbouring points: one look, overlapping pieces, and a gap to the next colony', () => {
    let joins = 0;
    for (const layout of LAYOUTS) {
      const h = habitatFor(layout), box = new THREE.Box3(), next = new THREE.Box3();
      layout.points.forEach((p, i) => {
        const q = layout.points[i + 1];
        if (!q || !isCoral(p.category)) return;
        const a = h.surveyObjects[i].getObjectByName('reef-coral'), b = h.surveyObjects[i + 1].getObjectByName('reef-coral');
        box.setFromObject(a);
        const same = q.colony === p.colony && q.category === p.category && q.coralForm === p.coralForm;
        if (same) {
          joins++;
          next.setFromObject(b);
          expect(b.material, `${layout.siteId} points ${i + 1}-${i + 2} share the colony's look`).toBe(a.material);
          expect(box.max.x, `${layout.siteId} points ${i + 1}-${i + 2} pieces meet`).toBeGreaterThan(next.min.x + 0.05);
        } else {
          // An open side stays inside the point's own half-metre stretch along the tape.
          expect(box.max.x, `${layout.siteId} point ${i + 1} ends before point ${i + 2}`).toBeLessThan((p.distanceM + q.distanceM) / 2 + 0.06);
        }
      });
    }
    expect(joins).toBeGreaterThan(10);
  });

  it('lays sand under sand points and reef pavement under rock points', () => {
    for (const layout of LAYOUTS) {
      const h = habitatFor(layout), floor = h.root.getObjectByName('reef-floor').geometry, pos = floor.attributes.position, ground = floor.attributes.reefGround;
      layout.points.forEach((p, i) => {
        if (p.category !== 'sand' && p.category !== 'rock') return;
        let best = -1, bestD = Infinity;
        for (let k = 0; k < pos.count; k++) { const d = Math.hypot(pos.getX(k) - p.distanceM, pos.getZ(k)); if (d < bestD) { bestD = d; best = k; } }
        if (p.category === 'sand') expect(ground.getX(best), `${layout.siteId} point ${i + 1} sand`).toBeGreaterThan(0.6);
        else expect(ground.getX(best), `${layout.siteId} point ${i + 1} rock`).toBeLessThan(0.25);
      });
    }
  });
});

describe('Survey 3D: the reef around the tape', () => {
  it('keeps every decorative colony off the tape and grows no giant flat slabs', () => {
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    for (const layout of LAYOUTS) for (const quality of ['high', 'low']) {
      const h = habitatFor(layout, quality);
      h.root.traverse((o) => {
        if (!o.isInstancedMesh || !o.name.startsWith('reef-decor-') || o.name === 'reef-decor-bommie') return;
        const pa = o.geometry.attributes.position; let reach = 0;
        for (let k = 0; k < pa.count; k++) reach = Math.max(reach, Math.hypot(pa.getX(k), pa.getZ(k)));
        for (let k = 0; k < o.count; k++) {
          o.getMatrixAt(k, m); m.decompose(p, q, s);
          const r = reach * Math.max(s.x, s.z);
          expect(Math.abs(p.z) - r, `${layout.siteId} ${quality} ${o.name} at ${p.x.toFixed(2)},${p.z.toFixed(2)} reaches the tape`).toBeGreaterThan(0.12);
          if (/encrusting|plate/.test(o.name)) expect(r, `${layout.siteId} ${o.name} radius`).toBeLessThan(0.95);
        }
      });
    }
  });

  it('builds the same survey objects for every seed and tier, and the same reef for the same seed', () => {
    for (const layout of LAYOUTS) {
      const a = habitatFor(layout, 'high'), b = habitatFor(layout, 'low'), c = habitatFor(layout, 'high', 99);
      expect(geometryKey(a) === geometryKey(b), `${layout.siteId} tier`).toBe(true);
      expect(geometryKey(a) === geometryKey(c), `${layout.siteId} seed`).toBe(true);
    }
    const layout = LAYOUTS[0], one = Habitat.create(THREE, { layout, seed: 5 }), two = Habitat.create(THREE, { layout, seed: 5 });
    const decor = (h) => { const out = []; h.root.traverse((o) => { if (o.isInstancedMesh) out.push(o.name, Array.from(o.instanceMatrix.array, (v) => v.toFixed(5)).join(',')); }); return out.join('|'); };
    expect(decor(one) === decor(two)).toBe(true);
    one.dispose(); two.dispose();
  });

  it('crowds the healthy reserve with more coral colonies than the rubble field', () => {
    const corals = (h) => { let n = 0; h.root.traverse((o) => { if (o.isInstancedMesh && /reef-decor-(finger|antler|corymbose|massive|plate|encrusting|soft)/.test(o.name)) n += o.count; }); return n; };
    const reserve = habitatFor(LAYOUTS.find((l) => l.siteId === 'reserve')), rubble = habitatFor(LAYOUTS.find((l) => l.siteId === 'rubble'));
    expect(corals(reserve)).toBeGreaterThan(corals(rubble) * 1.8);
  });
});

describe('Survey 3D: one ocean with the dive', () => {
  function compiled(material) {
    const lib = material.isMeshStandardMaterial ? THREE.ShaderLib.physical : THREE.ShaderLib.basic;
    const shader = { uniforms: THREE.UniformsUtils.clone(lib.uniforms), vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader };
    material.onBeforeCompile(shader);
    return shader;
  }
  it('mixes the water column into every lit habitat material and drops output-space fog', () => {
    const h = habitatFor(LAYOUTS[1]), seen = new Set();
    h.root.traverse((o) => {
      const mat = o.material;
      if (!mat || !mat.isMeshStandardMaterial || seen.has(mat)) return;
      seen.add(mat);
      const shader = compiled(mat);
      expect(shader.fragmentShader.includes('reefWaterExtinction'), `${o.name} water column`).toBe(true);
      expect(shader.fragmentShader.includes('#include <fog_fragment>'), `${o.name} fog removed`).toBe(false);
      expect(shader.uniforms.reefWaterEye.value, `${o.name} shares the eye`).toBe(h.water.eye.value);
    });
    expect(seen.size).toBeGreaterThan(8);
  });
  it('puts another module\'s material (the engine\'s fish) in the same water', () => {
    const h = habitatFor(LAYOUTS[1]), fish = new THREE.MeshStandardMaterial();
    let ownPatch = 0;
    fish.onBeforeCompile = () => { ownPatch++; }; fish.customProgramCacheKey = () => 'reef3d-fish-snapper-v3|d';
    h.immerse(fish);
    const shader = compiled(fish);
    expect(ownPatch).toBe(1);
    expect(shader.fragmentShader.includes('reefWaterExtinction')).toBe(true);
    expect(fish.customProgramCacheKey().startsWith('reef3d-fish-snapper-v3|d|reef3d-')).toBe(true);
    h.setWater({ extinction: new THREE.Vector3(0.1, 0.2, 0.3) });
    expect(shader.uniforms.reefWaterExtinction.value.toArray()).toEqual([0.1, 0.2, 0.3]);
  });
});
