import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Round 31, lane render (tag rn31). Road Ready 3D:
// - scenery batching: a chunk's plain static meshes are merged into a few meshes per chunk; everything
//   that moves, is named, is held by a registry or is see-through stays as it was built;
// - the drive start: a "Building the road" card first, then the scene in slices;
// - fog drawn at the visibility the scenario states;
// - headlight cones, snowflakes, sky objects, the curb on bends, the K photo without preserveDrawingBuffer.
// The geometry tests run on the real three.js r128 the tool loads (vendor/three-r128).

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const require = createRequire(import.meta.url);
let THREE, loadTool, resetStemLab, makeCtx, React, ReactDOMClient, RR, BATCH, WARM, FOG, LOOK, SOURCE;
beforeAll(async () => {
  THREE = require(path.resolve(process.cwd(), 'vendor/three-r128/three.min.js'));
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').split(path.sep).join('/'));
  ({ loadTool, resetStemLab, makeCtx, React, ReactDOMClient } = mod);
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  BATCH = window.__RR_TEST_EXPORTS__.roadReadyBatch;
  WARM = window.__RR_TEST_EXPORTS__.roadReadyWarm;
  FOG = window.__RR_TEST_EXPORTS__.roadReadyFog;
  LOOK = window.__RR_TEST_EXPORTS__.roadReadyLook;
  SOURCE = readFileSync(TOOL, 'utf8');
});

const triangles = (root) => { let n = 0; root.traverse((o) => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return n; };
const meshes = (root) => { const list = []; root.traverse((o) => { if (o.isMesh) list.push(o); }); return list; };
const lambert = (hex, extra) => new THREE.MeshLambertMaterial(Object.assign({ color: hex }, extra || {}));
const basic = (hex, extra) => new THREE.MeshBasicMaterial(Object.assign({ color: hex }, extra || {}));
const at = (mesh, x, y, z) => { mesh.position.set(x, y, z); return mesh; };

// A chunk like the builder makes: plain scenery of several kinds, and one of everything that must be left alone.
function syntheticChunk() {
  const group = new THREE.Group(); group.name = 'chunk_7';
  const keep = {}; const registry = { lamps: [], gates: [] };
  // section 'cells': trees and buildings
  const bark = lambert(0x4a2e18), leaf = lambert(0x3a8a3a), leaf2 = lambert(0x6ba84f);
  for (let i = 0; i < 12; i++) {
    group.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 1.5, 6), bark), -10 + i, 0.75, 3));
    const top = at(new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), i % 2 ? leaf : leaf2), -10 + i, 2.1, 3);
    top.scale.set(1.1, 0.85, 1.2); top.castShadow = true; group.add(top);             // round canopy: wind kind 2
  }
  for (let i = 0; i < 6; i++) { const cone = at(new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.4, 7), leaf), 4 + i, 2.6, 5); cone.castShadow = true; group.add(cone); } // wind kind 1
  for (let i = 0; i < 5; i++) group.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 4), lambert(0x4a8a2e)), 2 + i * 0.3, 0.11, 6)); // tufts: wind kind 3
  keep.turnedCone = at(new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.4, 7), leaf), 12, 2.6, 5); keep.turnedCone.rotation.y = 0.7; group.add(keep.turnedCone); // the shader cannot rock this one exactly: it stays
  for (let i = 0; i < 8; i++) { const wall = at(new THREE.Mesh(new THREE.BoxGeometry(1, 3, 1), lambert(i % 2 ? 0xb08c64 : 0xa09078)), -6 + i * 1.5, 1.5, 9); wall.rotation.y = 0.3 * i; group.add(wall); }
  keep.mirrored = at(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 2), lambert(0xb08c64)), 9, 0.5, 9); keep.mirrored.scale.x = -1; group.add(keep.mirrored); // merged, with its triangles turned
  group.add(at(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 2), lambert(0xb08c64)), 10.5, 0.5, 9));
  keep.flag = at(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.02), lambert(0xdc2626)), 0, 5, 9); keep.flag.name = 'rr_chunkFlag'; keep.flag._flagSeed = 3; group.add(keep.flag);
  keep.smoke = at(new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 5), lambert(0xcccccc)), 1, 4, 9); keep.smoke._sPhase = 1.5; group.add(keep.smoke); // unnamed, but the builder hung a value on it
  keep.glass = at(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), basic(0x88ccff, { transparent: true, opacity: 0.4 })), 2, 1, 9); group.add(keep.glass);
  keep.sign = at(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), basic(0xffffff, { map: new THREE.Texture() })), 3, 1, 9); keep.sign.material.map._rrShared = true; group.add(keep.sign);
  keep.road = new THREE.Mesh(new THREE.PlaneGeometry(8, 32, 1, 8), lambert(0xffffff, { vertexColors: true })); keep.road.receiveShadow = true; group.add(keep.road);
  BATCH.rrBatchCut(group, 'cells');
  // section 'cross_street': a turned group with paint, sign posts, a named stop sign, signal lamps held by a registry
  const cross = new THREE.Group(); cross.rotation.y = 0.4; cross.position.set(0, 0.02, 16);
  for (let i = 0; i < 10; i++) { const stripe = at(new THREE.Mesh(new THREE.PlaneGeometry(0.4, 2), basic(0xffffff)), -4 + i, 0, 0); stripe.rotation.x = -Math.PI / 2; cross.add(stripe); }
  const stop = new THREE.Group(); stop.name = 'intersection-stop-main-1';
  keep.stopPole = at(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), lambert(0x8a8f98)), 3, 1.1, 2); stop.add(keep.stopPole);
  cross.add(stop);
  for (let i = 0; i < 3; i++) { const lamp = at(new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), basic(0x331111)), 5, 4 + i * 0.3, 2); cross.add(lamp); registry.lamps.push({ mesh: lamp, colour: i }); }
  for (let i = 0; i < 4; i++) cross.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 6), lambert(0x4b5563)), 5 + i, 2, 2));
  const gate = new THREE.Group(); gate.position.set(-5, 1, 2);
  keep.gateArm = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 0.1), lambert(0xffffff)); gate.add(keep.gateArm);
  cross.add(gate); registry.gates.push(gate);
  group.add(cross);
  BATCH.rrBatchCut(group, 'cross_street');
  // section 'landmark' (not on the allow-list)
  keep.landmark = []; for (let i = 0; i < 6; i++) { const part = at(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), lambert(0x884422)), 20, 1 + i, 20); keep.landmark.push(part); group.add(part); }
  BATCH.rrBatchCut(group, 'landmark');
  // added after the last cut: never merged
  keep.late = []; for (let i = 0; i < 4; i++) { const part = at(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), lambert(0x884422)), 25, 1 + i, 20); keep.late.push(part); group.add(part); }
  return { group, keep, registry };
}

