import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(process.env.DINO_BEAK_SURFACE_SOURCE || resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
const anchor = "window.StemLab.registerTool('dinoLab'";
if (!source.includes(anchor)) throw new Error('Dino Lab registration anchor was not found');
window.StemLab = { registerTool() {} };
new Function(source.replace(anchor,
  'globalThis.__dinoBeakSurface = { DINOS, cranialSurfaceProfileFor, dinoBeakSurfaceGeometry, dinoSurfaceGeometry, dinoCranialGeometry, dinoConnectedCranialPose };' + anchor))();
const art = globalThis.__dinoBeakSurface;
delete globalThis.__dinoBeakSurface;
const byId = id => {
  const dino = art.DINOS.find(value => value.id === id);
  if (!dino) throw new Error('Missing catalog species: ' + id);
  return dino;
};
function setup(scale = 1, breadth = 1, id = 'triceratops') {
  const dino = byId(id), profile = art.cranialSurfaceProfileFor(dino);
  const head = new THREE.Vector3(.2, .3, .13).multiplyScalar(scale);
  const snout = head.clone().add(new THREE.Vector3(-1.4 * scale, 0, 0));
  const length = scale, height = .5 * scale, depth = .36 * scale * breadth;
  const base = head.clone().lerp(snout, .84);
  const points = [base, snout.clone().add(new THREE.Vector3(-length * .12, 0, 0)),
    snout.clone().add(new THREE.Vector3(-length * .32, -height * (/Ceratops|Oviraptor/i.test(dino.clade || '') ? .20 : .08), 0))];
  const radii = [[height * .36, depth * .55 * profile.muzzleTipScale],
    [height * .25, depth * .42 * profile.muzzleTipScale], [height * .025, depth * .10]];
  return { scale, breadth, dino, profile, head, snout, length, height, depth, base, points, radii };
}
function originalGeometry(data) {
  const geometry = art.dinoSurfaceGeometry(THREE, data.points, data.radii, { smoothProfile: true });
  geometry.translate(-data.base.x, -data.base.y, -data.base.z);
  return geometry;
}
function snapshot(geometry) {
  return {
    attributes: Object.fromEntries(Object.entries(geometry.attributes).map(([name, attribute]) =>
      [name, { attribute, array: attribute.array, values: attribute.array.slice(), version: attribute.version }])),
    index: { attribute: geometry.index, array: geometry.index.array, values: geometry.index.array.slice(), version: geometry.index.version },
    box: { object: geometry.boundingBox, min: geometry.boundingBox.min.toArray(), max: geometry.boundingBox.max.toArray() },
    sphere: { object: geometry.boundingSphere, center: geometry.boundingSphere.center.toArray(), radius: geometry.boundingSphere.radius },
    groups: JSON.stringify(geometry.groups)
  };
}
function expectUnchanged(geometry, saved) {
  for (const [name, value] of Object.entries(saved.attributes)) {
    expect(geometry.attributes[name]).toBe(value.attribute); expect(geometry.attributes[name].array).toBe(value.array);
    expect(geometry.attributes[name].array).toEqual(value.values); expect(geometry.attributes[name].version).toBe(value.version);
  }
  expect(geometry.index).toBe(saved.index.attribute); expect(geometry.index.array).toBe(saved.index.array);
  expect(geometry.index.array).toEqual(saved.index.values); expect(geometry.index.version).toBe(saved.index.version);
  expect(geometry.boundingBox).toBe(saved.box.object); expect(geometry.boundingBox.min.toArray()).toEqual(saved.box.min); expect(geometry.boundingBox.max.toArray()).toEqual(saved.box.max);
  expect(geometry.boundingSphere).toBe(saved.sphere.object); expect(geometry.boundingSphere.center.toArray()).toEqual(saved.sphere.center); expect(geometry.boundingSphere.radius).toBe(saved.sphere.radius);
  expect(JSON.stringify(geometry.groups)).toBe(saved.groups);
}
function topology(geometry) {
  const p = geometry.attributes.position, epsilon = new THREE.Box3().setFromBufferAttribute(p).getSize(new THREE.Vector3()).length() * 1e-6;
  const keys = new Map(), ids = [], edges = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = [p.getX(i), p.getY(i), p.getZ(i)].map(value => Math.round(value / epsilon)).join(',');
    if (!keys.has(key)) keys.set(key, keys.size); ids.push(keys.get(key));
  }
  let degenerates = 0;
  const index = geometry.index.array;
  for (let i = 0; i < index.length; i += 3) {
    const tri = [ids[index[i]], ids[index[i + 1]], ids[index[i + 2]]];
    if (new Set(tri).size !== 3) degenerates++;
    for (let j = 0; j < 3; j++) {
      const a = tri[j], b = tri[(j + 1) % 3], key = a < b ? a + ',' + b : b + ',' + a;
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  }
  return { degenerates, counts: Array.from(edges.values()) };
}
const chainStart = source.indexOf('function addSoftTissueChain(points, radii, mat, cranialShape, surfaceOptions) {');
const chainEnd = source.indexOf('function addContourGroup(meshes)', chainStart);
const callerStart = source.indexOf('if (skeletalProfile.keratinBeak) {', source.indexOf('var cladeName ='));
const callerEnd = source.indexOf('var integumentSeed =', callerStart);
if ([chainStart, chainEnd, callerStart, callerEnd].some(index => index < 0)) throw new Error('Actual beak construction was not found');
const createChain = new Function('THREE', 'props', 'bodyMat', 'model', 'dinoCranialGeometry', 'dinoSurfaceGeometry', source.slice(chainStart, chainEnd) + 'return addSoftTissueChain;');
const buildBeak = new Function('THREE', 'dn', 'skeletalProfile', 'head', 'surfaceSnout', 'surfaceHeadLength', 'surfaceHeadHeight', 'surfaceHeadDepth',
  'cranialSurface', 'cladeName', 'vec', 'addSoftTissueChain', 'keratinMat', 'registerCranialMotion', 'dinoBeakSurfaceGeometry',
  source.slice(callerStart, callerEnd) + 'return keratinBeak;');
function caller(data, hasBeak = true) {
  const material = new THREE.MeshBasicMaterial(), model = new THREE.Group(), registered = [], helperCalls = [];
  const chain = createChain(THREE, { showBody: true }, material, model, art.dinoCranialGeometry, art.dinoSurfaceGeometry);
  const mesh = buildBeak(THREE, data.dino, { keratinBeak: hasBeak }, data.head, data.snout, data.length, data.height, data.depth,
    data.profile, data.dino.clade, (x, y, z) => new THREE.Vector3(x, y, z), chain, material, part => registered.push(part),
    (...args) => { helperCalls.push({ geometry: args[1], height: args[2], enabled: args[3] }); return art.dinoBeakSurfaceGeometry(...args); });
  return { mesh, material, model, registered, helperCalls };
}
function disposeBuilt(built) { if (built.mesh) built.mesh.geometry.dispose(); built.material.dispose(); }
function section(startMarker, endMarker, after = 0) {
  const start = source.indexOf(startMarker, after), end = source.indexOf(endMarker, start);
  if (start < 0 || end < start) throw new Error('Source preservation seam missing');
  return source.slice(start, end + endMarker.length);
}
const sha = value => createHash('sha256').update(value).digest('hex');
// Preserve the anatomical frame while permitting this exact registered bulk-fill change.
function preservedSkeletalFrame() {
  const block = section('var cranialBoneBefore = model.children.slice();', 'captureCranialMotion(cranialBoneBefore);');
  const displayProxyCaller = "              var cranialDisplay = dinoCranialDisplayProfile(THREE, props.species, head, snout, skullLength, skullHeight, skullDepth, detailScale, isTheropod);\n              var cranialVault = addSkeletonEllipsoid(cranialDisplay.vaultCenter, cranialDisplay.vaultScale, boneMat);\n              var rostrumCenter = new THREE.Vector3().copy(head).lerp(snout, 0.62);\n              var cranialRostrum = addSkeletonEllipsoid(cranialDisplay.rostrumCenter, cranialDisplay.rostrumScale, boneMat);\n              if (cranialDisplay.refined) {\n                [[cranialVault, 'vault'], [cranialRostrum, 'rostrum']].forEach(function (entry) {\n                  if (!entry[0]) return;\n                  entry[0].name = 'cranial-' + entry[1] + '-display-proxy';\n                  entry[0].userData.dinoCranialDisplayProxy = { region: entry[1], interpretive: true, tissueHypothesisIndependent: true };\n                });\n              }";
  const originalBulkCaller = "              addSkeletonEllipsoid(head, vec(skullLength * 0.68, skullHeight, skullDepth), boneMat);\n              var rostrumCenter = new THREE.Vector3().copy(head).lerp(snout, 0.62);\n              addSkeletonEllipsoid(rostrumCenter, vec(Math.max(0.09 * detailScale, skullLength * 0.62), skullHeight * (isTheropod ? 0.58 : 0.48), skullDepth * 0.72), boneMat);";
  return block.includes(displayProxyCaller) ? block.replace(displayProxyCaller, originalBulkCaller) : block;
}


describe('Dino Lab bounded ceratopsian beak surface', () => {
  it('keeps unsupported topology, disabled calls and invalid heights completely unchanged', () => {
    const data = setup();
    for (const [enabled, height, edit] of [
      [false, data.height], [undefined, data.height], [1, data.height], ['true', data.height],
      [true, 0], [true, -data.height], [true, NaN], [true, Infinity],
      [true, data.height, geometry => geometry.deleteAttribute('uv')],
      [true, data.height, geometry => geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3))],
      [true, data.height, geometry => geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0], 2))],
      [true, data.height, geometry => geometry.setIndex([0, 1, 2])]
    ]) {
      const geometry = originalGeometry(data); if (edit) edit(geometry);
      const saved = snapshot(geometry);
      try { expect(art.dinoBeakSurfaceGeometry(THREE, geometry, height, enabled)).toBe(geometry); expectUnchanged(geometry, saved); }
      finally { geometry.dispose(); }
    }
  });

  it('sculpts the existing geometry without replacing attributes, indices or groups', () => {
    const data = setup(), geometry = originalGeometry(data), saved = snapshot(geometry);
    try {
      expect(art.dinoBeakSurfaceGeometry(THREE, geometry, data.height, true)).toBe(geometry);
      for (const [name, value] of Object.entries(saved.attributes)) {
        expect(geometry.attributes[name]).toBe(value.attribute); expect(geometry.attributes[name].array).toBe(value.array);
      }
      expect(geometry.index).toBe(saved.index.attribute); expect(geometry.index.array).toBe(saved.index.array);
      expect(geometry.index.array).toEqual(saved.index.values); expect(geometry.attributes.uv.array).toEqual(saved.attributes.uv.values);
      expect(JSON.stringify(geometry.groups)).toBe(saved.groups); expect(geometry.attributes.position.count).toBe(1227);
    } finally { geometry.dispose(); }
  });

  for (const scale of [.03, 1, 12]) for (const breadth of [.84, 1.12]) {
    it('forms a closed symmetric bounded hook at scale ' + scale + ' and breadth ' + breadth, () => {
      const data = setup(scale, breadth), geometry = originalGeometry(data), saved = snapshot(geometry);
      art.dinoBeakSurfaceGeometry(THREE, geometry, data.height, true);
      try {
        const p = geometry.attributes.position, n = geometry.attributes.normal, old = saved.attributes.position.values;
        expect(Array.from(p.array).every(Number.isFinite)).toBe(true); expect(Array.from(n.array).every(Number.isFinite)).toBe(true);
        const edges = topology(geometry); expect(edges.degenerates).toBe(0); expect(edges.counts.every(count => count === 2)).toBe(true);
        let maxNormalError = 0;
        for (let i = 0; i < p.count; i++) {
          expect(p.getX(i)).toBe(old[i * 3]);
          const dy = p.getY(i) - old[i * 3 + 1];
          expect(dy).toBeGreaterThanOrEqual(-data.height * .16 - scale * 1e-6);
          expect(dy).toBeLessThanOrEqual(data.height * .04 + scale * 1e-6);
          expect(Math.abs(p.getZ(i))).toBeLessThanOrEqual(Math.abs(old[i * 3 + 2]) + scale * 1e-6);
          maxNormalError = Math.max(maxNormalError, Math.abs(new THREE.Vector3().fromBufferAttribute(n, i).length() - 1));
          const point = new THREE.Vector3().fromBufferAttribute(p, i);
          expect(geometry.boundingBox.containsPoint(point)).toBe(true);
          expect(point.distanceTo(geometry.boundingSphere.center)).toBeLessThanOrEqual(geometry.boundingSphere.radius + scale * 1e-6);
        }
        expect(maxNormalError).toBeLessThan(1e-6);
        for (let ring = 0; ring <= 48; ring++) for (let side = 0; side <= 24; side++) {
          const a = ring * 25 + side, b = ring * 25 + 24 - side;
          expect(Math.abs(p.getX(a) - p.getX(b))).toBeLessThan(scale * 1e-6);
          expect(Math.abs(p.getY(a) - p.getY(b))).toBeLessThan(scale * 1e-6);
          expect(Math.abs(p.getZ(a) + p.getZ(b))).toBeLessThan(scale * 1e-6);
          if (side === 0) expect(new THREE.Vector3().fromBufferAttribute(n, a).distanceTo(new THREE.Vector3().fromBufferAttribute(n, b))).toBeLessThan(1e-6);
        }
        expect(p.array.slice(0, 25 * 3)).toEqual(old.slice(0, 25 * 3));
        expect(p.array.slice((p.count - 2) * 3, (p.count - 1) * 3)).toEqual(old.slice((p.count - 2) * 3, (p.count - 1) * 3));
        expect(geometry.attributes.uv.array).toEqual(saved.attributes.uv.values); expect(geometry.index.array).toEqual(saved.index.values);
        expect(geometry.boundingBox.min.x).toBe(saved.box.min[0]); expect(geometry.boundingBox.max.x).toBe(saved.box.max[0]);
        const tip = p.count - 1, mid = 24 * 25;
        expect(p.getY(tip) - old[tip * 3 + 1]).toBeLessThan(-data.height * .15);
        expect(p.getY(mid) - old[mid * 3 + 1]).toBeGreaterThan(data.height * .03);
        const oldTipWidth = Math.max(...Array.from({ length: 25 }, (_, j) => Math.abs(old[(48 * 25 + j) * 3 + 2])));
        const newTipWidth = Math.max(...Array.from({ length: 25 }, (_, j) => Math.abs(p.getZ(48 * 25 + j))));
        expect(newTipWidth).toBeLessThan(oldTipWidth * .50); expect(newTipWidth).toBeGreaterThan(oldTipWidth * .40);
        let previousCenterX = Infinity;
        for (let ring = 0; ring <= 48; ring++) {
          let centerX = 0; for (let side = 0; side < 24; side++) centerX += p.getX(ring * 25 + side); centerX /= 24;
          expect(centerX).toBeLessThanOrEqual(previousCenterX + scale * 1e-6); previousCenterX = centerX;
        }
      } finally { geometry.dispose(); }
    });
  }

  it('keeps every native root-ring vertex inside the head across scale and breadth inputs', () => {
    for (const scale of [.03, 1, 12]) for (const breadth of [.84, 1.12]) {
      const data = setup(scale, breadth), built = caller(data), head = data.head, snout = data.snout;
      const root = head.clone().add(new THREE.Vector3(.6 * scale, -.05 * scale, 0)), occiput = head.clone().add(new THREE.Vector3(.32 * scale, 0, 0));
      const skull = new THREE.Mesh(art.dinoCranialGeometry(THREE,
        [root, root.clone().lerp(occiput, .5), occiput, head, head.clone().lerp(snout, .58), snout, snout.clone().add(new THREE.Vector3(-.25 * scale, -.03 * data.height, 0))],
        [[.08 * scale, .08 * scale], [data.height * .20, data.depth * .24], [data.height * .84, data.depth * .82], [data.height, data.depth],
          [data.height * .62 * data.profile.muzzleHeightScale, data.depth * .72 * data.profile.muzzleDepthScale],
          [data.height * .45 * data.profile.muzzleTipScale, data.depth * .62 * data.profile.muzzleTipScale], [data.height * .025, data.depth * .04]],
        { center: head.clone().lerp(snout, .28).add(new THREE.Vector3(0, -data.height * .24, 0)), length: data.length, height: data.height, depth: data.depth, cheek: data.profile.cheekScale }),
        new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
      try {
        built.mesh.updateMatrixWorld(true);
        expect(built.mesh.geometry.attributes.position.count).toBe(2403);
        for (let i = 0; i < 48; i++) {
          const point = built.mesh.localToWorld(new THREE.Vector3().fromBufferAttribute(built.mesh.geometry.attributes.position, i)), delta = point.clone().sub(data.base);
          const hit = new THREE.Raycaster(data.base.clone().addScaledVector(delta, 8), delta.clone().normalize().negate()).intersectObject(skull, false)[0];
          expect(hit).toBeDefined();
          expect(hit.point.clone().sub(data.base).dot(delta.clone().normalize())).toBeGreaterThan(delta.length() * 1.10);
        }
      } finally { skull.geometry.dispose(); skull.material.dispose(); disposeBuilt(built); }
    }
  });

  for (const id of ['oviraptor', 'gallimimus', 'parasaurolophus']) {
    it('keeps actual non-target ' + id + ' beak geometry byte-identical', () => {
      const data = setup(1, 1, id), built = caller(data), original = originalGeometry(data);
      try {
        expect(built.helperCalls.every(call => call.enabled !== true)).toBe(true);
        for (const name of ['position', 'normal', 'uv']) expect(built.mesh.geometry.attributes[name].array).toEqual(original.attributes[name].array);
        expect(built.mesh.geometry.index.array).toEqual(original.index.array);
        expect(built.mesh.position.toArray()).toEqual(data.base.toArray());
        expect(built.registered).toEqual([built.mesh]);
      } finally { original.dispose(); disposeBuilt(built); }
    });
  }

  it('keeps the actual eligible beak material, root transform, tag and cranial registration', () => {
    const data = setup(), built = caller(data);
    try {
      expect(built.model.children).toHaveLength(1); expect(built.helperCalls).toHaveLength(1);
      expect(built.helperCalls[0].enabled).toBe(true); expect(built.helperCalls[0].geometry).toBe(built.mesh.geometry);
      expect(built.mesh.material).toBe(built.material); expect(built.mesh.position.toArray()).toEqual(data.base.toArray());
      expect(built.mesh.scale.toArray()).toEqual([1, 1, 1]); expect(built.mesh.quaternion.toArray()).toEqual([0, 0, 0, 1]);
      expect(built.mesh.userData.dinoFeature).toBe('keratin-beak'); expect(built.registered).toEqual([built.mesh]);
      expect(built.mesh.castShadow).toBe(true); expect(built.mesh.receiveShadow).toBe(true);
    } finally { disposeBuilt(built); }
  });

  it('does not create or register a surface for a species without a keratin beak', () => {
    const built = caller(setup(), false);
    try { expect(built.mesh).toBe(undefined); expect(built.model.children).toHaveLength(0); expect(built.helperCalls).toHaveLength(0); expect(built.registered).toHaveLength(0); }
    finally { disposeBuilt(built); }
  });

  it('moves the sculpted surface rigidly with the established shoulder pivot without changing its geometry', () => {
    const data = setup(), built = caller(data), mesh = built.mesh, saved = snapshot(mesh.geometry);
    const rig = new THREE.Group(), neck = new THREE.Object3D(), shoulder = new THREE.Vector3(.8, .2, .13), rest = neck.quaternion.clone();
    built.model.add(rig, neck); rig.add(mesh); neck.position.copy(shoulder); neck.rotation.set(.04, .08, .02);
    try {
      art.dinoConnectedCranialPose(THREE, rig, shoulder, neck, rest); built.model.updateMatrixWorld(true);
      const actualBox = new THREE.Box3(), expectedBox = new THREE.Box3(); let maxError = 0;
      for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
        const point = new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i);
        const expected = point.clone().add(data.base).sub(shoulder).applyQuaternion(neck.quaternion).add(shoulder);
        const actual = point.applyMatrix4(mesh.matrixWorld);
        actualBox.expandByPoint(actual); expectedBox.expandByPoint(expected); maxError = Math.max(maxError, actual.distanceTo(expected));
      }
      expect(maxError).toBeLessThan(1e-6); expect(actualBox.min.distanceTo(expectedBox.min)).toBeLessThan(1e-6); expect(actualBox.max.distanceTo(expectedBox.max)).toBeLessThan(1e-6);
      expect(mesh.position.toArray()).toEqual(data.base.toArray()); expectUnchanged(mesh.geometry, saved);
    } finally { disposeBuilt(built); }
  });

  it('preserves the exact jaw, eye and skeletal cranial construction blocks', () => {
    expect(sha(section('var cranialFaceBefore = model.children.slice();', 'captureCranialMotion(cranialFaceBefore);'))).toBe('2b81e77a5fa505be745eecd6c26c0cf35b6557456471815f0baed3893fcc3514');
    expect(sha(preservedSkeletalFrame())).toBe('0aa48b531de1c5dcb977239553d69a054f6caf9b6110de72115319f69f4909c0');
    const skeletalStart = source.indexOf('var cranialBoneBefore = model.children.slice();');
    expect(sha(section('} else if (/Oviraptor/i.test(cladeName)) {', '} else if (/Tyrannosaur/i.test(cladeName)', skeletalStart))).toBe('589a3149811aaa70cf3a04127ed42805415891f537ac7b4f038c61689ad06f09');
  });
});
