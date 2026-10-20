// The dive's scene draws in fewer calls with nothing visible changed.
// Every check works inside one build of the engine under test (no second engine copy):
// the diver is five meshes and its posed legs follow their rig nodes rigidly; the high tier
// rock chunks hold exactly the hidden whole rock's triangles, whole bommies only; and a high
// tier animal casts a shadow only if its radius is over 0.35 m and it can reach the shadow map.
import { afterEach, describe, expect, it } from 'vitest';
import { THREE, runtime, site, cleanup } from './helpers/reef_dive_harness.js';

afterEach(() => cleanup());

const diverOf = (t) => t.scene.getObjectByName('reef-explore-diver');
const meshesOf = (root) => { const out = []; root.traverse((o) => { if (o.isMesh) out.push(o); }); return out; };
const DIVER_MESHES = ['reef-explore-diver-body', 'reef-explore-diver-equipment', 'reef-explore-diver-fin-left', 'reef-explore-diver-fin-right', 'reef-explore-diver-mask-lenses'];

describe('the diver draws in five calls', () => {
  it('is five meshes (four casting on the high tier, none on the light tier) with every rig part in place', () => {
    for (const quality of ['high', 'low']) {
      const t = runtime({ quality }), diver = diverOf(t), meshes = meshesOf(diver);
      expect(meshes.map((o) => o.name).sort(), quality).toEqual(DIVER_MESHES);
      expect(meshes.filter((o) => o.castShadow).map((o) => o.name).sort(), quality + ' casters').toEqual(quality === 'high' ? DIVER_MESHES.filter((n) => !/lenses/.test(n)) : []);
      for (const side of ['left', 'right']) for (const part of ['hip', 'knee', 'ankle', 'fin']) expect(t.scene.getObjectByName(`reef-explore-diver-${part}-${side}`), `${quality} ${part} ${side}`).toBeTruthy();
      // The thighs and shins stay in the rig as plain nodes under their joints.
      const nodes = []; diver.traverse((o) => { if (/diver-(thigh|shin)$/.test(o.name)) nodes.push(`${o.name.slice(19)}<${o.parent.name.slice(19)}:${o.isMesh ? 'mesh' : 'node'}`); });
      expect(nodes.sort()).toEqual(['shin<knee-left:node', 'shin<knee-right:node', 'thigh<hip-left:node', 'thigh<hip-right:node']);
    }
  });

  // The body mesh in body space, and each candidate owner's matrix in body space: the body
  // itself (identity) and the four thigh and shin nodes, from the scene graph's world matrices.
  function sample(t) {
    const diver = diverOf(t), body = t.scene.getObjectByName('reef-explore-diver-body');
    diver.updateMatrixWorld(true);
    const inv = body.matrixWorld.clone().invert(), nodes = [];
    diver.traverse((o) => { if (/diver-(thigh|shin)$/.test(o.name)) nodes.push(o); });
    const mats = [new THREE.Matrix4()].concat(nodes.map((n) => new THREE.Matrix4().multiplyMatrices(inv, n.matrixWorld)));
    const g = body.geometry;
    return { mats, P: Float64Array.from(g.attributes.position.array), N: Float64Array.from(g.attributes.normal.array), index: g.index.array };
  }

  it('moves every body vertex rigidly with one owner (the body or one thigh or shin node), swimming, turning and paused', () => {
    for (const reducedMotion of [false, true]) {
      const t = runtime({ quality: 'high', reducedMotion });
      t.controller.setInput({ forward: 1, turn: 0.3 }); t.run(0.6);
      const A = sample(t), nV = A.P.length / 3, nC = A.mats.length;
      expect(nC, 'the body and four limb nodes').toBe(5);
      const invA = A.mats.map((m) => m.clone().invert());
      // Bit c set: owner c explains this vertex in every pose so far.
      const fits = new Uint8Array(nV).fill((1 << nC) - 1), p = new THREE.Vector3(), n = new THREE.Vector3();
      let poses = 0;
      const check = () => {
        const B = sample(t);
        expect(B.P.length).toBe(A.P.length);
        const rel = B.mats.map((m, c) => new THREE.Matrix4().multiplyMatrices(m, invA[c])), relN = rel.map((m) => new THREE.Matrix3().setFromMatrix4(m));
        for (let i = 0; i < nV; i++) for (let c = 0; c < nC; c++) {
          if (!(fits[i] & (1 << c))) continue;
          p.set(A.P[i * 3], A.P[i * 3 + 1], A.P[i * 3 + 2]).applyMatrix4(rel[c]);
          n.set(A.N[i * 3], A.N[i * 3 + 1], A.N[i * 3 + 2]).applyMatrix3(relN[c]);
          const dp = Math.max(Math.abs(p.x - B.P[i * 3]), Math.abs(p.y - B.P[i * 3 + 1]), Math.abs(p.z - B.P[i * 3 + 2]));
          const dn = Math.max(Math.abs(n.x - B.N[i * 3]), Math.abs(n.y - B.N[i * 3 + 1]), Math.abs(n.z - B.N[i * 3 + 2]));
          if (dp > 1e-5 || dn > 1e-4) fits[i] &= ~(1 << c);
        }
        poses++;
      };
      for (const [input, steps] of [[{ forward: 1, turn: 0.6, rise: 0.2 }, 9], [{ forward: 1, turn: -0.4, rise: -0.3 }, 9], [{ forward: 0.2, turn: 1 }, 6], [null, 12]]) {
        t.controller.setInput(input);
        for (let i = 0; i < steps; i++) { t.step(50); if (i % 3 === 2) check(); }
      }
      t.controller.setPaused(true); t.run(1); check();
      expect(poses).toBeGreaterThan(10);
      let lost = 0; const owned = new Array(nC).fill(0);
      for (let i = 0; i < nV; i++) { if (!fits[i]) lost++; for (let c = 0; c < nC; c++) if (fits[i] === 1 << c) owned[c]++; }
      expect(lost, 'vertices no owner moves rigidly').toBe(0);
      expect(owned[0], 'static body vertices').toBeGreaterThan(1000);
      owned.slice(1).forEach((k, c) => expect(k, 'vertices that only limb node ' + c + ' explains').toBeGreaterThan(100));
      // A triangle never straddles two owners: each has one owner all three corners share.
      let straddle = 0; for (let k = 0; k < A.index.length; k += 3) if (!(fits[A.index[k]] & fits[A.index[k + 1]] & fits[A.index[k + 2]])) straddle++;
      expect(straddle, 'triangles across two owners').toBe(0);
      expect(t.errors).toEqual([]);
    }
  });

  it('keeps every posed vertex inside its culling bounds through the hardest kick', () => {
    const t = runtime({ quality: 'high' }), body = t.scene.getObjectByName('reef-explore-diver-body');
    const s = body.geometry.boundingSphere, box = body.geometry.boundingBox, pos = body.geometry.attributes.position, v = new THREE.Vector3();
    t.controller.setInput({ forward: 1, turn: 1, rise: 1 });
    let worst = -Infinity, outBox = 0;
    for (let i = 0; i < 80; i++) { t.step(25); for (let k = 0; k < pos.count; k++) { v.fromBufferAttribute(pos, k); worst = Math.max(worst, s.distanceToPoint(v)); if (!box.containsPoint(v)) outBox++; } }
    expect(worst).toBeLessThanOrEqual(0);
    expect(outBox).toBe(0);
  });
});

