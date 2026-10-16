import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_habitat.js', 'utf8');
const math = source.slice(source.indexOf('function smooth('), source.indexOf('function groundHeight('));
const geometrySource = source.slice(source.indexOf('function smallLeafGeometry('), source.indexOf('function groundSurfaceAt('));
const mapSource = source.slice(source.indexOf('function livingGroundLeafMaps('), source.indexOf('var livingLeafMaps ='));
const drawSource = source.slice(source.indexOf('function groundDetail('), source.indexOf('groundDetail(false);'));
const updateSource = source.slice(source.indexOf('function update(time, wind)'), source.indexOf('function isBlocked('));
const point = (attribute, index) => new THREE.Vector3().fromBufferAttribute(attribute, index);
const leaves = detailed => new Function('THREE', 'detailed', `
  function geometry(value) { return value; }
  function random() { throw new Error('Leaf detail must not consume placement randomness'); }
  ${math} ${geometrySource} return smallLeafGeometry(true);`)(THREE, detailed);

function maps(detailed) {
  const textures = [];
  const canvas = size => {
    const value = { width: size, height: size };
    value.getContext = () => ({
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: image => { value.pixels = image.data; },
    });
    return value;
  };
  const texture = image => { const value = new THREE.CanvasTexture(image); textures.push(value); return value; };
  const result = new Function('THREE', 'detailed', 'canvas', 'texture', `
    function random() { throw new Error('Leaf texture must not consume placement randomness'); }
    ${math} ${mapSource} return livingGroundLeafMaps();`)(THREE, detailed, canvas, texture);
  return { ...result, textures, dispose: () => textures.forEach(texture => texture.dispose()) };
}

function batch(detailed) {
  const root = new THREE.Group(), resources = [], textures = maps(detailed);
  resources.push(...textures.textures);
  return new Function('THREE', 'detailed', 'root', 'resources', 'livingLeafMaps', `
    var dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),tint=new THREE.Color(),disposed=false;
    var cyclePhase={value:0},clock={value:0},breeze={value:new THREE.Vector3()},global={};
    function random(){throw new Error('Ground herbs must not consume placement randomness');}
    function geometry(value){resources.push(value);return value;}
    function material(options){var value=new THREE.MeshStandardMaterial(options);resources.push(value);return value;}
    function linear(value){return new THREE.Color(value).convertSRGBToLinear();}
    function groundSurfaceAt(x,z){return{height:.012*x-.008*z,normal:new THREE.Vector3(-.012,1,.008).normalize()};}
    function applyWind(){} function applyLeafTransmission(){}
    ${math} ${geometrySource} ${drawSource} ${updateSource}
    groundDetail(true);return{root:root,resources:resources,update:update,dispose:dispose};
  `)(THREE, detailed, root, resources, textures);
}

