import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
const cases = ['mourningDove', 'grouse'].flatMap(id => ['high', 'low'].map(quality => [id, quality]));
function create(id, quality) {
  const scope = {};
  new Function('window', source)(scope);
  return scope.AvianWoodlandBirds.create(THREE, id, { quality });
}
function geometry(bird) { return bird.wings[0].getObjectByName('woodland-layered-wing').geometry; }
function point(position, index) { return new THREE.Vector3().fromBufferAttribute(position, index); }
function underneath(info, vertex) { return info.getX(vertex) === 3 && info.getY(vertex) >= 2048; }
function feathers(g) {
  const { position, uv, featherInfo } = g.attributes, result = [];
  for (let first = 0; first < position.count;) {
    let end = first + 1;
    while (end < position.count && !(uv.getX(end) === 0 && uv.getY(end) === 0)) end++;
    if (underneath(featherInfo, first)) {
      const centers = [];
      for (let vertex = first; vertex < end; vertex++) if (uv.getX(vertex) === .5) centers.push(vertex);
      result.push({ first, end, centers, halfRow: centers[0] - first });
    }
    first = end;
  }
  return result;
}
function widths(position, tracts) {
  return tracts.flatMap(feather => feather.centers.slice(1, -1).map(center =>
    point(position, center - feather.halfRow).distanceTo(point(position, center + feather.halfRow))));
}
function lengths(position, tracts) {
  return tracts.map(feather => feather.centers.slice(1).reduce((sum, center, row) =>
    sum + point(position, center).distanceTo(point(position, feather.centers[row])), 0));
}
function difference(a, b) {
  let max = 0;
  for (let index = 0; index < a.length; index++) max = Math.max(max, Math.abs(a[index] - b[index]));
  return max;
}
function firstHit(g, x, z) {
  const { position, featherInfo } = g.attributes, indices = g.index.array;
  const ray = new THREE.Ray(new THREE.Vector3(x, -.08, z), new THREE.Vector3(0, 1, 0));
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), at = new THREE.Vector3();
  let height = Infinity, result = null;
  for (let triangle = 0; triangle < indices.length; triangle += 3) {
    a.fromBufferAttribute(position, indices[triangle]); b.fromBufferAttribute(position, indices[triangle + 1]);
    c.fromBufferAttribute(position, indices[triangle + 2]);
    if (ray.intersectTriangle(a, b, c, false, at) && at.y < height) {
      height = at.y; result = { underside: underneath(featherInfo, indices[triangle]), y: at.y };
    }
  }
  return result;
}

