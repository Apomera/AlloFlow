import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const GRID_SEGMENTS = 150, GRID_SIZE = GRID_SEGMENTS + 1, PERIMETER_SEGMENTS = 600;
const QUALITIES = [false, true];
let createApron;

beforeAll(() => {
  const source = readFileSync('stem_lab/stem_tool_solarsystem.js', 'utf8');
  const start = source.indexOf('function solarCreateDroneTerrainApronGeometry(');
  if (start < 0) throw new Error('Missing solarCreateDroneTerrainApronGeometry');
  const end = source.indexOf('\n}', start);
  if (end < start) throw new Error('Missing top-level apron helper close');
  // This Math binding belongs only to the extracted helper. THREE retains its
  // normal module Math binding for unrelated resource UUID generation.
  const deterministicMath = Object.create(Math);
  deterministicMath.random = () => { throw new Error('Terrain apron must not consume procedural randomness'); };
  createApron = new Function('Math', source.slice(start, end + 2) +
    '\nreturn solarCreateDroneTerrainApronGeometry;')(deterministicMath);
});

function groundFixture() {
  const geometry = new THREE.PlaneGeometry(250, 250, GRID_SEGMENTS, GRID_SEGMENTS);
  const positions = geometry.attributes.position;
  // An asymmetric positive surface exposes flipped boundary order, lost heights
  // and copied normals from the wrong edge, without duplicating scene terrain.
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i);
    positions.setZ(i, 3 + Math.sin(x * 0.013) * 0.7 + Math.cos(y * 0.017) * 0.5 + x * y * 0.00002);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

function boundaryIndices() {
  const indices = [];
  // The 600 real boundary samples, clockwise from top-left. Each corner appears
  // once; the apron supplies its own closing copy of the first sample.
  for (let column = 0; column < GRID_SEGMENTS; column++) indices.push(column);
  for (let row = 0; row < GRID_SEGMENTS; row++) indices.push(row * GRID_SIZE + GRID_SEGMENTS);
  for (let column = GRID_SEGMENTS; column > 0; column--) indices.push(GRID_SEGMENTS * GRID_SIZE + column);
  for (let row = GRID_SEGMENTS; row > 0; row--) indices.push(row * GRID_SIZE);
  return indices;
}

const BOUNDARY = boundaryIndices();
const vectorAt = (attribute, index) => new THREE.Vector3().fromBufferAttribute(attribute, index);
const valuesAt = (attribute, index) => Array.from(attribute.array.slice(index * attribute.itemSize, (index + 1) * attribute.itemSize));

function snapshotGeometry(geometry) {
  return {
    attributes: Object.fromEntries(Object.entries(geometry.attributes).map(([name, attribute]) =>
      [name, { reference: attribute, version: attribute.version, values: Array.from(attribute.array) }])),
    index: geometry.index, indexVersion: geometry.index.version, indices: Array.from(geometry.index.array),
    box: geometry.boundingBox, boxValues: [...geometry.boundingBox.min.toArray(), ...geometry.boundingBox.max.toArray()],
    sphere: geometry.boundingSphere, sphereValues: [...geometry.boundingSphere.center.toArray(), geometry.boundingSphere.radius],
    groups: JSON.stringify(geometry.groups), userData: JSON.stringify(geometry.userData),
  };
}

function withApron(lowPower, inspect) {
  const ground = groundFixture();
  let apron;
  try {
    apron = createApron(THREE, ground, lowPower);
    inspect(apron, ground);
  } finally {
    if (apron) apron.dispose();
    ground.dispose();
  }
}

