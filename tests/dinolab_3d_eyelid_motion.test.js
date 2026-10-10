import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// Exercise the production geometry helpers; installed source is the default.
const source = readFileSync(process.env.DINO_EYELID_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
function helperText(name) {
  const start = source.indexOf('  function ' + name + '(');
  if (start < 0) throw Error('Missing actual source helper: ' + name);
  const open = source.indexOf('{', start);
  let depth = 1, end = open + 1;
  while (depth && end < source.length) {
    if (source[end] === '{') depth++;
    if (source[end] === '}') depth--;
    end++;
  }
  if (depth) throw Error('Unclosed source helper: ' + name);
  return source.slice(start, end);
}
const { makeLid, updateLid, frameFor } = new Function(
  helperText('dinoEyelidGeometry') + '\n' + helperText('dinoUpdateEyelid') + '\n' + helperText('dinoEyeSurfaceFrame') +
  '\nreturn { makeLid: dinoEyelidGeometry, updateLid: dinoUpdateEyelid, frameFor: dinoEyeSurfaceFrame };'
)();
const vectorAt = (attribute, index) => new T.Vector3().fromBufferAttribute(attribute, index);
function outerBoundary(geometry) {
  const { rows, columns } = geometry.userData.dinoEyelid;
  return Array.from(geometry.attributes.position.array.slice(rows * (columns + 1) * 3));
}
function lidsFor(radius, side, frame = new T.Quaternion()) {
  const material = new T.MeshBasicMaterial({ side: T.FrontSide });
  const meshes = [true, false].map(upper => {
    const mesh = new T.Mesh(makeLid(T, radius, side, upper), material);
    mesh.quaternion.copy(frame);
    mesh.position.set(radius * 3, radius * 2, -radius);
    mesh.updateMatrixWorld(true);
    return mesh;
  });
  const localRay = (x, y) => {
    const origin = new T.Vector3(x * radius, y * radius, side * 3 * radius)
      .applyQuaternion(frame).add(meshes[0].position);
    const direction = new T.Vector3(0, 0, -side).applyQuaternion(frame);
    return new T.Raycaster(origin, direction, 0, radius * 6).intersectObjects(meshes, false);
  };
  return { meshes, localRay, blink: amount => meshes.forEach(mesh => updateLid(mesh.geometry, amount)),
    dispose: () => { meshes.forEach(mesh => mesh.geometry.dispose()); material.dispose(); } };
}

describe('Dino Lab curved eyelid surfaces', () => {
  for (const radius of [.0003, .1, 2.4]) for (const side of [-1, 1]) {
    it('keeps finite outward surfaces and conservative bounds at radius ' + radius + ', side ' + side, () => {
      for (const upper of [false, true]) {
        const geometry = makeLid(T, radius, side, upper);
        try {
          const position = geometry.attributes.position, normal = geometry.attributes.normal;
          const uv = geometry.attributes.uv, index = geometry.index;
          expect(position.count).toBeGreaterThan(30);
          expect(position.count).toBeLessThan(1000);
          expect(normal.count).toBe(position.count);
          expect(uv.count).toBe(position.count);
          expect(index.count % 3).toBe(0);
          expect(geometry.userData.dinoEyelid.interpretive).toBe(true);
          for (const amount of [0, .5, .9, .95, .99, 1, .25]) {
            updateLid(geometry, amount);
            for (let i = 0; i < position.count; i++) {
              const point = vectorAt(position, i), outward = vectorAt(normal, i);
              expect(point.toArray().every(Number.isFinite)).toBe(true);
              expect(outward.toArray().every(Number.isFinite)).toBe(true);
              expect(outward.length()).toBeCloseTo(1, 5);
              expect(point.z * side).toBeGreaterThan(0);
              expect(point.distanceTo(geometry.boundingSphere.center)).toBeLessThan(geometry.boundingSphere.radius * 1.000001);
              expect(geometry.boundingBox.distanceToPoint(point)).toBeLessThan(radius * 1e-6);
              expect(uv.getX(i)).toBeGreaterThanOrEqual(0);
              expect(uv.getX(i)).toBeLessThanOrEqual(1);
              expect(uv.getY(i)).toBeGreaterThanOrEqual(0);
              expect(uv.getY(i)).toBeLessThanOrEqual(1);
            }
            let nondegenerate = 0;
            for (let i = 0; i < index.count; i += 3) {
              const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
              expect(ids.every(id => Number.isInteger(id) && id >= 0 && id < position.count)).toBe(true);
              const a = vectorAt(position, ids[0]), b = vectorAt(position, ids[1]), c = vectorAt(position, ids[2]);
              const triangleNormal = b.sub(a).cross(c.sub(a));
              if (triangleNormal.length() <= radius * radius * 1e-10) continue;
              nondegenerate++;
              const vertexNormal = ids.reduce((sum, id) => sum.add(vectorAt(normal, id)), new T.Vector3()).normalize();
              expect(triangleNormal.normalize().dot(vertexNormal)).toBeGreaterThan(.1);
            }
            expect(nondegenerate).toBeGreaterThan(index.count / 3 * .8);
          }
        } finally { geometry.dispose(); }
      }
    });
  }
  for (const side of [-1, 1]) for (const upper of [false, true]) {
    it('keeps its head margin fixed and narrows the aperture monotonically for side ' + side + ', upper=' + upper, () => {
      const geometry = makeLid(T, .2, side, upper);
      try {
        const boundary = outerBoundary(geometry);
        const { columns } = geometry.userData.dinoEyelid;
        const innerCenter = columns / 2;
        const values = [];
        for (const amount of [0, .2, .5, .8, 1, 0]) {
          updateLid(geometry, amount);
          expect(outerBoundary(geometry)).toEqual(boundary);
          values.push(geometry.attributes.position.getY(innerCenter));
        }
        for (let i = 1; i < 5; i++)
          expect((values[i] - values[i - 1]) * (upper ? -1 : 1)).toBeGreaterThan(0);
        expect(values[5]).toBe(values[0]);
      } finally { geometry.dispose(); }
    });
  }
  it('joins both closed edges without cracks on either side', () => {
    for (const side of [-1, 1]) {
      const upper = makeLid(T, .1, side, true), lower = makeLid(T, .1, side, false);
      try {
        updateLid(upper, 1); updateLid(lower, 1);
        const edgeLength = (upper.userData.dinoEyelid.columns + 1) * 3;
        for (let i = 0; i < edgeLength / 3; i++)
          expect(vectorAt(upper.attributes.position, i).distanceTo(vectorAt(lower.attributes.position, i))).toBe(0);
      } finally { upper.dispose(); lower.dispose(); }
    }
  });
  it('has scale-independent shape and mirrored eye sides', () => {
    const small = makeLid(T, .001, -1, true), large = makeLid(T, 2, 1, true);
    try {
      for (const amount of [0, .5, 1]) {
        updateLid(small, amount); updateLid(large, amount);
        for (let i = 0; i < small.attributes.position.count; i++) {
          expect(small.attributes.position.getX(i) / .001).toBeCloseTo(large.attributes.position.getX(i) / 2, 6);
          expect(small.attributes.position.getY(i) / .001).toBeCloseTo(large.attributes.position.getY(i) / 2, 6);
          expect(small.attributes.position.getZ(i) / .001).toBeCloseTo(-large.attributes.position.getZ(i) / 2, 6);
        }
      }
    } finally { small.dispose(); large.dispose(); }
  });
});

describe('Dino Lab lid occlusion around a fixed eye', () => {
  for (const side of [-1, 1]) for (const radius of [.0003, .1, 2.4]) {
    it('leaves the pupil open, partially covers it, then closes it at radius ' + radius + ', side ' + side, () => {
      const rig = lidsFor(radius, side);
      try {
        // Central iris remains visible at rest on both front-facing sides.
        for (const x of [-.35, 0, .35]) for (const y of [-.2, 0, .2]) expect(rig.localRay(x, y)).toHaveLength(0);
        rig.blink(.5);
        expect(rig.localRay(0, 0)).toHaveLength(0);
        expect(rig.localRay(0, .5).length).toBeGreaterThan(0);
        expect(rig.localRay(0, -.5).length).toBeGreaterThan(0);
        rig.blink(1);
        for (const x of [-.7, -.35, 0, .35, .7]) for (const y of [-.4, -.2, 0, .2, .4]) {
          const hits = rig.localRay(x, y);
          expect(hits.length).toBeGreaterThan(0);
          // A sheet behind the globe would intersect the ray but leave the iris
          // visible. The first hit must lie outside the actual corneal envelope.
          const corneaFront = radius * (.12 + .515 * Math.sqrt(1 - (x / 1.03) ** 2 - (y / .8652) ** 2));
          const lidFront = hits[0].point.clone().sub(rig.meshes[0].position).z * side;
          expect(lidFront).toBeGreaterThan(corneaFront);
        }
        rig.blink(0);
        expect(rig.localRay(0, 0)).toHaveLength(0);
      } finally { rig.dispose(); }
    });
  }
  for (const side of [-1, 1]) {
    it('keeps occlusion correct after the actual bounded surface rotation on side ' + side, () => {
      const frame = frameFor(T, new T.Vector3(-.5, .2, side * .75), side, 35 * Math.PI / 180);
      expect(frame).not.toBeNull();
      const rig = lidsFor(.1, side, frame);
      try {
        expect(rig.localRay(0, 0)).toHaveLength(0);
        rig.blink(1);
        for (const x of [-.6, 0, .6]) for (const y of [-.35, 0, .35]) expect(rig.localRay(x, y).length).toBeGreaterThan(0);
      } finally { rig.dispose(); }
    });
  }
});

describe('Dino Lab eyelid updates and resource lifetime', () => {
  it('updates existing buffers in place and avoids repeat uploads at a fixed pose', () => {
    const geometry = makeLid(T, .1, 1, true);
    try {
      const position = geometry.attributes.position, normal = geometry.attributes.normal;
      const positionArray = position.array, normalArray = normal.array, uv = geometry.attributes.uv, index = geometry.index;
      const samples = geometry.dinoEyelidSamples, sphere = geometry.boundingSphere, box = geometry.boundingBox;
      const initial = Array.from(positionArray);
      let disposed = 0;
      geometry.addEventListener('dispose', () => disposed++);
      expect(updateLid(geometry, 0)).toBe(false);
      for (const amount of [.2, .5, 1, .7, 0]) {
        const before = position.version, normalsBefore = normal.version;
        expect(updateLid(geometry, amount)).toBe(true);
        expect(position.version).toBe(before + 1);
        expect(normal.version).toBe(normalsBefore + 1);
        expect(updateLid(geometry, amount)).toBe(false);
        expect(position.version).toBe(before + 1);
        expect(normal.version).toBe(normalsBefore + 1);
        expect(geometry.attributes.position).toBe(position);
        expect(geometry.attributes.normal).toBe(normal);
        expect(position.array).toBe(positionArray);
        expect(normal.array).toBe(normalArray);
        expect(geometry.attributes.uv).toBe(uv);
        expect(geometry.index).toBe(index);
        expect(geometry.dinoEyelidSamples).toBe(samples);
        expect(geometry.boundingSphere).toBe(sphere);
        expect(geometry.boundingBox).toBe(box);
      }
      expect(Array.from(positionArray)).toEqual(initial);
      expect(disposed).toBe(0);
    } finally { geometry.dispose(); }
  });
  it('clamps invalid blink input without creating nonfinite geometry', () => {
    const geometry = makeLid(T, .1, -1, false);
    try {
      updateLid(geometry, 1);
      const closed = Array.from(geometry.attributes.position.array);
      expect(updateLid(geometry, 5)).toBe(false);
      expect(Array.from(geometry.attributes.position.array)).toEqual(closed);
      for (const value of [-1, NaN, Infinity, undefined, 'invalid']) {
        updateLid(geometry, value);
        expect(geometry.userData.dinoEyelid.lastBlink).toBe(0);
        expect(Array.from(geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
      }
      expect(updateLid(geometry, null)).toBe(false);
    } finally { geometry.dispose(); }
  });
  it('tolerates an absent or unrelated geometry without disposing resources', () => {
    const unrelated = new T.BufferGeometry();
    expect(updateLid(null, .5)).toBe(false);
    expect(updateLid(undefined, 1)).toBe(false);
    expect(updateLid(unrelated, 1)).toBe(false);
    unrelated.dispose();
    const geometry = makeLid(T, .1, 1, true);
    let disposed = 0;
    geometry.addEventListener('dispose', () => disposed++);
    geometry.dispose();
    expect(() => updateLid(geometry, .5)).not.toThrow();
    expect(disposed).toBe(1);
  });
});
