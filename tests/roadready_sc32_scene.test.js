import { describe, it, expect, beforeAll } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Round 32, lane scene (tag sc32). Road Ready 3D:
// - every drive has a sky rig: hemisphere light, a sun or a moon (by time of day), low clouds, light matched to
//   time of day and weather, and a sun shadow box that follows the car in whole shadow-map texels;
// - an actor's static parts are merged when it is built: a traffic car is a dozen draw calls instead of thirty,
//   with its own paint, and with every lamp and wheel the frame loop drives still found by name.
// The geometry runs on the real three.js r128 the tool loads (vendor/three-r128), and the car tests run the
// tool's OWN builder and frame-loop code, cut out of the source.

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const require = createRequire(import.meta.url);
let THREE, SKY, ACTOR, GFX, LOOK, SOURCE, INIT, UPDATE;
beforeAll(async () => {
  THREE = require(path.resolve(process.cwd(), 'vendor/three-r128/three.min.js'));
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').split(path.sep).join('/'));
  mod.resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  mod.loadTool(TOOL, 'roadReady');
  SKY = window.__RR_TEST_EXPORTS__.roadReadySky;
  ACTOR = window.__RR_TEST_EXPORTS__.roadReadyActor;
  GFX = window.__RR_TEST_EXPORTS__.roadReadyGfx;
  LOOK = window.__RR_TEST_EXPORTS__.roadReadyLook;
  SOURCE = readFileSync(TOOL, 'utf8');
  INIT = SOURCE.slice(SOURCE.indexOf('        function initThreeScene() {'), SOURCE.indexOf('        function updateThreeScene(s3) {'));
  UPDATE = SOURCE.slice(SOURCE.indexOf('        function updateThreeScene(s3) {'));
}, 300000);

const SCN = (id, time, weather) => ({ id, time, weather });
const STREAMED = [SCN('residential', 'day', 'clear'), SCN('suburban', 'day', 'clear'), SCN('highway', 'day', 'clear'), SCN('rural', 'day', 'clear'),
  SCN('night', 'night', 'clear'), SCN('fog', 'day', 'fog'), SCN('rain', 'day', 'rain'), SCN('snow', 'day', 'snow'), SCN('construction', 'day', 'clear'),
  SCN('school_zone', 'day', 'clear'), SCN('downtown', 'day', 'clear'), SCN('dawn', 'night', 'clear')];
const meshes = (root) => { const list = []; root.traverse((o) => { if (o.isMesh) list.push(o); }); return list; };
const triangles = (root) => meshes(root).reduce((n, o) => n + (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3, 0);
// Every triangle corner of every mesh under root, in root's frame (which mesh it is in does not matter).
const cloud = (root) => {
  root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(); const v = new THREE.Vector3(); const rows = [];
  meshes(root).forEach((m) => { const p = m.geometry.attributes.position; const mat = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld); const idx = m.geometry.index;
    const n = idx ? idx.count : p.count; for (let i = 0; i < n; i++) { v.fromBufferAttribute(p, idx ? idx.getX(i) : i).applyMatrix4(mat); rows.push([v.x, v.y, v.z]); } });
  return rows;
};
// How many corners of one cloud have no partner of their own within 0.2 mm in the other (0 = the same shape).
const cloudDiff = (a, b) => {
  const cell = 0.01, key = (x, y, z) => Math.round(x / cell) + ',' + Math.round(y / cell) + ',' + Math.round(z / cell), grid = new Map();
  b.forEach((p) => { const k = key(p[0], p[1], p[2]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p); });
  let unmatched = Math.abs(a.length - b.length);
  for (const p of a) {
    let found = false;
    for (let dx = -1; dx <= 1 && !found; dx++) for (let dy = -1; dy <= 1 && !found; dy++) for (let dz = -1; dz <= 1 && !found; dz++) {
      const list = grid.get(key(p[0] + dx * cell, p[1] + dy * cell, p[2] + dz * cell)); if (!list) continue;
      const at = list.findIndex((q) => Math.abs(q[0] - p[0]) < 2e-4 && Math.abs(q[1] - p[1]) < 2e-4 && Math.abs(q[2] - p[2]) < 2e-4);
      if (at >= 0) { list.splice(at, 1); found = true; }
    }
    if (!found) unmatched++;
  }
  return unmatched;
};
function makeScene(scn, streamed) {
  const scene = new THREE.Scene();
  const ambient = new THREE.AmbientLight(0xffffff, 0.5); scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff5e0, 0.9); sun.position.set(20, 30, 10); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); scene.add(sun);
  const halo = new THREE.Group(); halo.name = 'celestial_halo'; halo.add(new THREE.Mesh(new THREE.CircleGeometry(4, 8), new THREE.MeshBasicMaterial({ color: 0x123456 }))); scene.add(halo);
  const rig = SKY.rrSkyRigBuild(THREE, scene, { sun, ambient, streamed, scenario: scn });
  return { scene, ambient, sun, halo, rig, s3: { scene } };
}