describe('rocky terrain apron joins the rendered ground without extending physics', () => {
  it.each(QUALITIES)('copies every ground boundary position, normal and UV without mutating the ground (low power: %s)', lowPower => {
    const ground = groundFixture(), before = snapshotGeometry(ground);
    let apron;
    try {
      apron = createApron(THREE, ground, lowPower);
      const rows = lowPower ? 4 : 5;
      expect(new Set(BOUNDARY).size).toBe(PERIMETER_SEGMENTS);
      for (const name of ['position', 'normal', 'uv']) {
        expect(apron.attributes[name]).not.toBe(ground.attributes[name]);
        for (let sample = 0; sample < PERIMETER_SEGMENTS; sample++) {
          expect(valuesAt(apron.attributes[name], sample * rows), name + ' at boundary sample ' + sample)
            .toEqual(valuesAt(ground.attributes[name], BOUNDARY[sample]));
        }
      }
      for (const [name, saved] of Object.entries(before.attributes)) {
        expect(ground.attributes[name]).toBe(saved.reference);
        expect(ground.attributes[name].version).toBe(saved.version);
        expect(Array.from(ground.attributes[name].array)).toEqual(saved.values);
      }
      expect(ground.index).toBe(before.index); expect(ground.index.version).toBe(before.indexVersion);
      expect(Array.from(ground.index.array)).toEqual(before.indices);
      expect(ground.boundingBox).toBe(before.box); expect(ground.boundingSphere).toBe(before.sphere);
      expect([...ground.boundingBox.min.toArray(), ...ground.boundingBox.max.toArray()]).toEqual(before.boxValues);
      expect([...ground.boundingSphere.center.toArray(), ground.boundingSphere.radius]).toEqual(before.sphereValues);
      expect(JSON.stringify(ground.groups)).toBe(before.groups); expect(JSON.stringify(ground.userData)).toBe(before.userData);
    } finally {
      if (apron) apron.dispose();
      ground.dispose();
    }
  });

  it.each(QUALITIES)('stays finite, outside the square and inside its bounded rendering budget (low power: %s)', lowPower => {
    withApron(lowPower, apron => {
      const rows = lowPower ? 4 : 5;
      expect(apron.isBufferGeometry).toBe(true);
      expect(apron.userData.droneTerrainApronRows).toBe(rows);
      expect(apron.userData.droneTerrainApronSegments).toBe(PERIMETER_SEGMENTS);
      expect(apron.index.count).toBe(PERIMETER_SEGMENTS * (rows - 1) * 6);
      expect(apron.index.count / 3).toBe(lowPower ? 3600 : 4800);
      for (const [name, itemSize] of [['position', 3], ['normal', 3], ['uv', 2]]) {
        const attribute = apron.attributes[name];
        expect(attribute.itemSize).toBe(itemSize); expect(attribute.count).toBe((PERIMETER_SEGMENTS + 1) * rows);
        expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
      }
      expect(Array.from(apron.index.array).every(index => Number.isInteger(index) && index >= 0 && index < apron.attributes.position.count)).toBe(true);
      let minSquareExtent = Infinity, maxRadius = 0, maxNormalError = 0, minNormalZ = Infinity;
      const positions = apron.attributes.position, normals = apron.attributes.normal;
      for (let i = 0; i < positions.count; i++) {
        const position = vectorAt(positions, i), normal = vectorAt(normals, i);
        minSquareExtent = Math.min(minSquareExtent, Math.max(Math.abs(position.x), Math.abs(position.y)));
        maxRadius = Math.max(maxRadius, Math.hypot(position.x, position.y));
        maxNormalError = Math.max(maxNormalError, Math.abs(normal.length() - 1)); minNormalZ = Math.min(minNormalZ, normal.z);
      }
      expect(minSquareExtent).toBeGreaterThanOrEqual(125 - 1e-5);
      expect(maxRadius).toBeCloseTo(236, 3); expect(maxRadius).toBeLessThanOrEqual(236 + 3e-5);
      expect(maxNormalError).toBeLessThan(1e-5); expect(minNormalZ).toBeGreaterThan(0);
      apron.computeBoundingBox(); apron.computeBoundingSphere();
      expect([...apron.boundingBox.min.toArray(), ...apron.boundingBox.max.toArray(), ...apron.boundingSphere.center.toArray(), apron.boundingSphere.radius].every(Number.isFinite)).toBe(true);
      expect(apron.boundingSphere.radius).toBeGreaterThan(0);
      for (let i = 0; i < positions.count; i++) expect(vectorAt(positions, i).distanceTo(apron.boundingSphere.center))
        .toBeLessThanOrEqual(apron.boundingSphere.radius + 1e-4);
    });
  });

  it.each(QUALITIES)('tapers outward without raised relief or a vertical wall and buries its outer edge (low power: %s)', lowPower => {
    withApron(lowPower, apron => {
      const rows = lowPower ? 4 : 5, positions = apron.attributes.position;
      for (let sample = 0; sample <= PERIMETER_SEGMENTS; sample++) {
        const first = vectorAt(positions, sample * rows), firstRadius = Math.hypot(first.x, first.y);
        let previousRadius = firstRadius, previousHeight = first.z;
        expect(first.z).toBeGreaterThan(0);
        for (let row = 1; row < rows; row++) {
          const position = vectorAt(positions, sample * rows + row), radius = Math.hypot(position.x, position.y);
          expect(radius).toBeGreaterThan(previousRadius);
          expect(Math.abs(first.x * position.y - first.y * position.x) / (firstRadius * radius), 'rows must follow the same outward ray').toBeLessThan(2e-7);
          expect(first.x * position.x + first.y * position.y).toBeGreaterThan(0);
          expect(position.z).toBeLessThanOrEqual(previousHeight);
          expect(position.z).toBeGreaterThanOrEqual(-14);
          previousRadius = radius; previousHeight = position.z;
        }
        expect(previousRadius).toBeCloseTo(236, 3); expect(previousHeight).toBe(-14);
      }
    });
  });

  it.each(QUALITIES)('uses upward nondegenerate triangles with no gaps between perimeter sectors (low power: %s)', lowPower => {
    withApron(lowPower, apron => {
      const rows = lowPower ? 4 : 5, positions = apron.attributes.position, indices = apron.index.array;
      const edges = new Map(), welded = index => index >= PERIMETER_SEGMENTS * rows ? index - PERIMETER_SEGMENTS * rows : index;
      let minAreaSquared = Infinity, minUpwardArea = Infinity;
      for (let i = 0; i < indices.length; i += 3) {
        const triangle = [indices[i], indices[i + 1], indices[i + 2]];
        const a = vectorAt(positions, triangle[0]), b = vectorAt(positions, triangle[1]), c = vectorAt(positions, triangle[2]);
        const cross = b.sub(a).cross(c.sub(a));
        minAreaSquared = Math.min(minAreaSquared, cross.lengthSq()); minUpwardArea = Math.min(minUpwardArea, cross.z);
        for (let edge = 0; edge < 3; edge++) {
          const first = welded(triangle[edge]), second = welded(triangle[(edge + 1) % 3]);
          const key = Math.min(first, second) + ',' + Math.max(first, second);
          edges.set(key, (edges.get(key) || 0) + 1);
        }
      }
      expect(minAreaSquared).toBeGreaterThan(1e-10); expect(minUpwardArea).toBeGreaterThan(0);
      const boundaries = [];
      for (const [edge, count] of edges) {
        expect(count, 'non-manifold apron edge ' + edge).toBeLessThanOrEqual(2);
        if (count === 1) boundaries.push(edge.split(',').map(Number));
      }
      expect(boundaries).toHaveLength(PERIMETER_SEGMENTS * 2);
      expect(boundaries.every(([a, b]) => (a % rows === 0 && b % rows === 0) || (a % rows === rows - 1 && b % rows === rows - 1)),
        'only the ground boundary and buried outer skirt may remain open').toBe(true);
    });
  });

  it.each(QUALITIES)('closes positions, normals and UVs exactly and retains the ground texture scale (low power: %s)', lowPower => {
    withApron(lowPower, apron => {
      const rows = lowPower ? 4 : 5;
      for (const name of ['position', 'normal', 'uv']) {
        for (let row = 0; row < rows; row++) expect(valuesAt(apron.attributes[name], PERIMETER_SEGMENTS * rows + row))
          .toEqual(valuesAt(apron.attributes[name], row));
      }
      const positions = apron.attributes.position, uvs = apron.attributes.uv;
      let maxUVError = 0, minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
      for (let i = 0; i < positions.count; i++) {
        const u = uvs.getX(i), v = uvs.getY(i);
        maxUVError = Math.max(maxUVError, Math.abs(u - (positions.getX(i) + 125) / 250), Math.abs(v - (positions.getY(i) + 125) / 250));
        minU = Math.min(minU, u); maxU = Math.max(maxU, u); minV = Math.min(minV, v); maxV = Math.max(maxV, v);
      }
      expect(maxUVError).toBeLessThan(2e-7);
      // Extending the original UV mapping preserves both repeating textures;
      // remapping the apron back to 0..1 would make the boundary visibly slide.
      expect(minU).toBeLessThan(0); expect(maxU).toBeGreaterThan(1);
      expect(minV).toBeLessThan(0); expect(maxV).toBeGreaterThan(1);
    });
  });

  it('rebuilds identical attribute and index data without procedural randomness', () => {
    for (const lowPower of QUALITIES) {
      const ground = groundFixture();
      let first, second;
      try {
        first = createApron(THREE, ground, lowPower); second = createApron(THREE, ground, lowPower);
        for (const name of ['position', 'normal', 'uv']) expect(second.attributes[name].array).toEqual(first.attributes[name].array);
        expect(second.index.array).toEqual(first.index.array);
      } finally {
        if (first) first.dispose(); if (second) second.dispose(); ground.dispose();
      }
    }
  });

  it('keeps the same ground join and buried outer perimeter at both quality settings', () => {
    const ground = groundFixture();
    let low, high;
    try {
      low = createApron(THREE, ground, true); high = createApron(THREE, ground, false);
      for (let sample = 0; sample <= PERIMETER_SEGMENTS; sample++) {
        for (const name of ['position', 'uv']) {
          expect(valuesAt(low.attributes[name], sample * 4)).toEqual(valuesAt(high.attributes[name], sample * 5));
          expect(valuesAt(low.attributes[name], sample * 4 + 3)).toEqual(valuesAt(high.attributes[name], sample * 5 + 4));
        }
        expect(valuesAt(low.attributes.normal, sample * 4)).toEqual(valuesAt(high.attributes.normal, sample * 5));
      }
    } finally {
      if (low) low.dispose(); if (high) high.dispose(); ground.dispose();
    }
  });
});
