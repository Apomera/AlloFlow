import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
function create(id, quality) {
  const window = {};
  new Function('window', source)(window);
  return window.AvianWoodlandBirds.create(THREE, id, { quality });
}

describe('woodland body feather contours', () => {
  it.each(['high', 'low'])('merges feathered thighs into the torso and tapers toward the tarsi (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality);
      try {
        const grouse = id === 'grouse', radius = grouse ? [.066, .078, .124] : [.037, .043, .073];
        const stance = grouse ? .024 : .014, bodyY = grouse ? .126 : .083, legTop = (grouse ? .056 : .034) + .009;
        const body = bird.root.getObjectByName('woodland-body-plumage');
        const { position, normal, uv, featherInfo } = body.geometry.attributes;
        let lowestThigh = Infinity, maximumNormalError = 0;
        const counts = [new Set(), new Set()], widths = [[0, 0], [0, 0]], rootDepth = [];
        for (let vertex = 0; vertex < position.count; vertex++) {
          const kind = featherInfo.getX(vertex), seed = featherInfo.getY(vertex);
          maximumNormalError = Math.max(maximumNormalError, Math.abs(Math.hypot(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex)) - 1));
          if (seed < 2200) continue;
          const side = seed >= 2400 ? 1 : 0, origin = side ? 2400 : 2200;
          const x = position.getX(vertex), y = position.getY(vertex), z = position.getZ(vertex);
          lowestThigh = Math.min(lowestThigh, y + bodyY);
          if (kind === 1) {
            counts[side].add(seed);
            if (seed - origin < (quality === 'high' ? 12 : 8) && uv.getY(vertex) === 0) {
              rootDepth.push((x / radius[0]) ** 2 + (y / radius[1]) ** 2 + (z / radius[2]) ** 2);
            }
          } else if (kind === 0) {
            const radialWidth = Math.hypot((x - (side ? stance : -stance)) / (radius[0] * .31), (z - .004) / (radius[2] * .225));
            const latitude = uv.getY(vertex);
            if (latitude >= .25 && latitude <= .6) widths[side][0] = Math.max(widths[side][0], radialWidth);
            if (latitude >= .75) widths[side][1] = Math.max(widths[side][1], radialWidth);
          }
        }
        expect(counts.map(set => set.size)).toEqual(quality === 'high' ? [96, 96] : [40, 40]);
        expect(rootDepth.length).toBeGreaterThan(0); expect(Math.max(...rootDepth)).toBeLessThan(1);
        for (const [upper, lower] of widths) expect(lower).toBeLessThan(upper * .72);
        expect(lowestThigh).toBeGreaterThan(.03); expect(lowestThigh).toBeLessThan(legTop);
        expect(maximumNormalError).toBeLessThan(2e-5);
        const footBounds = new THREE.Box3().setFromObject(bird.feet[0]);
        expect(Math.abs(footBounds.min.y)).toBeLessThan(1e-7);
      } finally { bird.dispose(); }
    }
  });

  it.each(['high', 'low'])('covers the forward breast pole with nondegenerate overlapping feather fans (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality);
      try {
        const body = bird.root.getObjectByName('woodland-body-plumage');
        const { position, normal, featherInfo } = body.geometry.attributes;
        const radius = id === 'grouse' ? [.066, .078, .124] : [.037, .043, .073];
        const capSeeds = new Set(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
        const capVertex = vertex => featherInfo.getY(vertex) >= 1000 && featherInfo.getY(vertex) < 1100;
        let minimumArea = Infinity, maximumZ = -Infinity;
        for (let vertex = 0; vertex < position.count; vertex++) if (capVertex(vertex)) {
          capSeeds.add(featherInfo.getY(vertex));
          maximumZ = Math.max(maximumZ, position.getZ(vertex));
          expect(featherInfo.getX(vertex)).toBe(1);
          expect(Math.abs(Math.hypot(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex)) - 1)).toBeLessThan(2e-5);
          expect(normal.getZ(vertex)).toBeGreaterThan(.45);
        }
        const index = body.geometry.index;
        for (let triangle = 0; triangle < index.count; triangle += 3) if (capVertex(index.getX(triangle))) {
          a.fromBufferAttribute(position, index.getX(triangle));
          b.fromBufferAttribute(position, index.getX(triangle + 1));
          c.fromBufferAttribute(position, index.getX(triangle + 2));
          minimumArea = Math.min(minimumArea, b.sub(a).cross(c.sub(a)).length() * .5);
        }
        expect(capSeeds.size).toBe(quality === 'high' ? 14 : 10);
        expect(minimumArea).toBeGreaterThan(1e-8);
        expect(maximumZ).toBeCloseTo(radius[2], 7);
        // Trace the visible surface from several directions across the former
        // bare patch. Its nearest surface must be feathered, not the undercoat.
        const probe = new THREE.Mesh(body.geometry, body.material);
        const ray = new THREE.Raycaster(), direction = new THREE.Vector3();
        for (const latitude of [.025, .09, .17, .25, .33]) for (let azimuth = 0; azimuth < 16; azimuth++) {
          const angle = azimuth / 16 * Math.PI * 2 + .037;
          direction.set(radius[0] * Math.sin(latitude) * Math.cos(angle), radius[1] * Math.sin(latitude) * Math.sin(angle), radius[2] * Math.cos(latitude)).normalize();
          ray.set(direction.clone(), direction.clone().negate());
          const hits = ray.intersectObject(probe);
          expect(hits.length).toBeGreaterThan(0);
          expect(featherInfo.getX(hits[0].face.a)).toBe(1);
        }
      } finally { bird.dispose(); }
    }
  });

  it.each(['high', 'low'])('keeps the feathered body static and within the existing anatomical envelope (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality);
      try {
        const body = bird.root.getObjectByName('woodland-body-plumage');
        const attributes = Object.values(body.geometry.attributes).map(attribute => [attribute, attribute.array]);
        const initial = body.geometry.attributes.position.array.slice(), grouse = id === 'grouse';
        const radius = grouse ? [.066, .078, .124] : [.037, .043, .073];
        const point = new THREE.Vector3(), position = body.geometry.attributes.position;
        let envelopeExcess = -Infinity, finite = true;
        for (let vertex = 0; vertex < position.count; vertex++) {
          point.fromBufferAttribute(position, vertex);
          finite = finite && Number.isFinite(point.x + point.y + point.z);
          envelopeExcess = Math.max(envelopeExcess, Math.abs(point.x) - radius[0] - .001,
            point.y - radius[1] - .001, Math.abs(point.z) - radius[2] - .001);
        }
        expect(finite).toBe(true); expect(envelopeExcess).toBeLessThan(0);
        for (const pose of [{ peck: 1 }, { flight: 1, phase: 4.2, effort: .8 }, { flight: .43, landing: 1 }]) bird.update(pose);
        expect(body.geometry.attributes.position.array).toEqual(initial);
        for (const [attribute, array] of attributes) expect(attribute.array).toBe(array);
        expect(body.geometry.index.count / 3).toBeLessThan(quality === 'high' ? 23000 : 4100);
        let meshes = 0; bird.root.traverse(object => { if (object.isMesh) meshes++; });
        expect(meshes).toBe(9);
      } finally { bird.dispose(); }
    }
  });

  it.each(['high', 'low'])('covers the rump with aligned shallow coverts and preserves the tail-joint envelope (%s)', quality => {
    for (const id of ['mourningDove', 'grouse']) {
      const bird = create(id, quality);
      try {
        const body = bird.root.getObjectByName('woodland-body-plumage');
        const { position, normal, featherInfo, uv } = body.geometry.attributes;
        const radius = id === 'grouse' ? [.066, .078, .124] : [.037, .043, .073];
        const feathers = new Map();
        for (let vertex = 0; vertex < position.count; vertex++) {
          const seed = featherInfo.getY(vertex);
          if (seed < 1200 || seed >= 1300) continue;
          const feather = feathers.get(seed) || { rootY: 0, tipY: 0, roots: 0, tips: 0 };
          if (uv.getY(vertex) === 0) { feather.rootY += position.getY(vertex); feather.roots++; }
          if (uv.getY(vertex) === 1) { feather.tipY += position.getY(vertex); feather.tips++; }
          feathers.set(seed, feather);
          expect(featherInfo.getX(vertex)).toBe(1);
          expect(position.getZ(vertex)).toBeGreaterThan(-radius[2] - .0004);
          expect(position.getZ(vertex)).toBeLessThan(-radius[2] * .75);
          expect(Math.abs(position.getX(vertex))).toBeLessThan(radius[0] * .65);
          expect(normal.getZ(vertex)).toBeLessThan(-.5);
          expect(Math.abs(Math.hypot(normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex)) - 1)).toBeLessThan(2e-5);
        }
        expect(feathers.size).toBe(quality === 'high' ? 35 : 16);
        // Every tract has the same feather lay: no fan of converging tips.
        for (const feather of feathers.values()) {
          expect(feather.rootY / feather.roots - feather.tipY / feather.tips).toBeGreaterThan(radius[1] * .25);
        }
        const probe = new THREE.Mesh(body.geometry, body.material), ray = new THREE.Raycaster();
        for (const latitude of [.025, .09, .17, .25, .33]) for (let azimuth = 0; azimuth < 16; azimuth++) {
          const angle = azimuth / 16 * Math.PI * 2 + .037;
          const direction = new THREE.Vector3(radius[0] * Math.sin(latitude) * Math.cos(angle), radius[1] * Math.sin(latitude) * Math.sin(angle), -radius[2] * Math.cos(latitude)).normalize();
          ray.set(direction.clone(), direction.clone().negate());
          const hits = ray.intersectObject(probe);
          expect(hits.length).toBeGreaterThan(0);
          expect(featherInfo.getX(hits[0].face.a)).toBe(1);
        }
      } finally { bird.dispose(); }
    }
  });
});