describe('sc32: one table of sky light, by time of day and weather', () => {
  it('the phase comes from the time; the Dawn / Dusk scenario (stored as night) is dawn', () => {
    expect(SKY.rrSkyPhase(SCN('residential', 'day', 'clear'))).toBe('day');
    expect(SKY.rrSkyPhase(SCN('night', 'night', 'clear'))).toBe('night');
    expect(SKY.rrSkyPhase(SCN('dawn', 'night', 'clear'))).toBe('dawn');
    expect(SKY.rrSkyPhase(SCN('suburban', 'dusk', 'clear'))).toBe('dusk');
    expect(SKY.rrSkyPhase(SCN('suburban', 'dawn', 'rain'))).toBe('dawn');
    expect(SKY.rrSkyPhase(null)).toBe('day');
  });
  it('a clear day has a sun, a clear night a moon, dawn a low sun; fog, rain and snow show neither', () => {
    expect(SKY.rrSkyPlan(SCN('residential', 'day', 'clear')).disc).toBe('sun');
    expect(SKY.rrSkyPlan(SCN('night', 'night', 'clear')).disc).toBe('moon');
    expect(SKY.rrSkyPlan(SCN('dawn', 'night', 'clear')).disc).toBe('low_sun');
    for (const time of ['day', 'night', 'dawn', 'dusk']) for (const weather of ['fog', 'rain', 'snow']) {
      const plan = SKY.rrSkyPlan(SCN('suburban', time, weather));
      expect(plan.disc, time + ' ' + weather).toBe(null);
      expect(plan.overcast).toBe(true);
      expect(plan.body).toBe(time === 'night' ? 'moon' : time === 'day' ? 'sun' : 'low_sun'); // the light still has a direction
    }
    expect(SKY.rrSkyPlan(SCN('fog', 'day', 'fog')).clouds).toBe(false);
    expect(SKY.rrSkyPlan(SCN('rain', 'day', 'rain')).clouds).toBe(false);
    expect(SKY.rrSkyPlan(SCN('snow', 'day', 'snow')).clouds).toBe(true);
    expect(SKY.rrSkyPlan(SCN('residential', 'day', 'clear')).clouds).toBe(true);
  });
  it('overcast: a weak sun and more light from the whole sky, so shadows are faint', () => {
    const clear = SKY.rrSkyPlan(SCN('residential', 'day', 'clear'));
    for (const weather of ['fog', 'rain', 'snow']) {
      const plan = SKY.rrSkyPlan(SCN('suburban', 'day', weather));
      // round 35 (Aaron): snow gets a little more sun (0.4) so banks and the road edge have form; still under half a clear day's
      expect(plan.sun.intensity).toBeLessThanOrEqual(clear.sun.intensity * (weather === 'snow' ? 0.45 : 1 / 3) + 1e-9);
      expect(plan.sun.intensity).toBeGreaterThan(0);
      expect(plan.hemi.intensity).toBeGreaterThan(clear.hemi.intensity);
      // the share of light that can be shadowed
      expect(plan.sun.intensity / (plan.sun.intensity + plan.ambient.intensity + plan.hemi.intensity)).toBeLessThan(0.3);
    }
    expect(clear.sun.intensity / (clear.sun.intensity + clear.ambient.intensity + clear.hemi.intensity)).toBeGreaterThan(0.5);
  });
  it('night is as dark as it was: the same ambient and moonlight, and the sky adds next to nothing', () => {
    // base, streamed road at night: ambient 0x1a1a3a at 0.15 and one directional 0x4466aa at 0.3 (no hemisphere light)
    const lum = (hex, k) => { const c = new THREE.Color(hex); return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) * k; };
    const baseNight = lum(0x1a1a3a, 0.15) + lum(0x4466aa, 0.3);
    for (const weather of ['clear', 'fog', 'rain', 'snow']) {
      const plan = SKY.rrSkyPlan(SCN('suburban', 'night', weather));
      expect(plan.ambient).toEqual({ color: 0x1a1a3a, intensity: 0.15 });
      expect(plan.sun.color).toBe(0x4466aa);
      expect(plan.sun.intensity).toBeLessThanOrEqual(0.3);
      // most a surface can get: ambient + moon square on + the brighter half of the hemisphere light
      const most = lum(plan.ambient.color, plan.ambient.intensity) + lum(plan.sun.color, plan.sun.intensity) + Math.max(lum(plan.hemi.sky, plan.hemi.intensity), lum(plan.hemi.ground, plan.hemi.intensity));
      expect(most).toBeLessThan(baseNight * 1.06);
      const day = SKY.rrSkyPlan(SCN('suburban', 'day', weather));
      expect(most).toBeLessThan(0.2 * (lum(day.ambient.color, day.ambient.intensity) + lum(day.sun.color, day.sun.intensity)));
    }
  });
  it('the light comes from where the sun or moon is drawn (the low sun a little higher, for shadows of a sane length)', () => {
    for (const [scn, body] of [[SCN('residential', 'day', 'clear'), 'sun'], [SCN('night', 'night', 'clear'), 'moon']]) {
      const plan = SKY.rrSkyPlan(scn), at = SKY.RR_SKY_BODY[body], len = Math.hypot(at[0], at[1], at[2]);
      plan.direction.forEach((v, i) => expect(v).toBeCloseTo(at[i] / len, 9));
    }
    const dawn = SKY.rrSkyPlan(SCN('dawn', 'night', 'clear')), low = SKY.RR_SKY_BODY.low_sun;
    expect(Math.hypot(...dawn.direction)).toBeCloseTo(1, 9);
    expect(Math.atan2(dawn.direction[2], dawn.direction[0])).toBeCloseTo(Math.atan2(low[2], low[0]), 9); // same compass direction
    const elevation = Math.asin(dawn.direction[1]) * 180 / Math.PI;
    expect(elevation).toBeGreaterThan(10); expect(elevation).toBeLessThan(25);
  });
});

