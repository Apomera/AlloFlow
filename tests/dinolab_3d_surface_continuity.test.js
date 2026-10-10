import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { internals } from './helpers/dino_lab_harness.js';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const { dinoSurfaceGeometry, dinoLoftRadius } = internals();
const SCALES = [0.03, 1, 12];
const RINGS = 48, SIDES = 24, STRIDE = SIDES + 1;
const vectorAt = (attribute, i) => new THREE.Vector3().fromBufferAttribute(attribute, i);
const curveFor = points => new THREE.CatmullRomCurve3(points, false, 'centripetal');

function sectionRadius(radii, t, axis, smooth) {
  const station = t * (radii.length - 1);
  if (smooth) return Math.max(0.001, dinoLoftRadius(radii, station, axis));
  const i = Math.min(radii.length - 2, Math.floor(station)), fraction = station - i;
  const f = fraction * fraction * (3 - 2 * fraction);
  const a = Array.isArray(radii[i]) ? radii[i][axis] : radii[i];
  const b = Array.isArray(radii[i + 1]) ? radii[i + 1][axis] : radii[i + 1];
  return Math.max(0.001, a + (b - a) * f);
}

function expectVector(actual, expected, tolerance) {
  expect(actual.distanceTo(expected)).toBeLessThan(tolerance);
}

// Weld only coincident positions to inspect the actual closed surface despite
// the duplicated longitudinal UV seam. Every oriented edge must have a mate.
function inspectClosedGeometry(geometry, scale) {
  const p = geometry.attributes.position, n = geometry.attributes.normal, uv = geometry.attributes.uv;
  const tolerance = scale * 1e-6, vertices = [], welded = [], edges = new Map(), used = new Set();
  for (let i = 0; i < p.count; i++) {
    const v = vectorAt(p, i), normal = vectorAt(n, i);
    expect(v.toArray().every(Number.isFinite)).toBe(true);
    expect(normal.toArray().every(Number.isFinite)).toBe(true);
    expect(normal.length()).toBeCloseTo(1, 5);
    expect(Number.isFinite(uv.getX(i) + uv.getY(i))).toBe(true);
    expect(uv.getX(i)).toBeGreaterThanOrEqual(0); expect(uv.getX(i)).toBeLessThanOrEqual(1);
    expect(uv.getY(i)).toBeGreaterThanOrEqual(0); expect(uv.getY(i)).toBeLessThanOrEqual(1);
    expect(geometry.boundingBox.containsPoint(v)).toBe(true);
    expect(v.distanceTo(geometry.boundingSphere.center)).toBeLessThanOrEqual(geometry.boundingSphere.radius + tolerance);
    // A positional search avoids quantization-bin artifacts near zero.
    let id = welded.findIndex(other => other.distanceToSquared(v) < tolerance * tolerance);
    if (id < 0) { id = welded.length; welded.push(v); }
    vertices.push({ p: v, id });
  }
  const indices = geometry.index.array;
  let volume = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [vertices[indices[i]], vertices[indices[i + 1]], vertices[indices[i + 2]]];
    const cross = new THREE.Vector3().subVectors(b.p, a.p).cross(new THREE.Vector3().subVectors(c.p, a.p));
    expect(cross.lengthSq()).toBeGreaterThan(Math.pow(scale, 4) * 1e-16);
    volume += a.p.dot(new THREE.Vector3().crossVectors(b.p, c.p)) / 6;
    for (const [from, to] of [[a.id, b.id], [b.id, c.id], [c.id, a.id]]) {
      expect(from).not.toBe(to); used.add(from); used.add(to);
      const low = Math.min(from, to), key = low + ':' + Math.max(from, to);
      const edge = edges.get(key) || { count: 0, winding: 0 };
      edge.count++; edge.winding += from === low ? 1 : -1; edges.set(key, edge);
    }
  }
  for (const edge of edges.values()) { expect(edge.count).toBe(2); expect(edge.winding).toBe(0); }
  expect(used.size - edges.size + indices.length / 3).toBe(2);
  expect(volume).toBeGreaterThan(Math.pow(scale, 3) * 1e-5);
  return volume;
}

function sidewaysPoints(scale, mirror) {
  return [[0, 0, 0], [0.45, 0.16, 0.4], [0.55, 0.2, 1.6], [0.9, 0.55, 2.8], [1.7, 0.65, 3.2]]
    .map(([x, y, z]) => new THREE.Vector3(x, y, z * mirror).multiplyScalar(scale));
}

