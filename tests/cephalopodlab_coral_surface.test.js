import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
function region(start, end) { const a = source.indexOf(start), b = source.indexOf(end, a);if (a < 0 || b <= a) throw new Error('Missing coral region: ' + start);return source.slice(a, b); }
const helper = region('function shadeCLHuntCoralSurface(', 'function createCLHuntPlantGeometry(');
const factory = region('function createReefCoralGeometry(height,index){', 'var coralColors =');
const noRandom = Object.assign(Object.create(Math), { random() { throw new Error('Coral geometry consumed dive RNG'); } });
const build = new Function('THREE', 'Math', factory + ';return createReefCoralGeometry;')(THREE, noRandom);
const shade = new Function(helper + ';return shadeCLHuntCoralSurface;')();
function compiled() { const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} };shade(shader);return shader; }
function scalarFunctions() {
  const definitions = Array.from(compiled().fragmentShader.matchAll(/float (clCoral\w+)\(([^)]*)\)\{([^{}]*)\}/g));
  const js = definitions.map(([, name, parameters, body]) => 'function ' + name + '(' + parameters.replace(/float /g, '') + '){' + body.replace(/\bfloat /g, 'let ') + '}').join('\n');
  const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
  const smoothstep = (low, high, v) => { const t = clamp((v - low) / (high - low), 0, 1);return t * t * (3 - 2 * t); };
  return new Function('floor', 'fract', 'mod', 'sqrt', 'min', 'max', 'abs', 'clamp', 'smoothstep', js + ';return {' + definitions.map(([, name]) => name).join(',') + '};')(Math.floor, v => v - Math.floor(v), (a, b) => a - b * Math.floor(a / b), Math.sqrt, Math.min, Math.max, Math.abs, clamp, smoothstep);
}
function construct(webgl2, supported) {
  const reef = region('        function reefSurface(shader){', '        // ─── Reef rocks');
  const spawn = region('        var coralColors =', '        // ─── Sea grass');
  let seed = 2741;const draws = [], calls = [], math = Object.create(Math);
  math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;const value = seed / 4294967296;draws.push(value);return value; };
  const renderer = { capabilities: { isWebGL2: webgl2 }, extensions: { has(name) { calls.push(name);return supported; } } };
  const scene = new Function('THREE', 'Math', 'renderer', helper + reef + factory + ';var scene=new THREE.Scene();' + spawn + ';return scene;')(THREE, math, renderer);
  return { scene, draws, calls, dispose() { scene.traverse(o => { o.geometry?.dispose();o.material?.dispose(); }); } };
}

