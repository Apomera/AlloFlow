import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_DORSAL_WAIST_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const registration = "window.StemLab.registerTool('dinoLab'";
if (!source.includes(registration)) throw new Error('Dino Lab registration missing');
window.StemLab = { registerTool() {} };
new Function(source.replace(registration,
  'globalThis.__dorsalWaist = { DINOS, postcranialSurfaceProfileFor, dinoSurfaceGeometry, dinoCranialGeometry, dinoTorsoRadii };' + registration))();
const art = globalThis.__dorsalWaist;
delete globalThis.__dorsalWaist;
const vec = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b <= a) throw new Error('Missing native construction section: ' + start);
  return source.slice(a, b);
}
const chainCode = section('function addSoftTissueChain(', 'function addContourGroup(meshes)');
const torsoCode = section('var cladeName = String(dn.clade', 'function dorsalSurfacePoint(t)');
const inContext = (code, result, context) => new Function('context', 'with (context) {' + code + '\nreturn ' + result + ';}')(context);

// Exercise the actual torso caller with catalog profiles, including its hidden-body gate.
function build(id, scale = 1, showBody = true, suppressProfileGate = false) {
  const dn = art.DINOS.find(d => d.id === id);
  if (!dn) throw new Error('Missing catalog species ' + id);
  const profile = art.postcranialSurfaceProfileFor(dn);
  const originalProfile = JSON.stringify(profile);
  if (suppressProfileGate) profile.id = 'test-legacy-envelope';
  const model = new THREE.Group(), material = new THREE.MeshPhongMaterial();
  const context = {
    THREE, vec, ...art, model, bodyMat: material, props: { showBody }, dn,
    bodyLen: 2.88 * scale, bodyHeight: .58 * scale, bodyDepth: .70 * scale,
    shoulder: vec(-1.44, 1.45, 0).multiplyScalar(scale), hip: vec(1.44, 1.30, 0).multiplyScalar(scale),
    postcranialSurface: profile, isSauropod: dn.group === 'sauropod',
    surfaceHypothesis: { bodyHeightScale: 1, bodyDepthScale: 1 }, idleMotion: {}
  };
  const calls = [];
  context.addSoftTissueChain = (...args) => {
    calls.push(args);
    return inContext(chainCode, 'addSoftTissueChain', context)(...args);
  };
  const result = inContext(torsoCode, '({ bodyShell, torsoPoints, torsoRadii, surfaceBodyHeight, surfaceBodyDepth })', context);
  return { ...result, context, calls, model, material, originalProfile,
    dispose() { model.children.forEach(m => m.geometry?.dispose()); material.dispose(); } };
}

