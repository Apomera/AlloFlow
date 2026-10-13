import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_BEAK_CLOSURE_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const anchor = "window.StemLab.registerTool('dinoLab'";
if (!source.includes(anchor)) throw new Error('Dino Lab registration anchor was not found');
window.StemLab = { registerTool() {} };
new Function(source.replace(anchor,
  'globalThis.__dinoBeakClosure = { dinoCranialGeometry, dinoSurfaceGeometry, dinoBeakSkinClosure };' + anchor))();
const art = globalThis.__dinoBeakClosure;
delete globalThis.__dinoBeakClosure;

// A complete cranial loft, including the narrow neck root and muzzle cap.
function cranial(scale = 1, breadth = 1) {
  const height = .42 * scale, depth = .31 * scale * breadth;
  const points = [[.8, .025, .05], [.57, .035, .05], [.32, .045, .05], [0, .045, .05],
    [-.72, .015, .05], [-1.26, .01, .05], [-1.51, .01 - .42 * .03, .05]]
    .map(v => new THREE.Vector3(...v).multiplyScalar(scale));
  const radii = [[.06 * scale, .06 * scale], [height * .20, depth * .24],
    [height * .84, depth * .82], [height, depth], [height * .62, depth * .72],
    [height * .45, depth * .62], [height * .025, depth * .04]];
  const geometry = art.dinoCranialGeometry(THREE, points, radii, {
    center: points[3].clone().lerp(points[5], .28).add(new THREE.Vector3(0, -height * .24, 0)),
    length: scale, height, depth, cheek: .8
  });
  return { geometry, height };
}
function tuple(attribute, index) {
  return Array.from(attribute.array.slice(index * attribute.itemSize, (index + 1) * attribute.itemSize));
}
function snapshot(geometry) {
  return { attributes: Object.fromEntries(Object.entries(geometry.attributes).map(([name, attr]) =>
    [name, { array: Array.from(attr.array), version: attr.version, itemSize: attr.itemSize }])),
    index: geometry.index && Array.from(geometry.index.array),
    box: geometry.boundingBox && [geometry.boundingBox.min.toArray(), geometry.boundingBox.max.toArray()],
    sphere: geometry.boundingSphere && [geometry.boundingSphere.center.toArray(), geometry.boundingSphere.radius],
    userData: JSON.parse(JSON.stringify(geometry.userData)) };
}
function faceVector(geometry, offset) {
  const p = geometry.attributes.position, index = geometry.index.array;
  const a = new THREE.Vector3().fromBufferAttribute(p, index[offset]);
  const b = new THREE.Vector3().fromBufferAttribute(p, index[offset + 1]);
  const c = new THREE.Vector3().fromBufferAttribute(p, index[offset + 2]);
  return b.sub(a).cross(c.sub(a));
}
function manifold(geometry, scale) {
  const positions = geometry.attributes.position, indices = geometry.index.array;
  const keys = new Map(), ids = [], edges = new Map();
  for (let i = 0; i < positions.count; i++) {
    const key = tuple(positions, i).map(value => Math.round(value / (scale * 1e-7))).join(',');
    if (!keys.has(key)) keys.set(key, keys.size);
    ids.push(keys.get(key));
  }
  for (let i = 0; i < indices.length; i += 3) for (let j = 0; j < 3; j++) {
    const a = ids[indices[i + j]], b = ids[indices[i + (j + 1) % 3]];
    const key = Math.min(a, b) + ',' + Math.max(a, b), edge = edges.get(key) || { count: 0, direction: 0 };
    edge.count++; edge.direction += a < b ? 1 : -1; edges.set(key, edge);
  }
  return Array.from(edges.values());
}

