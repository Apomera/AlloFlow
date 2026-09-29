import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
function region(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b <= a) throw new Error('Missing live rock shader region: ' + start);
  return source.slice(a, b);
}
const helper = region('function shadeCLHuntRockSurface(', 'function createCLHuntPlantGeometry(');
const shade = new Function(helper + ';return shadeCLHuntRockSurface;')();
function compiled() {
  const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: { sentinel: { value: 3 } } };
  shade(shader);return shader;
}
// Execute the production scalar GLSL functions directly as JavaScript. These functions use
// the same scalar arithmetic; vector gradients and actual compilation are covered by GPU tests.
function scalarFunctions() {
  const definitions = Array.from(compiled().fragmentShader.matchAll(/float (clRock\w+)\(([^)]*)\)\{([^{}]*)\}/g));
  const js = definitions.map(([, name, parameters, body]) => 'function ' + name + '(' + parameters.replace(/float /g, '') + '){' + body.replace(/\bfloat /g, 'let ') + '}').join('\n');
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const smoothstep = (low, high, value) => { const t = clamp((value - low) / (high - low), 0, 1);return t * t * (3 - 2 * t); };
  const mod = (value, divisor) => value - divisor * Math.floor(value / divisor), mix = (a, b, t) => a * (1 - t) + b * t;
  return new Function('floor', 'mod', 'mix', 'min', 'max', 'clamp', 'smoothstep', js + ';return {' + definitions.map(([, name]) => name).join(',') + '};')(Math.floor, mod, mix, Math.min, Math.max, clamp, smoothstep);
}
function construct(isWebGL2, derivatives) {
  const reef = region('        function reefSurface(shader){', '        // ─── Reef rocks');
  const rocks = region('        var rocks = [];', '        // ─── Curved branching coral colonies');
  let seed = 2741;const draws = [], requested = [], math = Object.create(Math);
  math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;const value = seed / 4294967296;draws.push(value);return value; };
  const renderer = { capabilities: { isWebGL2 }, extensions: { has(name) { requested.push(name);return derivatives; } } };
  const scene = new Function('THREE', 'Math', 'renderer', helper + reef + ';var scene=new THREE.Scene();' + rocks + ';return scene;')(THREE, math, renderer);
  return { scene, draws, requested, dispose() { scene.traverse(object => { object.geometry?.dispose();object.material?.dispose(); }); } };
}