describe('scenery batching: one mesh per kind of plain scenery, the same triangles (rn31)', () => {
  it('merges the plain meshes of the allowed sections and keeps every triangle', () => {
    const { group, registry } = syntheticChunk();
    const before = { meshes: meshes(group).length, triangles: triangles(group) };
    const stats = BATCH.rrBatchChunk(THREE, group, { protect: [registry] });
    const after = { meshes: meshes(group).length, triangles: triangles(group) };
    expect(after.triangles).toBe(before.triangles);
    // 12 trunks + 12 round canopies + 6 cone canopies + 5 tufts + 10 walls and blocks + 10 stripes + 4 posts
    expect(stats.parts).toBe(59);
    expect(after.meshes).toBe(before.meshes - stats.parts + stats.batches);
    expect(after.meshes).toBeLessThan(before.meshes / 2);
    const batches = meshes(group).filter((m) => m.userData.rrBatch);
    expect(batches.length).toBe(stats.batches);
    expect(batches.reduce((n, b) => n + b.userData.rrBatch.triangles, 0)).toBe(stats.triangles);
    for (const b of batches) {
      expect(b.parent).toBe(group);
      expect(b.geometry.index.count / 3).toBe(b.userData.rrBatch.triangles);
      expect(b.geometry.attributes.color.count).toBe(b.geometry.attributes.position.count);
      expect(b.material.vertexColors).toBe(true);
      expect(b.material.color.getHex()).toBe(0xffffff);
      expect(b.geometry.index.array instanceof Uint16Array).toBe(true);
    }
    expect(group._rrBatchCuts).toBeUndefined();
  });

  it('bakes each part where the builder put it, in its own colour', () => {
    const group = new THREE.Group();
    const a = at(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 3), lambert(0x336699)), 4, 1, -2); a.rotation.y = 0.5; a.scale.set(1, 2, 1);
    const nest = new THREE.Group(); nest.position.set(0, 0.5, 10); nest.rotation.y = -0.3;
    const b = at(new THREE.Mesh(new THREE.BoxGeometry(1, 2, 3), lambert(0xcc3311)), 5, 1, 0); nest.add(b);
    group.add(a); group.add(nest);
    BATCH.rrBatchCut(group, 'cells');
    group.updateMatrixWorld(true);
    const expected = [a, b].map((m) => { const p = m.geometry.attributes.position; const n = m.geometry.attributes.normal; const nm = new THREE.Matrix3().getNormalMatrix(m.matrixWorld);
      return { v: new THREE.Vector3().fromBufferAttribute(p, 5).applyMatrix4(m.matrixWorld), n: new THREE.Vector3().fromBufferAttribute(n, 5).applyMatrix3(nm).normalize(), c: m.material.color.clone(), count: p.count }; });
    const stats = BATCH.rrBatchChunk(THREE, group, {});
    expect(stats).toMatchObject({ parts: 2, batches: 1 });
    const merged = meshes(group)[0];
    const pos = merged.geometry.attributes.position, nor = merged.geometry.attributes.normal, col = merged.geometry.attributes.color;
    let offset = 0;
    for (const e of expected) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, offset + 5), n = new THREE.Vector3().fromBufferAttribute(nor, offset + 5);
      expect(v.distanceTo(e.v)).toBeLessThan(1e-5);
      expect(n.distanceTo(e.n)).toBeLessThan(1e-5);
      expect(col.getX(offset + 5)).toBeCloseTo(e.c.r, 6); expect(col.getY(offset + 5)).toBeCloseTo(e.c.g, 6); expect(col.getZ(offset + 5)).toBeCloseTo(e.c.b, 6);
      offset += e.count;
    }
    expect(nest.children.length).toBe(0);
  });

  it('leaves alone what is named, flagged, see-through, textured, vertex-coloured, held by a registry or under such a parent', () => {
    const { group, keep, registry } = syntheticChunk();
    BATCH.rrBatchChunk(THREE, group, { protect: [registry] });
    const inChunk = (o) => { let n = o; while (n && n !== group) n = n.parent; return n === group; };
    // looked up by name: still there, the same objects, with what the builder hung on them
    expect(group.getObjectByName('rr_chunkFlag')).toBe(keep.flag);
    expect(keep.flag._flagSeed).toBe(3);
    expect(group.getObjectByName('intersection-stop-main-1').children).toContain(keep.stopPole);
    for (const o of [keep.flag, keep.smoke, keep.glass, keep.sign, keep.road, keep.stopPole, keep.gateArm, keep.turnedCone]) {
      expect(inChunk(o), o.name || o.geometry.type).toBe(true);
      expect(o.userData.rrBatch).toBeUndefined();
    }
    // registries still point at live meshes whose material is their own
    for (const entry of registry.lamps) { expect(inChunk(entry.mesh)).toBe(true); entry.mesh.material.color.setHex(0xff0000); expect(entry.mesh.material.color.getHex()).toBe(0xff0000); }
    expect(inChunk(registry.gates[0])).toBe(true);
    expect(registry.gates[0].children).toContain(keep.gateArm);
    // not on the allow-list, and added after the last cut
    for (const o of keep.landmark.concat(keep.late)) expect(o.parent).toBe(group);
    // a material held by a registry keeps its meshes out too
    const g2 = new THREE.Group(); const shared = lambert(0x222222);
    for (let i = 0; i < 5; i++) g2.add(at(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), shared), i, 0, 0));
    BATCH.rrBatchCut(g2, 'cells');
    expect(BATCH.rrBatchChunk(THREE, g2, { protect: [{ lampMaterial: shared }] }).parts).toBe(0);
    expect(g2.children.length).toBe(5);
  });

  it('never mixes shadow casters with non-casters, or different kinds of material', () => {
    const { group, registry } = syntheticChunk();
    const casterTriangles = meshes(group).filter((m) => m.castShadow).reduce((n, m) => n + m.geometry.index.count / 3, 0);
    BATCH.rrBatchChunk(THREE, group, { protect: [registry] });
    expect(meshes(group).filter((m) => m.castShadow).reduce((n, m) => n + m.geometry.index.count / 3, 0)).toBe(casterTriangles);
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) g.add(at(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), lambert(0x111111)), i, 0, 0));
    for (let i = 0; i < 3; i++) g.add(at(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), basic(0x111111)), i, 2, 0));
    for (let i = 0; i < 3; i++) g.add(at(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), lambert(0x111111, { side: THREE.DoubleSide })), i, 4, 0));
    for (let i = 0; i < 3; i++) g.add(at(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), lambert(0x111111, { emissive: 0x332200 })), i, 6, 0));
    for (let i = 0; i < 3; i++) { const m = at(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), lambert(0x111111)), i, 8, 0); m.receiveShadow = true; g.add(m); }
    BATCH.rrBatchCut(g, 'cells');
    expect(BATCH.rrBatchChunk(THREE, g, {})).toMatchObject({ parts: 15, batches: 5 });
    const kinds = meshes(g).map((m) => [m.material.type, m.material.side, m.material.emissive ? m.material.emissive.getHex() : -1, m.receiveShadow].join('/')).sort();
    expect(new Set(kinds).size).toBe(5);
  });

  it('a mirrored part still faces out', () => {
    const g = new THREE.Group();
    const a = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 2), lambert(0x445566)); a.scale.x = -1; a.position.set(3, 0, 0);
    const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 2), lambert(0x445566)); b.position.set(5, 0, 0);
    g.add(a); g.add(b); BATCH.rrBatchCut(g, 'cells');
    BATCH.rrBatchChunk(THREE, g, {});
    const geo = meshes(g)[0].geometry, pos = geo.attributes.position, nor = geo.attributes.normal, idx = geo.index;
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3(), face = new THREE.Vector3();
    for (let t = 0; t < idx.count; t += 3) {
      A.fromBufferAttribute(pos, idx.getX(t)); B.fromBufferAttribute(pos, idx.getX(t + 1)); C.fromBufferAttribute(pos, idx.getX(t + 2));
      face.copy(C).sub(B).cross(A.clone().sub(B)).normalize();
      N.fromBufferAttribute(nor, idx.getX(t));
      expect(face.dot(N)).toBeGreaterThan(0.99);
    }
  });

  it('cuts big batches at 65,535 vertices and into 24 m strips across the road', () => {
    const g = new THREE.Group(); const mat = lambert(0x3a8a3a);
    const sphere = new THREE.SphereGeometry(0.8, 8, 6); // 63 vertices
    for (let i = 0; i < 1100; i++) g.add(at(new THREE.Mesh(sphere, mat), (i % 40) * 0.5, 8, Math.floor(i / 40))); // y = 8: not rocked by the wind
    BATCH.rrBatchCut(g, 'cells');
    const tris = triangles(g);
    const stats = BATCH.rrBatchChunk(THREE, g, {});
    expect(stats.batches).toBe(2);
    expect(triangles(g)).toBe(tris);
    for (const m of meshes(g)) { expect(m.geometry.attributes.position.count).toBeLessThanOrEqual(BATCH.RR_BATCH_MAX_VERTICES); expect(m.geometry.index.array instanceof Uint16Array).toBe(true); }
    const wide = new THREE.Group();
    for (const x of [-40, -39, -10, -9, 10, 11, 40, 41]) wide.add(at(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat), x, 0, 0));
    BATCH.rrBatchCut(wide, 'cells');
    expect(BATCH.rrBatchChunk(THREE, wide, {}).batches).toBe(4);
    expect(BATCH.RR_BATCH_STRIP_WIDTH).toBe(24);
  });

  it('wind: merged canopies and tufts carry their pivot and kind, and the shader rocks them by the frame loop formulas', () => {
    const { group, registry } = syntheticChunk();
    BATCH.rrBatchChunk(THREE, group, { protect: [registry] });
    const sway = meshes(group).filter((m) => m.userData.rrBatch && m.userData.rrBatch.sway);
    const still = meshes(group).filter((m) => m.userData.rrBatch && !m.userData.rrBatch.sway);
    expect(sway.length).toBeGreaterThanOrEqual(3);
    for (const m of still) expect(m.geometry.attributes.rrSway).toBeUndefined();
    const kinds = {};
    for (const m of sway) {
      expect(m.material.onBeforeCompile).toBe(BATCH.rrBatchSwayCompile);
      const a = m.geometry.attributes.rrSway; expect(a.itemSize).toBe(4);
      for (let i = 0; i < a.count; i++) kinds[a.getW(i)] = (kinds[a.getW(i)] || 0) + 1;
      // the pivot of a vertex is the position its part had in the chunk
      const p = new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position, 0);
      expect(p.distanceTo(new THREE.Vector3(a.getX(0), a.getY(0), a.getZ(0)))).toBeLessThan(2);
    }
    expect(Object.keys(kinds).sort()).toEqual(['1', '2', '3']);
    // the same test the frame loop applies, and the loop still reads as this test expects
    const kind = (geo, y) => BATCH.rrBatchSwayKind({ geometry: geo, position: { y } });
    expect([kind(new THREE.ConeGeometry(1, 1), 2), kind(new THREE.SphereGeometry(1), 3), kind(new THREE.ConeGeometry(1, 1), 0.1), kind(new THREE.ConeGeometry(1, 1), 1), kind(new THREE.SphereGeometry(1), 7), kind(new THREE.BoxGeometry(1, 1, 1), 3)]).toEqual([1, 2, 3, 0, 0, 0]);
    expect(SOURCE).toContain("if (gt === 'ConeGeometry' && child.position.y > 1.5) {");
    expect(SOURCE).toContain("} else if (gt === 'SphereGeometry' && child.position.y > 1.0 && child.position.y < 6.0) {");
    expect(SOURCE).toContain("} else if (gt === 'ConeGeometry' && child.position.y < 0.3) {");
    expect(SOURCE).toContain('child.rotation.z = Math.sin(t_now * 1.5 + child.position.x * 2 + child.position.z) * windStrength;');
    expect(SOURCE).toContain('child.rotation.x = Math.cos(t_now * 1.2 + child.position.z * 1.5) * windStrength * 0.5;');
    expect(SOURCE).toContain('child.rotation.z = Math.sin(t_now * 1.1 + child.position.x * 1.7 + child.position.z) * windStrength * 0.6;');
    expect(SOURCE).toContain('child.scale.y = 1 + Math.sin(t_now * 4 + child.position.x * 6) * 0.15;');
    const glsl = BATCH.RR_BATCH_SWAY_GLSL;
    expect(glsl).toContain('az = sin( rrSwayTime * 1.5 + rrSway.x * 2.0 + rrSway.z ) * rrSwayWind;');
    expect(glsl).toContain('ax = cos( rrSwayTime * 1.2 + rrSway.z * 1.5 ) * rrSwayWind * 0.5;');
    expect(glsl).toContain('az = sin( rrSwayTime * 1.1 + rrSway.x * 1.7 + rrSway.z ) * rrSwayWind * 0.6;');
    expect(glsl).toContain('rel.y *= 1.0 + sin( rrSwayTime * 4.0 + rrSway.x * 6.0 ) * 0.15;');
    // the frame feeds the two uniforms, and the shader is patched where three.js r128 moves a vertex
    expect(SOURCE).toContain('RR_BATCH_SWAY_UNIFORMS.rrSwayTime.value = t_now;');
    expect(SOURCE).toContain('RR_BATCH_SWAY_UNIFORMS.rrSwayWind.value = windStrength;');
    const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.lambert.vertexShader };
    BATCH.rrBatchSwayCompile(shader);
    expect(shader.uniforms.rrSwayTime).toBe(BATCH.RR_BATCH_SWAY_UNIFORMS.rrSwayTime);
    expect(shader.vertexShader).toContain('transformed = rrSwayMove( transformed );');
    expect(shader.vertexShader).toContain('objectNormal = rrSwayTurn( objectNormal );');
    expect(shader.vertexShader.indexOf('attribute vec4 rrSway;')).toBe(0);
  });

  it('wind: the rest pose is what the frame loop would start from, and the turn order is three.js order', () => {
    // A canopy the builder scaled: the loop overwrites rotation.z (and .x for cones). Port of the shader for one vertex.
    const g = new THREE.Group(); const leaf = lambert(0x3a8a3a);
    const cones = [0, 1].map((i) => { const c = at(new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.4, 7), leaf), 3 + i * 2, 2.6, 5 + i); c.scale.set(1.2, 1, 0.9); return c; });
    cones.forEach((c) => g.add(c)); BATCH.rrBatchCut(g, 'cells');
    const source = cones[0].geometry.attributes.position, local = new THREE.Vector3().fromBufferAttribute(source, 3);
    const t = 12.3, wind = 0.04, p = cones[0].position.clone();
    const az = Math.sin(t * 1.5 + p.x * 2 + p.z) * wind, ax = Math.cos(t * 1.2 + p.z * 1.5) * wind * 0.5;
    const live = new THREE.Object3D(); live.position.copy(p); live.scale.set(1.2, 1, 0.9); live.rotation.z = az; live.rotation.x = ax; live.updateMatrix();
    const want = local.clone().applyMatrix4(live.matrix);
    BATCH.rrBatchChunk(THREE, g, {});
    const merged = meshes(g)[0];
    const rest = new THREE.Vector3().fromBufferAttribute(merged.geometry.attributes.position, 3);
    const rel = rest.clone().sub(p);
    const cz = Math.cos(az), sz = Math.sin(az), cx = Math.cos(ax), sx = Math.sin(ax);
    const r = new THREE.Vector3(rel.x * cz - rel.y * sz, rel.x * sz + rel.y * cz, rel.z);
    const got = new THREE.Vector3(r.x, r.y * cx - r.z * sx, r.y * sx + r.z * cx).add(p);
    expect(got.distanceTo(want)).toBeLessThan(1e-5);
    expect(BATCH.RR_BATCH_SWAY_GLSL).toContain('vec3 r = vec3( v.x * cz - v.y * sz, v.x * sz + v.y * cz, v.z );');
    expect(BATCH.RR_BATCH_SWAY_GLSL).toContain('return vec3( r.x, r.y * cx - r.z * sx, r.y * sx + r.z * cx );');
  });

  it('the chunk unload frees the merged geometry and still spares shared textures', () => {
    const { group, keep, registry } = syntheticChunk();
    BATCH.rrBatchChunk(THREE, group, { protect: [registry] });
    const from = SOURCE.indexOf('                  cg.traverse(function(obj) {\n                    if (obj.geometry) obj.geometry.dispose();');
    const to = SOURCE.indexOf('                  s3.scene.remove(cg);', from);
    expect(from).toBeGreaterThan(0); expect(to).toBeGreaterThan(from);
    const unload = new Function('cg', SOURCE.slice(from, to));
    const freed = new Set(); let texturesFreed = 0;
    const batches = meshes(group).filter((m) => m.userData.rrBatch);
    for (const m of batches) m.geometry.addEventListener('dispose', () => freed.add(m.geometry));
    keep.sign.material.map.addEventListener('dispose', () => { texturesFreed++; });
    unload(group);
    expect(freed.size).toBe(batches.length);
    expect(texturesFreed).toBe(0);
  });

  it('the builder: every section label is on the allow-list, movers are off it, and every registry is handed to the batcher', () => {
    const from = SOURCE.indexOf("              chunkGroup.name = 'chunk_' + ci;");
    const to = SOURCE.indexOf('              s3._loadedChunks[ci] = chunkGroup;', from);
    const builder = SOURCE.slice(from, to);
    const labels = (builder.match(/rrBatchCut\(chunkGroup, '([a-z_]+)'\);/g) || []).map((s) => /'([a-z_]+)'/.exec(s)[1]);
    expect(labels.length).toBeGreaterThanOrEqual(15);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels.slice().sort()).toEqual(Object.keys(BATCH.RR_BATCH_SECTIONS).sort());
    expect(BATCH.RR_BATCH_SECTIONS).toMatchObject({ cells: true, rumble: true, markings: true, landmark: false, railroad: false, work_zone: false, sheen: false });
    const call = builder.slice(builder.indexOf('rrBatchChunk(T, chunkGroup, { protect: ['));
    expect(call.indexOf('rrBatchChunk(')).toBe(0);
    const registries = Array.from(new Set(builder.match(/s3\.[A-Za-z]+ByChunk\b/g) || []));
    expect(registries.length).toBeGreaterThanOrEqual(5);
    for (const name of registries.concat(['s3.flashingBeacons'])) expect(call.slice(0, 600), name).toContain(name);
    // the batcher runs after the last section and before the chunk is shown
    expect(builder.lastIndexOf("rrBatchCut(chunkGroup, 'cross_street');")).toBeLessThan(builder.indexOf('rrBatchChunk(T, chunkGroup'));
    expect(builder.indexOf('rrBatchChunk(T, chunkGroup')).toBeLessThan(builder.indexOf('s3.scene.add(chunkGroup);'));
  });
});