describe('Dino Lab ceratopsian skin closure beneath the beak', () => {
  for (const [scale, breadth] of [[.03, .84], [1, 1], [12, 1.12]]) {
    it('retains the visible muzzle and changes only terminal height at scale ' + scale, () => {
      const { geometry, height } = cranial(scale, breadth), before = geometry.clone();
      try {
        expect(art.dinoBeakSkinClosure(THREE, geometry, height, true)).toBe(true);
        const p = geometry.attributes.position, old = before.attributes.position, uv = geometry.attributes.uv;
        expect(p.count).toBe(2995); expect(geometry.index.count).toBe(17520);
        expect(Array.from(geometry.index.array)).toEqual(Array.from(before.index.array));
        expect(Array.from(uv.array)).toEqual(Array.from(before.attributes.uv.array));
        let changed = 0;
        for (let i = 0; i < p.count; i++) {
          expect(p.getX(i)).toBe(old.getX(i)); expect(p.getZ(i)).toBe(old.getZ(i));
          if (uv.getX(i) <= .92) expect(tuple(p, i)).toEqual(tuple(old, i));
          else {
            expect(p.getY(i)).toBeLessThan(old.getY(i));
            expect(old.getY(i) - p.getY(i)).toBeLessThanOrEqual(height * .10 + scale * 1e-7);
            changed++;
          }
        }
        expect(changed).toBe(6 * 41 + 1);
        expect(tuple(p, p.count - 2)).toEqual(tuple(old, p.count - 2));
        expect(old.getY(p.count - 1) - p.getY(p.count - 1)).toBeCloseTo(height * .10, 6);
        // Row 66 borders the blend and may receive changed normals; rows through 65 cannot.
        for (let i = 0; i < 66 * 41; i++) expect(tuple(geometry.attributes.normal, i)).toEqual(tuple(before.attributes.normal, i));
        expect(geometry.userData.dinoBeakSkinClosure).toEqual({ interpretive: true, start: .92 });
        expect(geometry.userData.dinoCranialSurface).toEqual(before.userData.dinoCranialSurface);
      } finally { geometry.dispose(); before.dispose(); }
    });

    it('keeps a closed, consistently wound surface with smooth normal seams at scale ' + scale, () => {
      const { geometry, height } = cranial(scale, breadth), before = geometry.clone();
      try {
        art.dinoBeakSkinClosure(THREE, geometry, height, true);
        expect(manifold(geometry, scale).every(edge => edge.count === 2 && edge.direction === 0)).toBe(true);
        for (let i = 0; i < geometry.index.count; i += 3) {
          const current = faceVector(geometry, i), old = faceVector(before, i);
          expect(current.length()).toBeGreaterThan(scale * scale * 1e-10);
          expect(current.normalize().dot(old.normalize())).toBeGreaterThan(0);
        }
        const p = geometry.attributes.position, n = geometry.attributes.normal;
        for (let i = 0; i < p.count; i++) {
          expect(tuple(p, i).every(Number.isFinite)).toBe(true);
          const normal = new THREE.Vector3().fromBufferAttribute(n, i), point = new THREE.Vector3().fromBufferAttribute(p, i);
          expect(Math.abs(normal.length() - 1)).toBeLessThan(1e-6);
          expect(geometry.boundingBox.containsPoint(point)).toBe(true);
          expect(point.distanceTo(geometry.boundingSphere.center)).toBeLessThanOrEqual(geometry.boundingSphere.radius + scale * 1e-7);
        }
        for (let row = 0; row <= 72; row++) expect(tuple(n, row * 41)).toEqual(tuple(n, row * 41 + 40));
      } finally { geometry.dispose(); before.dispose(); }
    });
  }

  for (const enabled of [false, undefined, null, 1, 'true']) {
    it('leaves all geometry state unchanged when disabled with ' + String(enabled), () => {
      const { geometry, height } = cranial();
      try {
        const before = snapshot(geometry);
        expect(art.dinoBeakSkinClosure(THREE, geometry, height, enabled)).toBe(false);
        expect(snapshot(geometry)).toEqual(before);
      } finally { geometry.dispose(); }
    });
  }
  for (const height of [0, -1, NaN, Infinity, -Infinity, undefined, null, '.4']) {
    it('rejects invalid height atomically: ' + String(height), () => {
      const { geometry } = cranial();
      try {
        const before = snapshot(geometry);
        expect(art.dinoBeakSkinClosure(THREE, geometry, height, true)).toBe(false);
        expect(snapshot(geometry)).toEqual(before);
      } finally { geometry.dispose(); }
    });
  }
  for (const [label, mutate] of [
    ['missing positions', g => g.deleteAttribute('position')],
    ['missing UVs', g => g.deleteAttribute('uv')],
    ['wrong vertex count', g => g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3))],
    ['wrong UV count', g => g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0], 2))],
    ['missing index', g => g.setIndex(null)],
    ['wrong index count', g => g.setIndex([0, 1, 2])]
  ]) {
    it('rejects unsupported topology atomically: ' + label, () => {
      const { geometry, height } = cranial();
      try {
        mutate(geometry); const before = snapshot(geometry);
        expect(art.dinoBeakSkinClosure(THREE, geometry, height, true)).toBe(false);
        expect(snapshot(geometry)).toEqual(before);
      } finally { geometry.dispose(); }
    });
  }
  it('rejects an absent geometry without changing external state', () => {
    for (const geometry of [null, undefined]) expect(art.dinoBeakSkinClosure(THREE, geometry, .4, true)).toBe(false);
  });

  it('preserves existing blended normals away from the terminal closure', () => {
    const { geometry, height } = cranial();
    try {
      const normals = geometry.attributes.normal, custom = new THREE.Vector3(.2, .5, .7).normalize();
      for (let i = 0; i < 66 * 41; i++) normals.setXYZ(i, custom.x, custom.y, custom.z);
      const before = normals.array.slice(0, 66 * 41 * 3);
      art.dinoBeakSkinClosure(THREE, geometry, height, true);
      expect(normals.array.slice(0, 66 * 41 * 3)).toEqual(before);
      expect(tuple(normals, normals.count - 1)).not.toEqual(tuple(normals, 0));
    } finally { geometry.dispose(); }
  });

  it('runs the actual caller only for a keratin-beaked ceratopsian, after seating and before skin mapping', () => {
    const call = source.match(/^\s*if \(headShell\) dinoBeakSkinClosure\(THREE, headShell\.geometry, surfaceHeadHeight, .*\);$/m)?.[0];
    expect(call).toBeTruthy();
    const run = new Function('THREE', 'headShell', 'surfaceHeadHeight', 'skeletalProfile', 'cladeName', 'dinoBeakSkinClosure', call);
    for (const [clade, beak, enabled] of [['Ceratopsia', true, true], ['Ceratopsidae', true, true],
      ['Ceratopsia', false, false], ['Hadrosauridae', true, false], ['Theropoda', false, false]]) {
      const { geometry, height } = cranial();
      try {
        const before = snapshot(geometry);
        run(THREE, { geometry }, height, { keratinBeak: beak }, clade, art.dinoBeakSkinClosure);
        if (enabled) expect(geometry.userData.dinoBeakSkinClosure).toBeDefined();
        else expect(snapshot(geometry)).toEqual(before);
      } finally { geometry.dispose(); }
    }
    const callIndex = source.indexOf(call);
    expect(source.indexOf('function faceSurfacePoint')).toBeLessThan(callIndex);
    expect(source.indexOf('registerCranialMotion(addBodyContour(headShell))')).toBeLessThan(callIndex);
    expect(source.indexOf('headShell.userData.dinoNeckNormalBlend =')).toBeLessThan(callIndex);
    expect(source.indexOf('dinoSkinCoordinates(THREE, part.geometry,', callIndex)).toBeGreaterThan(callIndex);
  });
});