describe('the high tier rock draws in chunks', () => {
  // Each triangle as the exact position, normal and colour of its three corners.
  function triangles(g) {
    const P = g.attributes.position.array, N = g.attributes.normal.array, C = g.attributes.color.array, I = g.index.array, out = [];
    const corner = (i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2], N[i * 3], N[i * 3 + 1], N[i * 3 + 2], C[i * 3], C[i * 3 + 1], C[i * 3 + 2]].join(',');
    for (let k = 0; k < I.length; k += 3) out.push(corner(I[k]) + '|' + corner(I[k + 1]) + '|' + corner(I[k + 2]));
    return out;
  }
  // Connected pieces of a mesh (one or more per bommie), each as its triangle count and smallest triangle.
  function pieces(g) {
    const I = g.index.array, keys = triangles(g), parent = Int32Array.from({ length: g.attributes.position.count }, (_, i) => i);
    const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    const join = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
    for (let k = 0; k < I.length; k += 3) { join(I[k], I[k + 1]); join(I[k], I[k + 2]); }
    const by = new Map();
    for (let k = 0; k < I.length; k += 3) { const r = find(I[k]), e = by.get(r) || { n: 0, min: null }; e.n++; const key = keys[k / 3]; if (e.min === null || key < e.min) e.min = key; by.set(r, e); }
    return [...by.values()].map((e) => e.n + '#' + e.min);
  }
  const chunksOf = (t) => t.scene.children.filter((o) => o.name === 'reef-explore-bommies-chunk');

  it('holds exactly the hidden whole rock\'s triangles, corner for corner, in whole bommies with its material', () => {
    const t = runtime({ quality: 'high' }), whole = t.scene.getObjectByName('reef-explore-bommies'), chunks = chunksOf(t);
    expect(whole.visible, 'the whole rock is kept for picking and queries, undrawn').toBe(false);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.length).toBeLessThanOrEqual(9);
    const mine = chunks.flatMap((c) => triangles(c.geometry)).sort(), all = triangles(whole.geometry).sort();
    expect(mine.length).toBe(all.length);
    expect(mine.every((k, i) => k === all[i]), 'the same triangles').toBe(true);
    // No piece of rock is cut between chunks: the chunks' pieces are the whole rock's pieces.
    expect(chunks.flatMap((c) => pieces(c.geometry)).sort()).toEqual(pieces(whole.geometry).sort());
    const owner = new Map();
    chunks.forEach((chunk, ci) => { const P = chunk.geometry.attributes.position.array; for (let i = 0; i < P.length; i += 3) { const k = P[i] + ',' + P[i + 1] + ',' + P[i + 2]; if (owner.has(k) && owner.get(k) !== ci) owner.set(k, -1); else if (!owner.has(k)) owner.set(k, ci); } });
    expect([...owner.values()].filter((v) => v === -1).length, 'vertices shared by two chunks').toBe(0);
    const m = new THREE.Matrix4(), c = new THREE.Color(), v = new THREE.Vector3();
    for (const chunk of chunks) {
      expect(chunk.material).toBe(whole.material);
      expect([chunk.visible, chunk.castShadow, chunk.receiveShadow, chunk.frustumCulled, chunk.count]).toEqual([true, true, true, true, 1]);
      chunk.getMatrixAt(0, m); expect(m.equals(new THREE.Matrix4())).toBe(true);
      chunk.getColorAt(0, c); expect(c.toArray()).toEqual([1, 1, 1]);
      const pos = chunk.geometry.attributes.position, s = chunk.geometry.boundingSphere;
      let out = 0; for (let i = 0; i < pos.count; i++) if (s.distanceToPoint(v.fromBufferAttribute(pos, i)) > 1e-6) out++;
      expect(out, 'vertices outside a chunk\'s culling sphere').toBe(0);
    }
  });

  it('lets the view and the shadow camera skip the chunks they cannot see; the light tier keeps its one drawn rock', () => {
    const t = runtime({ quality: 'high' });
    t.controller.setInput({ forward: 1, turn: 0.25 }); t.run(5); t.controller.setInput(null); t.run(0.5);
    const chunks = chunksOf(t), cam = t.renderer.camera, sun = t.scene.getObjectByName('reef-explore-sun');
    cam.updateMatrixWorld();
    const view = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    sun.updateMatrixWorld(); sun.target.updateMatrixWorld(); sun.shadow.camera.updateProjectionMatrix(); sun.shadow.updateMatrices(sun);
    const shadow = sun.shadow.getFrustum();
    // What three.js projectObject draws: an object that is not culled, or one its frustum meets.
    const drawnIn = (f) => chunks.filter((o) => o.visible && (!o.frustumCulled || f.intersectsObject(o))).length;
    expect(drawnIn(view)).toBeGreaterThan(0);
    expect(drawnIn(view), 'chunks drawn in the view').toBeLessThan(chunks.length);
    expect(drawnIn(shadow)).toBeGreaterThan(0);
    expect(drawnIn(shadow), 'chunks drawn in the shadow pass').toBeLessThan(chunks.length);
    const low = runtime({ quality: 'low' });
    expect(chunksOf(low).length).toBe(0);
    expect(low.scene.getObjectByName('reef-explore-bommies').visible).toBe(true);
  });
});