describe('woodland feathered underwing', () => {
  it.each(cases)('covers the %s inner wing with outward-facing underside feathers and hides them when folded (%s)', (id, quality) => {
    const bird = create(id, quality), g = geometry(bird), { position, normal, featherInfo } = g.attributes;
    try {
      bird.update({ flight: 1, effort: 0 });
      const tracts = feathers(g), scale = id === 'grouse' ? 1.22 : 1;
      expect(tracts.length).toBeGreaterThan(12);
      let minimumFacing = 1, maximumNormalError = 0;
      for (const feather of tracts) for (let vertex = feather.first; vertex < feather.end; vertex++) {
        minimumFacing = Math.min(minimumFacing, -normal.getY(vertex));
        maximumNormalError = Math.max(maximumNormalError,
          Math.abs(Math.hypot(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex)) - 1));
      }
      expect(minimumFacing).toBeGreaterThan(.9); expect(maximumNormalError).toBeLessThan(2e-5);
      // Actual underside rays must first meet pale/marked coverts across the
      // shoulder, forearm and wrist, rather than expose the dark quill roots.
      for (const x of [.020, .050, .080, .110, .140]) {
        const hit = firstHit(g, x * scale, (-.025 - x * .1) * scale);
        expect(hit, `uncovered inner-wing sample at span ${x}`).not.toBeNull();
        expect(hit.underside, `exposed remex root at span ${x}`).toBe(true);
      }
      bird.update({ flight: 0, effort: 0 });
      const mantle = new THREE.Box3();
      for (let vertex = 0; vertex < position.count; vertex++)
        if (!underneath(featherInfo, vertex)) mantle.expandByPoint(point(position, vertex));
      mantle.expandByScalar(.002);
      for (const feather of tracts) for (let vertex = feather.first; vertex < feather.end; vertex++)
        expect(mantle.containsPoint(point(position, vertex))).toBe(true);
    } finally { bird.dispose(); }
  });

  it.each(cases)('keeps the %s underwing tracts broad, finite and continuous during a loaded wingbeat (%s)', (id, quality) => {
    const bird = create(id, quality), g = geometry(bird), { position, normal } = g.attributes;
    try {
      bird.update({ flight: 1, effort: 0 });
      const tracts = feathers(g), neutralWidths = widths(position, tracts), neutralLengths = lengths(position, tracts);
      let minimumWidth = 1, maximumWidth = 1, maximumStrain = 0, normalError = 0, boundsExcess = -Infinity;
      const probe = new THREE.Vector3();
      for (let sample = 0; sample < 36; sample++) {
        const pose = { flight: 1, effort: 1, phase: sample * Math.PI / 18, bank: .5, landing: .65 };
        bird.update(pose);
        widths(position, tracts).forEach((width, index) => {
          minimumWidth = Math.min(minimumWidth, width / neutralWidths[index]);
          maximumWidth = Math.max(maximumWidth, width / neutralWidths[index]);
        });
        lengths(position, tracts).forEach((length, index) => {
          maximumStrain = Math.max(maximumStrain, Math.abs(length / neutralLengths[index] - 1));
        });
        for (const feather of tracts) for (let vertex = feather.first; vertex < feather.end; vertex++) {
          probe.fromBufferAttribute(position, vertex);
          boundsExcess = Math.max(boundsExcess, probe.distanceTo(g.boundingSphere.center) - g.boundingSphere.radius);
          normalError = Math.max(normalError,
            Math.abs(Math.hypot(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex)) - 1));
        }
        const before = position.array.slice();
        bird.update({ ...pose, phase: pose.phase + .0001 });
        expect(difference(position.array, before)).toBeLessThan(.0001);
      }
      // Short overlapping coverts can shear slightly with the wing skin, but
      // must not become edge-on strips, stretch excessively or pop on recovery.
      expect(minimumWidth).toBeGreaterThan(.75); expect(maximumWidth).toBeLessThan(1.15);
      expect(maximumStrain).toBeLessThan(.18); expect(normalError).toBeLessThan(2e-5);
      expect(boundsExcess).toBeLessThan(0);
      expect([...position.array, ...normal.array].every(Number.isFinite)).toBe(true);
    } finally { bird.dispose(); }
  });

  it.each(cases)('keeps %s underside motion seekable without new meshes or animation resources (%s)', (id, quality) => {
    const bird = create(id, quality), g = geometry(bird), { position, normal } = g.attributes;
    const positions = position.array, normals = normal.array, indices = g.index.array;
    const resources = new Set(), materials = new Set(); let meshes = 0;
    bird.root.traverse(object => { if (object.isMesh) {
      meshes++; resources.add(object.geometry); resources.add(object.material); materials.add(object.material);
    } });
    const disposed = new Map([...resources].map(resource => [resource, 0]));
    for (const resource of resources) resource.addEventListener('dispose', () => disposed.set(resource, disposed.get(resource) + 1));
    try {
      expect(meshes).toBe(9); expect(materials.size).toBe(3);
      const pose = { flight: .62, phase: 4.3, effort: .84, bank: -.4, landing: .55 };
      bird.update(pose); const expected = positions.slice();
      bird.update({ ...pose, phase: pose.phase + Math.PI * 2 });
      expect(difference(positions, expected)).toBeLessThan(1e-7);
      bird.update({ flight: 0, phase: -15, effort: 1 });
      bird.update({ flight: 1, phase: 2.2, effort: .1 });
      bird.update(pose); expect(positions).toEqual(expected);
      expect(position.array).toBe(positions); expect(normal.array).toBe(normals); expect(g.index.array).toBe(indices);
      bird.dispose(); bird.dispose();
      expect([...disposed.values()].every(count => count === 1)).toBe(true);
    } finally { bird.dispose(); }
  });
});