describe('sc32: streamed roads get the sky rig', () => {
  it('rrSkyRigBuild on a streamed road: hemisphere light, three named discs on the travelling anchor, eight one-mesh clouds', () => {
    const { scene, rig } = makeScene(SCN('suburban', 'day', 'clear'), true);
    expect(scene.userData.rrSkyRig).toBe(rig);
    expect(scene.children.filter((c) => c.isHemisphereLight)).toEqual([rig.hemi]);
    expect(rig.anchor.name).toBe('rr_sky_anchor'); expect(rig.anchor.parent).toBe(scene);
    expect(Object.keys(rig.discs).sort()).toEqual(['low_sun', 'moon', 'sun']);
    for (const key of Object.keys(rig.discs)) {
      const disc = rig.discs[key];
      expect(disc.name).toBe('rr_celestial'); expect(disc.parent).toBe(rig.anchor);
      expect(disc.position.toArray()).toEqual(SKY.RR_SKY_BODY[key]);
      // part of the sky: no fog, no depth, drawn after the dome (-30) and before the mountain ring (-20)
      expect(disc.material.fog).toBe(false); expect(disc.material.depthTest).toBe(false); expect(disc.material.depthWrite).toBe(false);
      expect(disc.renderOrder).toBeGreaterThan(-30); expect(disc.renderOrder).toBeLessThan(-20);
      rig.extras[key].forEach((extra) => { expect(extra.material.transparent).toBe(false); expect(extra.material.blending).toBe(THREE.AdditiveBlending); expect(extra.renderOrder).toBeLessThan(-20); expect(extra.renderOrder).toBeGreaterThan(disc.renderOrder); });
    }
    expect(rig.cloudGroup.parent).toBe(scene);
    expect(rig.cloudGroup.children.length).toBe(8);
    rig.cloudGroup.children.forEach((c) => { expect(c.isMesh).toBe(true); expect(c.children.length).toBe(0); expect(c._drift).toBeGreaterThan(0.29); expect(c._drift).toBeLessThan(0.81); expect(c.position.y).toBeGreaterThanOrEqual(25); expect(c.position.y).toBeLessThanOrEqual(35); expect(c.material).toBe(rig.cloudMaterial); });
    expect(triangles(rig.cloudGroup)).toBe([0, 1, 2, 3, 4, 5, 6, 7].reduce((n, i) => n + (3 + (i % 3)) * 80, 0)); // 3 to 5 puffs of 80 triangles each
    // the same sky every time
    const again = makeScene(SCN('suburban', 'day', 'clear'), true).rig;
    expect(again.cloudGroup.children.map((c) => c.position.toArray())).toEqual(rig.cloudGroup.children.map((c) => c.position.toArray()));
  });
  it('a bounded course keeps the sky it already had: the rig only takes over its sun (for the shadow box)', () => {
    const { scene, rig, sun } = makeScene(SCN('roundabout', 'day', 'clear'), false);
    expect(rig.streamed).toBe(false); expect(rig.hemi).toBe(null); expect(rig.anchor).toBe(null); expect(rig.cloudGroup).toBe(null);
    expect(scene.children.some((c) => c.isHemisphereLight)).toBe(false);
    expect(sun.target.parent).toBe(scene);
    const len = Math.hypot(20, 30, 10);
    expect(rig.direction0.map((v) => +v.toFixed(9))).toEqual([20 / len, 30 / len, 10 / len].map((v) => +v.toFixed(9)));
  });
  it('each streamed scenario shows the right disc and gets the planned light (x the passing-cloud factor)', () => {
    for (const scn of STREAMED) {
      const { rig, ambient, sun, s3, halo } = makeScene(scn, true);
      const plan = SKY.rrSkyPlan(scn);
      SKY.rrSkyRigFrame(THREE, s3, scn, { x: 10, y: 0, z: -40, heading: 0.3, dim: 0.97 });
      for (const key of Object.keys(rig.discs)) {
        expect(rig.discs[key].visible, scn.id + ' ' + key).toBe(plan.disc === key);
        rig.extras[key].forEach((extra) => expect(extra.visible).toBe(plan.disc === key));
      }
      expect(Object.keys(rig.discs).filter((key) => rig.discs[key].visible).length).toBe(plan.overcast ? 0 : 1);
      expect(s3._haloSearched).toBe(true);
      expect(s3._haloTarget).toBe(plan.disc ? rig.discs[plan.disc] : null);
      expect(halo.children[0].material.color.getHex()).toBe(plan.haloColor);
      expect(rig.cloudGroup.visible).toBe(plan.clouds);
      expect(rig.cloudMaterial.color.getHex()).toBe(plan.cloudColor);
      expect(ambient.intensity).toBeCloseTo(plan.ambient.intensity * 0.97, 9); expect(ambient.color.getHex()).toBe(plan.ambient.color);
      expect(sun.intensity).toBeCloseTo(plan.sun.intensity * 0.97, 9); expect(sun.color.getHex()).toBe(plan.sun.color);
      expect(rig.hemi.intensity).toBeCloseTo(plan.hemi.intensity * 0.97, 9); expect(rig.hemi.color.getHex()).toBe(plan.hemi.sky); expect(rig.hemi.groundColor.getHex()).toBe(plan.hemi.ground);
    }
  });
  it('Free Explore: day to night to fog mid-drive swaps the disc and the light without a new scene', () => {
    const scn = SCN('suburban', 'day', 'clear');
    const { rig, sun, s3 } = makeScene(scn, true);
    const pose = { x: 0, y: 0, z: 0, heading: 0 };
    SKY.rrSkyRigFrame(THREE, s3, scn, pose);
    expect(rig.discs.sun.visible).toBe(true); expect(rig.discs.moon.visible).toBe(false);
    scn.time = 'night'; SKY.rrSkyRigFrame(THREE, s3, scn, pose);
    expect(rig.discs.sun.visible).toBe(false); expect(rig.discs.moon.visible).toBe(true); expect(sun.color.getHex()).toBe(0x4466aa); expect(s3._haloTarget).toBe(rig.discs.moon);
    scn.weather = 'fog'; SKY.rrSkyRigFrame(THREE, s3, scn, pose);
    expect(rig.discs.moon.visible).toBe(false); expect(s3._haloTarget).toBe(null); expect(rig.cloudGroup.visible).toBe(false);
    scn.time = 'day'; scn.weather = 'clear'; SKY.rrSkyRigFrame(THREE, s3, scn, pose);
    expect(rig.discs.sun.visible).toBe(true); expect(rig.cloudGroup.visible).toBe(true); expect(sun.intensity).toBeCloseTo(SKY.rrSkyPlan(scn).sun.intensity, 9);
  });
  it('the scene set-up makes the rig for every world, outside the block that streamed roads skip; the frame applies it', () => {
    const blockEnd = INIT.indexOf('          } // ── end of scenario-mode road infrastructure block ──');
    const build = INIT.indexOf('rrSkyRigBuild(T, scene, { sun: sun, ambient: ambient, streamed: isStreamedWorldInit, scenario: currentScenario });');
    const nextBlock = INIT.indexOf('          if (!isStreamedWorldInit) {', blockEnd);
    expect(blockEnd).toBeGreaterThan(0); expect(build).toBeGreaterThan(blockEnd); expect(build).toBeLessThan(nextBlock);
    expect(INIT).toContain('if (rrSkyRig.cloudGroup) cloudGroup = rrSkyRig.cloudGroup;'); // the drift loop and the follow line use s3.cloudGroup
    expect(INIT).toContain('cloudGroup: cloudGroup,');
    expect(UPDATE).toContain('rrSkyRigFrame(T, s3, scn, { x: carWorldX, y: roadH, z: carWorldZ, heading: car.heading, dim: cloudShadow });');
    // after the old light loop (which it overrides on streamed roads) and before the frame is drawn
    expect(UPDATE.indexOf('rrSkyRigFrame(T, s3, scn,')).toBeGreaterThan(UPDATE.indexOf('if (child.isHemisphereLight) {'));
    expect(UPDATE.indexOf('rrSkyRigFrame(T, s3, scn,')).toBeLessThan(UPDATE.indexOf('var rrDrawFrame = function() {'));
    // what the rig relies on in the frame: the anchor and the clouds travel with the car, the halo follows _haloTarget
    expect(UPDATE).toContain("if (!s3._skyAnchorRef) s3._skyAnchorRef = s3.scene.getObjectByName('rr_sky_anchor');");
    expect(UPDATE).toContain('if (s3.cloudGroup) s3.cloudGroup.position.set(carWorldX, 0, carWorldZ);');
    expect(UPDATE).toContain('s3._haloRef.visible = !!s3._haloTarget;');
  });
});

