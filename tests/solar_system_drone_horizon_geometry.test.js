import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const PROFILES = ['regolith-pitted', 'aeolian-rippled', 'fractured-basalt', 'crevassed-ice', 'rocky-granular'];
const CASES = PROFILES.flatMap(profile => [false, true].map(lowPower => [profile, lowPower]));
let createHorizon;

beforeAll(() => {
  const source = readFileSync('stem_lab/stem_tool_solarsystem.js', 'utf8');
  const start = source.indexOf('function solarCreateDroneHorizonGeometry(');
  if (start < 0) throw new Error('Missing solarCreateDroneHorizonGeometry');
  const end = source.indexOf('\n}', start);
  if (end < start) throw new Error('Missing top-level horizon helper close');
  // Execute the shipped helper with the pinned THREE implementation. A random
  // call fails immediately rather than silently changing scenery on remount.
  const deterministicMath = Object.create(Math);
  deterministicMath.random = () => { throw new Error('Horizon geometry must not call Math.random'); };
  createHorizon = new Function('Math', source.slice(start, end + 2) +
    '\nreturn solarCreateDroneHorizonGeometry;')(deterministicMath);
});

const vectorAt = (attribute, index) => new THREE.Vector3().fromBufferAttribute(attribute, index);
const tripleAt = (attribute, index) => [attribute.getX(index), attribute.getY(index), attribute.getZ(index)];