describe('Cephalopod Hunter coral surface', () => {
  it('preserves all original geometry and colors while adding finite branch coordinates with sealed cap detail', () => {
    const protectedData = [];let memory = 0, tips = 0;
    for (const height of [1, 1.75, 2.5]) for (let index = 0; index < 18; index++) {
      const geometry = build(height, index);
      try {
        const p = geometry.attributes.position, a = geometry.attributes.clCoralSurface;
        expect(a.itemSize).toBe(4);expect(a.count).toBe(p.count);
        expect(p.count).toBe([675, 711, 972][index % 3]);expect(geometry.index.count / 3).toBe([984, 1024, 1320][index % 3]);
        expect(Array.from(a.array).every(Number.isFinite)).toBe(true);
        for (let row = 0; row < a.count; row += 9) {
          const period = a.getW(row), v = a.getY(row), fade = a.getZ(row);
          expect(Number.isInteger(period) && period >= 6 && period <= 29).toBe(true);
          expect(v >= 0 && v < 319 && fade >= 0 && fade <= 1).toBe(true);
          for (let side = 0; side < 9; side++) {
            expect(a.getX(row + side)).toBe(side / 8 * period);expect(a.getY(row + side)).toBe(v);expect(a.getZ(row + side)).toBe(fade);expect(a.getW(row + side)).toBe(period);
          }
          expect(new THREE.Vector3().fromBufferAttribute(p, row).distanceTo(new THREE.Vector3().fromBufferAttribute(p, row + 8))).toBeLessThan(1e-6);
          const diameter = new THREE.Vector3().fromBufferAttribute(p, row).distanceTo(new THREE.Vector3().fromBufferAttribute(p, row + 4));
          if (diameter < 1e-7) {
            tips++;expect(fade).toBe(0);
            // All three hemisphere rings are smooth, and the next branch begins with zero detail.
            for (let offset = 0; offset < 3; offset++) expect(a.getZ(row - offset * 9)).toBe(0);
            if (row + 9 < a.count) expect(a.getZ(row + 9)).toBe(0);
          }
        }
        expect(a.getZ(0)).toBe(0);
        if (height === 1) memory += a.array.byteLength;
        protectedData.push({ height, index, position: Array.from(p.array), normal: Array.from(geometry.attributes.normal.array), color: Array.from(geometry.attributes.color.array), indices: Array.from(geometry.index.array) });
      } finally { geometry.dispose(); }
    }
    expect(tips).toBeGreaterThan(500);expect(memory).toBe(226368);
    expect(createHash('sha256').update(JSON.stringify(protectedData)).digest('hex')).toBe('3a0ba84fb12bc9f6654bf090a07905e793cf8b99983c9c4ea4185151efd32f2c');
  });

  it('keeps jittered pore cells bounded, continuous at cell edges and periodic only at the wrapped branch seam', () => {
    const f = scalarFunctions();let min = Infinity, max = -Infinity, maxSeamError = 0, finite = true;
    for (const period of [6, 13, 29]) for (let v = -2.3; v < 24; v += .137) for (let u = -.4; u < period; u += .173) {
      const value = f.clCoralPoreField(u, v, period);finite = finite && Number.isFinite(value);min = Math.min(min, value);max = Math.max(max, value);
      maxSeamError = Math.max(maxSeamError, Math.abs(value - f.clCoralPoreField(u + period, v, period)));
    }
    expect(finite).toBe(true);expect(min).toBeGreaterThanOrEqual(-.85);expect(min).toBeLessThan(-.8);expect(max).toBeLessThanOrEqual(.18);expect(max).toBeGreaterThan(.14);expect(maxSeamError).toBeLessThan(1e-11);
    // Varyings are not flat-qualified in WebGL1. Exercise real Float32 neighbors,
    // including four ULPs of error in both the count and a coordinate on the seam.
    const offsetFloat32 = (value, steps) => { const floats = new Float32Array([value]), bits = new Uint32Array(floats.buffer);bits[0] += steps;return floats[0]; };
    let maxFloat32SeamError = 0;
    for (let period = 6; period <= 29; period++) for (const steps of [-4, -1, 1, 4]) for (let v = .131; v < 24; v += .271) {
      const perturbed = offsetFloat32(period, steps), error = perturbed - period, expected = f.clCoralPoreField(0, v, period);
      for (const u of [error, period + error]) maxFloat32SeamError = Math.max(maxFloat32SeamError, Math.abs(f.clCoralPoreField(u, v, perturbed) - expected));
    }
    expect(maxFloat32SeamError).toBeLessThan(1e-11);
    for (const period of [6, 13, 29]) for (let row = 0; row < 8; row++) {
      const edge = 3 - .5 * (row % 2);
      for (const epsilon of [-1e-6, 0, 1e-6]) {
        expect(f.clCoralPoreField(edge + epsilon, row + .51, period)).toBe(0);
        expect(f.clCoralPoreField(.37, row + epsilon, period)).toBe(0);
      }
    }
    const rowProfiles = Array.from({ length: 12 }, (_, row) => Array.from({ length: 9 }, (_, i) => f.clCoralPoreField(2 + i / 8, row + .51, 13).toFixed(5)).join(','));
    expect(new Set(rowProfiles).size).toBeGreaterThan(8);
    for (const field of [-.85, -.4, 0, .18]) for (const aa of [0, .25, 1]) {
      expect(f.clCoralTone(field, aa)).toBeGreaterThanOrEqual(.7879999);expect(f.clCoralTone(field, aa)).toBeLessThanOrEqual(.9116001);
      for (const base of [0, .84, 1]) { expect(f.clCoralRoughness(base, field, aa)).toBeGreaterThanOrEqual(.87);expect(f.clCoralRoughness(base, field, aa)).toBeLessThanOrEqual(.96); }
    }
    let previous = 1;
    for (let footprint = 0; footprint < 3; footprint += .03) { const aa = f.clCoralFilter(footprint);expect(aa >= 0 && aa <= previous).toBe(true);previous = aa; }
    expect(f.clCoralFilter(.2)).toBe(1);expect(f.clCoralFilter(.7)).toBe(0);
    expect(f.clCoralTone(-.85, 0)).toBe(f.clCoralTone(.18, 0));
    for (const magnitude of [0, 1e-12, .01, .079, .08, 1, 1e8]) {
      const scale = f.clCoralSlopeLimit(magnitude);expect(Number.isFinite(scale)).toBe(true);expect(magnitude * scale).toBeLessThanOrEqual(.08000000000000002);
    }
  });

  it('extends the actual r128 standard shader with one static attribute and a bounded surface-gradient hook', () => {
    const shader = compiled();
    expect(THREE.REVISION).toBe('128');expect(shader.uniforms).toEqual({});
    expect(shader.vertexShader).toContain('attribute vec4 clCoralSurface;');expect(shader.vertexShader).toContain('#include <begin_vertex>\nvCLCoralSurface=clCoralSurface;');
    expect(shader.fragmentShader).toContain('#include <roughnessmap_fragment>\nroughnessFactor=clCoralRoughness(');
    expect(shader.fragmentShader).toContain('#include <normal_fragment_maps>\nvec3 clCoralDx=dFdx(-vViewPosition)');
    expect(shader.fragmentShader).toContain('if(abs(clCoralDet)>0.0000000001)');expect(shader.fragmentShader).not.toContain('\\n');
    expect(helper).not.toMatch(/Math\.random|\btexture2D\b|\buniform\b|\btime\b|\bsin\(|\bcos\(|\bfor\s*\(/);
    const field = shader.fragmentShader.match(/float clCoralPoreField\([^{}]+\{([^{}]+)\}/)[1];
    expect(field.match(/clCoralHash\(/g)).toHaveLength(2);
    expect(shader.fragmentShader).not.toMatch(/dFd[xy]\(clCoralAA/);
  });

  it('keeps the seeded colony layout and palette, with derivative support and the original fallback', () => {
    const fixtures = [construct(true, false), construct(false, true), construct(false, false)];
    try {
      for (const fixture of fixtures) {
        expect(fixture.draws).toHaveLength(108);expect(fixture.scene.children).toHaveLength(18);expect(fixture.draws).toEqual(fixtures[0].draws);
        let at = 0, ci = 0;
        for (let index = 0; index < 18; index++) {
          const x = (fixture.draws[at++] - .5) * 90, z = (fixture.draws[at++] - .5) * 90;if (Math.abs(x) < 8 && Math.abs(z) < 8) continue;
          const height = 1 + fixture.draws[at++] * 1.5, hex = [0xc94e6d, 0xff6b35, 0xd4af37, 0x8e5572, 0xb8345c][Math.floor(fixture.draws[at++] * 5)], ry = fixture.draws[at++] * Math.PI, rz = (fixture.draws[at++] - .5) * .3;
          const mesh = fixture.scene.children[ci++];expect(mesh.position.toArray()).toEqual([x, height / 2, z]);expect(mesh.rotation.toArray()).toEqual([0, ry, rz, 'XYZ']);
          expect(mesh.userData).toEqual({ substrate: 'coral', coralHex: hex, substrateRadius: 1.1 });expect(mesh.geometry.userData.growthForm).toBe(['finger', 'antler', 'corymbose'][index % 3]);
          expect(mesh.castShadow && mesh.receiveShadow).toBe(true);expect(mesh.material.roughness).toBe(.84);
          expect(mesh.material.color.toArray()).toEqual(new THREE.Color(hex).convertSRGBToLinear().lerp(new THREE.Color(0x9b8a79).convertSRGBToLinear(), .16).toArray());
        }
        expect(at).toBe(108);
      }
      expect(fixtures[0].calls).toEqual([]);
      for (const fixture of fixtures.slice(0, 2)) for (const mesh of fixture.scene.children) { expect(mesh.material.onBeforeCompile.name).toBe('shadeCLHuntCoralSurface');expect(mesh.material.customProgramCacheKey()).toBe('cl-coral-surface-v14');expect(mesh.material.extensions.derivatives).toBe(true); }
      for (const mesh of fixtures[2].scene.children) expect(mesh.material.onBeforeCompile.name).toBe('reefSurface');
      expect(createHash('sha256').update(region('        function reefSurface(shader){', '        // ─── Reef rocks')).digest('hex')).toBe('b15de7c3fcb96e131a7e97eae8c215a685909cc10ce34f70456c9590c07323b5');
    } finally { fixtures.forEach(fixture => fixture.dispose()); }
  });
});