describe('sc32: the sun shadow box follows the car', () => {
  const shadowTexel = (sun, point) => {
    sun.shadow.updateMatrices(sun);
    const v = point.clone().project(sun.shadow.camera);
    return [(v.x * 0.5 + 0.5) * sun.shadow.mapSize.x, (v.y * 0.5 + 0.5) * sun.shadow.mapSize.y];
  };
  it('wherever the car is, the box is centred just ahead of it and the light keeps its direction', () => {
    for (const scn of [SCN('rural', 'day', 'clear'), SCN('night', 'night', 'clear'), SCN('dawn', 'night', 'clear'), SCN('fog', 'day', 'fog')]) {
      const { sun, s3, rig } = makeScene(scn, true);
      const plan = SKY.rrSkyPlan(scn);
      for (const [x, y, z, heading] of [[0, 0, 0, 0], [612.4, 3.2, -2480.7, 1.1], [-95.3, -1.4, 7731.9, -2.4]]) {
        SKY.rrSkyRigFrame(THREE, s3, scn, { x, y, z, heading, dim: 1 });
        const ahead = new THREE.Vector3(x + Math.cos(heading) * SKY.RR_SKY_SHADOW.ahead, y, z + Math.sin(heading) * SKY.RR_SKY_SHADOW.ahead);
        expect(sun.target.position.distanceTo(ahead)).toBeLessThan(2 * rig.focus.texel);
        const dir = sun.position.clone().sub(sun.target.position);
        expect(dir.length()).toBeCloseTo(SKY.RR_SKY_SHADOW.reach, 6);
        dir.normalize().toArray().forEach((v, i) => expect(v).toBeCloseTo(plan.direction[i], 9));
        // the car itself and the road 50 m ahead are inside the shadow map
        for (const p of [new THREE.Vector3(x, y, z), new THREE.Vector3(x + Math.cos(heading) * 50, y, z + Math.sin(heading) * 50), new THREE.Vector3(x - Math.cos(heading) * 20, y + 8, z - Math.sin(heading) * 20)]) {
          const ndc = (sun.shadow.updateMatrices(sun), p.clone().project(sun.shadow.camera));
          expect(Math.abs(ndc.x)).toBeLessThan(1); expect(Math.abs(ndc.y)).toBeLessThan(1); expect(Math.abs(ndc.z)).toBeLessThan(1);
        }
      }
      const box = sun.shadow.camera;
      expect([box.left, box.right, box.top, box.bottom]).toEqual([-40, 40, 40, -40]);
      expect(box.far).toBeGreaterThanOrEqual(SKY.RR_SKY_SHADOW.reach + 60);
    }
  });
  it('texel-snapped: a point of the world keeps its place inside a shadow-map texel while the car drives', () => {
    for (const [scn, size] of [[SCN('rural', 'day', 'clear'), 1024], [SCN('suburban', 'day', 'clear'), 512], [SCN('dawn', 'night', 'clear'), 1024]]) {
      const { sun, s3, rig } = makeScene(scn, true);
      sun.shadow.mapSize.set(size, size);
      const tree = new THREE.Vector3(403.137, 2.5, -911.642);
      let first = null, moved = 0, lastTarget = null;
      for (let step = 0; step < 400; step++) {
        const t = step * 0.031; // a bend: 0.03 to 0.5 m a frame
        SKY.rrSkyRigFrame(THREE, s3, scn, { x: 400 + Math.sin(t) * 9 + step * 0.013, y: 1 + Math.sin(t * 0.7) * 0.4, z: -900 - step * 0.045, heading: -1.5 + Math.sin(t) * 0.4, dim: 1 });
        expect(rig.focus.texel).toBeCloseTo(80 / size, 12);
        const at = shadowTexel(sun, tree);
        const frac = [at[0] - Math.floor(at[0]), at[1] - Math.floor(at[1])];
        if (!first) first = frac;
        // same sub-texel place (a tolerance far below a texel; the two ends of [0,1) are neighbours)
        for (const k of [0, 1]) { const d = Math.abs(frac[k] - first[k]); expect(Math.min(d, 1 - d), 'step ' + step).toBeLessThan(1e-3); }
        if (lastTarget && lastTarget.distanceTo(sun.target.position) > 1e-9) moved++;
        lastTarget = sun.target.position.clone();
      }
      expect(moved).toBeGreaterThan(20); // it did follow
    }
  });
  it('without the snap the same drive would slide the point through the texel (the test above can fail)', () => {
    const scn = SCN('rural', 'day', 'clear'); const { sun } = makeScene(scn, true); const plan = SKY.rrSkyPlan(scn);
    const tree = new THREE.Vector3(403.137, 2.5, -911.642); let spread = 0, first = null;
    for (let step = 0; step < 50; step++) {
      const p = new THREE.Vector3(400 + step * 0.013, 1, -900 - step * 0.045);
      sun.target.position.copy(p); sun.position.copy(p).add(new THREE.Vector3(...plan.direction).multiplyScalar(90)); sun.target.updateMatrixWorld(); sun.updateMatrixWorld();
      const at = shadowTexel(sun, tree); const fx = at[0] - Math.floor(at[0]); if (first == null) first = fx; const d = Math.abs(fx - first); spread = Math.max(spread, Math.min(d, 1 - d));
    }
    expect(spread).toBeGreaterThan(0.2);
  });
  it('the graphics table still decides the shadows: soft 1024 at High, basic 512 at Medium, off at Low; drawn once a frame', () => {
    const scn = SCN('suburban', 'day', 'clear');
    const { scene, sun, s3, rig } = makeScene(scn, true);
    const renderer = { ratio: 1, getPixelRatio() { return this.ratio; }, setPixelRatio(v) { this.ratio = v; }, shadowMap: { type: THREE.PCFSoftShadowMap, autoUpdate: false, needsUpdate: false } };
    s3.renderer = renderer;
    const expectRow = (level, cast, mapSize, type) => {
      GFX.rrGfxApplyLevel(s3, THREE, level, 1);
      expect(s3._gfxSun).toBe(sun); // the table finds the rig's sun (the first shadow light of the scene)
      SKY.rrSkyRigFrame(THREE, s3, scn, { x: 50, y: 0, z: 60, heading: 1 });
      expect(sun.castShadow).toBe(cast);
      if (cast) { expect(sun.shadow.mapSize.x).toBe(mapSize); expect(renderer.shadowMap.type).toBe(type); expect(rig.focus.texel).toBeCloseTo(80 / mapSize, 12); }
      expect(renderer.shadowMap.autoUpdate).toBe(false);
    };
    expectRow('high', true, 1024, THREE.PCFSoftShadowMap);
    expectRow('medium', true, 512, THREE.BasicShadowMap);
    expectRow('low', false);
    expectRow('lowest', false);
    expectRow('high', true, 1024, THREE.PCFSoftShadowMap);
    expect(GFX.RR_GFX_LEVELS.high.shadows).toBe('soft'); expect(GFX.RR_GFX_LEVELS.medium.shadows).toBe('basic'); expect(GFX.RR_GFX_LEVELS.low.shadows).toBe('off');
    expect(scene.children.filter((c) => c.isDirectionalLight).length).toBe(1); // no second sun
    expect(INIT).toContain('renderer.shadowMap.autoUpdate = false;');
    const draw = UPDATE.slice(UPDATE.indexOf('          var rrDrawFrame = function() {'), UPDATE.indexOf('          rrDrawFrame();\n          s3._rrRedraw = rrDrawFrame;'));
    expect(draw.split('shadowMap.needsUpdate = true').length).toBe(2);
    expect(UPDATE.split('shadowMap.needsUpdate = true').length).toBe(2);
  });
});

