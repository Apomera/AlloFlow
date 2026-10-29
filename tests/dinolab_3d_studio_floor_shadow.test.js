import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
function loadHelper(name) {
  const start = source.indexOf('  function ' + name + '(');
  if (start < 0) throw new Error('Missing integrated helper: ' + name);
  const helper = source.slice(start, source.indexOf('\n  function ', start + 12));
  return new Function(helper + '\nreturn ' + name + ';')();
}
const dinoStudioFloorShadow = loadHelper('dinoStudioFloorShadow');
const dinoStudioFloorSurface = loadHelper('dinoStudioFloorSurface');
const native = THREE.ShaderChunk.shadowmap_pars_fragment;
const softStart = '#elif defined( SHADOWMAP_TYPE_PCF_SOFT )';
const vsmStart = '#elif defined( SHADOWMAP_TYPE_VSM )';

function compile(material, renderer = {}) {
  const shader = { vertexShader: 'vertex untouched', fragmentShader: '#include <shadowmap_pars_fragment>\nvoid main(){}' };
  material.onBeforeCompile(shader, renderer);
  return shader;
}

describe('Dino Lab studio floor shadow filter', () => {
  it('changes only the local soft-shadow branch and preserves native frustum, bias and other filters', () => {
    const material = new THREE.MeshStandardMaterial();
    dinoStudioFloorShadow(THREE, material);
    const shader = compile(material), output = shader.fragmentShader;
    expect(shader.vertexShader).toBe('vertex untouched');
    expect(output.slice(0, output.indexOf(softStart))).toBe(native.slice(0, native.indexOf(softStart)));
    expect(output.slice(output.indexOf(vsmStart))).toBe(native.slice(native.indexOf(vsmStart)) + '\nvoid main(){}');
    expect(THREE.ShaderChunk.shadowmap_pars_fragment).toBe(native);
    expect(compile(new THREE.MeshStandardMaterial()).fragmentShader).toBe('#include <shadowmap_pars_fragment>\nvoid main(){}');
    expect(material.userData.dinoStudioFloorShadow).toBe(true);
  });

  it('uses sixteen deterministic bounded taps and the same normalized footprint at both map resolutions', () => {
    const material = dinoStudioFloorShadow(THREE, new THREE.MeshStandardMaterial());
    const output = compile(material).fragmentShader;
    const soft = output.slice(output.indexOf(softStart), output.indexOf(vsmStart));
    const taps = [...soft.matchAll(/vec2\(\s*(-?[\d.]+),\s*(-?[\d.]+)\s*\) \* dinoFloorShadowStep/g)].map(match => [Number(match[1]), Number(match[2])]);
    expect(taps).toHaveLength(16);
    expect(new Set(taps.map(tap => tap.join(','))).size).toBe(16);
    for (const [x, y] of taps) expect(Math.hypot(x, y)).toBeLessThanOrEqual(1);
    expect(soft).toContain('4.0 * (shadowMapSize / 1024.0)');
    expect(soft).toContain('dinoFloorShadowRadius / shadowMapSize');
    expect(soft).toContain('(1.0 / 16.0)');
    expect(soft).not.toMatch(/time|random|dFdx|dFdy/);
    for (const [x, y] of taps) {
      const footprints = [1024, 2048].map(size => [x * (4 * size / 1024) / size, y * (4 * size / 1024) / size]);
      expect(footprints[0]).toEqual(footprints[1]);
    }
    expect(compile(material).fragmentShader).toBe(output);
  });

  it('chains existing callbacks with their receiver and renderer and retains the prior cache key', () => {
    const renderer = {}, material = new THREE.MeshStandardMaterial();
    material.customProgramCacheKey = function () { return 'previous-' + this.name; };
    material.name = 'floor';
    const priorCompile = vi.fn(function (shader, passedRenderer) {
      expect(this).toBe(material); expect(passedRenderer).toBe(renderer);
      shader.fragmentShader += '\n// prior shader customization';
    });
    material.onBeforeCompile = priorCompile;
    const version = material.version;
    expect(dinoStudioFloorShadow(THREE, material)).toBe(material);
    const shader = compile(material, renderer);
    expect(priorCompile).toHaveBeenCalledTimes(1);
    expect(shader.fragmentShader).toContain('// prior shader customization');
    expect(material.customProgramCacheKey()).toBe('previous-floor|dinolab-studio-floor-shadow-v1');
    expect(material.version).toBeGreaterThan(version);
    const hook = material.onBeforeCompile;
    dinoStudioFloorShadow(THREE, material);
    expect(material.onBeforeCompile).toBe(hook);
  });

  it('falls back without altering materials when shader support is missing or incompatible', () => {
    for (const runtime of [undefined, {}, { ShaderChunk: {} }, { ShaderChunk: { shadowmap_pars_fragment: 'unknown shader revision' } }]) {
      const material = new THREE.MeshStandardMaterial(), callback = material.onBeforeCompile, key = material.customProgramCacheKey, version = material.version;
      expect(dinoStudioFloorShadow(runtime, material)).toBe(material);
      expect(material.onBeforeCompile).toBe(callback);
      expect(material.customProgramCacheKey).toBe(key);
      expect(material.version).toBe(version);
    }
    expect(dinoStudioFloorShadow(THREE, null)).toBeNull();
    const material = dinoStudioFloorShadow(THREE, new THREE.MeshStandardMaterial());
    const shader = { fragmentShader: 'shader with no shadow include' };
    material.onBeforeCompile(shader, {});
    expect(shader.fragmentShader).toBe('shader with no shadow include');
  });
});