function geometryState(g) {
  return { position: Array.from(g.attributes.position.array), normal: Array.from(g.attributes.normal.array),
    uv: Array.from(g.attributes.uv.array), index: Array.from(g.index.array),
    box: [g.boundingBox.min.toArray(), g.boundingBox.max.toArray()], sphere: [g.boundingSphere.center.toArray(), g.boundingSphere.radius] };
}
function protectEnvelope(before, after, rings = 48, sides = 24) {
  expect(after.attributes.position.count).toBe(before.attributes.position.count);
  expect(Array.from(after.attributes.uv.array)).toEqual(Array.from(before.attributes.uv.array));
  expect(Array.from(after.index.array)).toEqual(Array.from(before.index.array));
  const p = before.attributes.position, q = after.attributes.position;
  let raised = 0, maximumLift = 0, coordinateFailures = 0;
  for (let i = 0; i < p.count; i++) {
    if (q.getX(i) !== p.getX(i) || q.getZ(i) !== p.getZ(i)) coordinateFailures++;
    const ring = Math.floor(i / (sides + 1)), column = i % (sides + 1);
    const protectedVertex = ring <= rings / 3 || ring >= rings * 2 / 3 ||
      (column >= sides / 4 && column <= sides * 3 / 4);
    if (protectedVertex && q.getY(i) !== p.getY(i)) coordinateFailures++;
    if (q.getY(i) < p.getY(i)) coordinateFailures++;
    if (q.getY(i) > p.getY(i)) { raised++; maximumLift = Math.max(maximumLift, q.getY(i) - p.getY(i)); }
  }
  expect(coordinateFailures).toBe(0);
  expect(raised).toBeGreaterThan(0);
  expect(after.boundingBox.min.toArray()).toEqual(before.boundingBox.min.toArray());
  expect(after.boundingBox.max.x).toBe(before.boundingBox.max.x);
  expect(after.boundingBox.max.z).toBe(before.boundingBox.max.z);
  expect(after.boundingBox.max.y).toBeGreaterThanOrEqual(before.boundingBox.max.y);
  expect(after.boundingBox.max.y - before.boundingBox.max.y).toBeLessThanOrEqual(maximumLift + 1e-7);
  return maximumLift;
}
function checkNormals(g, rings = 48, sides = 24) {
  const p = g.attributes.position, n = g.attributes.normal;
  let maxLengthError = 0, maxSeamError = 0;
  for (let i = 0; i < n.count; i++) {
    const normal = vec().fromBufferAttribute(n, i);
    if (!normal.toArray().every(Number.isFinite)) throw new Error('Non-finite surface normal at ' + i);
    maxLengthError = Math.max(maxLengthError, Math.abs(normal.length() - 1));
  }
  for (let ring = 0; ring <= rings; ring++) {
    const first = ring * (sides + 1), last = first + sides;
    maxSeamError = Math.max(maxSeamError, vec().fromBufferAttribute(n, first).distanceTo(vec().fromBufferAttribute(n, last)));
  }
  expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
  expect(maxLengthError).toBeLessThan(1e-6);
  expect(maxSeamError).toBeLessThan(2e-6);
}
function checkClosedOutward(g, scale) {
  // Weld the duplicated texture seam only for the topological audit.
  const p = g.attributes.position, index = g.index, unique = new Map(), ids = [], edges = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = [p.getX(i), p.getY(i), p.getZ(i)].map(v => Math.round(v / (scale * 1e-6))).join(',');
    if (!unique.has(key)) unique.set(key, unique.size);
    ids.push(unique.get(key));
  }
  let volume = 0, minimumAreaSquared = Infinity;
  const a = vec(), b = vec(), c = vec(), ab = vec(), ac = vec(), cross = vec();
  for (let offset = 0; offset < index.count; offset += 3) {
    const ai = index.getX(offset), bi = index.getX(offset + 1), ci = index.getX(offset + 2);
    a.fromBufferAttribute(p, ai); b.fromBufferAttribute(p, bi); c.fromBufferAttribute(p, ci);
    cross.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
    minimumAreaSquared = Math.min(minimumAreaSquared, cross.lengthSq());
    volume += a.dot(cross.crossVectors(b, c)) / 6;
    for (const [from, to] of [[ids[ai], ids[bi]], [ids[bi], ids[ci]], [ids[ci], ids[ai]]]) {
      if (from === to) throw new Error('Collapsed welded edge');
      const key = Math.min(from, to) + ':' + Math.max(from, to);
      const edge = edges.get(key) || [0, 0]; edge[0]++; edge[1] += from < to ? 1 : -1; edges.set(key, edge);
    }
  }
  expect(minimumAreaSquared / scale ** 4).toBeGreaterThan(1e-14);
  expect(volume / scale ** 3).toBeGreaterThan(0);
  expect([...edges.values()].every(([count, orientation]) => count === 2 && orientation === 0)).toBe(true);
  expect(unique.size - edges.size + index.count / 3).toBe(2);
}