// The tool's own traffic-car builder and lamp loop, cut out of updateThreeScene and run on real three.js.
function carBuilder(merge) {
  const from = SOURCE.indexOf('              // Build a proper low-poly vehicle group\n');
  const to = SOURCE.indexOf('              tGroup.add(cg);\n', from);
  expect(from).toBeGreaterThan(0); expect(to).toBeGreaterThan(from);
  const body = SOURCE.slice(from, to) + '\n return cg;';
  return (t, ti) => new Function('T', 't', 'ti', 'rrBeamConeGeometry', 'rrActorMergeCar', body)(THREE, t, ti || 0, LOOK.rrBeamConeGeometry, merge);
}
function lampLoop() {
  const from = UPDATE.indexOf('              m.children.forEach(function(child) {\n                // Steering pivot Groups');
  const to = UPDATE.indexOf('          // Update pedestrians', from);
  expect(from).toBeGreaterThan(0);
  let body = UPDATE.slice(from, to);
  body = body.slice(0, body.lastIndexOf('              });') + '              });'.length); // the forEach alone, without the builder's closing braces
  return new Function('m', 't', 'ti', 'scn', 'timeRef', 'aiSteerYaw', 'tWheelAngle', 'tBlinkOn', 'isBraking', 'aiBrakeFlick', 'nightLights', body);
}
const CARS = [{ id: 'a', type: 'sedan', color: '#c0392b' }, { id: 'b', type: 'suv', color: '#2563eb' }, { id: 'c', type: 'truck', color: '#f8fafc' }, { id: 'd', type: 'van', color: '#16a34a' }, { id: 'e', type: 'schoolbus', color: '#facc15' }];
const LAMPS = ['rr_fr', 'rr_fl', 'rr_brR', 'rr_brL', 'rr_brHaloR', 'rr_brHaloL', 'rr_chmsl', 'rr_rrBlinkR', 'rr_rrBlinkL', 'rr_revR', 'rr_revL', 'rr_hlCone'];