describe('Dino Lab continuous sections around sideways limb bends', () => {
  for (const scale of SCALES) for (const mirror of [-1, 1]) {
    it('carries an elliptical section smoothly across both reference-axis crossings at scale ' + scale + ', mirror ' + mirror, () => {
      const points = sidewaysPoints(scale, mirror), radii = [[0.17, 0.11], [0.14, 0.095], [0.1, 0.065], [0.075, 0.04]].map(pair => pair.map(r => r * scale));
      const originalPoints = points.map(p => p.toArray()), originalRadii = structuredClone(radii);
      const geometry = dinoSurfaceGeometry(THREE, points, radii, { smoothProfile: true });
      const curve = curveFor(points), p = geometry.attributes.position;
      let previous = null, previousTangent = null, crossings = 0, previousReference = null;
      for (let ring = 0; ring <= RINGS; ring++) {
        const t = ring / RINGS, center = curve.getPoint(t), tangent = curve.getTangent(t).normalize();
        const offset = vectorAt(p, ring * STRIDE).sub(center), normal = offset.clone().normalize();
        const otherOffset = vectorAt(p, ring * STRIDE + SIDES / 4).sub(center), binormal = otherOffset.clone().normalize();
        const reference = Math.abs(tangent.z) < 0.9;
        if (previousReference !== null && reference !== previousReference) crossings++;
        previousReference = reference;
        expect(Math.abs(normal.dot(tangent))).toBeLessThan(2e-5);
        expect(Math.abs(binormal.dot(tangent))).toBeLessThan(2e-5);
        expect(Math.abs(normal.dot(binormal))).toBeLessThan(2e-5);
        expect(new THREE.Vector3().crossVectors(normal, binormal).dot(tangent)).toBeGreaterThan(0.99999);
        expect(Math.abs(offset.length() - sectionRadius(radii, t, 0, true))).toBeLessThan(scale * 2e-6);
        expect(Math.abs(otherOffset.length() - sectionRadius(radii, t, 1, true))).toBeLessThan(scale * 2e-6);
        if (previous) {
          // A short bend must not produce a quarter/half-turn of the section.
          expect(normal.dot(previous)).toBeGreaterThan(0.97);
          const sectionAngle = normal.angleTo(previous), tangentAngle = tangent.angleTo(previousTangent);
          expect(sectionAngle).toBeLessThanOrEqual(tangentAngle + 2e-5);
        }
        previous = normal; previousTangent = tangent;
      }
      expect(crossings).toBeGreaterThanOrEqual(2);
      inspectClosedGeometry(geometry, scale);
      expect(points.map(p => p.toArray())).toEqual(originalPoints); expect(radii).toEqual(originalRadii);
      geometry.dispose();
    });
  }
});

describe('Dino Lab established planar loft shape', () => {
  for (const scale of SCALES) for (const elliptical of [false, true]) for (const smooth of [false, true]) {
    it('preserves planar stations, radii, UVs and triangle order at scale ' + scale + ', ellipse ' + elliptical + ', smooth ' + smooth, () => {
      const points = [[0, 0, 0], [0.9, 0.12, 0], [2, 0.35, 0], [3, 0.28, 0]].map(p => new THREE.Vector3(...p).multiplyScalar(scale));
      const radii = (elliptical ? [[0.45, 0.3], [0.52, 0.37], [0.31, 0.24], [0.09, 0.06]] : [0.45, 0.52, 0.31, 0.09])
        .map(r => Array.isArray(r) ? r.map(n => n * scale) : r * scale);
      const geometry = dinoSurfaceGeometry(THREE, points, radii, { smoothProfile: smooth });
      const curve = curveFor(points), expectedUV = [], expectedIndices = [];
      for (let ring = 0; ring <= RINGS; ring++) {
        const t = ring / RINGS, center = curve.getPoint(t), tangent = curve.getTangent(t).normalize();
        // In the original XY plane, the normal is exactly the left-hand
        // perpendicular and the binormal is the fixed positive Z direction.
        const normal = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
        for (let side = 0; side <= SIDES; side++) {
          const angle = side / SIDES * Math.PI * 2;
          const expected = center.clone().addScaledVector(normal, Math.cos(angle) * sectionRadius(radii, t, 0, smooth));
          expected.z += Math.sin(angle) * sectionRadius(radii, t, 1, smooth);
          expectVector(vectorAt(geometry.attributes.position, ring * STRIDE + side), expected, scale * 4e-7);
          expectedUV.push(t, side / SIDES);
          if (ring < RINGS && side < SIDES) {
            const n = ring * STRIDE + side;
            expectedIndices.push(n, n + 1, n + STRIDE, n + 1, n + STRIDE + 1, n + STRIDE);
          }
        }
      }
      for (const ring of [0, RINGS]) {
        const centerIndex = (RINGS + 1) * STRIDE + (ring === 0 ? 0 : 1);
        expectVector(vectorAt(geometry.attributes.position, centerIndex), curve.getPoint(ring / RINGS), scale * 4e-7);
        expectedUV.push(ring / RINGS, 0.5);
        for (let side = 0; side < SIDES; side++) {
          const n = ring * STRIDE + side;
          if (ring === 0) expectedIndices.push(centerIndex, n + 1, n);
          else expectedIndices.push(centerIndex, n, n + 1);
        }
      }
      expect([...geometry.attributes.uv.array]).toEqual([...new Float32Array(expectedUV)]);
      expect([...geometry.index.array]).toEqual(expectedIndices);
      expect(geometry.attributes.position.count).toBe(1227); expect(geometry.index.count / 3).toBe(2352);
      inspectClosedGeometry(geometry, scale); geometry.dispose();
    });
  }
});