function checkConnectedStrip(geometry, segments, rows) {
  const positions = geometry.attributes.position, indices = geometry.index.array;
  const edges = new Map();
  let minAreaSquared = Infinity, minUpwardArea = Infinity;
  // Weld only the duplicated angular seam for topology accounting. The open
  // inner/outer skirt boundaries are intentional; no internal gap is allowed.
  const welded = index => index >= segments * rows ? index - segments * rows : index;
  for (let i = 0; i < indices.length; i += 3) {
    const triangle = [indices[i], indices[i + 1], indices[i + 2]];
    const a = vectorAt(positions, triangle[0]), b = vectorAt(positions, triangle[1]), c = vectorAt(positions, triangle[2]);
    const cross = b.sub(a).cross(c.sub(a));
    minAreaSquared = Math.min(minAreaSquared, cross.lengthSq());
    minUpwardArea = Math.min(minUpwardArea, cross.y);
    for (let edge = 0; edge < 3; edge++) {
      const first = welded(triangle[edge]), second = welded(triangle[(edge + 1) % 3]);
      const key = Math.min(first, second) + ',' + Math.max(first, second);
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  }
  expect(minAreaSquared, 'every triangle must have a nonzero area').toBeGreaterThan(1e-10);
  expect(minUpwardArea, 'every terrain triangle must face upward').toBeGreaterThan(0);
  const boundaries = [];
  for (const [edge, count] of edges) {
    expect(count, 'non-manifold edge ' + edge).toBeLessThanOrEqual(2);
    if (count === 1) boundaries.push(edge.split(',').map(Number));
  }
  expect(boundaries).toHaveLength(segments * 2);
  expect(boundaries.every(([a, b]) =>
    (a % rows === 0 && b % rows === 0) || (a % rows === rows - 1 && b % rows === rows - 1)),
  'only the inner and outer skirt edges may remain open').toBe(true);
}

describe('drone horizon geometry remains continuous and outside the driving area', () => {
  it.each(CASES)('builds a finite, sloped, seam-free %s horizon (low power: %s)', (profile, lowPower) => {
    const geometry = createHorizon(THREE, profile, lowPower);
    try {
      const segments = lowPower ? 96 : 192, rows = 6;
      expect(geometry.isBufferGeometry).toBe(true);
      expect(geometry.userData.droneHorizonSegments).toBe(segments);
      expect(geometry.userData.droneHorizonRows).toBe(rows);
      const positions = geometry.attributes.position, normals = geometry.attributes.normal, colors = geometry.attributes.color;
      for (const attribute of [positions, normals, colors]) {
        expect(attribute.itemSize).toBe(3);
        expect(attribute.count).toBe((segments + 1) * rows);
        expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
      }
      expect(Array.from(colors.array).every(value => value >= 0 && value <= 1)).toBe(true);
      expect(geometry.index.count).toBe(segments * (rows - 1) * 6);
      expect(geometry.index.count / 3).toBeLessThanOrEqual(1920);
      expect(Array.from(geometry.index.array).every(index => Number.isInteger(index) && index >= 0 && index < positions.count)).toBe(true);

      let minRadius = Infinity, maxRadius = -Infinity, normalLengthError = 0, minNormalY = Infinity;
      let minCrestHeight = Infinity, maxCrestHeight = -Infinity;
      for (let angle = 0; angle <= segments; angle++) {
        let previousRadius = -Infinity;
        for (let row = 0; row < rows; row++) {
          const index = angle * rows + row, position = vectorAt(positions, index), normal = vectorAt(normals, index);
          const radius = Math.hypot(position.x, position.z);
          minRadius = Math.min(minRadius, radius); maxRadius = Math.max(maxRadius, radius);
          normalLengthError = Math.max(normalLengthError, Math.abs(normal.length() - 1));
          minNormalY = Math.min(minNormalY, normal.y);
          expect(radius, 'successive radial rows must not make a vertical wall').toBeGreaterThan(previousRadius);
          previousRadius = radius;
          if (row > 0 && row <= 3) expect(position.y).toBeGreaterThan(positions.getY(index - 1));
          if (row > 3) expect(position.y).toBeLessThan(positions.getY(index - 1));
        }
        const crestHeight = positions.getY(angle * rows + 3);
        minCrestHeight = Math.min(minCrestHeight, crestHeight); maxCrestHeight = Math.max(maxCrestHeight, crestHeight);
      }
      expect(minRadius).toBeCloseTo(234, 3); expect(maxRadius).toBeCloseTo(262, 3);
      expect(minRadius - Math.hypot(115, 115)).toBeGreaterThan(70);
      expect(maxCrestHeight - minCrestHeight, 'the distant ridge must have relief').toBeGreaterThan(2);
      expect(normalLengthError).toBeLessThan(1e-5); expect(minNormalY).toBeGreaterThan(0);
      checkConnectedStrip(geometry, segments, rows);

      for (let row = 0; row < rows; row++) {
        const first = row, last = segments * rows + row;
        for (const attribute of [positions, colors, normals]) expect(tripleAt(attribute, last)).toEqual(tripleAt(attribute, first));
        // Matching seam vertices alone can hide a cusp. Incoming/outgoing
        // tangents and nearby lighting must also remain continuous there.
        const seam = vectorAt(positions, first), before = vectorAt(positions, (segments - 1) * rows + row), after = vectorAt(positions, rows + row);
        const incoming = seam.clone().sub(before).normalize(), outgoing = after.sub(seam).normalize();
        expect(incoming.dot(outgoing), 'angular seam cusp at radial row ' + row).toBeGreaterThan(0.95);
        for (const neighbor of [(segments - 1) * rows + row, rows + row]) {
          expect(vectorAt(normals, first).dot(vectorAt(normals, neighbor)), 'angular seam lighting discontinuity').toBeGreaterThan(0.9);
        }
      }

      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      expect([...geometry.boundingBox.min.toArray(), ...geometry.boundingBox.max.toArray(), ...geometry.boundingSphere.center.toArray(), geometry.boundingSphere.radius].every(Number.isFinite)).toBe(true);
      expect(geometry.boundingSphere.radius).toBeGreaterThan(0);
      for (let i = 0; i < positions.count; i++) {
        const position = vectorAt(positions, i);
        expect(position.distanceTo(geometry.boundingSphere.center)).toBeLessThanOrEqual(geometry.boundingSphere.radius + 1e-4);
        for (const [x, z] of [[-115, -115], [-115, 115], [115, -115], [115, 115]]) {
          expect(position.distanceTo(new THREE.Vector3(x, 1.6, z)), 'ridge must stay inside the 500-unit camera far range').toBeLessThan(500);
        }
      }
    } finally {
      geometry.dispose();
    }
  });

  it.each(PROFILES)('preserves the global %s silhouette and colors across quality budgets', profile => {
    const low = createHorizon(THREE, profile, true), high = createHorizon(THREE, profile, false);
    try {
      const rows = low.userData.droneHorizonRows;
      for (let angle = 0; angle <= low.userData.droneHorizonSegments; angle++) {
        for (let row = 0; row < rows; row++) {
          for (const name of ['position', 'color']) {
            expect(tripleAt(high.attributes[name], angle * 2 * rows + row)).toEqual(tripleAt(low.attributes[name], angle * rows + row));
          }
        }
      }
    } finally {
      low.dispose(); high.dispose();
    }
  });

  it('rebuilds identical geometry without consuming randomness for every profile and quality', () => {
    for (const [profile, lowPower] of CASES) {
      const first = createHorizon(THREE, profile, lowPower), second = createHorizon(THREE, profile, lowPower);
      try {
        for (const name of ['position', 'normal', 'color']) expect(second.attributes[name].array).toEqual(first.attributes[name].array);
        expect(second.index.array).toEqual(first.index.array);
      } finally {
        first.dispose(); second.dispose();
      }
    }
  });

  it('gives every surface profile a distinct ridge silhouette', () => {
    const geometries = PROFILES.map(profile => createHorizon(THREE, profile, true));
    try {
      for (let first = 0; first < geometries.length; first++) {
        for (let second = first + 1; second < geometries.length; second++) {
          const a = geometries[first], b = geometries[second], segments = a.userData.droneHorizonSegments, rows = a.userData.droneHorizonRows;
          let squaredHeightDifference = 0;
          for (let angle = 0; angle < segments; angle++) {
            const index = angle * rows + 3, difference = a.attributes.position.getY(index) - b.attributes.position.getY(index);
            squaredHeightDifference += difference * difference;
          }
          expect(Math.sqrt(squaredHeightDifference / segments), PROFILES[first] + ' must differ from ' + PROFILES[second]).toBeGreaterThan(0.2);
        }
      }
    } finally {
      geometries.forEach(geometry => geometry.dispose());
    }
  });
});