describe('Dino Lab seamless studio floor', () => {
  function standardShader() {
    return { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  }
  it('composes both floor hooks against the native material shader without changing global chunks', () => {
    const material = new THREE.MeshStandardMaterial(), renderer = {};
    const prior = vi.fn(function (shader, passedRenderer) { expect(this).toBe(material); expect(passedRenderer).toBe(renderer); shader.uniforms.priorValue = { value: 7 }; });
    material.onBeforeCompile = prior;
    material.customProgramCacheKey = () => 'existing-floor';
    dinoStudioFloorShadow(THREE, material);
    dinoStudioFloorSurface(THREE, material, 12, 4);
    const shader = standardShader(); material.onBeforeCompile(shader, renderer);
    expect(prior).toHaveBeenCalledTimes(1);
    expect(shader.uniforms.priorValue.value).toBe(7);
    expect(shader.uniforms.dinoStudioFloorSpan.value).toBe(12);
    expect(shader.fragmentShader).toContain('dinoFloorShadowStep');
    expect(shader.fragmentShader).toContain('gl_FragColor.a *= exp(');
    expect(material.customProgramCacheKey()).toBe('existing-floor|dinolab-studio-floor-shadow-v1|dinolab-studio-floor-surface-v1');
    expect(THREE.ShaderChunk.shadowmap_pars_fragment).toBe(native);
    const callback = material.onBeforeCompile;
    dinoStudioFloorSurface(THREE, material, 12, 4);
    expect(material.onBeforeCompile).toBe(callback);
  });

  it('anchors the continuous fade to world coordinates while preserving shader lighting and shadow includes', () => {
    const material = dinoStudioFloorSurface(THREE, new THREE.MeshStandardMaterial(), 2, 6), shader = standardShader();
    material.onBeforeCompile(shader, {});
    expect(shader.vertexShader).toContain('(modelMatrix * vec4(transformed, 1.0)).xz');
    expect(shader.vertexShader).toContain('#include <begin_vertex>');
    expect(shader.fragmentShader).toContain('vDinoStudioFloorXZ / dinoStudioFloorSpan');
    expect(shader.fragmentShader).toContain('#include <lights_fragment_begin>');
    expect(shader.fragmentShader).toContain('#include <shadowmap_pars_fragment>');
    expect(shader.fragmentShader).toContain('#include <dithering_fragment>');
    expect(shader.uniforms.dinoStudioFloorSpan.value).toBe(6);
    expect(shader.vertexShader.match(/varying vec2 vDinoStudioFloorXZ/g)).toHaveLength(1);
    expect(shader.fragmentShader.match(/varying vec2 vDinoStudioFloorXZ/g)).toHaveLength(1);
  });

  it('uses a matte transparent floor that cannot write over translucent anatomical layers', () => {
    const map = new THREE.Texture(), material = new THREE.MeshStandardMaterial({ map });
    const version = material.version;
    dinoStudioFloorSurface(THREE, material, 12, 4);
    expect(material.map).toBeNull(); expect(material.fog).toBe(false);
    expect(material.transparent).toBe(true); expect(material.depthWrite).toBe(false);
    expect(material.depthTest).toBe(true); expect(material.dithering).toBe(true);
    expect(material.color.toArray()).toEqual(new THREE.Color('#182835').convertSRGBToLinear().toArray());
    expect(material.version).toBeGreaterThan(version);
    expect(dinoStudioFloorSurface(THREE, null, 12, 4)).toBeNull();
  });

  it('keeps invalid, tiny and extreme dimensions positive and finite as WebGL float uniforms', () => {
    for (const [length, height] of [[undefined, undefined], ['invalid', NaN], [-10, -2], [0, 0], [0.000001, 0.000002], [Infinity, 4], [Number.MAX_VALUE, 1], [1, Number.MAX_VALUE]]) {
      const material = dinoStudioFloorSurface(THREE, new THREE.MeshStandardMaterial(), length, height), shader = standardShader();
      material.onBeforeCompile(shader, {});
      const span = shader.uniforms.dinoStudioFloorSpan.value;
      expect(span).toBeGreaterThan(0);
      expect(Number.isFinite(span)).toBe(true);
      expect(Number.isFinite(new Float32Array([span])[0])).toBe(true);
    }
  });
});