describe('Dino Lab default cap compatibility', () => {
  it('keeps flat caps and custom resolution when no rounded-cap option is supplied', () => {
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(3, 0, 0)], radii = [[0.5, 0.28], [0.4, 0.2]];
    const geometry = dinoSurfaceGeometry(THREE, points, radii, { rings: 8, sides: 12 });
    expect(geometry.attributes.position.count).toBe(119); expect(geometry.index.count / 3).toBe(216);
    expectVector(vectorAt(geometry.attributes.position, 117), points[0], 1e-7);
    expectVector(vectorAt(geometry.attributes.position, 118), points[1], 1e-7);
    inspectClosedGeometry(geometry, 1); geometry.dispose();
  });
});

// Capture only the new pure radius helper. The existing harness continues to
// provide the actual registered module's loft and interpolation functions.
const torsoSource = readFileSync(resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const torsoStart = torsoSource.indexOf('  function dinoTorsoRadii(');
if (torsoStart < 0) throw new Error('Dino torso radius helper missing');
const torsoOpening = torsoSource.indexOf('{', torsoStart);
let torsoDepth = 1, torsoEnd = torsoOpening + 1;
for (; torsoDepth && torsoEnd < torsoSource.length; torsoEnd++) {
  if (torsoSource[torsoEnd] === '{') torsoDepth++;
  if (torsoSource[torsoEnd] === '}') torsoDepth--;
}
const dinoTorsoRadii = new Function(torsoSource.slice(torsoStart, torsoEnd) + '\nreturn dinoTorsoRadii;')();

// These six established stations retain shoulder, ribcage, belly, pelvis and
// rump dimensions. Only the small front closure ring is allowed to shrink.
function establishedTorsoStations(height, depth, profile) {
  return [
    [height * 0.76 * profile.shoulderFullness, depth * 0.88 * profile.shoulderFullness],
    [height * 0.96 * profile.shoulderFullness, depth * 0.96 * profile.ribcageFullness],
    [height * 0.91 * profile.bellyFullness, depth * 0.94 * profile.bellyFullness],
    [height * 0.88 * profile.pelvicFullness, depth * 0.94 * profile.pelvicFullness],
    [height * 0.70, depth * 0.76],
    [height * 0.12, depth * 0.16]
  ];
}

describe('Dino Lab torso shoulder closure radii', () => {
  const profiles = [
    { shoulderFullness: 1, ribcageFullness: 1, bellyFullness: 1, pelvicFullness: 1 },
    { shoulderFullness: 0.82, ribcageFullness: 0.88, bellyFullness: 0.91, pelvicFullness: 0.84 },
    { shoulderFullness: 1.12, ribcageFullness: 0.97, bellyFullness: 1.25, pelvicFullness: 1.08 }
  ];
  for (const scale of SCALES) for (const profileIndex of [0, 1, 2]) {
    it('reduces only the front closure without altering anatomical fullness at scale ' + scale + ', profile ' + profileIndex, () => {
      const height = 1.2 * scale, depth = 0.72 * scale, profile = profiles[profileIndex], original = structuredClone(profile);
      const radii = dinoTorsoRadii(height, depth, profile);
      expect(radii.length).toBe(7);
      expect(radii[0]).toEqual([height * 0.045, depth * 0.05]);
      expect(radii.slice(1)).toEqual(establishedTorsoStations(height, depth, profile));
      for (const pair of radii) for (const radius of pair) { expect(Number.isFinite(radius)).toBe(true); expect(radius).toBeGreaterThan(0); }
      // The exposed flat front-cut area should shrink by over 96%, while the
      // surrounding six station areas remain exactly the established ones.
      const frontArea = Math.PI * radii[0][0] * radii[0][1];
      const oldFrontArea = Math.PI * height * 0.24 * depth * 0.28;
      expect(frontArea / oldFrontArea).toBeLessThan(0.04);
      expect(profile).toEqual(original);
      const fresh = dinoTorsoRadii(height, depth, profile);
      radii[0][0] = 100; radii[3][1] = 100;
      expect(fresh[0]).toEqual([height * 0.045, depth * 0.05]);
      expect(fresh.slice(1)).toEqual(establishedTorsoStations(height, depth, profile));
      expect(profile).toEqual(original);
    });
  }
  for (const scale of SCALES) {
    it('retains the torso curve from station2 onward and bounds the shoulder transition at scale ' + scale, () => {
      const height = 1.2 * scale, depth = 0.72 * scale, profile = profiles[0];
      const radii = dinoTorsoRadii(height, depth, profile);
      const old = [[height * 0.24, depth * 0.28], ...establishedTorsoStations(height, depth, profile)];
      const original = structuredClone(radii);
      for (const axis of [0, 1]) {
        let newMaximum = 0, oldMaximum = 0;
        for (let sample = 0; sample <= 240; sample++) {
          const station = sample / 40, current = dinoLoftRadius(radii, station, axis), previous = dinoLoftRadius(old, station, axis);
          expect(Number.isFinite(current)).toBe(true); expect(current).toBeGreaterThan(0);
          newMaximum = Math.max(newMaximum, current); oldMaximum = Math.max(oldMaximum, previous);
          // Station0 contributes to the harmonic derivative on interval1..2;
          // the entire interval2..6 must retain its previous radius samples.
          if (station >= 2) expect(current).toBe(previous);
          if (station < 2) {
            const i = Math.floor(station), minimum = Math.min(radii[i][axis], radii[i + 1][axis]);
            const maximum = Math.max(radii[i][axis], radii[i + 1][axis]);
            expect(current).toBeGreaterThanOrEqual(minimum - scale * 1e-12);
            expect(current).toBeLessThanOrEqual(maximum + scale * 1e-12);
          }
        }
        expect(newMaximum).toBe(oldMaximum);
      }
      expect(radii).toEqual(original);
    });
    it('closes the seven-station torso smoothly at its supplied endpoint with no added cap geometry at scale ' + scale, () => {
      const points = [[-0.25, 0, 0], [0, 0, 0], [0.5, 0.05, 0], [1, 0.03, 0], [1.5, 0, 0], [2, 0, 0], [2.24, 0, 0]]
        .map(p => new THREE.Vector3(...p).multiplyScalar(scale));
      const profile = profiles[0], radii = dinoTorsoRadii(1.2 * scale, 0.72 * scale, profile);
      const originalPoints = points.map(p => p.toArray()), originalRadii = structuredClone(radii);
      const geometry = dinoSurfaceGeometry(THREE, points, radii, { smoothProfile: true });
      expect(geometry.attributes.position.count).toBe(1227); expect(geometry.index.count / 3).toBe(2352);
      expectVector(vectorAt(geometry.attributes.position, 1225), points[0], scale * 1e-6);
      expectVector(vectorAt(geometry.attributes.position, 1226), points[6], scale * 1e-6);
      const curve = curveFor(points), p = geometry.attributes.position;
      // Ring8,16,...,48 coincide with original anatomical radius stations.
      for (let station = 0; station < 7; station++) {
        const ring = station * 8, center = curve.getPoint(station / 6);
        expect(Math.abs(vectorAt(p, ring * STRIDE).distanceTo(center) - Math.max(0.001, radii[station][0]))).toBeLessThan(scale * 2e-6);
        expect(Math.abs(vectorAt(p, ring * STRIDE + SIDES / 4).distanceTo(center) - Math.max(0.001, radii[station][1]))).toBeLessThan(scale * 2e-6);
      }
      for (let ring = 0; ring <= RINGS; ring++) {
        const first = ring * STRIDE, last = first + SIDES;
        expectVector(vectorAt(geometry.attributes.normal, first), vectorAt(geometry.attributes.normal, last), 1e-6);
      }
      inspectClosedGeometry(geometry, scale);
      expect(points.map(p => p.toArray())).toEqual(originalPoints); expect(radii).toEqual(originalRadii);
      geometry.dispose();
    });
  }
});