describe('high tier shadow casters', () => {
  const POP = [{ id: 'green_turtle', count: 4 }, { id: 'blue_tang', count: 5 }, { id: 'parrotfish', count: 6 }, { id: 'clownfish', count: 2 }, { id: 'brain_coral', count: 6 }, { id: 'sea_fan', count: 2 }];
  const rootsOf = (t) => { const out = new Map(); t.scene.traverse((o) => { if (o.userData && o.userData.exploreUid && !o.isInstancedMesh) out.set(o.userData.exploreUid, o); }); return out; };

  it('are exactly the animals over 0.35 m in radius, each casting only while it can reach the shadow map', () => {
    const t = runtime({ quality: 'high', site: site({ population: POP }) }), roots = rootsOf(t);
    const ring = t.scene.getObjectByName('reef-explore-focus'), sun = t.scene.getObjectByName('reef-explore-sun'), half = sun.shadow.camera.right;
    const seen = { big: new Set(), small: new Set(), inside: 0, outside: 0, cast: new Set() };
    for (const [input, seconds] of [[null, 0.5], [{ forward: 1, turn: 0.15 }, 8], [{ forward: 1, turn: -0.3, rise: -0.2 }, 8], [{ forward: 1, turn: 0.5 }, 6]]) {
      t.controller.setPaused(false); t.controller.setInput(input); t.run(seconds); t.controller.setInput(null);
      t.controller.setPaused(true); t.run(0.3);
      // Paused, nothing moves; the focus ring shows each animal's centre and radius (r * 1.15 + 0.12).
      const where = new Map();
      for (const uid of roots.keys()) { expect(t.controller.focus(uid)).toBe(true); t.step(50); where.set(uid, { c: ring.position.clone(), r: (ring.scale.x - 0.12) / 1.15 }); }
      t.controller.clearFocus(); t.step(50);
      // The renderer calls scene.onBeforeRender just before its shadow pass.
      t.scene.onBeforeRender(t.renderer, t.scene, t.renderer.camera);
      const z = new THREE.Vector3().subVectors(sun.position, sun.target.position).normalize(), x = new THREE.Vector3(0, 1, 0).cross(z).normalize(), y = new THREE.Vector3().crossVectors(z, x);
      for (const [uid, root] of roots) {
        const flags = meshesOf(root).map((m) => m.castShadow), on = flags.some(Boolean), { c, r } = where.get(uid);
        expect(flags.every((f) => f === on), uid + ' casts with all its meshes or none').toBe(true);
        expect(Math.abs(r - 0.35) > 1e-6, uid + ' radius is clear of the threshold').toBe(true);
        const d = c.clone().sub(sun.target.position), reach = Math.max(Math.abs(d.dot(x)), Math.abs(d.dot(y)));
        if (on) seen.cast.add(uid);
        if (r < 0.35) { seen.small.add(uid); expect(on, uid + ' (radius ' + r.toFixed(2) + ') never casts').toBe(false); continue; }
        seen.big.add(uid);
        // On the map: it must cast. More than 2 m beyond the map's edge: it must not.
        if (reach <= half + r) { seen.inside++; expect(on, uid + ' on the shadow map casts').toBe(true); }
        if (reach > half + r + 2) { seen.outside++; expect(on, uid + ' off the shadow map casts nothing').toBe(false); }
      }
    }
    expect(seen.big.size).toBeGreaterThan(2);
    expect(seen.small.size).toBeGreaterThan(2);
    expect(seen.inside).toBeGreaterThan(0);
    expect(seen.outside).toBeGreaterThan(0);
    expect([...seen.cast].every((uid) => seen.big.has(uid)), 'only big animals ever cast').toBe(true);
    const low = runtime({ quality: 'low', site: site({ population: POP }) });
    low.run(1); low.scene.onBeforeRender(low.renderer, low.scene, low.renderer.camera);
    expect([...rootsOf(low).values()].some((r) => meshesOf(r).some((m) => m.castShadow)), 'the light tier has no shadows').toBe(false);
  });
});