describe('fog is drawn at the visibility the scenario states (rn31)', () => {
  it('reads the number from the scenario text; Coastal Fog says 100 ft and is drawn complete at 100 ft', () => {
    const fog = RR.SCENARIOS.find((s) => s.id === 'fog');
    expect(fog.desc).toMatch(/visibility 100 ft/);
    expect(FOG.rrStatedVisibilityFeet(fog)).toBe(100);
    expect(FOG.rrFogVisibilityFeet(fog)).toBe(100);
    const range = FOG.rrFogRange(FOG.rrFogVisibilityFeet(fog));
    expect(range.far * 3.28084).toBeCloseTo(100, 3);
    expect(range.near).toBeLessThanOrEqual(1.6);
    // the picture follows the words
    expect(FOG.rrStatedVisibilityFeet({ desc: 'Thick fog. Visibility about 150 feet. Slow down.' })).toBe(150);
    expect(FOG.rrStatedVisibilityFeet({ desc: 'visibility is under 1,000 ft in snow squalls' })).toBe(1000);
    expect(FOG.rrFogRange(150).far).toBeCloseTo(150 / 3.28084, 6);
    expect(FOG.rrStatedVisibilityFeet({ desc: 'Headlights reach ~250 ft with lows.' })).toBe(null);
  });

  it('other weather has no stated fog; Free Explore fog and weather that turns to fog use the Coastal Fog number', () => {
    for (const s of RR.SCENARIOS) if (s.weather !== 'fog') expect(FOG.rrFogVisibilityFeet(s), s.id).toBe(null);
    expect(FOG.rrFogVisibilityFeet({ id: 'residential', weather: 'fog', time: 'day' })).toBe(100);
    expect(FOG.rrFogVisibilityFeet({ id: 'snow', weather: 'fog', desc: 'Snow-covered road.' })).toBe(100);
  });

  it('the scene uses it at the start and on a weather change, and no graphics level shortens weather fog', () => {
    expect(SOURCE).not.toContain('new T.Fog(0x94a3b8, 5, 40)');
    expect(SOURCE).toContain('var statedFog = rrFogRange(rrFogVisibilityFeet(currentScenario) || 100);');
    expect(SOURCE).toContain('if (isFog) { scene.fog = new T.Fog(0x94a3b8, statedFog.near, statedFog.far); }');
    expect(SOURCE).toContain('var skyFogRange = rrFogRange(rrFogVisibilityFeet(scn) || 100);');
    expect(SOURCE).toContain('s3.scene.fog = new T.Fog(0x94a3b8, skyFogRange.near, skyFogRange.far);');
    expect(SOURCE).toContain("s3.scene.fog._rrWeatherFog = skyState === 'fog' || skyState === 'snow' || skyState === 'rain';");
    expect(SOURCE).toContain('if (gfxFog && !gfxFog._rrWeatherFog && gfxFog._rrGfxScale !== s3._gfxFogScale && s3._gfxFogScale > 0) {');
    // the far backdrop (drawn without fog) is hidden in weather
    expect(SOURCE).toContain("['mountain_ring', 'forest_ring', 'hi_clouds', 'birds'].forEach(function(backdropName) {");
  });
});

