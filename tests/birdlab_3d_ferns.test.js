import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_habitat.js', 'utf8');
const math = source.slice(source.indexOf('function smooth('), source.indexOf('function groundHeight('));
const plantBody = source.slice(source.indexOf('function grassGeometry('), source.indexOf('function groundPlants('));

function plantGeometry(detailed, fern = true) {
  let calls = 0, state = 972031;
  const random = () => { calls++; state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  const geometry = new Function('THREE', 'detailed', 'fern', 'random', `
    function geometry(value) { return value; }
    function linear(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }
    ${math}
    ${plantBody}
    return grassGeometry(fern);`)(THREE, detailed, fern, random);
  return { geometry, calls, state };
}

// Follow actual mesh connectivity rather than relying on vertex offsets. Each
// rachis and pinna is a separate connected surface in the instanced plant.
function surfaces(geometry) {
  const parents = Array.from({ length: geometry.attributes.position.count }, (_, index) => index);
  function find(index) { while (parents[index] !== index) index = parents[index]; return index; }
  const indices = geometry.index.array;
  for (let triangle = 0; triangle < indices.length; triangle += 3) {
    const root = find(indices[triangle]);
    parents[find(indices[triangle + 1])] = root;
    parents[find(indices[triangle + 2])] = root;
  }
  const groups = new Map();
  for (let vertex = 0; vertex < parents.length; vertex++) {
    const key = find(vertex);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(vertex);
  }
  return [...groups.values()];
}

function average(attribute, vertices) {
  const total = new THREE.Vector3();
  for (const vertex of vertices) total.add(new THREE.Vector3().fromBufferAttribute(attribute, vertex));
  return total.multiplyScalar(1 / vertices.length);
}

describe('BirdLab arched woodland ferns', () => {
  it('narrows the bare rachis in three dimensions instead of exposing ribbon tips', () => {
    const { geometry } = plantGeometry(true),a=new THREE.Vector3(),b=new THREE.Vector3();
    try {
      const p=geometry.attributes.position,uv=geometry.attributes.uv;
      const stems=surfaces(geometry).filter(vertices=>vertices.every(vertex=>uv.getX(vertex)===.5));
      for(const vertices of stems) {
        const rootWidth=a.fromBufferAttribute(p,vertices[0]).distanceTo(b.fromBufferAttribute(p,vertices[1]));
        const tipWidth=a.fromBufferAttribute(p,vertices[vertices.length-2]).distanceTo(b.fromBufferAttribute(p,vertices[vertices.length-1]));
        expect(tipWidth).toBeLessThan(rootWidth*.04);
        expect(tipWidth).toBeGreaterThan(0);
      }
    } finally { geometry.dispose(); }
  });

  it('keeps high quality pinnae attached to the rendered rachis while arching and drooping', () => {
    const { geometry } = plantGeometry(true);
    try {
      const groups = surfaces(geometry), position = geometry.attributes.position, uv = geometry.attributes.uv;
      const stems = groups.filter(vertices => vertices.every(vertex => uv.getX(vertex) === .5));
      const pinnae = groups.filter(vertices => !stems.includes(vertices));
      expect(stems).toHaveLength(7);
      expect(pinnae).toHaveLength(126);
      const stemSegments = stems.flatMap(vertices => {
        const centers = [];
        for (let index = 0; index < vertices.length; index += 2) centers.push(average(position, vertices.slice(index, index + 2)));
        return centers.slice(1).map((end, index) => new THREE.Line3(centers[index], end));
      });
      for (const vertices of pinnae) {
        expect(vertices).toHaveLength(6); // Bounded high-quality tessellation.
        const row = along => vertices.filter(vertex => uv.getY(vertex) === along);
        const root = average(position, row(0)), middle = average(position, row(.5)), tip = average(position, row(1));
        const length = Math.hypot(tip.x - root.x, tip.z - root.z);
        const rootGap = Math.min(...stemSegments.map(segment => segment.closestPointToPoint(root, true, new THREE.Vector3()).distanceTo(root)));
        expect(rootGap).toBeLessThan(2e-7);
        expect(middle.y - (root.y + tip.y) / 2).toBeGreaterThan(length * .04);
        expect(middle.y - (root.y + tip.y) / 2).toBeLessThan(length * .15);
        expect(middle.y - tip.y).toBeGreaterThan(length * .025);
        const rootNormal = average(geometry.attributes.normal, row(0)).normalize();
        const tipNormal = average(geometry.attributes.normal, row(1)).normalize();
        expect(rootNormal.dot(tipNormal)).toBeLessThan(.995);
        expect(rootNormal.dot(tipNormal)).toBeGreaterThan(.75);
      }
    } finally { geometry.dispose(); }
  });

  it.each([false, true])('retains finite, nondegenerate surfaces and unit normals (high=%s)', detailed => {
    const { geometry } = plantGeometry(detailed);
    try {
      const position = geometry.attributes.position, normal = geometry.attributes.normal, index = geometry.index.array;
      for (const attribute of Object.values(geometry.attributes)) for (const value of attribute.array) expect(Number.isFinite(value)).toBe(true);
      for (let vertex = 0; vertex < normal.count; vertex++) expect(new THREE.Vector3().fromBufferAttribute(normal, vertex).length()).toBeCloseTo(1, 6);
      for (let triangle = 0; triangle < index.length; triangle += 3) {
        const a = new THREE.Vector3().fromBufferAttribute(position, index[triangle]);
        const b = new THREE.Vector3().fromBufferAttribute(position, index[triangle + 1]);
        const c = new THREE.Vector3().fromBufferAttribute(position, index[triangle + 2]);
        expect(new THREE.Vector3().crossVectors(b.sub(a), c.sub(a)).length()).toBeGreaterThan(1e-7);
      }
      if (!detailed) {
        expect(position.count).toBe(462);
        expect(index.length / 3).toBe(252);
        expect(surfaces(geometry).filter(vertices => vertices.length === 4)).toHaveLength(98);
      } else {
        expect(position.count).toBe(826);
        expect(index.length / 3).toBe(560);
      }
    } finally { geometry.dispose(); }
  });

  it.each([false, true])('preserves the deterministic placement random stream (fern=%s)', fern => {
    const low = plantGeometry(false, fern), high = plantGeometry(true, fern), repeated = plantGeometry(true, fern);
    try {
      const expectedCalls = fern ? 7 : 21;
      let expectedState = 972031;
      for (let index = 0; index < expectedCalls; index++) expectedState = (Math.imul(expectedState, 1664525) + 1013904223) >>> 0;
      expect(low.calls).toBe(expectedCalls);
      expect(high.calls).toBe(expectedCalls);
      expect(low.state).toBe(expectedState);
      expect(high.state).toBe(expectedState);
      for (const [name, attribute] of Object.entries(high.geometry.attributes)) {
        expect(attribute.array).toEqual(repeated.geometry.attributes[name].array);
        if (!fern) expect(attribute.array).toEqual(low.geometry.attributes[name].array);
      }
      expect(high.geometry.index.array).toEqual(repeated.geometry.index.array);
    } finally { low.geometry.dispose(); high.geometry.dispose(); repeated.geometry.dispose(); }
  });

  it('ships identical fern geometry to the desktop mirror', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/birdlab_3d_habitat.js', 'utf8')).toBe(source);
  });
});