describe('BirdLab close ground leaves', () => {
  it.each([false, true])('gives five blades continuous tapered silhouettes with shared curved surfaces (high=%s)', detailed => {
    const geometry = leaves(detailed);
    try {
      const p = geometry.attributes.position, uv = geometry.attributes.uv, n = geometry.attributes.normal;
      const roots = [], tips = [], coordinates = new Set();
      for (let vertex = 0; vertex < p.count; vertex++) {
        const position = point(p, vertex), normal = point(n, vertex);
        expect(position.toArray().every(Number.isFinite)).toBe(true);
        expect(normal.length()).toBeCloseTo(1, 6); expect(normal.y).toBeGreaterThan(.2);
        expect(position.y).toBeGreaterThan(0);
        coordinates.add(position.toArray().join(','));
        if (uv.getY(vertex) === 0) roots.push(vertex);
        if (uv.getY(vertex) === 1) tips.push(vertex);
      }
      expect(coordinates.size).toBe(p.count); expect(roots).toHaveLength(5); expect(tips).toHaveLength(5);
      for (let blade = 0; blade < 5; blade++) {
        const root = point(p, roots[blade]), tip = point(p, tips[blade]);
        expect(Math.hypot(tip.x - root.x, tip.z - root.z)).toBeGreaterThan(.47);
        expect(Math.hypot(tip.x - root.x, tip.z - root.z)).toBeLessThan(.81);
        let high = 0;
        for (let vertex = roots[blade]; vertex <= tips[blade]; vertex++) high = Math.max(high, p.getY(vertex));
        expect(high - tip.y).toBeGreaterThan(.12); // Tips droop below the living arch.
        expect(high).toBeLessThan(.49);
      }
      expect(p.count).toBeLessThanOrEqual(detailed ? 400 : 190);
      expect(geometry.index.count / 3).toBeLessThanOrEqual(detailed ? 660 : 280);
    } finally { geometry.dispose(); }
  });

  it.each([false, true])('keeps faces finite and upward and avoids hard shading folds (high=%s)', detailed => {
    const geometry = leaves(detailed);
    try {
      const p = geometry.attributes.position, n = geometry.attributes.normal, indices = geometry.index;
      let greatestNormalAngle = 0;
      for (let triangle = 0; triangle < indices.count; triangle += 3) {
        const vertices = [indices.getX(triangle), indices.getX(triangle + 1), indices.getX(triangle + 2)];
        const a = point(p, vertices[0]), face = point(p, vertices[1]).sub(a).cross(point(p, vertices[2]).sub(a));
        expect(face.lengthSq()).toBeGreaterThan(1e-12); expect(face.y).toBeGreaterThan(0);
        face.normalize();
        for (let edge = 0; edge < 3; edge++) {
          const first = point(n, vertices[edge]), second = point(n, vertices[(edge + 1) % 3]);
          expect(first.dot(face)).toBeGreaterThan(.75);
          greatestNormalAngle = Math.max(greatestNormalAngle, first.angleTo(second));
        }
      }
      expect(greatestNormalAngle).toBeGreaterThan(.05);
      // The low-detail mesh spans a longer arc between its fewer stations.
      expect(greatestNormalAngle).toBeLessThan(detailed ? .7 : .8);
    } finally { geometry.dispose(); }
  });

  it('uses restrained leaf pigment variation and separately raised vein relief without placement RNG', () => {
    const geometry = leaves(true), first = maps(true), second = maps(true), low = maps(false);
    try {
      const pigments = geometry.attributes.color.array;
      expect(Math.min(...pigments)).toBeGreaterThan(.8); expect(Math.max(...pigments)).toBeLessThan(1.1);
      expect(Math.max(...pigments) - Math.min(...pigments)).toBeGreaterThan(.05);
      expect(first.color.image.pixels).toEqual(second.color.image.pixels);
      expect(first.bump.image.pixels).toEqual(second.bump.image.pixels);
      expect(first.bump.encoding).toBe(THREE.LinearEncoding);
      expect(first.color.image.width).toBe(256); expect(low.color.image.width).toBe(128);
      const pixels = first.bump.image.pixels, value = (x, y) => pixels[(y * 256 + x) * 4];
      let centerHeight = 0, tissueHeight = 0, raisedVeins = 0;
      for (let y = 32; y < 224; y++) {
        centerHeight += value(128, y); tissueHeight += value(82, y);
        if (value(82, y) > 132) raisedVeins++;
      }
      expect(centerHeight / 192 - tissueHeight / 192).toBeGreaterThan(35);
      expect(raisedVeins).toBeGreaterThan(5);
    } finally { geometry.dispose(); first.dispose(); second.dispose(); low.dispose(); }
  });

  it.each([false, true])('retains one instanced draw, bounded resources, deterministic transforms and exact-once disposal (high=%s)', detailed => {
    const first = batch(detailed), second = batch(detailed);
    try {
      expect(first.root.children).toHaveLength(1);
      const mesh = first.root.children[0], other = second.root.children[0];
      expect(mesh.name).toBe('clustered-woodland-ground-leaves'); expect(mesh.isInstancedMesh).toBe(true);
      expect(mesh.count).toBe(detailed ? 40 : 15);
      expect(mesh.instanceMatrix.array).toEqual(other.instanceMatrix.array);
      expect(mesh.instanceColor.array).toEqual(other.instanceColor.array);
      expect(mesh.material.map).toBe(first.resources[0]);
      expect(mesh.material.bumpMap).toBe(detailed ? first.resources[1] : null);
      const resources = [...first.resources], buffer = mesh.geometry.attributes.position.array;
      const disposal = resources.map(resource => { const item = { count: 0 }; resource.addEventListener('dispose', () => item.count++); return item; });
      for (let frame = 0; frame < 120; frame++) first.update(frame / 30, .6);
      expect(first.resources).toEqual(resources); expect(mesh.geometry.attributes.position.array).toBe(buffer);
      expect(resources).toHaveLength(4);
      first.dispose(); first.dispose(); expect(disposal.every(item => item.count === 1)).toBe(true);
    } finally { first.dispose(); second.dispose(); }
  });
});