describe('Cephalopod Hunter static rock material', () => {
  it('extends the actual bundled r128 standard shader at valid stages without new resources', () => {
    const shader = compiled();
    expect(THREE.REVISION).toBe('128');
    expect(THREE.ShaderChunk.roughnessmap_fragment).toContain('float roughnessFactor = roughness;');
    expect(THREE.ShaderChunk.normal_fragment_begin).toContain('vec3 normal = normalize( vNormal );');
    expect(shader.vertexShader).toContain('#include <begin_vertex>\nclRockPosition=position;');
    expect(shader.fragmentShader).toContain('#include <roughnessmap_fragment>\nroughnessFactor=clRockRoughness(');
    expect(shader.fragmentShader).toContain('#include <normal_fragment_maps>\nvec3 clRockDx=dFdx(-vViewPosition)');
    expect(shader.fragmentShader).not.toContain('\\n');
    expect(shader.uniforms).toEqual({ sentinel: { value: 3 } });
    expect(helper).not.toMatch(/Math\.random|\btexture2D\b|\buniform\b|\btime\b/);
    expect(shader.fragmentShader).toContain('if(abs(clRockDet)>0.0000000001)');
    expect(shader.fragmentShader).not.toMatch(/dFd[xy]\(clRock(?:GrainAA|CoarseAA)/);
    expect(helper).not.toMatch(/\bsin\(|\bcos\(|\bfor\s*\(|\bwhile\s*\(/);
    const noise = shader.fragmentShader.match(/float clRockValueNoise\([^{}]+\{([^{}]+)\}/)[1];
    expect(noise.match(/clRockHash\(/g)).toHaveLength(8);
    expect(helper.match(/return clRockValueNoise\(/g)).toHaveLength(2);
  });

  it('samples smooth irregular lattice values with bounded hash arithmetic, shading and filtered grain', () => {
    const f = scalarFunctions();
    const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;
    const hashValues = new Set();
    for (let x = -50; x <= 80; x += 7) for (let y = -10; y <= 100; y += 9) for (let z = -40; z <= 70; z += 11) {
      const first = x * 7 + 19, hx = mod(first, 127), second = hx * mod(hx, 13) + y * 5 + 23;
      const hxy = mod(second, 127), third = hxy * mod(hxy, 11) + z * 3 + 31;
      const hxyz = mod(third, 127), fourth = hxyz * mod(hxyz, 7) + 17;
      // The real sampled rock domain avoids large floating-point hashes and overflow.
      expect(Math.max(Math.abs(first), Math.abs(second), Math.abs(third), Math.abs(fourth))).toBeLessThan(2048);
      const reference = mod(fourth, 127) / 126;
      expect(f.clRockHash(x, y, z)).toBe(reference);hashValues.add(reference);
      expect(f.clRockValueNoise(x, y, z)).toBe(reference * 2 - 1);
    }
    expect(hashValues.size).toBeGreaterThan(60);
    // Reject the short diagonal repeats of a hash that collapses XYZ to one linear residue.
    for (const shift of [[2, 0, -9], [5, -7, 0], [0, 1, 24]]) {
      let changed = 0;
      for (let i = -20; i <= 20; i++) if (f.clRockHash(i, i * 2, -i) !== f.clRockHash(i + shift[0], i * 2 + shift[1], -i + shift[2])) changed++;
      expect(changed).toBeGreaterThan(35);
    }
    // Cubic interpolation is continuous with flat first derivatives at lattice boundaries.
    for (const axis of [0, 1, 2]) for (let boundary = -4; boundary <= 4; boundary++) {
      const a = [.317, -.713, .223], b = [...a];a[axis] = boundary - 1e-5;b[axis] = boundary + 1e-5;
      expect(Math.abs(f.clRockValueNoise(...a) - f.clRockValueNoise(...b))).toBeLessThan(2e-8);
    }
    for (let x = -2.4; x <= 2.4; x += .19) for (let y = -2.4; y <= 2.4; y += .27) for (let z = -2.4; z <= 2.4; z += .41) {
      const coarse = f.clRockCoarseField(x, y, z), grain = f.clRockGrainField(x, y, z);
      expect(Number.isFinite(coarse) && Math.abs(coarse) <= 1).toBe(true);
      expect(Number.isFinite(grain) && Math.abs(grain) <= 1).toBe(true);
      for (const aa of [0, .5, 1]) {
        const tone = f.clRockAlbedo(coarse, grain, aa), roughness = f.clRockRoughness(.92, coarse, grain, aa);
        expect(tone).toBeGreaterThanOrEqual(.817);expect(tone).toBeLessThanOrEqual(.983);
        expect(roughness).toBeGreaterThanOrEqual(.86);expect(roughness).toBeLessThanOrEqual(.98);
      }
    }
    let previous = 1;
    for (let footprint = 0; footprint <= 10; footprint += .1) {
      const aa = f.clRockFilter(footprint);
      expect(aa).toBeGreaterThanOrEqual(0);expect(aa).toBeLessThanOrEqual(previous);previous = aa;
    }
    expect(f.clRockFilter(.35)).toBe(1);expect(f.clRockFilter(1.1)).toBe(0);
    expect(f.clRockAlbedo(.4, -.8, 0)).toBe(f.clRockAlbedo(.4, .8, 0));
    expect(f.clRockRoughness(.92, .4, -.8, 0)).toBe(f.clRockRoughness(.92, .4, .8, 0));
  });

  it('bounds the live slope limiter including zero and near-degenerate finite magnitudes', () => {
    const { clRockSlopeLimit: limit } = scalarFunctions();
    for (const magnitude of [0, 1e-14, 1e-8, .01, .119, .12, .3, 1, 10, 1e6, 1e20]) {
      const scale = limit(magnitude), slope = magnitude * scale;
      expect(Number.isFinite(scale)).toBe(true);expect(scale).toBeGreaterThan(0);expect(scale).toBeLessThanOrEqual(1);
      expect(slope).toBeLessThanOrEqual(.12000000000000001);
      // A tangent gradient of this size keeps the normalized result within 6.85 degrees.
      expect(Math.atan(slope) * 180 / Math.PI).toBeLessThan(6.85);
    }
    expect(limit(0)).toBe(1);expect(limit(.01)).toBe(1);
  });

  it('uses one static cached rock program with a WebGL1 derivative fallback and unchanged seeded layout', () => {
    const fixtures = [construct(true, false), construct(false, true), construct(false, false)];
    try {
      for (const fixture of fixtures) {
        expect(fixture.draws).toHaveLength(354);expect(fixture.scene.children).toHaveLength(44);
        expect(fixture.draws).toEqual(fixtures[0].draws);
        let at = 0, rockIndex = 0;
        for (let placement = 0; placement < 45; placement++) {
          const x = (fixture.draws[at++] - .5) * 110, z = (fixture.draws[at++] - .5) * 110;
          if (Math.abs(x) < 6 && Math.abs(z) < 6) continue;
          const size = .6 + fixture.draws[at++] * 1.4, colorIndex = Math.floor(fixture.draws[at++] * 5), lightness = (fixture.draws[at++] - .5) * .05;
          const rotationX = fixture.draws[at++] * Math.PI, rotationY = fixture.draws[at++] * Math.PI, scaleY = .7 + fixture.draws[at++] * .5;
          const mesh = fixture.scene.children[rockIndex++];
          expect(mesh.position.toArray()).toEqual([x, size * .35, z]);expect(mesh.rotation.toArray()).toEqual([rotationX, rotationY, 0, 'XYZ']);expect(mesh.scale.toArray()).toEqual([1, scaleY, 1]);
          expect(mesh.userData).toEqual({ substrate: 'rock', substrateRadius: size * 1.2 });
          expect(mesh.castShadow && mesh.receiveShadow).toBe(true);expect(mesh.material.roughness).toBe(.92);
          const expectedColor = new THREE.Color([0x55483a, 0x3f4d3d, 0x5c4f3f, 0x46524a, 0x4a3f36][colorIndex]).offsetHSL(0, 0, lightness).convertSRGBToLinear();
          expect(mesh.material.color.toArray()).toEqual(expectedColor.toArray());
          expect(mesh.geometry.attributes.position.count).toBe(425);expect(mesh.geometry.index.count).toBe(2160);
        }
        expect(at).toBe(354);
      }
      expect(fixtures[0].requested).toEqual([]);
      for (const fixture of fixtures.slice(0, 2)) for (const mesh of fixture.scene.children) {
        expect(mesh.material.onBeforeCompile.name).toBe('shadeCLHuntRockSurface');expect(mesh.material.customProgramCacheKey()).toBe('cl-rock-surface-v1');expect(mesh.material.extensions.derivatives).toBe(true);
      }
      for (const mesh of fixtures[2].scene.children) expect(mesh.material.onBeforeCompile.name).toBe('reefSurface');
      expect(source).toContain("coral.name='cl-coral-colony';coral.material.onBeforeCompile=reefSurface;");
    } finally { fixtures.forEach(fixture => fixture.dispose()); }
  });
});
