import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
if (process.env.CEPHALOPOD_EXPECT_CORAL_TISSUE === '1' && !process.env.CEPHALOPOD_CORAL_BASELINE) throw new Error('Focused coral validation requires CEPHALOPOD_CORAL_BASELINE');
const baseline = process.env.CEPHALOPOD_CORAL_BASELINE ? readFileSync(process.env.CEPHALOPOD_CORAL_BASELINE, 'utf8').replace(/\r\n/g, '\n') : null;
const baselineIt = baseline ? it : it.skip;
function region(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a);
  if (a < 0 || b <= a) throw new Error('Missing coral region: ' + start);
  return text.slice(a, b);
}
const helperOf = text => region(text, 'function shadeCLHuntCoralSurface(', 'function shadeCLHuntPlantFlex(');
const factoryOf = text => region(text, 'function createReefCoralGeometry(height,index){', 'var coralColors =');
const reefOf = text => region(text, '        function reefSurface(shader){', '        // ─── Reef rocks');
const noRandom = Object.assign(Object.create(Math), { random() { throw new Error('Geometry consumed dive RNG'); } });
const buildOf = text => new Function('THREE', 'Math', factoryOf(text) + ';return createReefCoralGeometry;')(THREE, noRandom);
const build = buildOf(source), buildBaseline = baseline ? buildOf(baseline) : null;
function compiled(text = source) {
  const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} };
  new Function(helperOf(text) + ';return shadeCLHuntCoralSurface;')()(shader);
  return shader;
}
function scalarFunctions(text = source) {
  const definitions = Array.from(compiled(text).fragmentShader.matchAll(/float (clCoral\w+)\(([^)]*)\)\{([^{}]*)\}/g));
  const js = definitions.map(([, name, parameters, body]) => 'function ' + name + '(' + parameters.replace(/float /g, '') + '){' + body.replace(/\bfloat /g, 'let ') + '}').join('\n');
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const smoothstep = (lo, hi, v) => { const t = clamp((v - lo) / (hi - lo), 0, 1);return t * t * (3 - 2 * t); };
  return new Function('floor', 'fract', 'mod', 'sqrt', 'min', 'max', 'abs', 'clamp', 'smoothstep', 'sin', 'cos', js + ';return {' + definitions.map(([, name]) => name).join(',') + '};')(Math.floor, v => v - Math.floor(v), (a, b) => a - b * Math.floor(a / b), Math.sqrt, Math.min, Math.max, Math.abs, clamp, smoothstep, Math.sin, Math.cos);
}
const bytes = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
function sameGeometry(actual, expected) {
  assert.deepEqual(Object.keys(actual.attributes), Object.keys(expected.attributes));
  for (const name of Object.keys(expected.attributes)) {
    const a = actual.attributes[name], b = expected.attributes[name];
    assert.equal(a.array.constructor, b.array.constructor);assert.equal(a.itemSize, b.itemSize);
    assert.equal(a.normalized, b.normalized);assert.equal(a.count, b.count);assert.deepEqual(bytes(a.array), bytes(b.array));
  }
  assert.equal(actual.index.array.constructor, expected.index.array.constructor);
  assert.deepEqual(bytes(actual.index.array), bytes(expected.index.array));
  assert.deepEqual(actual.boundingBox, expected.boundingBox);assert.deepEqual(actual.boundingSphere, expected.boundingSphere);
  assert.deepEqual(actual.groups, expected.groups);assert.deepEqual(actual.drawRange, expected.drawRange);assert.deepEqual(actual.userData, expected.userData);
}
function construct(text, webgl2, supported, initialSeed = 2741) {
  const spawn = region(text, '        var coralColors =', '        // ─── Sea grass');
  let seed = initialSeed;const draws = [], calls = [], math = Object.create(Math);
  math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;const value = seed / 4294967296;draws.push(value);return value; };
  const renderer = { capabilities: { isWebGL2: webgl2 }, extensions: { has(name) { calls.push(name);return supported; } } };
  const scene = new Function('THREE', 'Math', 'renderer', helperOf(text) + reefOf(text) + factoryOf(text) + ';var scene=new THREE.Scene();' + spawn + ';return scene;')(THREE, math, renderer);
  return { scene, draws, calls, dispose() { scene.traverse(o => { o.geometry?.dispose();o.material?.dispose(); }); } };
}