describe('sc32: a traffic car is merged when it is built', () => {
  it('about half the meshes, the same triangles, every vertex where the builder put it', () => {
    const plainCar = carBuilder(() => {}), mergedCar = carBuilder((T, cg) => ACTOR.rrActorMergeCar(T, cg));
    for (const t of CARS) {
      const before = plainCar(t), after = mergedCar(t);
      expect(triangles(after), t.type).toBe(triangles(before));
      expect(cloudDiff(cloud(before), cloud(after)), t.type).toBe(0);
      expect(cloudDiff(cloud(before), cloud(plainCar(CARS[(CARS.indexOf(t) + 1) % CARS.length])))).toBeGreaterThan(100); // the measure can tell two cars apart
      // sedan: body+cabin, glass, tyre shadows, 3 wheel meshes, headlights, cone, brake lights, halos, third brake light, 2 turn signals, reverse lights
      // (the bus has no glass to merge and keeps its stop arm, stripe and two roof flashers)
      expect([meshes(before).length, meshes(after).length], t.type).toEqual({ sedan: [30, 14], suv: [30, 14], truck: [29, 14], van: [27, 14], schoolbus: [30, 17] }[t.type]);
    }
  });
  it('each car keeps its own paint: the body is vertex-coloured with that car\'s colour', () => {
    const mergedCar = carBuilder((T, cg) => ACTOR.rrActorMergeCar(T, cg));
    const paints = CARS.map((t) => {
      const car = mergedCar(t);
      const body = car.children.find((c) => c.isMesh && c.castShadow); // the body cast a shadow; the merged body still does
      expect(body, t.type).toBeTruthy();
      expect(car.children.indexOf(body)).toBe(0);
      // a pickup has no cabin box to merge with: its body is as built
      if (t.type === 'truck') { expect(body.userData.rrActorBatch).toBeUndefined(); expect(body.material.color.getHex()).toBe(new THREE.Color(t.color).getHex()); return body.material; }
      expect(body.userData.rrActorBatch.parts).toBe(2);
      expect(body.material.vertexColors).toBe(true); expect(body.material.color.getHex()).toBe(0xffffff);
      const col = body.geometry.attributes.color, want = new THREE.Color(t.color);
      let painted = 0; for (let i = 0; i < col.count; i++) if (Math.abs(col.getX(i) - want.r) < 1e-6 && Math.abs(col.getY(i) - want.g) < 1e-6 && Math.abs(col.getZ(i) - want.b) < 1e-6) painted++;
      expect(painted).toBeGreaterThanOrEqual(24); // at least the body box
      if (t.type !== 'schoolbus') expect(painted).toBe(col.count); // body and cabin: all paint
      return body.material;
    });
    expect(new Set(paints).size).toBe(CARS.length); // no material shared between cars
    // glass and tyre shadows stay see-through, in one mesh each
    const sedan = mergedCar(CARS[0]);
    const seeThrough = sedan.children.filter((c) => c.isMesh && c.userData.rrActorBatch && c.material.transparent);
    expect(seeThrough.map((c) => c.userData.rrActorBatch.parts).sort()).toEqual([4, 4]);
    expect(seeThrough.map((c) => c.material.opacity).sort()).toEqual([0.4, 0.55]);
  });
  it('every lamp is still found by its name, and wheels by theirs', () => {
    const mergedCar = carBuilder((T, cg) => ACTOR.rrActorMergeCar(T, cg));
    for (const t of CARS) {
      const car = mergedCar(t);
      for (const name of LAMPS) { const lamp = ACTOR.rrActorLamp(car, name); expect(lamp, t.type + ' ' + name).toBeTruthy(); expect(lamp.isMesh).toBe(true); expect(lamp.parent).toBe(car); }
      if (t.type === 'schoolbus') for (const name of ['rr_busStopArm', 'rr_busFlashF', 'rr_busFlashR']) expect(car.children.filter((c) => c.name === name).length).toBe(1);
      // pairs that are always lit together share a mesh under the first name; turn signals stay left and right
      for (const [a, b] of ACTOR.RR_ACTOR_LAMP_PAIRS) { expect(ACTOR.rrActorLamp(car, a)).toBe(ACTOR.rrActorLamp(car, b)); expect(ACTOR.rrActorLamp(car, a).name).toBe(a); }
      expect(ACTOR.rrActorLamp(car, 'rr_rrBlinkL')).not.toBe(ACTOR.rrActorLamp(car, 'rr_rrBlinkR'));
      expect(ACTOR.rrActorLamp(car, 'nothing')).toBe(null);
      const fronts = car.children.filter((c) => c.name === 'rr_aiWheelPivotF'), rears = car.children.filter((c) => c.name === 'rr_aiWheelPivotR');
      expect(fronts.length).toBe(2); expect(rears.length).toBe(1); // two steering wheels, one rear axle
      expect(rears[0].position.z).toBe(0);
      fronts.concat(rears).forEach((pivot) => { expect(pivot.children.length).toBe(1); expect(pivot.children[0].name).toBe('rr_aiWheel'); expect(pivot.children[0].material.vertexColors).toBe(true); });
      expect(car.userData.rrTrafficId).toBe(t.id);
    }
  });
  it('the frame loop drives the merged car exactly as it drives the unmerged one (steer, spin, brake, signal, night)', () => {
    const plainCar = carBuilder(() => {}), mergedCar = carBuilder((T, cg) => ACTOR.rrActorMergeCar(T, cg)), loop = lampLoop();
    const shown = (car) => { const rows = []; car.updateMatrixWorld(true); car.traverseVisible((o) => { if (o.isMesh && !o.userData.rrActorBatch && o.name && !/Wheel|Hub/.test(o.name)) rows.push([o.name, o.material.color.getHex(), +o.material.opacity.toFixed(4)].join(':')); }); return rows; };
    const states = [
      { scn: SCN('residential', 'day', 'clear'), braking: false, blinker: 0, steer: 0, spin: 0, speed: 8 },
      { scn: SCN('night', 'night', 'clear'), braking: true, blinker: -1, steer: 0.4, spin: 1.3, speed: 5 },
      { scn: SCN('fog', 'day', 'fog'), braking: true, blinker: 1, steer: -0.6, spin: 7.7, speed: -1 },
      { scn: SCN('rain', 'day', 'rain'), braking: false, blinker: 1, steer: 0.2, spin: 100.25, speed: 12 }
    ];
    for (const t of CARS) for (const st of states) {
      const sim = Object.assign({}, t, { blinker: st.blinker, speed: st.speed, _stopArmActive: st.braking });
      const before = plainCar(t), after = mergedCar(t);
      for (const car of [before, after]) loop(car, sim, 0, st.scn, { current: 3.1 }, st.steer, st.spin, true, st.braking, 1, st.scn.time === 'night' || st.scn.weather === 'fog');
      // wheels turned and spun: every vertex of the car is where the unmerged car has it
      expect(cloudDiff(cloud(before), cloud(after)), t.type + ' ' + st.scn.id).toBe(0);
      // the same lamps show the same colour and strength (a pair stands for both of its lamps)
      const want = shown(before).filter((row) => +row.split(':')[2] > 0), got = shown(after);
      const pairSecond = ACTOR.RR_ACTOR_LAMP_PAIRS.map((p) => p[1]);
      expect(got.sort()).toEqual(want.filter((row) => pairSecond.indexOf(row.split(':')[0]) < 0).sort());
      for (const [a, b] of ACTOR.RR_ACTOR_LAMP_PAIRS) { const ra = want.find((r) => r.split(':')[0] === a), rb = want.find((r) => r.split(':')[0] === b); expect(!!ra).toBe(!!rb); if (ra) expect(ra.split(':').slice(1)).toEqual(rb.split(':').slice(1)); }
      // by day no beam cone and no brake halo is drawn at all
      const drawn = []; after.traverseVisible((o) => { if (o.isMesh) drawn.push(o.name); });
      if (st.scn.time !== 'night' && st.scn.weather !== 'fog') { expect(drawn).not.toContain('rr_hlCone'); expect(drawn).not.toContain('rr_brHaloR'); expect(drawn.length).toBeLessThanOrEqual(meshes(before).length / 2); expect(drawn.length).toBe(t.type === 'schoolbus' ? 15 : 12); }
      if (st.braking && (st.scn.time === 'night' || st.scn.weather === 'fog')) { expect(drawn).toContain('rr_hlCone'); expect(drawn).toContain('rr_brHaloR'); }
    }
  });
  it('dropping a car frees the merged geometry and materials (the tool\'s own dispose helper)', () => {
    const from = UPDATE.indexOf('          var _disposeNode = function(node) {'), to = UPDATE.indexOf('          // Update traffic vehicles', from);
    const dispose = new Function(UPDATE.slice(from, to) + '\n return _disposeNode;')();
    const car = carBuilder((T, cg) => ACTOR.rrActorMergeCar(T, cg))(CARS[0]);
    const geometries = new Set(), materials = new Set(), freedG = new Set(), freedM = new Set();
    meshes(car).forEach((m) => { geometries.add(m.geometry); materials.add(m.material); });
    geometries.forEach((g) => g.addEventListener('dispose', () => freedG.add(g))); materials.forEach((m) => m.addEventListener('dispose', () => freedM.add(m)));
    const merged = meshes(car).filter((m) => m.userData.rrActorBatch);
    expect(merged.length).toBe(6); // body, glass, tyre shadows, 3 wheel meshes
    dispose(car);
    expect(freedG.size).toBe(geometries.size); expect(freedM.size).toBe(materials.size); expect(geometries.size).toBe(14);
  });
  it('the builders call the merge before the actor is shown; collision never reads these meshes', () => {
    expect(UPDATE).toContain('              rrActorMergeCar(T, cg); // body, glass, tyre shadows, 3 wheel meshes, paired lamps\n              tGroup.add(cg);');
    expect(UPDATE).toContain('              rrActorMerge(T, cg); // bike and rider never move apart: one mesh (+ the unlit vest or lamp)\n              cg.castShadow = true;\n              cGroup.add(cg);');
    expect(UPDATE).toContain('                rrActorMerge(T, hazardVehicleGroup); // the flashers are held in userData and stay\n                wGroup.add(hazardVehicleGroup);');
    expect(UPDATE).toContain('              rrActorMerge(T, eGrp, { protect: [emPods] }); // light pods and glows change every frame\n              eGroup.add(eGrp);');
    expect(SOURCE).not.toMatch(/Raycaster|intersectObjects?\(/);
  });
});

describe('sc32: rrActorMerge leaves alone what the frame loop changes', () => {
  const lambert = (hex, extra) => new THREE.MeshLambertMaterial(Object.assign({ color: hex }, extra || {}));
  const basic = (hex, extra) => new THREE.MeshBasicMaterial(Object.assign({ color: hex }, extra || {}));
  const box = (material, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 0.25), material); m.position.set(x || 0, y || 0, z || 0); return m; };
  it('named, hidden, flagged, textured, vertex-coloured, registry-held parts and parts with children stay; the rest merge by kind', () => {
    const group = new THREE.Group(); const keep = {};
    const body = box(lambert(0xcc0000), 0, 1, 0); body.castShadow = true; group.add(body);
    group.add(box(lambert(0x00cc00), 1, 1, 0)); const turned = box(lambert(0x0000cc), 2, 1, 0); turned.rotation.set(0.3, 0.7, -0.2); turned.scale.set(1, 2, 0.5); group.add(turned);
    group.add(box(basic(0xffffff), 0, 2, 0)); group.add(box(basic(0x111111), 1, 2, 0));
    group.add(box(basic(0x4488aa, { transparent: true, opacity: 0.4 }), 0, 3, 0)); group.add(box(basic(0x4488aa, { transparent: true, opacity: 0.4 }), 1, 3, 0));
    keep.otherGlass = box(basic(0x4488aa, { transparent: true, opacity: 0.7 }), 2, 3, 0); group.add(keep.otherGlass); // not equally see-through: alone in its kind
    keep.named = box(lambert(0xff8800), 0, 4, 0); keep.named.name = 'rr_rrBlinkL'; group.add(keep.named);
    keep.hidden = box(lambert(0xff8800), 1, 4, 0); keep.hidden.visible = false; group.add(keep.hidden);
    keep.flagged = box(lambert(0xff8800), 2, 4, 0); keep.flagged._phase = 2; group.add(keep.flagged);
    keep.tagged = box(lambert(0xff8800), 3, 4, 0); keep.tagged.userData.kind = 'pod'; group.add(keep.tagged);
    keep.textured = box(basic(0xffffff, { map: new THREE.Texture() }), 4, 4, 0); group.add(keep.textured);
    keep.coloured = box(lambert(0xffffff, { vertexColors: true }), 5, 4, 0); group.add(keep.coloured);
    keep.parent = box(lambert(0x333333), 6, 4, 0); keep.parent.add(box(lambert(0x333333))); group.add(keep.parent);
    const flasherMaterial = basic(0x4a0000); keep.flasher = box(flasherMaterial, 0, 5, 0); group.add(keep.flasher); group.userData.rrHazardFlashers = [{ material: flasherMaterial, phase: 0, color: 0xff1f1f }];
    const podMaterial = basic(0x222222); keep.pod = box(podMaterial, 1, 5, 0); group.add(keep.pod); keep.glow = box(basic(0xff0000), 2, 5, 0); group.add(keep.glow);
    const wheels = new THREE.Group(); wheels.name = 'rr_aiWheelPivotF'; keep.wheel = box(lambert(0x0c0c0c)); wheels.add(keep.wheel); group.add(wheels);
    const total = triangles(group), points = cloud(group);
    const stats = ACTOR.rrActorMerge(THREE, group, { protect: [[{ mat: podMaterial, glow: keep.glow, idx: 0 }]] });
    expect(stats).toEqual({ parts: 7, batches: 3, triangles: 7 * 12 });
    expect(triangles(group)).toBe(total); expect(cloudDiff(points, cloud(group))).toBe(0);
    for (const key of Object.keys(keep)) { expect(keep[key].parent, key).toBeTruthy(); expect(keep[key].userData.rrActorBatch).toBeUndefined(); }
    const merged = group.children.filter((c) => c.userData.rrActorBatch);
    expect(merged.map((m) => m.userData.rrActorBatch.parts)).toEqual([3, 2, 2]);
    expect(group.children[0]).toBe(merged[0]); // the merged body takes the body's place
    expect(merged[0].castShadow).toBe(true); expect(merged[1].castShadow).toBe(false);
    expect(merged[2].material.transparent).toBe(true); expect(merged[2].material.opacity).toBe(0.4);
    // each part's colour is on its vertices
    const col = merged[0].geometry.attributes.color; const seen = new Set(); for (let i = 0; i < col.count; i++) seen.add(new THREE.Color(col.getX(i), col.getY(i), col.getZ(i)).getHex());
    expect([...seen].sort()).toEqual([0x0000cc, 0x00cc00, 0xcc0000].sort());
    // a second call finds nothing more to do
    expect(ACTOR.rrActorMerge(THREE, group, { protect: [[{ mat: podMaterial, glow: keep.glow }]] }).batches).toBe(0);
  });
  it('rrActorFuseWheels gives up, and changes nothing, when the wheels are not the builder\'s wheels', () => {
    const car = new THREE.Group();
    const pivot = (name, x, z, extra) => { const p = new THREE.Group(); p.name = name; p.position.set(x, 0.24, z); const w = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.13, 14), lambert(0x0c0c0c)); w.rotation.x = Math.PI / 2; w.name = 'rr_aiWheel'; p.add(w); const h = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.134, 12), lambert(0x909096)); h.rotation.x = Math.PI / 2; h.name = 'rr_aiHub'; p.add(h); if (extra) extra(p, w, h); car.add(p); return p; };
    pivot('rr_aiWheelPivotF', 0.5, 0.4, (p, w, h) => { h.position.y = 0.05; });              // a hub off the axle: left as it is
    pivot('rr_aiWheelPivotF', 0.5, -0.4, (p) => { p.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), lambert(0xff0000))); }); // a stranger on the pivot
    pivot('rr_aiWheelPivotR', -0.5, 0.4); pivot('rr_aiWheelPivotR', -0.6, -0.4);              // not one axle: fused one by one
    const points = cloud(car);
    expect(ACTOR.rrActorFuseWheels(THREE, car, 'rr_aiWheelPivotF', 'rr_aiWheelPivotR')).toBe(4);
    expect(cloudDiff(points, cloud(car))).toBe(0);
    expect(car.children.filter((c) => c.name === 'rr_aiWheelPivotF').map((p) => p.children.length)).toEqual([2, 3]);
    expect(car.children.filter((c) => c.name === 'rr_aiWheelPivotR').map((p) => p.children.length)).toEqual([1, 1]);
  });
  it('lamps are paired only when they look the same', () => {
    const car = new THREE.Group();
    const lamp = (name, hex, opacity, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.22), basic(hex, { transparent: true, opacity })); m.position.set(-0.8, 0.5, z); m.name = name; car.add(m); return m; };
    lamp('rr_brR', 0xcc0000, 0.55, 0.33); lamp('rr_brL', 0xcc0000, 0.55, -0.33);
    lamp('rr_revR', 0xeeeeee, 0.15, 0.15); lamp('rr_revL', 0xeeeeee, 0.3, -0.15); // not the same: stay two
    lamp('rr_fr', 0xffffee, 0.25, 0.3);                                            // no partner
    const points = cloud(car);
    expect(ACTOR.rrActorPairLamps(THREE, car, ACTOR.RR_ACTOR_LAMP_PAIRS)).toBe(1);
    expect(cloudDiff(points, cloud(car))).toBe(0);
    expect(car.children.map((c) => c.name)).toEqual(['rr_brR', 'rr_revR', 'rr_revL', 'rr_fr']);
    expect(ACTOR.rrActorLamp(car, 'rr_brL').name).toBe('rr_brR');
    expect(ACTOR.rrActorLamp(car, 'rr_brR').geometry.attributes.color).toBeUndefined(); // the pair's colour is the material's: the loop sets it
    expect(ACTOR.rrActorLamp(car, 'rr_revL').name).toBe('rr_revL');
    expect(ACTOR.rrActorLamp(car, 'rr_fl')).toBe(null);
  });
});