describe('the drive start: a card first, then the scene in slices (rn31)', () => {
  let mounted = [];
  afterEach(async () => {
    for (const m of mounted) { try { await React.act(async () => { m.root.unmount(); }); } catch (e) {} m.host.remove(); }
    mounted = [];
    delete window.THREE; delete window.__testHooks;
    vi.restoreAllMocks();
  });
  async function mountDrive(scenario) {
    window.__testHooks = {};
    resetStemLab();
    const config = loadTool(TOOL, 'roadReady');
    const state = { toolData: { roadReady: { view: 'scenarioSelect', scenario, vehicle: 'sedan', reducedMotion: true, tourCompleted: true, instructorVoice: false } } };
    function Host() {
      const [toolData, setToolData] = React.useState(state.toolData);
      state.toolData = toolData;
      const ctx = makeCtx({ toolData, addToast: () => {},
        update: (tool, key, value) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [key]: value } })),
        updateMulti: (tool, values) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), ...(values || {}) } })) });
      return config.render(ctx);
    }
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    await React.act(async () => { root.render(React.createElement(Host)); });
    const m = { host, root, state }; mounted.push(m);
    // The real way in: Start on the briefing calls startDriving, which opens the drive view.
    await React.act(async () => { window.__testHooks.roadReady.startDriving(scenario, 'sedan'); });
    return m;
  }

  it('the card is in the drive view from its first render, with the scenario name, and the scene is made only after a paint', async () => {
    let scenes = 0;
    window.THREE = Object.assign({}, THREE, { Scene: function () { scenes++; throw new Error('no WebGL in this test'); } });
    const frames = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => { frames.push(fn); return frames.length; });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const m = await mountDrive('fog');
    const card = m.host.querySelector('[data-rr-build-card]');
    expect(card, 'the card').toBeTruthy();
    expect(card.getAttribute('data-rr-build-card')).toBe('on');
    expect(card.getAttribute('aria-live')).toBe('polite');
    expect(card.style.display).toBe('flex');
    expect(card.textContent).toContain('Building the road');
    expect(card.textContent).toContain('Coastal Fog');
    expect(m.host.querySelector('.rr-drive-shell').contains(card)).toBe(true);
    // nothing heavy has run yet: the scene waits for two frames and then a task
    expect(scenes).toBe(0);
    const runFrame = async () => { const pending = frames.splice(0); await React.act(async () => { pending.forEach((fn) => { try { fn(performance.now()); } catch (e) {} }); }); };
    await runFrame();
    await React.act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(scenes).toBe(0);                                           // one frame is not enough
    await runFrame();
    expect(scenes).toBe(0);                                           // ... and the scene is made in a task after the second
    await React.act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(scenes).toBe(1);
  });

  it('the source: the card is shown before the scene is made, and hidden when the start chunks are drawn or WebGL fails', () => {
    const from = SOURCE.indexOf('        function ensureThreeAndStart() {');
    const to = SOURCE.indexOf('        ensureThreeAndStart();', from);
    const start = SOURCE.slice(from, to);
    expect(start.indexOf('rrBuildCardSet(driveShellRef.current, true);')).toBeGreaterThan(0);
    expect(start.indexOf('rrBuildCardSet(driveShellRef.current, true);')).toBeLessThan(start.indexOf('scn3d = initThreeScene();'));
    expect(start).toContain('animRef.current = requestAnimationFrame(function() { setTimeout(fn, 0); });');
    // the frame code runs only to make things; while objects wait, only the staged drawing runs
    expect(start).toContain('if (!warm.queue || warm.next >= warm.queue.length) updateThreeScene(scn3d);\n                  else rrWarmStage(scn3d, window.THREE);');
    // one whole frame is drawn behind the card, then the card goes and the drive loop starts
    const finish = start.slice(start.indexOf('rrWarmFinish(scn3d);'));
    expect(finish.indexOf('try { updateThreeScene(scn3d); }')).toBeGreaterThan(0);
    expect(finish.indexOf('try { updateThreeScene(scn3d); }')).toBeLessThan(finish.indexOf('rrBuildCardSet(driveShellRef.current, false);\n                animRef.current = requestAnimationFrame(step);'));
    expect((start.match(/rrBuildCardSet\(driveShellRef\.current, false\);/g) || []).length).toBeGreaterThanOrEqual(4);
    expect(start).toContain('if (warm && !rrWarmDone(scn3d, !!infiniteWorldRef.current)) { animRef.current = requestAnimationFrame(warmTick); return; }');
    // the frame: at most one chunk while starting, and the staged drawing replaces the normal one
    expect(SOURCE).toContain('if (s3._rrWarm) chunkBuildPlan.length = Math.min(rrWarmChunkBudget(s3), chunkBuildPlan.length);');
    expect(SOURCE).toContain('if (s3._rrWarm) { rrWarmStage(s3, T); return; }');
    const shell = document.createElement('div'); shell.innerHTML = '<div data-rr-build-card="on" style="display:flex"></div>';
    expect(WARM.rrBuildCardSet(shell, false).style.display).toBe('none');
    expect(shell.firstChild.getAttribute('data-rr-build-card')).toBe('off');
    expect(WARM.rrBuildCardSet(shell, true).style.display).toBe('flex');
    expect(WARM.rrBuildCardSet(null, true)).toBe(null);
  });

  function stagedScene(cheapDrawMs) {
    const scene = new THREE.Scene();
    const sun = new THREE.DirectionalLight(0xffffff, 1); scene.add(sun);
    const hidden = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), lambert(0x111111)); hidden.visible = false; scene.add(hidden);
    const things = [];
    for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), i % 10 === 0 ? basic(i) : lambert(i)); m.userData.newProgram = i % 10 === 0; scene.add(m); things.push(m); }
    const car = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), lambert(0x224488)); car.add(body); scene.add(car); things.push(body);
    const renders = []; const info = { programs: [] }; let clock = 0;
    const renderer = { info, render(sc) { let shown = 0, compiled = 0; sc.traverseVisible((o) => { if (o.isMesh && o.layers.mask) { shown++; if (o.userData.newProgram && !o.userData.compiled) { o.userData.compiled = true; info.programs.push({}); compiled++; } } }); renders.push({ shown, compiled }); clock += compiled ? 40 : (cheapDrawMs || 3); } };
    const s3 = { scene, renderer, camera: new THREE.PerspectiveCamera(), _rrWarm: { ticks: 0 }, _loadedChunks: {} };
    return { s3, sun, hidden, things, renders, now: () => clock };
  }

  it('rrWarmStage: queues first, then brings objects in a few at a time; a draw that compiled a shader ends the frame', () => {
    const { s3, sun, hidden, things, renders, now } = stagedScene();
    expect(WARM.rrWarmStage(s3, THREE, now)).toBe(true);
    expect(renders.length).toBe(0);                                   // the first call only queues
    expect(things.every((m) => m.layers.mask === 0)).toBe(true);
    expect(things.every((m) => m.visible)).toBe(true);                // .visible belongs to the frame code
    expect(sun.layers.mask).toBe(1); expect(hidden.layers.mask).toBe(1);
    expect(WARM.rrWarmChunkBudget(s3)).toBe(0);                       // no chunk is built while objects wait
    let calls = 0, perCall = [];
    while (WARM.rrWarmStage(s3, THREE, now) && calls < 200) { calls++; }
    const compiledPerRender = renders.map((r) => r.compiled);
    expect(Math.max(...compiledPerRender)).toBe(1);                   // one new shader per draw at most
    expect(renders.reduce((n, r) => n + r.shown, 0)).toBe(things.length); // every object is drawn once, with only its own group
    expect(Math.max(...renders.map((r) => r.shown))).toBeLessThanOrEqual(64);
    expect(renders[0].shown).toBe(1);
    expect(calls).toBeGreaterThanOrEqual(4);                          // 4 shaders: at least 4 frames
    expect(WARM.rrWarmStage(s3, THREE, now)).toBe(false);             // nothing left to stage
    expect(things.filter((m) => m.layers.mask === 1).length).toBeLessThan(things.length); // still not whole: rrWarmFinish does that
    // chunks: one at a time, up to the start chunks; each new chunk is queued in its own frame
    expect(WARM.rrWarmDone(s3, true)).toBe(false);
    expect(WARM.rrWarmDone(s3, false)).toBe(true);                    // a bounded course has no chunks
    for (let c = 0; c < WARM.RR_WARM_START_CHUNKS; c++) {
      expect(WARM.rrWarmChunkBudget(s3)).toBe(1);
      const chunk = new THREE.Group(); chunk.name = 'chunk_' + c; chunk.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), lambert(c))); s3.scene.add(chunk); s3._loadedChunks[c] = chunk;
      const before = renders.length;
      expect(WARM.rrWarmStage(s3, THREE, now)).toBe(true);
      expect(renders.length).toBe(before);
      expect(WARM.rrWarmChunkBudget(s3)).toBe(0);
      while (WARM.rrWarmStage(s3, THREE, now)) { /* draw */ }
    }
    expect(WARM.rrWarmChunkBudget(s3)).toBe(0);
    expect(WARM.rrWarmDone(s3, true)).toBe(true);
    WARM.rrWarmFinish(s3);                                            // now everything is back in view, chunks included
    let off = 0; s3.scene.traverse((o) => { if (o.isMesh && o.layers.mask !== 1) off++; });
    expect(off).toBe(0);
  });

  it('where even a plain draw is slow (software drawing) the steps are bigger, so there are fewer draws', () => {
    const run = (cheapDrawMs) => { const st = stagedScene(cheapDrawMs); WARM.rrWarmStage(st.s3, THREE, st.now); let guard = 0; while (WARM.rrWarmStage(st.s3, THREE, st.now) && guard++ < 500) { /* draw */ } return st; };
    const fast = run(3), slow = run(45);
    expect(fast.s3._rrWarm.slow).toBeFalsy();
    expect(slow.s3._rrWarm.slow).toBe(true);
    expect(slow.renders.length).toBeLessThan(fast.renders.length);
    expect(slow.renders.reduce((n, r) => n + r.shown, 0)).toBe(slow.things.length);   // still every object once
    expect(fast.renders.reduce((n, r) => n + r.shown, 0)).toBe(fast.things.length);
    // a device the graphics profile already knows to draw without a chip: one step from the start
    const soft = stagedScene(3); soft.s3._gfx = { profile: { level: 'low', reason: 'software_gl' } };
    expect(WARM.rrWarmStage(soft.s3, THREE, soft.now)).toBe(true);
    expect(WARM.rrWarmStage(soft.s3, THREE, soft.now)).toBe(false);
    expect(soft.renders.length).toBe(1);
    expect(soft.renders[0].shown).toBe(soft.things.length);
  });

  it('rrWarmFinish puts back whatever is still waiting, and a stuck start-up ends by itself', () => {
    const { s3, things, now } = stagedScene();
    WARM.rrWarmStage(s3, THREE, now); WARM.rrWarmStage(s3, THREE, now);
    expect(things.some((m) => m.layers.mask === 0)).toBe(true);
    s3._rrWarm.ticks = 901;
    expect(WARM.rrWarmDone(s3, true)).toBe(true);
    WARM.rrWarmFinish(s3);
    expect(things.every((m) => m.layers.mask === 1)).toBe(true);
    expect(s3._rrWarm).toBe(null);
    expect(WARM.rrWarmStage(s3, THREE, now)).toBe(false);
    expect(WARM.rrWarmDone(s3, true)).toBe(true);
  });
});