describe('Dino Lab bounded tyrannosauroid dorsal torso surface', () => {
  for (const id of ['tyrannosaurus', 'yutyrannus', 'dilong']) for (const scale of [.03, 1, 12]) {
    it('raises only the dorsal waist while preserving native construction for ' + id + ' at scale ' + scale, () => {
      const actual = build(id, scale), legacy = build(id, scale, true, true);
      try {
        expect(actual.context.postcranialSurface.id).toBe('powerful-theropod');
        expect(actual.bodyShell.geometry.userData.dinoDorsalWaist).toBeTruthy();
        expect(legacy.bodyShell.geometry.userData.dinoDorsalWaist).toBeFalsy();
        expect(actual.torsoPoints.map(p => p.toArray())).toEqual(legacy.torsoPoints.map(p => p.toArray()));
        expect(actual.torsoRadii).toEqual(legacy.torsoRadii);
        expect(JSON.stringify(actual.context.postcranialSurface)).toBe(actual.originalProfile);
        expect(actual.model.children).toHaveLength(1);
        expect(actual.bodyShell.position.toArray()).toEqual(legacy.bodyShell.position.toArray());
        expect(actual.bodyShell.quaternion.toArray()).toEqual(legacy.bodyShell.quaternion.toArray());
        expect(actual.bodyShell.scale.toArray()).toEqual(legacy.bodyShell.scale.toArray());
        expect(actual.bodyShell.material).toBe(actual.material);
        expect(actual.bodyShell.castShadow).toBe(legacy.bodyShell.castShadow);
        expect(actual.bodyShell.receiveShadow).toBe(legacy.bodyShell.receiveShadow);
        expect(actual.bodyShell.name).toBe('continuous-torso');
        expect(actual.bodyShell.userData.dinoRegion).toBe('torso');
        expect(actual.context.idleMotion.body).toBe(actual.bodyShell);
        expect(actual.context.idleMotion.bodyBaseScale.toArray()).toEqual(legacy.context.idleMotion.bodyBaseScale.toArray());
        const lift = protectEnvelope(legacy.bodyShell.geometry, actual.bodyShell.geometry);
        expect(lift / actual.surfaceBodyHeight).toBeGreaterThan(.10);
        expect(lift / actual.surfaceBodyHeight).toBeLessThan(.20);
        checkNormals(actual.bodyShell.geometry); checkClosedOutward(actual.bodyShell.geometry, scale);
      } finally { actual.dispose(); legacy.dispose(); }
    });
  }

  for (const id of ['brachiosaurus', 'diplodocus', 'triceratops', 'spinosaurus', 'therizinosaurus', 'velociraptor']) {
    it('retains the original native torso geometry and options for ' + id, () => {
      const actual = build(id);
      const options = id === 'diplodocus' ? { smoothProfile: true, compactChest: true } : { smoothProfile: true };
      const original = art.dinoSurfaceGeometry(THREE, actual.torsoPoints, actual.torsoRadii, options);
      original.translate(-actual.torsoPoints[0].x, -actual.torsoPoints[0].y, -actual.torsoPoints[0].z);
      try {
        expect(actual.bodyShell.geometry.userData.dinoDorsalWaist).toBeFalsy();
        expect(geometryState(actual.bodyShell.geometry)).toEqual(geometryState(original));
        expect(JSON.stringify(actual.context.postcranialSurface)).toBe(actual.originalProfile);
      } finally { actual.dispose(); original.dispose(); }
    });
  }

  for (const id of ['tyrannosaurus', 'yutyrannus', 'dilong']) it('creates no surface or motion entry when the body is hidden for ' + id, () => {
    const actual = build(id, 1, false);
    try { expect(actual.bodyShell).toBeNull(); expect(actual.model.children).toHaveLength(0); expect(actual.context.idleMotion.body).toBeUndefined(); }
    finally { actual.dispose(); }
  });
});

function loft(scale = 1, direction = vec(1, 0, 0)) {
  const points = [-3, -2, -1, 0, 1, 2, 3].map(t => direction.clone().multiplyScalar(t * scale).add(vec(.2, .3, -.4).multiplyScalar(scale)));
  const profile = art.postcranialSurfaceProfileFor(art.DINOS.find(d => d.id === 'tyrannosaurus'));
  return { points, radii: art.dinoTorsoRadii(.6 * scale, .7 * scale, profile) };
}