describe('Cephalopod Hunter living coral tissue', () => {
  baselineIt('preserves every authored geometry, attribute byte, index and bound against the direct frozen baseline', () => {
    for (const height of [1, 1.75, 2.5]) for (let index = 0; index < 18; index++) {
      const actual = build(height, index), expected = buildBaseline(height, index);
      try { sameGeometry(actual, expected); } finally { actual.dispose();expected.dispose(); }
    }
  }, 30000);

  baselineIt('preserves seeded RNG, placement, palette and the exact derivative-free fallback', () => {
    expect(reefOf(source)).toBe(reefOf(baseline));
    for (const seed of [2741, 17]) for (const [webgl2, supported] of [[true, false], [false, true], [false, false]]) {
      const actual = construct(source, webgl2, supported, seed), expected = construct(baseline, webgl2, supported, seed);
      try {
        assert.deepEqual(actual.draws, expected.draws);assert.deepEqual(actual.calls, expected.calls);
        assert.equal(actual.scene.children.length, expected.scene.children.length);
        actual.scene.children.forEach((mesh, i) => {
          const old = expected.scene.children[i];
          assert.deepEqual(mesh.position.toArray(), old.position.toArray());assert.deepEqual(mesh.rotation.toArray(), old.rotation.toArray());
          assert.deepEqual(mesh.scale.toArray(), old.scale.toArray());assert.deepEqual(mesh.userData, old.userData);
          assert.equal(mesh.castShadow, old.castShadow);assert.equal(mesh.receiveShadow, old.receiveShadow);sameGeometry(mesh.geometry, old.geometry);
          for (const key of ['type', 'roughness', 'metalness', 'vertexColors', 'side', 'opacity', 'transparent']) assert.deepEqual(mesh.material[key], old.material[key]);
          assert.deepEqual(mesh.material.color.toArray(), old.material.color.toArray());
          if (webgl2 || supported) {
            assert.equal(mesh.material.onBeforeCompile.name, 'shadeCLHuntCoralSurface');assert.equal(mesh.material.customProgramCacheKey(), 'cl-coral-tissue-v15');
            assert.equal(mesh.material.extensions.derivatives, true);
          } else {
            assert.equal(mesh.material.onBeforeCompile.toString(), old.material.onBeforeCompile.toString());
            const a = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: {} }, b = { ...a, uniforms: {} };
            mesh.material.onBeforeCompile(a);old.material.onBeforeCompile(b);assert.deepEqual(a, b);
          }
        });
      } finally { actual.dispose();expected.dispose(); }
    }
  }, 30000);

  it('retains the fine pore function and gives larger calyces and broad tissue finite bounded fields', () => {
    const f = scalarFunctions(), fragment = compiled().fragmentShader, old = baseline ? compiled(baseline).fragmentShader : null;
    for (const name of ['clCoralHash', 'clCoralPoreField', 'clCoralFilter', 'clCoralTone', 'clCoralRoughness']) {
      const pattern = new RegExp('float ' + name + '\\([^{}]+\\)\\{[^{}]+\\}');
      if (old) assert.equal(fragment.match(pattern)?.[0], old.match(pattern)?.[0]);
      assert.ok(fragment.match(pattern), name + ' must exist');
    }
    let tissueMin = Infinity, tissueMax = -Infinity, calyxMin = Infinity, calyxMax = -Infinity;
    for (let period = 6; period <= 29; period++) {
      const half = f.clCoralCalyxPeriod(period);assert.equal(half, Math.max(3, Math.round(period / 2)));
      assert.ok(Number.isInteger(half) && half < period);
      for (let v = .137; v < 319; v += 2.731) for (let u = .071; u < period; u += .479) {
        const tissue = f.clCoralTissueField(f.clCoralTissueAngle(u, period), v), calyx = f.clCoralPoreField(u * half / period, v * .5, half);
        assert.ok(Number.isFinite(tissue) && tissue >= -1 && tissue <= 1);
        assert.ok(Number.isFinite(calyx) && calyx >= -.85 && calyx <= .18);
        tissueMin = Math.min(tissueMin, tissue);tissueMax = Math.max(tissueMax, tissue);calyxMin = Math.min(calyxMin, calyx);calyxMax = Math.max(calyxMax, calyx);
        const tone = f.clCoralLivingTone(tissue, calyx, 1, 1);assert.ok(Number.isFinite(tone) && tone >= .8621 - 1e-12 && tone <= 1.12918 + 1e-12);
      }
    }
    assert.ok(tissueMin < -.9 && tissueMax > .9 && calyxMin < -.8 && calyxMax > .14);
    assert.equal(f.clCoralLivingTone(-1, 0, 1, 1), .925);assert.equal(f.clCoralLivingTone(1, 0, 1, 1), 1.075);
    for (const base of [0, .84, .89, 1]) for (const field of [-.85, 0, .18]) for (const calyx of [-.85, 0, .18]) for (const aa of [0, .3, 1]) {
      const roughness = f.clCoralLivingRoughness(f.clCoralRoughness(base, field, aa), calyx, aa);
      assert.ok(Number.isFinite(roughness) && roughness >= .87 && roughness <= .96);
    }
  });

  it('closes both new fields around every integer branch period including Float32 seam interpolation error', () => {
    const f = scalarFunctions();
    const neighbor = (value, steps) => { const floats = new Float32Array([value]), bits = new Uint32Array(floats.buffer);bits[0] += steps;return floats[0]; };
    for (let period = 6; period <= 29; period++) for (let v = .131; v < 319; v += 1.971) {
      const half = f.clCoralCalyxPeriod(period), calyx = f.clCoralPoreField(0, v * .5, half), tissue = f.clCoralTissueField(f.clCoralTissueAngle(0, period), v);
      for (const steps of [-4, -1, 0, 1, 4]) {
        const interpolatedPeriod = neighbor(period, steps), error = interpolatedPeriod - period, rounded = Math.max(1, Math.floor(interpolatedPeriod + .5));
        assert.equal(f.clCoralCalyxPeriod(interpolatedPeriod), half);
        for (const u of [error, period + error]) {
          assert.ok(Math.abs(f.clCoralPoreField(u * half / rounded, v * .5, half) - calyx) < 1e-11);
          assert.ok(Math.abs(f.clCoralTissueField(f.clCoralTissueAngle(u, interpolatedPeriod), v) - tissue) < 1e-11);
        }
      }
      const u = period * .371;
      assert.ok(Math.abs(f.clCoralPoreField(u * half / period, v * .5, half) - f.clCoralPoreField((u + period) * half / period, v * .5, half)) < 1e-10);
      assert.ok(Math.abs(f.clCoralTissueField(f.clCoralTissueAngle(u, period), v) - f.clCoralTissueField(f.clCoralTissueAngle(u + period, period), v)) < 1e-10);
    }
  });

  it('fades all detail with footprint and keeps actual root collars and sealed tip rings smooth', () => {
    const f = scalarFunctions(), fragment = compiled().fragmentShader;
    for (const field of ['clCoralField', 'clCoralCalyx', 'clCoralTissue']) assert.match(fragment, new RegExp('float ' + field + '=[^;]+\\*clamp\\(vCLCoralSurface.z,0.0,1.0\\);'));
    let previous = 1;
    for (let footprint = 0; footprint <= 2; footprint += .01) { const aa = f.clCoralFilter(footprint);assert.ok(aa >= 0 && aa <= previous);previous = aa; }
    assert.equal(f.clCoralFilter(.2), 1);assert.equal(f.clCoralFilter(.7), 0);
    for (const tissue of [-1, -.3, 0, .7, 1]) for (const calyx of [-.85, 0, .18]) {
      assert.equal(f.clCoralLivingTone(tissue, calyx, 0, 0), 1);
      assert.equal(f.clCoralLivingRoughness(.89, calyx, 0), .89);
      assert.equal(f.clCoralTone(calyx, 0), .89);
    }
    let tips = 0, interiors = 0;
    for (let index = 0; index < 18; index++) {
      const geometry = build(1.75, index);
      try {
        const p = geometry.attributes.position, surface = geometry.attributes.clCoralSurface;assert.equal(surface.getZ(0), 0);
        for (let row = 0; row < surface.count; row += 9) {
          const mask = surface.getZ(row);assert.ok(Number.isFinite(mask) && mask >= 0 && mask <= 1);if (mask > .5) interiors++;
          for (let side = 0; side <= 8; side++) assert.equal(surface.getZ(row + side), mask);
          const a = new THREE.Vector3().fromBufferAttribute(p, row), b = new THREE.Vector3().fromBufferAttribute(p, row + 4);
          if (a.distanceTo(b) < 1e-7) {
            tips++;
            for (let ring = 0; ring < 3; ring++) assert.equal(surface.getZ(row - ring * 9), 0);
            if (row + 9 < surface.count) assert.equal(surface.getZ(row + 9), 0);
            assert.equal(f.clCoralLivingTone(f.clCoralTissueField(1.3, surface.getY(row)) * mask, -.85 * mask, 1, 1), 1);
          }
        }
      } finally { geometry.dispose(); }
    }
    assert.ok(tips > 180 && interiors > 300);
  });

  it('bounds the combined relief slope and retains the existing shader and resource budget', () => {
    const f = scalarFunctions(), shader = compiled(), fragment = shader.fragmentShader;
    assert.equal(THREE.REVISION, '128');assert.deepEqual(shader.uniforms, {});
    assert.equal((shader.vertexShader.match(/attribute vec4 clCoralSurface;/g) || []).length, 1);
    if (baseline) { const old = compiled(baseline);assert.deepEqual(shader.uniforms, old.uniforms);assert.equal(shader.vertexShader, old.vertexShader); }
    assert.match(fragment, /dFdx\(clCoralField\)\*0\.0012\*clCoralAA\+dFdx\(clCoralCalyx\)\*0\.003\*clCoralCalyxAA/);
    assert.match(fragment, /dFdy\(clCoralField\)\*0\.0012\*clCoralAA\+dFdy\(clCoralCalyx\)\*0\.003\*clCoralCalyxAA/);
    assert.match(fragment, /#ifdef DOUBLE_SIDED\nclCoralDet\*=faceDirection;\n#endif/);
    assert.match(fragment, /if\(abs\(clCoralDet\)>0\.0000000001\)/);
    assert.match(fragment, /clCoralGradient-=normal\*dot\(normal,clCoralGradient\);\n\s*clCoralGradient\*=clCoralSlopeLimit\(length\(clCoralGradient\)\);\n\s*normal=normalize\(normal-clCoralGradient\);/);
    assert.doesNotMatch(fragment, /dFd[xy]\(clCoral(?:AA|CalyxAA|TissueAA|Tissue)\)/);
    assert.doesNotMatch(helperOf(source), /Math\.random|\btexture2D\b|\buniform\b|\btime\b|\bfor\s*\(/);
    for (const magnitude of [0, 1e-12, .01, .099, .1, 1, 1e4, 1e12]) {
      const scale = f.clCoralSlopeLimit(magnitude);assert.ok(Number.isFinite(scale) && scale >= 0 && scale <= 1);
      assert.ok(magnitude * scale <= .10000000000000002);if (magnitude <= .1) assert.equal(scale, 1);
    }
    // Feed real combined field derivatives through the final limiter, including grazing scales.
    for (const period of [6, 13, 29]) for (let v = .13; v < 24; v += .31) for (let u = .07; u < period; u += .41) {
      const half = f.clCoralCalyxPeriod(period), height = (x, y) => .0012 * f.clCoralPoreField(x, y, period) + .003 * f.clCoralPoreField(x * half / period, y * .5, half), e = 1e-4;
      const dx = (height(u + e, v) - height(u - e, v)) / (2 * e), dy = (height(u, v + e) - height(u, v - e)) / (2 * e);
      for (const grazing of [1, 1e-4, 1e-8]) {
        const magnitude = Math.hypot(dx, dy) / grazing, limited = magnitude * f.clCoralSlopeLimit(magnitude);
        assert.ok(Number.isFinite(limited) && limited <= .10000000000000002);
        assert.ok(Math.atan(limited) <= Math.atan(.1) + 1e-15);
      }
    }
    const actual = construct(source, true, false), expected = baseline ? construct(baseline, true, false) : null;
    const resourceCounts = fixture => {
      const geometries = new Set(), materials = new Set(), textures = new Set();let bytesTotal = 0, triangles = 0;
      fixture.scene.traverse(o => {
        if (o.geometry && !geometries.has(o.geometry)) { geometries.add(o.geometry);for (const a of Object.values(o.geometry.attributes)) bytesTotal += a.array.byteLength;bytesTotal += o.geometry.index.array.byteLength;triangles += o.geometry.index.count / 3; }
        if (o.material) { materials.add(o.material);for (const value of Object.values(o.material)) if (value?.isTexture) textures.add(value); }
      });
      return { geometries: geometries.size, materials: materials.size, textures: textures.size, bytesTotal, triangles };
    };
    try {
      const counts = resourceCounts(actual);if (expected) assert.deepEqual(counts, resourceCounts(expected));
      assert.equal(counts.textures, 0);assert.equal(counts.geometries, 18);assert.equal(counts.materials, 18);
    } finally { actual.dispose();expected?.dispose(); }
  });
});