describe('headlights, snow, sky and the curb (rn31)', () => {
  it('a headlight cone has its point at the lamp, opens away from the car and fades out', () => {
    const geo = LOOK.rrBeamConeGeometry(THREE, 1.0, 9);
    const pos = geo.attributes.position, col = geo.attributes.color;
    let lamp = -1, far = -1;
    for (let i = 0; i < pos.count; i++) { if (pos.getY(i) > 4.49) lamp = i; if (pos.getY(i) < -4.49) far = i; }
    expect(Math.hypot(pos.getX(lamp), pos.getZ(lamp))).toBeLessThan(1e-6);      // the point
    expect(Math.hypot(pos.getX(far), pos.getZ(far))).toBeCloseTo(1.0, 5);       // the open end
    expect(col.getX(lamp)).toBeCloseTo(1, 6); expect(col.getX(far)).toBe(0);
    // local +y (the point) is turned to the back of the car: rotation.z = +90 degrees maps +y to -x, and +x is forward
    const tip = new THREE.Vector3(0, 4.5, 0).applyEuler(new THREE.Euler(0, 0, Math.PI / 2 - 0.035));
    expect(tip.x).toBeLessThan(-4.4);
    expect(SOURCE).toContain('var beamGeo = rrBeamConeGeometry(T, 1.0, 9);');
    expect(SOURCE).toContain('beam.rotation.z = Math.PI / 2 - 0.035;');
    expect(SOURCE).toContain('var coneGeo = rrBeamConeGeometry(T, 0.9, 4.5);');
    expect(SOURCE).toContain('cone.rotation.z = Math.PI / 2;');
    expect(SOURCE).not.toContain('new T.ConeGeometry(1.8, 9, 12, 1, true)');
    // the lamps aim in the car frame
    expect(SOURCE).toContain('s3.headlightL.target.position.set(hlTargetDist, 0, -0.3);');
    expect(SOURCE).not.toContain('carWorldX + Math.cos(car.heading) * hlTargetDist');
    // the lamps, their light on the road and the fog veil are in a group of their own that follows the car and is
    // not hidden with the car body in the cockpit camera (so the number of lights never changes with the camera)
    for (const child of ['headlightL', 'headlightL.target', 'headlightR', 'headlightR.target', 'pool', 'veil']) expect(SOURCE).toContain('playerLightGroup.add(' + child + ');');
    expect(SOURCE).not.toContain('playerCarGroup.add(headlightL);');
    expect(SOURCE).toContain('s3.playerLightGroup.position.copy(s3.playerCarGroup.position);');
    expect(SOURCE).toContain('s3.playerLightGroup.quaternion.copy(s3.playerCarGroup.quaternion);');
    expect(SOURCE).toContain("child.visible = scn.weather === 'fog' && !!(d && d.highBeams);");
  });

  it('snowflakes are round, soft and capped in size; the sprites need no canvas element', () => {
    const shader = { vertexShader: THREE.ShaderLib.points.vertexShader };
    LOOK.rrSnowPointCompile(shader);
    expect(shader.vertexShader).toContain('gl_PointSize = clamp( gl_PointSize, 3.0, max( 3.0, scale * 0.045 ) );');
    expect(shader.vertexShader.indexOf('gl_PointSize = clamp')).toBeGreaterThan(shader.vertexShader.indexOf('gl_PointSize *= ( scale / - mvPosition.z );'));
    expect(SOURCE).toContain("var sTex = rrSoftSpriteTexture(T, 'flake');");
    expect(SOURCE).toContain('sMat.onBeforeCompile = rrSnowPointCompile;');
    const made = vi.spyOn(document, 'createElement');
    const flake = LOOK.rrSoftSpriteTexture(THREE, 'flake');
    expect(made).not.toHaveBeenCalled();
    made.mockRestore();
    expect(flake.isDataTexture).toBe(true);
    expect([flake.image.width, flake.image.height]).toEqual([32, 32]);
    const alphaAt = (tex, x, y) => tex.image.data[(y * tex.image.width + x) * 4 + 3];
    expect(alphaAt(flake, 16, 16)).toBe(255);                 // solid in the middle
    expect(alphaAt(flake, 22, 16)).toBe(255);                 // ... out to 70% of the radius
    expect(alphaAt(flake, 29, 16)).toBeLessThan(120);         // soft edge
    for (const [x, y] of [[0, 0], [31, 0], [0, 31], [31, 31], [0, 16], [16, 0]]) expect(alphaAt(flake, x, y)).toBeLessThan(12); // round: nothing in the corners or at the rim
    expect(flake.image.data[0]).toBe(255);                    // white; only the alpha changes
    const pool = LOOK.rrSoftSpriteTexture(THREE, 'pool');
    expect(alphaAt(pool, 16, 16)).toBeGreaterThan(240);
    expect(alphaAt(pool, 23, 16)).toBeLessThan(alphaAt(pool, 19, 16));
    const cloud = LOOK.rrSoftSpriteTexture(THREE, 'cloud');
    expect([cloud.image.width, cloud.image.height]).toEqual([128, 32]);
    for (let x = 0; x < 128; x++) { expect(alphaAt(cloud, x, 0)).toBeLessThan(40); expect(alphaAt(cloud, x, 31)).toBeLessThan(40); } // fades out before the plane's long edges
    for (let y = 0; y < 32; y++) { expect(alphaAt(cloud, 0, y)).toBe(0); expect(alphaAt(cloud, 127, y)).toBe(0); }
    expect(alphaAt(cloud, 64, 16)).toBeGreaterThan(180);
    for (let x = 24; x <= 104; x++) expect(alphaAt(cloud, x, 16)).toBeGreaterThan(110); // one streak, not a row of dots
  });

  it('the sun and the moon are named, travel with the car and are the only things the halo follows', () => {
    expect(SOURCE).toContain("skyAnchor.name = 'rr_sky_anchor';");
    for (const body of ['moon', 'dawnSun', 'sunSphere']) expect(SOURCE).toContain(body + ".name = 'rr_celestial';\n            skyAnchor.add(" + body + ');');
    expect(SOURCE).toContain("if (obj.name === 'rr_celestial' && obj.position.y > bestY) {");
    expect(SOURCE).not.toContain("obj.geometry.type === 'SphereGeometry'\n                  && obj.material && obj.material.color && obj.position.y > 8");
    expect(SOURCE).toContain('s3._haloRef.visible = !!s3._haloTarget;');
    expect(SOURCE).toContain('if (s3._skyAnchorRef) s3._skyAnchorRef.position.set(carWorldX, 0, carWorldZ);');
    expect(SOURCE).toContain('if (s3.cloudGroup) s3.cloudGroup.position.set(carWorldX, 0, carWorldZ);');
    // sky, mountains, forest line: a fixed drawing order
    expect(SOURCE).toContain('skyMesh.renderOrder = -30;');
    expect(SOURCE).toContain('mtnMesh.renderOrder = -20;');
    expect(SOURCE).toContain('fMesh.renderOrder = -10;');
    expect(SOURCE).toContain("var hcTex = rrSoftSpriteTexture(T, 'cloud');");
  });

  it('the curb is turned along the road: the road tangent is (sin h, cos h), so a block is turned by +h', () => {
    const world = RR.createScenarioWorld({ id: 'rural', speedLimit: 50 });
    let worst = 0, bend = 0;
    for (let s = 20; s < 600; s += 7) {
      const h = world.spline.headingAt(s), dx = world.spline.centerAt(s + 0.5) - world.spline.centerAt(s - 0.5);
      const tangent = new THREE.Vector3(dx, 0, 1).normalize();
      const block = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, h, 0));       // the long axis of a curb block turned by +h
      const wrong = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, -h, 0));
      worst = Math.max(worst, block.angleTo(tangent));
      bend = Math.max(bend, wrong.angleTo(tangent));
    }
    expect(worst).toBeLessThan(0.06);
    expect(bend).toBeGreaterThan(0.2);                                 // the old sign was off by twice the heading on a bend
    expect(SOURCE).toContain('curb.rotation.y = cbHd;');
    expect(SOURCE).not.toContain('curb.rotation.y = -cbHd;');
  });

  it('the K photo draws the frame again and copies at once, so the canvas need not keep its picture', () => {
    expect(SOURCE).toContain('antialias: !!RR_GFX_LEVELS[gfxStartLevel].antialias, preserveDrawingBuffer: false });');
    const photo = SOURCE.slice(SOURCE.indexOf('      var takePhoto = function() {'), SOURCE.indexOf("addToast('📸 Photo saved');"));
    expect(photo.indexOf('photoScene._rrRedraw();')).toBeGreaterThan(0);
    expect(photo.indexOf('photoScene._rrRedraw();')).toBeLessThan(photo.indexOf('octx.drawImage(gl3d, 0, 0, w, hH);'));
    // the frame's own drawing is that function: the main view, then the mirror passes
    const from = SOURCE.indexOf('          var rrDrawFrame = function() {');
    const to = SOURCE.indexOf('          rrDrawFrame();\n          s3._rrRedraw = rrDrawFrame;', from);
    expect(from).toBeGreaterThan(0); expect(to).toBeGreaterThan(from);
    const draw = SOURCE.slice(from, to);
    expect(draw).toContain('var _ac=gfxComposer; if(_ac){');
    expect(draw).toContain("rrGfxMirrorPass(s3, T, 'rear'");
    expect(draw.split('shadowMap.needsUpdate = true').length).toBe(2);
  });
});