describe('Dorsal loft locality, silhouette and geometry invariants', () => {
  for (const direction of [vec(1, 0, 0), vec(1, .18, 0), vec(1, -.18, 0), vec(1, .12, .20), vec(1, -.12, -.20)]) {
    it('preserves every lateral coordinate and protected section for direction ' + direction.toArray().join(','), () => {
      const { points, radii } = loft(1, direction), pointsBefore = points.map(p => p.toArray()), radiiBefore = radii.map(r => r.slice());
      const original = art.dinoSurfaceGeometry(THREE, points, radii, { smoothProfile: true });
      const refined = art.dinoSurfaceGeometry(THREE, points, radii, { smoothProfile: true, dorsalWaist: true });
      try { protectEnvelope(original, refined); checkNormals(refined); checkClosedOutward(refined, 1); expect(points.map(p => p.toArray())).toEqual(pointsBefore); expect(radii).toEqual(radiiBefore); }
      finally { original.dispose(); refined.dispose(); }
    });
  }

  for (const scale of [.03, 1, 12]) it('removes the saddle without adding dorsal peaks or changing the entire bounding box at scale ' + scale, () => {
    const { points, radii } = loft(scale);
    const original = art.dinoSurfaceGeometry(THREE, points, radii, { smoothProfile: true, rings: 240 });
    const refined = art.dinoSurfaceGeometry(THREE, points, radii, { smoothProfile: true, dorsalWaist: true, rings: 240 });
    try {
      const p = refined.attributes.position, old = original.attributes.position, first = 80, last = 160, centerY = points[3].y;
      const tops = Array.from({ length: last - first + 1 }, (_, i) => p.getY((i + first) * 25));
      const oldTops = Array.from({ length: last - first + 1 }, (_, i) => old.getY((i + first) * 25));
      const ceilingLow = centerY + Math.min(radii[2][0], radii[4][0]);
      expect(Math.min(...oldTops)).toBeLessThan(ceilingLow - .08 * scale);
      expect(Math.min(...tops)).toBeGreaterThanOrEqual(ceilingLow - scale * 1e-6);
      let increasingSteps = 0;
      for (let i = 1; i < tops.length; i++) if (tops[i] - tops[i - 1] > scale * 1e-6) increasingSteps++;
      expect(increasingSteps).toBe(0);
      expect(tops[0]).toBe(oldTops[0]); expect(tops[tops.length - 1]).toBe(oldTops[oldTops.length - 1]);
      const middleSlope = Math.abs(tops[41] - tops[39]);
      expect(Math.abs(tops[1] - tops[0])).toBeLessThan(middleSlope * .06);
      expect(Math.abs(tops[80] - tops[79])).toBeLessThan(middleSlope * .06);
      expect(refined.boundingBox.min.toArray()).toEqual(original.boundingBox.min.toArray());
      expect(refined.boundingBox.max.toArray()).toEqual(original.boundingBox.max.toArray());
      checkNormals(refined, 240);
    } finally { original.dispose(); refined.dispose(); }
  });

  for (const value of [false, undefined, 'true']) it('keeps geometry byte-identical without explicit dorsal opt-in ' + value, () => {
    const { points, radii } = loft();
    const original = art.dinoSurfaceGeometry(THREE, points, radii, { smoothProfile: true });
    const actual = art.dinoSurfaceGeometry(THREE, points, radii, { smoothProfile: true, dorsalWaist: value });
    try { expect(geometryState(actual)).toEqual(geometryState(original)); expect(actual.userData.dinoDorsalWaist).toBeFalsy(); }
    finally { original.dispose(); actual.dispose(); }
  });

  for (const shape of ['points', 'radii', 'unsmoothed']) it('does not apply the torso bridge to an incompatible ' + shape + ' loft', () => {
    const { points, radii } = loft();
    const p = shape === 'points' ? points.slice(0, 6) : points, r = shape === 'radii' ? radii.slice(0, 6) : radii;
    const options = { smoothProfile: shape !== 'unsmoothed' };
    const original = art.dinoSurfaceGeometry(THREE, p, r, options);
    const actual = art.dinoSurfaceGeometry(THREE, p, r, { ...options, dorsalWaist: true });
    try { expect(geometryState(actual)).toEqual(geometryState(original)); expect(actual.userData.dinoDorsalWaist).toBeFalsy(); }
    finally { original.dispose(); actual.dispose(); }
  });
});
